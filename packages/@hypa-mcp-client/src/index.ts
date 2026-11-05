import dotenv from "dotenv";
dotenv.config();
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import axios, { isAxiosError } from "axios";
import { ToolCallParser, ToolCall, ToolSchema } from "./tool-parser.js";

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

interface Tool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

// Endpoints are configured via .env (see .env.example). Unlike apps/hypa-api,
// this package isn't wired to the internal @hypa-config workspace package,
// so the Hugging Face endpoint URL below (private api's baseURL) defaults
// here rather than being read from models.json. If that endpoint ID changes
// again, set HYPA_HF_BASE_URL to override it.
const CONFIG = {
  mcpServerUrl:
    process.env.MCP_SERVER_URL || "http://localhost:5678/v2/mcp",
  hfBaseUrl:
    process.env.HYPA_HF_BASE_URL ||
    "https://m35sn4lizhvy1v19.endpoints.huggingface.cloud/v1",
  maxAgentLoops: 10,
};

export class HypaClient {
  private mcp: Client;
  private transport: StreamableHTTPClientTransport | null = null;
  private tools: Tool[] = [];
  private toolNames: Set<string> = new Set();
  private toolSchemas: Map<string, ToolSchema> = new Map();

  private api = axios.create({
    baseURL: CONFIG.hfBaseUrl,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.HF_API_KEY}`,
    },
  });

  constructor() {
    this.mcp = new Client({ name: "hypa-client", version: "1.0.0" }, {});
  }

  async connect() {
    console.log("Connecting to MCP server...");
    this.transport = new StreamableHTTPClientTransport(
      new URL(CONFIG.mcpServerUrl)
    );
    await this.mcp.connect(this.transport);

    const { tools } = await this.mcp.listTools();
    this.tools = tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema as Record<string, unknown>,
      },
    }));
    this.toolNames = new Set(tools.map((t) => t.name));
    this.toolSchemas = new Map(
      this.tools.map((t) => [
        t.function.name,
        {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters as ToolSchema["parameters"],
        },
      ])
    );

    console.table({
      Connected: true,
      Tools: this.tools.map((t) => t.function.name).join(", "),
    });
  }

  async disconnect() {
    await this.mcp.close();
  }

  private parseToolCalls(content: string): ToolCall[] {
    // Convert tools to ToolSchema format for schema-aware parsing
    const toolSchemas: ToolSchema[] = this.tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters as ToolSchema["parameters"],
    }));
    const parser = new ToolCallParser(toolSchemas);
    return parser.parse(content);
  }

  private normalizeToolArguments(
    toolName: string,
    argumentsInput: Record<string, unknown>
  ): Record<string, unknown> {
    const schema = this.toolSchemas.get(toolName);
    const props = schema?.parameters?.properties;
    if (!props) return argumentsInput;

    const normalized: Record<string, unknown> = { ...argumentsInput };

    for (const [key, propSchema] of Object.entries(props)) {
      const value = normalized[key];
      if (!value || typeof value === "object") continue;

      // If schema expects an object with a single property, wrap the scalar
      if (
        propSchema?.type === "object" &&
        propSchema.properties &&
        Object.keys(propSchema.properties).length === 1
      ) {
        const innerKey = Object.keys(propSchema.properties)[0];
        normalized[key] = { [innerKey]: value };
      }
    }

    return normalized;
  }

  private formatToolResult(result: unknown): string {
    if (typeof result === "string") return result;
    if (Array.isArray(result)) {
      return result
        .map((item) =>
          item.type === "text" ? item.text : JSON.stringify(item)
        )
        .join("\n");
    }
    return JSON.stringify(result, null, 2);
  }

  private buildToolPrompt(): string {
    if (this.tools.length === 0) return "";

    const toolDescriptions = this.tools
      .map((t) => {
        const params = t.function.parameters as {
          properties?: Record<string, { type?: string; description?: string }>;
          required?: string[];
        };
        const props = params?.properties || {};
        const required = new Set(params?.required || []);

        const paramList = Object.entries(props)
          .map(([name, schema]) => {
            const req = required.has(name) ? "required" : "optional";
            const type = schema.type || "string";
            const desc = schema.description ? `: ${schema.description}` : "";
            return `    - ${name} (${req}, ${type})${desc}`;
          })
          .join("\n");

        return `• ${t.function.name}\n  ${t.function.description || "No description"}\n  Parameters:\n${paramList || "    (none)"}`;
      })
      .join("\n\n");

    return `# AVAILABLE TOOLS

You have FULL ACCESS to these tools. USE THEM.

${toolDescriptions}

# HOW TO USE TOOLS

When you need external, current, or real-time information, you MUST call a tool.
Respond with ONLY this exact JSON (nothing else):

{"tool": "tool_name", "arguments": {"param": "value"}}

# EXAMPLE

User: What is the current price of Bitcoin?
Assistant: {"tool": "web_search", "arguments": {"query": "bitcoin price USD today"}}

# CRITICAL RULES

- NEVER say "I cannot access external data" - you CAN, use the tools!
- NEVER say "I don't have access to real-time information" - you DO, use web_search!
- NEVER offer to show code or APIs instead of just getting the answer - USE THE TOOL!
- For ANY question about current events, prices, news, weather, etc. → USE web_search
- Output ONLY the JSON when calling a tool, no other text before or after`;
  }

  async chat(options: { messages: Message[] }): Promise<string> {
    const toolPrompt = this.buildToolPrompt();

    const systemPrompt = `You are a helpful assistant with access to real-time tools.

${toolPrompt}

You MUST use tools to get real data. Do NOT make excuses about not having access - you have the tools above. Use them.
You don't have to return the tool result in the response, just use them to get the information and return the final answer to the user.
Don't explicitly mention the tool result in the response, just use them to get the information and return the final answer to the user.
Filter out the tool result from the response, don't include it in the response.
Don't say what is not in the user's question, just return the final answer to the user.
`;

    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      ...options.messages,
    ];

    for (let i = 0; i < CONFIG.maxAgentLoops; i++) {
      console.log(`\n--- Iteration ${i + 1} ---`);

      const response = await this.api
        .post(`/chat/completions`, {
          messages,
          model:"tgi",
          tools:this.tools,
          tool_choice:"auto",
        })
        .catch((err) => {
          if (isAxiosError(err)) {
            console.log(err.response?.data);
          }
        });
      // const response = await this.api
      //   .post<{ output: { content: { text: string }[] } }>(`/responses`, {
      //     input:messages,
      //     "model": "gpt-4o",
      //   })
      //   .catch((err) => {
      //     if(isAxiosError(err)){
      //       console.log(err.response?.data);
      //     }
      //   });
      if(!response?.data) continue;
      let content = response.data.choices[0]?.message?.content || "";
      // let content = response?.data?.output?.[0]?.content?.[0]?.text || "";
      content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

      console.log("Assistant:", content);

      const toolCalls = this.parseToolCalls(content);

      if (toolCalls.length === 0) {
        return content;
      }

      messages.push({ role: "assistant", content });

      const toolResultMessages: string[] = [];
      for (const toolCall of toolCalls) {
        const normalizedArgs = this.normalizeToolArguments(
          toolCall.tool,
          toolCall.arguments
        );
        console.log(`Calling tool: ${toolCall.tool}`, normalizedArgs);

        try {
          const result = await this.mcp.callTool({
            name: toolCall.tool,
            arguments: normalizedArgs,
          });

          const formattedResult = this.formatToolResult(result.content);
          console.log("Tool result:", formattedResult);

          toolResultMessages.push(
            `[Tool Result from ${toolCall.tool}]:\n${formattedResult}`
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(`Tool error: ${errorMessage}`);
          toolResultMessages.push(
            `[Tool Error from ${toolCall.tool}]: ${errorMessage}\n\nThe tool failed. Try to help the user anyway or suggest an alternative.`
          );
        }
      }

      if (toolResultMessages.length > 0) {
        messages.push({
          role: "assistant",
          content: `${toolResultMessages.join(
            "\n\n"
          )}\n\nNow provide a helpful response to the user based on this information.`,
        });
      }
    }

    const lastAssistantMessage = messages
      .filter((m) => m.role === "assistant")
      .pop();
    return (
      lastAssistantMessage?.content ||
      "Max iterations reached without final response."
    );
  }
}

export async function createClient(): Promise<HypaClient> {
  const client = new HypaClient();
  await client.connect();
  return client;
}

async function main() {
  const client = await createClient();
  const response = await client.chat({
    messages: [
      {
        role: "user",
        content:
          "Hey, hello. What is current price of Bitcoin? and what is the current weather in Lagos, Nigeria? also what is time in Lagos, Nigeria now and India now? what is the difference in time between Lagos, Nigeria and India now? and what is How are you in yoruba",
        // content: "What is current weather in Lagos, Nigeria?",
        // content: "What is the time in Lagos, Nigeria now?",
      },
    ],
  });
  console.log("\n=== Final Response ===\n", response);
  await client.disconnect();
}

main().catch(console.error);
