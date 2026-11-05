const MAX_CONTENT_CHARS = 2000;

export interface ToolCall {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface ToolSchema {
  name: string;
  description?: string;
  parameters?: {
    type?: string;
    properties?: Record<
      string,
      {
        type?: string;
        description?: string;
        enum?: string[];
        properties?: Record<string, { type?: string; description?: string; enum?: string[] }>;
      }
    >;
    required?: string[];
  };
}

export class ToolCallParser {
  private toolNames: Set<string>;
  private toolSchemas: Map<string, ToolSchema>;

  constructor(tools: Set<string> | string[] | ToolSchema[]) {
    if (Array.isArray(tools) && tools.length > 0 && typeof tools[0] === "object") {
      // ToolSchema[] - extract names and store schemas
      const schemas = tools as ToolSchema[];
      this.toolNames = new Set(schemas.map((t) => t.name));
      this.toolSchemas = new Map(schemas.map((t) => [t.name, t]));
    } else if (tools instanceof Set) {
      this.toolNames = tools;
      this.toolSchemas = new Map();
    } else {
      this.toolNames = new Set(tools as string[]);
      this.toolSchemas = new Map();
    }
  }

  private getToolArgNames(toolName: string): string[] {
    const schema = this.toolSchemas.get(toolName);
    if (!schema?.parameters?.properties) return [];
    return Object.keys(schema.parameters.properties);
  }

  private getRequiredArgs(toolName: string): string[] {
    const schema = this.toolSchemas.get(toolName);
    return schema?.parameters?.required || [];
  }

  private getArgSchema(toolName: string, argName: string) {
    const schema = this.toolSchemas.get(toolName);
    return schema?.parameters?.properties?.[argName];
  }

  private coerceValue(value: string, argSchema?: { type?: string }): unknown {
    if (!argSchema?.type) return value;
    
    const trimmed = value.trim();
    
    if (argSchema.type === "number" || argSchema.type === "integer") {
      const num = Number(trimmed);
      if (!isNaN(num)) return num;
    } else if (argSchema.type === "boolean") {
      if (trimmed.toLowerCase() === "true") return true;
      if (trimmed.toLowerCase() === "false") return false;
    } else if (argSchema.type === "array" || argSchema.type === "object") {
      try { return JSON.parse(trimmed); } catch {}
    }
    
    return trimmed;
  }

  private extractArgValue(content: string, argName: string, toolName: string): string | null {
    // Comprehensive patterns to extract argument values from messy text
    const patterns = [
      // JSON-like: "argName": "value" or 'argName': 'value'
      new RegExp(`["']${this.escapeRegex(argName)}["']\\s*:\\s*["']([^"']+)["']`, "gi"),
      // JSON-like unquoted key: argName: "value"
      new RegExp(`(?:^|[\\s,{])${this.escapeRegex(argName)}\\s*:\\s*["']([^"']+)["']`, "gim"),
      // Assignment: argName = "value"
      new RegExp(`${this.escapeRegex(argName)}\\s*=\\s*["']([^"']+)["']`, "gi"),
      // Colon with unquoted value (stop at comma, newline, closing brace)
      new RegExp(`["']?${this.escapeRegex(argName)}["']?\\s*:\\s*["']?([^"',}\\]\\n]+)["']?`, "gi"),
      // Natural language: with argName "value"
      new RegExp(`(?:with|using|set)\\s+(?:the\\s+)?${this.escapeRegex(argName)}\\s+(?:to\\s+|as\\s+)?["']([^"']+)["']`, "gi"),
      // Natural language: argName is "value"
      new RegExp(`${this.escapeRegex(argName)}\\s+(?:is|of|as|being)\\s+["']([^"']+)["']`, "gi"),
      // Argument in parentheses after tool: tool(argName="value")
      new RegExp(`${this.escapeRegex(toolName)}[^)]*${this.escapeRegex(argName)}\\s*=\\s*["']([^"']+)["']`, "gi"),
    ];

    for (const pattern of patterns) {
      pattern.lastIndex = 0; // Reset regex state
      const match = pattern.exec(content);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractQuotedStrings(content: string): string[] {
    const strings: string[] = [];
    // Match double-quoted strings
    const doubleQuoted = content.match(/"([^"]+)"/g);
    if (doubleQuoted) {
      strings.push(...doubleQuoted.map(s => s.slice(1, -1)));
    }
    // Match single-quoted strings
    const singleQuoted = content.match(/'([^']+)'/g);
    if (singleQuoted) {
      strings.push(...singleQuoted.map(s => s.slice(1, -1)));
    }
    // Match backtick strings
    const backtickQuoted = content.match(/`([^`]+)`/g);
    if (backtickQuoted) {
      strings.push(...backtickQuoted.map(s => s.slice(1, -1)));
    }
    return strings;
  }

  /**
   * Flatten nested argument structures that LLMs sometimes produce
   * e.g., { query: { text: "value" } } → { query: "value" }
   * e.g., { type: "object", query: "value" } → { query: "value" }
   */
  private flattenArguments(args: unknown): Record<string, unknown> {
    if (!args || typeof args !== "object") return {};
    
    const obj = args as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    
    // Meta keys to skip (JSON Schema / OpenAPI cruft)
    const metaKeys = new Set(["type", "properties", "required", "description", "$schema", "additionalProperties"]);
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip meta keys
      if (metaKeys.has(key)) continue;
      
      // If value is an object with a single "text", "value", "content", or "input" key, unwrap it
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const innerObj = value as Record<string, unknown>;
        const innerKeys = Object.keys(innerObj).filter(k => !metaKeys.has(k));
        
        // Check for common wrapper patterns
        if (innerKeys.length === 1) {
          const innerKey = innerKeys[0];
          if (["text", "value", "content", "input", "data", "query"].includes(innerKey)) {
            result[key] = innerObj[innerKey];
            continue;
          }
        }
        
        // Check if inner object has type: "object" with actual value keys
        if (innerObj.type === "object" || innerObj.type === "string") {
          const valueKeys = innerKeys.filter(k => k !== "type");
          if (valueKeys.length === 1) {
            result[key] = innerObj[valueKeys[0]];
            continue;
          }
        }
      }
      
      result[key] = value;
    }
    
    return result;
  }

  parse(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    const seen = new Set<string>();
    const limitedContent =
      content.length > MAX_CONTENT_CHARS
        ? content.slice(0, MAX_CONTENT_CHARS)
        : content;

    const addToolCall = (call: ToolCall): boolean => {
      const key = JSON.stringify({ tool: call.tool, arguments: call.arguments });
      if (seen.has(key)) return false;
      seen.add(key);
      toolCalls.push(call);
      return true;
    };

    const isValidToolCall = (obj: unknown): obj is ToolCall => {
      if (!obj || typeof obj !== "object") return false;
      const o = obj as Record<string, unknown>;

      // Standard format: { tool, arguments }
      if (typeof o.tool === "string" && this.toolNames.has(o.tool)) {
        return true;
      }
      // OpenAI-style: { name, arguments } or { name, parameters }
      if (typeof o.name === "string" && this.toolNames.has(o.name)) {
        return true;
      }
      // Nested function format
      if (o.function && typeof o.function === "object") {
        const fn = o.function as Record<string, unknown>;
        if (typeof fn.name === "string" && this.toolNames.has(fn.name)) {
          return true;
        }
      }
      // action/input format (some models use this)
      if (typeof o.action === "string" && this.toolNames.has(o.action)) {
        return true;
      }
      // tool_name format (Anthropic style)
      if (typeof o.tool_name === "string" && this.toolNames.has(o.tool_name)) {
        return true;
      }
      return false;
    };

    const normalizeToolCall = (obj: Record<string, unknown>): ToolCall | null => {
      // Standard format
      if (typeof obj.tool === "string" && this.toolNames.has(obj.tool)) {
        return {
          tool: obj.tool,
          arguments: this.flattenArguments(obj.arguments) || {},
        };
      }
      // OpenAI name/arguments format
      if (typeof obj.name === "string" && this.toolNames.has(obj.name)) {
        let args = obj.arguments || obj.parameters;
        if (typeof args === "string") {
          try { args = JSON.parse(args); } catch { args = {}; }
        }
        return {
          tool: obj.name,
          arguments: this.flattenArguments(args) || {},
        };
      }
      // Nested function format: { function: { name, arguments } }
      if (obj.function && typeof obj.function === "object") {
        const fn = obj.function as Record<string, unknown>;
        if (typeof fn.name === "string" && this.toolNames.has(fn.name)) {
          let args = fn.arguments || fn.parameters;
          if (typeof args === "string") {
            try { args = JSON.parse(args); } catch { args = {}; }
          }
          return {
            tool: fn.name,
            arguments: this.flattenArguments(args) || {},
          };
        }
      }
      // action/input format
      if (typeof obj.action === "string" && this.toolNames.has(obj.action)) {
        return {
          tool: obj.action,
          arguments: this.flattenArguments(obj.input || obj.parameters) || {},
        };
      }
      // tool_name/tool_input format (Anthropic style)
      if (typeof obj.tool_name === "string" && this.toolNames.has(obj.tool_name)) {
        return {
          tool: obj.tool_name,
          arguments: this.flattenArguments(obj.tool_input) || {},
        };
      }
      return null;
    };

    const extractFromJson = (text: string) => {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (isValidToolCall(item)) {
              const normalized = normalizeToolCall(item as unknown as Record<string, unknown>);
              if (normalized) addToolCall(normalized);
            }
          }
        } else if (isValidToolCall(parsed)) {
          const normalized = normalizeToolCall(parsed as unknown as Record<string, unknown>);
          if (normalized) addToolCall(normalized);
        }
        // Handle { tool_calls: [...] } wrapper
        if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
          for (const item of parsed.tool_calls) {
            if (isValidToolCall(item)) {
              const normalized = normalizeToolCall(item as unknown as Record<string, unknown>);
              if (normalized) addToolCall(normalized);
            }
          }
        }
      } catch {}
    };

    // 1. Code blocks with any language tag (json, javascript, typescript, etc.)
    const codeBlockRegex = /```(?:\w*)\s*([\s\S]*?)\s*```/g;
    let match;
    while ((match = codeBlockRegex.exec(limitedContent)) !== null) {
      extractFromJson(match[1].trim());
    }
    if (toolCalls.length > 0) return toolCalls;

    // 2. XML-style tool calls: <tool_call>...</tool_call> or <function_call>...</function_call>
    const xmlPatterns = [
      /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/gi,
      /<function_call>\s*([\s\S]*?)\s*<\/function_call>/gi,
      /<tool>\s*([\s\S]*?)\s*<\/tool>/gi,
      /<action>\s*([\s\S]*?)\s*<\/action>/gi,
    ];
    for (const regex of xmlPatterns) {
      while ((match = regex.exec(limitedContent)) !== null) {
        extractFromJson(match[1].trim());
      }
    }
    if (toolCalls.length > 0) return toolCalls;

    // 3. Balanced brace extraction for nested JSON objects
    const extractBalancedJson = (str: string): string[] => {
      const results: string[] = [];
      let depth = 0;
      let start = -1;
      for (let i = 0; i < str.length; i++) {
        if (str[i] === "{") {
          if (depth === 0) start = i;
          depth++;
        } else if (str[i] === "}") {
          depth--;
          if (depth === 0 && start !== -1) {
            results.push(str.slice(start, i + 1));
            start = -1;
          }
        }
      }
      return results;
    };

    const jsonObjects = extractBalancedJson(limitedContent);
    for (const jsonStr of jsonObjects) {
      extractFromJson(jsonStr);
    }
    if (toolCalls.length > 0) return toolCalls;

    // 4. Array extraction [...] for tool call arrays
    const extractBalancedArray = (str: string): string[] => {
      const results: string[] = [];
      let depth = 0;
      let start = -1;
      for (let i = 0; i < str.length; i++) {
        if (str[i] === "[") {
          if (depth === 0) start = i;
          depth++;
        } else if (str[i] === "]") {
          depth--;
          if (depth === 0 && start !== -1) {
            results.push(str.slice(start, i + 1));
            start = -1;
          }
        }
      }
      return results;
    };

    const jsonArrays = extractBalancedArray(limitedContent);
    for (const arrStr of jsonArrays) {
      extractFromJson(arrStr);
    }
    if (toolCalls.length > 0) return toolCalls;

    // 5. Relaxed pattern matching for malformed JSON
    for (const toolName of this.toolNames) {
      // Pattern: tool_name(arg1="value1", arg2="value2")
      const funcCallRegex = new RegExp(
        `${toolName}\\s*\\(([^)]*)\\)`,
        "gi"
      );
      while ((match = funcCallRegex.exec(limitedContent)) !== null) {
        const argsStr = match[1];
        const args: Record<string, unknown> = {};
        const argPairs = argsStr.match(/(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g);
        if (argPairs) {
          for (const pair of argPairs) {
            const [key, ...valueParts] = pair.split("=");
            const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
            args[key.trim()] = value;
          }
        }
        addToolCall({ tool: toolName, arguments: args });
      }

      // Pattern: Use tool_name with { ... }
      const useToolRegex = new RegExp(
        `(?:use|call|invoke|execute)\\s+${toolName}\\s+(?:with\\s+)?({[^}]+})`,
        "gi"
      );
      while ((match = useToolRegex.exec(limitedContent)) !== null) {
        extractFromJson(match[1]);
      }
    }
    if (toolCalls.length > 0) return toolCalls;

    // 6. Key-value line parsing (YAML-like format some models produce)
    const lines = limitedContent.split("\n");
    let currentTool: string | null = null;
    let currentArgs: Record<string, unknown> = {};

    for (const line of lines) {
      const toolMatch = line.match(/^(?:tool|function|action)\s*:\s*["']?(\w+)["']?\s*$/i);
      if (toolMatch && this.toolNames.has(toolMatch[1])) {
        if (currentTool) {
          addToolCall({ tool: currentTool, arguments: currentArgs });
        }
        currentTool = toolMatch[1];
        currentArgs = {};
        continue;
      }

      if (currentTool) {
        const argMatch = line.match(/^\s*[-•]?\s*(\w+)\s*:\s*(.+?)\s*$/);
        if (argMatch) {
          let value: unknown = argMatch[2].replace(/^["']|["']$/g, "");
          // Try to parse as JSON for complex values
          try { value = JSON.parse(argMatch[2]); } catch {}
          currentArgs[argMatch[1]] = value;
        }
      }
    }
    if (currentTool) {
      addToolCall({ tool: currentTool, arguments: currentArgs });
    }
    if (toolCalls.length > 0) return toolCalls;

    // 7. Aggressive schema-aware extraction: scan entire content for tool names and arguments
    if (this.toolSchemas.size > 0) {
      for (const [toolName, schema] of this.toolSchemas) {
        // Check if tool name appears anywhere in content (case-insensitive, word boundary)
        const toolMentionPatterns = [
          new RegExp(`\\b${this.escapeRegex(toolName)}\\b`, "i"),
          new RegExp(`["']${this.escapeRegex(toolName)}["']`, "i"),
          new RegExp(`tool["']?\\s*[:=]\\s*["']?${this.escapeRegex(toolName)}`, "i"),
          new RegExp(`name["']?\\s*[:=]\\s*["']?${this.escapeRegex(toolName)}`, "i"),
        ];
        
        const toolMentioned = toolMentionPatterns.some(p => p.test(limitedContent));
        if (!toolMentioned) continue;

        const argNames = this.getToolArgNames(toolName);
        const requiredArgs = this.getRequiredArgs(toolName);
        const args: Record<string, unknown> = {};

        // Extract values for each known argument
        for (const argName of argNames) {
          const argSchema = this.getArgSchema(toolName, argName);
          const value = this.extractArgValue(limitedContent, argName, toolName);
          
          if (value !== null) {
            args[argName] = this.coerceValue(value, argSchema);
          }
        }

        // Check if we have all required arguments
        const hasAllRequired = requiredArgs.every((arg) => args[arg] !== undefined);

        // If tool has no args, or no required args and we found at least one, or we have all required
        if (argNames.length === 0 || (requiredArgs.length === 0 && Object.keys(args).length > 0) || hasAllRequired) {
          addToolCall({ tool: toolName, arguments: args });
        }
      }
    }
    if (toolCalls.length > 0) return toolCalls;

    // 8. Single-argument tool extraction from quoted strings near tool name
    if (this.toolSchemas.size > 0) {
      for (const [toolName] of this.toolSchemas) {
        const argNames = this.getToolArgNames(toolName);
        const requiredArgs = this.getRequiredArgs(toolName);
        
        // Only for tools with single required argument
        if (requiredArgs.length !== 1) continue;
        
        const primaryArg = requiredArgs[0];
        const argSchema = this.getArgSchema(toolName, primaryArg);
        
        // Various patterns to find the value near the tool name
        const patterns = [
          // tool_name "value" or tool_name 'value'
          new RegExp(`${this.escapeRegex(toolName)}[\\s:]*["']([^"']+)["']`, "i"),
          // "value" ... tool_name (value before tool)
          new RegExp(`["']([^"']+)["'][^"']*?${this.escapeRegex(toolName)}`, "i"),
          // tool_name(value) or tool_name("value")
          new RegExp(`${this.escapeRegex(toolName)}\\s*\\(\\s*["']?([^)"']+)["']?\\s*\\)`, "i"),
          // use/call tool_name for "value"
          new RegExp(`(?:use|call|invoke|run)\\s+${this.escapeRegex(toolName)}\\s+(?:for|with|to)?\\s*["']([^"']+)["']`, "i"),
          // I'll tool_name "value"
          new RegExp(`(?:I'll|I will|let me|going to)\\s+(?:use\\s+)?${this.escapeRegex(toolName)}\\s+["']([^"']+)["']`, "i"),
        ];

        for (const pattern of patterns) {
          const match = limitedContent.match(pattern);
          if (match && match[1]) {
            const args: Record<string, unknown> = {
              [primaryArg]: this.coerceValue(match[1].trim(), argSchema),
            };
            addToolCall({ tool: toolName, arguments: args });
            break;
          }
        }
      }
    }
    if (toolCalls.length > 0) return toolCalls;

    // 9. Ultra-aggressive: find tool name and grab the nearest/most relevant quoted string
    if (this.toolSchemas.size > 0) {
      const quotedStrings = this.extractQuotedStrings(limitedContent);
      
      for (const [toolName] of this.toolSchemas) {
        const toolRegex = new RegExp(`\\b${this.escapeRegex(toolName)}\\b`, "i");
        if (!toolRegex.test(limitedContent)) continue;

        const argNames = this.getToolArgNames(toolName);
        const requiredArgs = this.getRequiredArgs(toolName);
        
        // If tool needs at least one argument, try to use the first meaningful quoted string
        if (requiredArgs.length > 0 && quotedStrings.length > 0) {
          // Find the most relevant quoted string (closest to tool name or longest)
          const toolIndex = limitedContent.toLowerCase().indexOf(toolName.toLowerCase());
          let bestString = quotedStrings[0];
          let bestDistance = Infinity;

          for (const str of quotedStrings) {
            // Skip very short strings or ones that look like argument names
            if (str.length < 2 || argNames.includes(str)) continue;
            
            const strIndex = limitedContent.indexOf(`"${str}"`) !== -1 
              ? limitedContent.indexOf(`"${str}"`) 
              : limitedContent.indexOf(`'${str}'`);
            
            const distance = Math.abs(strIndex - toolIndex);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestString = str;
            }
          }

          if (bestString && bestString.length >= 2) {
            // Assign to primary argument
            const primaryArg = argNames.find((a) => 
              ["query", "input", "text", "search", "message", "prompt", "q", "question"].includes(a.toLowerCase())
            ) || requiredArgs[0] || argNames[0];
            
            if (primaryArg) {
              const argSchema = this.getArgSchema(toolName, primaryArg);
              addToolCall({
                tool: toolName,
                arguments: { [primaryArg]: this.coerceValue(bestString, argSchema) },
              });
            }
          }
        } else if (requiredArgs.length === 0) {
          // Tool has no required args, we can call it without arguments
          addToolCall({ tool: toolName, arguments: {} });
        }
      }
    }
    if (toolCalls.length > 0) return toolCalls;

    // 10. Last-ditch: extract any JSON-like key-value pairs and match to tool args
    if (this.toolSchemas.size > 0) {
      for (const [toolName] of this.toolSchemas) {
        const toolRegex = new RegExp(`\\b${this.escapeRegex(toolName)}\\b`, "i");
        if (!toolRegex.test(limitedContent)) continue;

        const argNames = this.getToolArgNames(toolName);
        const requiredArgs = this.getRequiredArgs(toolName);
        const args: Record<string, unknown> = {};

        // Look for any key: value or key = value patterns where key matches our arg names
        for (const argName of argNames) {
          // Broad pattern to catch messy formatting
          const broadPatterns = [
            new RegExp(`${this.escapeRegex(argName)}\\s*[:=]\\s*([^,}\\]\\n]+)`, "i"),
            new RegExp(`["']${this.escapeRegex(argName)}["']\\s*[:=]\\s*([^,}\\]\\n]+)`, "i"),
          ];

          for (const pattern of broadPatterns) {
            const match = limitedContent.match(pattern);
            if (match && match[1]) {
              let value = match[1].trim();
              // Clean up quotes
              value = value.replace(/^["'`]+|["'`]+$/g, "").trim();
              if (value) {
                const argSchema = this.getArgSchema(toolName, argName);
                args[argName] = this.coerceValue(value, argSchema);
                break;
              }
            }
          }
        }

        const hasAllRequired = requiredArgs.every((arg) => args[arg] !== undefined);
        if (hasAllRequired || (requiredArgs.length === 0 && Object.keys(args).length > 0)) {
          addToolCall({ tool: toolName, arguments: args });
        }
      }
    }
    if (toolCalls.length > 0) return toolCalls;

    // 9. Last resort: try to parse entire content as JSON
    extractFromJson(limitedContent.trim());

    return toolCalls;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

/**
 * Convenience function to parse tool calls from content
 */
export function parseToolCalls(
  content: string,
  tools: Set<string> | string[] | ToolSchema[]
): ToolCall[] {
  const parser = new ToolCallParser(tools);
  return parser.parse(content);
}
