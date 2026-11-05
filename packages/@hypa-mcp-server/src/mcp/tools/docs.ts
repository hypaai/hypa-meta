import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import * as z from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Schema for reading docs
export const readDocsSchema = z.object({
  filename: z
    .string()
    .describe(
      "The documentation filename to read (e.g., 'HYPA-API.md', 'HYPA-AUDIO.md')"
    ),
});

// Schema for searching docs
export const searchDocsSchema = z.object({
  query: z.string().describe("The search query to find in documentation"),
});

// Schema for listing docs
export const listDocsSchema = z.object({});

// Path to docs directory
const DOCS_DIR = join(process.cwd(), "../../apps/hypa-mds");

/**
 * Read a specific documentation file
 */
export async function readDocs({ filename }: z.infer<typeof readDocsSchema>) {
  try {
    const filePath = join(DOCS_DIR, filename);
    const content = readFileSync(filePath, "utf-8");

    return {
      content: [
        {
          type: "text" as const,
          text: content,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error reading documentation: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  }
}

/**
 * Search across all documentation files
 */
export async function searchDocs({
  query,
}: z.infer<typeof searchDocsSchema>) {
  try {
    const files = readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));
    const results: Array<{ file: string; matches: string[] }> = [];

    for (const file of files) {
      const filePath = join(DOCS_DIR, file);
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      const matches = lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) =>
          line.toLowerCase().includes(query.toLowerCase())
        )
        .map(
          ({ line, index }) =>
            `Line ${index + 1}: ${line.trim().substring(0, 200)}`
        );

      if (matches.length > 0) {
        results.push({ file, matches: matches.slice(0, 5) }); // Limit to 5 matches per file
      }
    }

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No results found for query: "${query}"`,
          },
        ],
      };
    }

    const resultText = results
      .map(
        ({ file, matches }) =>
          `\n## ${file}\n${matches.map((m) => `- ${m}`).join("\n")}`
      )
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Search results for "${query}":${resultText}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error searching documentation: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  }
}

/**
 * List all available documentation files
 */
export async function listDocs() {
  try {
    const files = readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));

    const fileList = files
      .map((file) => {
        const filePath = join(DOCS_DIR, file);
        const content = readFileSync(filePath, "utf-8");
        const firstLine = content.split("\n")[0] || "";
        return `- ${file}: ${firstLine.replace(/^#\s*/, "").substring(0, 100)}`;
      })
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Available documentation files:\n${fileList}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error listing documentation: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  }
}

/** Register the built-in documentation tools on an MCP server. */
export function registerDocsTools(server: McpServer): void {
  server.registerTool(
    "read_docs",
    {
      description:
        "Read a specific Hypa documentation file (e.g., HYPA-API.md, HYPA-AUDIO.md, HYPA-VOICE-CLONING.md)",
      inputSchema: readDocsSchema,
    },
    readDocs,
  );
  server.registerTool(
    "search_docs",
    {
      description: "Search across all Hypa documentation files for specific content",
      inputSchema: searchDocsSchema,
    },
    searchDocs,
  );
  server.registerTool(
    "list_docs",
    {
      description: "List all available Hypa documentation files",
      inputSchema: listDocsSchema,
    },
    listDocs,
  );
}
