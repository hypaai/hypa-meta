/**
 * Public MCP path. It versions like the rest of the API (`/v2/mcp`) and can
 * move to `/v1/mcp` without a new hostname.
 *
 * Set `MCP_PATH` to an absolute path, or `MCP_VERSION` (default `v2`) to use
 * `/${version}/mcp`. The host stays the API host.
 */

const VERSION = /^v\d+$/;

export function resolveMcpPath(
  env: { MCP_PATH?: string; MCP_VERSION?: string } = process.env,
): string {
  const explicit = env.MCP_PATH?.trim();
  if (explicit) return normalizeMcpPath(explicit);
  const version = (env.MCP_VERSION ?? "v2").trim().replace(/^\/+|\/+$/g, "");
  if (!VERSION.test(version)) {
    throw new Error("MCP_VERSION must look like v2");
  }
  return `/${version}/mcp`;
}

function normalizeMcpPath(value: string): string {
  const path = value.replace(/\/+$/, "");
  const parts = path.split("/").slice(1);
  if (!path.startsWith("/") || parts.length === 0 || parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error("MCP_PATH must be an absolute path such as /v2/mcp");
  }
  return path;
}
