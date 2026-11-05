import "dotenv/config";
import express from "express";
import { createMcpHttpHost } from "./http.js";
import { createDocsMcpServer } from "./mcp/index.js";
import { readDocs, searchDocs, listDocs } from "./mcp/tools/docs.js";

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";

async function main(): Promise<void> {
  const host = createMcpHttpHost({
    name: "hypa-mcp-server",
    createServer: createDocsMcpServer,
  });

  // Direct REST tool calls (assistant integration) — docs tools only.
  host.app.post("/tools/call", async (req, res) => {
    try {
      const { tool, arguments: args } = (req.body ?? {}) as {
        tool?: string;
        arguments?: { filename?: string; query?: string };
      };
      if (!tool) {
        res.status(400).json({ error: "Tool name is required" });
        return;
      }
      console.log(`Direct tool call: ${tool}`, args);
      if (tool === "read_docs") {
        res.json({ result: await readDocs(args as { filename: string }) });
      } else if (tool === "search_docs") {
        res.json({ result: await searchDocs(args as { query: string }) });
      } else if (tool === "list_docs") {
        res.json({ result: await listDocs() });
      } else {
        res.status(404).json({ error: `Tool "${tool}" not found` });
      }
    } catch (error) {
      console.error("Tool call error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Tool execution failed",
      });
    }
  });

  const { url } = await host.listen(PORT, HOST);
  console.log(`🚀 MCP server (docs tools) running on ${url}`);
  console.log(`📚 Documentation tools enabled`);
  console.log(`🔧 Direct tool endpoint: POST /tools/call`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
