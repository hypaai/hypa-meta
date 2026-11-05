import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ToolCallParser, parseToolCalls, type ToolSchema } from "../src/tool-parser";

const schemas: ToolSchema[] = [
  {
    name: "web_search",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "What to search for" } },
      required: ["query"],
    },
  },
  {
    name: "translate",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string" },
        targetLang: { type: "string" },
      },
      required: ["text", "targetLang"],
    },
  },
];

describe("ToolCallParser", () => {
  it("parses the standard tool/arguments JSON", () => {
    const calls = new ToolCallParser(schemas).parse(
      '{"tool": "web_search", "arguments": {"query": "bitcoin price"}}',
    );
    assert.deepEqual(calls, [{ tool: "web_search", arguments: { query: "bitcoin price" } }]);
  });

  it("parses JSON inside code blocks", () => {
    const calls = new ToolCallParser(schemas).parse(
      '```json\n{"tool": "translate", "arguments": {"text": "hello", "targetLang": "Yoruba"}}\n```',
    );
    assert.deepEqual(calls, [
      { tool: "translate", arguments: { text: "hello", targetLang: "Yoruba" } },
    ]);
  });

  it("parses OpenAI-style name/arguments calls, including stringified args", () => {
    const calls = new ToolCallParser(schemas).parse(
      '{"name": "web_search", "arguments": "{\\"query\\": \\"weather Lagos\\"}"}',
    );
    assert.deepEqual(calls, [{ tool: "web_search", arguments: { query: "weather Lagos" } }]);
  });

  it("returns nothing when no known tool is called", () => {
    assert.deepEqual(new ToolCallParser(schemas).parse("The price of Bitcoin is high today."), []);
    assert.deepEqual(
      new ToolCallParser(schemas).parse('{"tool": "unknown_tool", "arguments": {}}'),
      [],
    );
  });

  it("flattens nested argument wrappers models sometimes produce", () => {
    const calls = new ToolCallParser(schemas).parse(
      '{"tool": "web_search", "arguments": {"query": {"text": "bitcoin price"}}}',
    );
    assert.deepEqual(calls, [{ tool: "web_search", arguments: { query: "bitcoin price" } }]);
  });

  it("exposes the same parsing through the parseToolCalls helper", () => {
    assert.deepEqual(
      parseToolCalls('{"tool": "web_search", "arguments": {"query": "x"}}', new Set(["web_search"])),
      [{ tool: "web_search", arguments: { query: "x" } }],
    );
  });
});
