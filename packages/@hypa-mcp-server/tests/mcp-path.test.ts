import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveMcpPath } from "../src/mcp-path.js";

test("the public MCP path defaults to /v2/mcp on the API host", () => {
  assert.equal(resolveMcpPath({}), "/v2/mcp");
});

test("MCP_VERSION and MCP_PATH select another version", () => {
  assert.equal(resolveMcpPath({ MCP_VERSION: "v1" }), "/v1/mcp");
  assert.equal(resolveMcpPath({ MCP_PATH: "/v1/mcp/", MCP_VERSION: "v2" }), "/v1/mcp");
});

test("MCP_PATH rejects a relative or parent path", () => {
  assert.throws(() => resolveMcpPath({ MCP_PATH: "mcp" }), /absolute path/);
  assert.throws(() => resolveMcpPath({ MCP_PATH: "/v2/../mcp" }), /absolute path/);
  assert.throws(() => resolveMcpPath({ MCP_VERSION: "latest" }), /MCP_VERSION/);
});
