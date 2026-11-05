import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import axios from "axios";

// ============================================================================
// Types
// ============================================================================

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface Tool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

interface ToolCall {
  tool: string;
  arguments: Record<string, unknown>;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  mcpServerUrl: process.env.MCP_SERVER_URL || "http://localhost:3000/v2/mcp",
  llmBaseUrl:
    process.env.LLM_BASE_URL ||
    "https://m35sn4lizhvy1v19.endpoints.huggingface.cloud",
  llmModel: process.env.LLM_MODEL || "hypa-llama3-2-8b-sft-2025-12-rvl",
  llmApiKey: process.env.LLM_API_KEY || "",
};

// ============================================================================
// MCP Client
// ============================================================================

export class HypaClient {
  private mcp: Client;
  private transport: StreamableHTTPClientTransport | null = null;
  private tools: Tool[] = [];

  constructor() {
    this.mcp = new Client({ name: "hypa-client", version: "1.0.0" }, {});
  }

  async connect(): Promise<void> {
    console.log("Connecting to MCP server...");
    this.transport = new StreamableHTTPClientTransport(
      new URL(CONFIG.mcpServerUrl)
    );
    await this.mcp.connect(this.transport);

    const { tools } = await this.mcp.listTools();
    this.tools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown>,
    }));

    console.log(`Connected! Tools: ${this.tools.map((t) => t.name).join(", ")}`);
  }

  async disconnect(): Promise<void> {
    await this.mcp.close();
  }

  private buildSystemPrompt(): string {
    const toolDescriptions = this.tools
      .map((t) => {
        return `- ${t.name}: ${t.description || "No description"}\n  Parameters: ${JSON.stringify(t.inputSchema, null, 2)}`;
      })
      .join("\n\n");

    return `You are a helpful AI assistant with access to tools.

## Available Tools:
${toolDescriptions}

## How to Use Tools:
When you need to use a tool, respond with ONLY a JSON object in this exact format:
\`\`\`json
{"tool": "tool_name", "arguments": {...}}
\`\`\`

For example, to translate text:
\`\`\`json
{"tool": "translate", "arguments": {"params": {"text": "Hello", "from": "English", "to": "Yoruba"}}}
\`\`\`

For example, to search the web:
\`\`\`json
{"tool": "web_search", "arguments": {"query": {"query": "latest news"}}}
\`\`\`

## Important Rules:
1. If you need to use a tool, respond ONLY with the JSON - no other text
2. After receiving tool results, provide a helpful response to the user
3. If you don't need a tool, just respond normally with text`;
  }

  private parseToolCall(content: string): ToolCall | null {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    const textToparse = jsonMatch ? jsonMatch[1] : content;

    try {
      const parsed = JSON.parse(textToparse.trim());
      if (parsed.tool && parsed.arguments) {
        return parsed as ToolCall;
      }
    } catch {
      // Not valid JSON or not a tool call
    }
    return null;
  }

  async chat(userMessage: string): Promise<string> {
    const messages: Message[] = [
      { role: "system", content: this.buildSystemPrompt() },
      { role: "user", content: userMessage.slice(0, 200) },
    ];

    // Agent loop - max 10 iterations
    for (let i = 0; i < 10; i++) {
      console.log(`\n--- Iteration ${i + 1} ---`);

      const response = await axios.post(
        `${CONFIG.llmBaseUrl}/v1/chat/completions`,
        {
          // model: CONFIG.llmModel,
          messages,
          // max_tokens: 4096,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer `,
          },
        }
      );

      let content = response.data.choices[0]?.message?.content || "";
      
      // Remove thinking tags
      content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      
      console.log("LLM Response:", content.slice(0, 200) + (content.length > 200 ? "..." : ""));

      // Check if the model wants to call a tool
      const toolCall = this.parseToolCall(content);

      if (!toolCall) {
        // No tool call - this is the final response
        return content;
      }

      // Execute the tool
      console.log(`Calling tool: ${toolCall.tool}`, toolCall.arguments);

      messages.push({ role: "assistant", content });

      try {
        const result = await this.mcp.callTool({
          name: toolCall.tool,
          arguments: toolCall.arguments,
        });

        const resultText = result.content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
          .join("\n");

        console.log("Tool result:", resultText.slice(0, 200) + (resultText.length > 200 ? "..." : ""));

        // Add tool result as user message
        messages.push({
          role: "user",
          content: `Tool "${toolCall.tool}" returned:\n${resultText}\n\nPlease provide a helpful response based on this result.`,
        });
      } catch (err: any) {
        console.error("Tool error:", err.message);
        messages.push({
          role: "user",
          content: `Tool "${toolCall.tool}" failed with error: ${err.message}\n\nPlease try a different approach or inform the user.`,
        });
      }
    }

    return "Max iterations reached";
  }
}

// ============================================================================
// Quick Start
// ============================================================================

export async function createClient(): Promise<HypaClient> {
  const client = new HypaClient();
  await client.connect();
  return client;
}

// Run if executed directly
async function main() {
  const client = await createClient();
  const response = await client.chat("What is trending in the stock market?");
  console.log("\n=== Final Response ===\n", response);
  await client.disconnect();
}

main().catch(console.error);
