/**
 * Docs MCP server (the original @hypa/mcp-server tool set).
 *
 * A factory rather than a shared singleton: the HTTP host mints one per session
 * because an McpServer instance can connect to exactly one transport.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDocsTools } from "./tools/docs.js";

export const createDocsMcpServer = (): McpServer => {
  const server = new McpServer(
    {
      name: "hypa-mcp-server",
      version: "1.0.0",
    },
    { capabilities: {} },
  );
  registerDocsTools(server);
  return server;
};
