/**
 * Tiny JSON tokenizer that turns a stringified payload into typed spans.
 * Avoids the cost of pulling a full highlighter (prism/shiki) for what is a
 * regular grammar. Tokens are emitted in source order and concatenated by
 * the renderer without altering whitespace.
 */

export type JsonTokenKind =
  | "key"
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "punctuation"
  | "whitespace";

export interface JsonToken {
  kind: JsonTokenKind;
  text: string;
}

const TOKEN_PATTERN =
  // 1: string  2: number  3: boolean  4: null  5: punctuation  6: whitespace
  /("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false)|(null)|([{}[\],:])|(\s+)/g;

export function tokenizeJson(json: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let match: RegExpExecArray | null;
  TOKEN_PATTERN.lastIndex = 0;

  while ((match = TOKEN_PATTERN.exec(json)) !== null) {
    if (match[1] !== undefined) {
      // Look ahead through whitespace for ':' to detect object keys.
      const tailStart = TOKEN_PATTERN.lastIndex;
      let i = tailStart;
      while (i < json.length && /\s/.test(json[i]!)) i++;
      const isKey = json[i] === ":";
      tokens.push({ kind: isKey ? "key" : "string", text: match[1] });
    } else if (match[2] !== undefined) {
      tokens.push({ kind: "number", text: match[2] });
    } else if (match[3] !== undefined) {
      tokens.push({ kind: "boolean", text: match[3] });
    } else if (match[4] !== undefined) {
      tokens.push({ kind: "null", text: match[4] });
    } else if (match[5] !== undefined) {
      tokens.push({ kind: "punctuation", text: match[5] });
    } else if (match[6] !== undefined) {
      tokens.push({ kind: "whitespace", text: match[6] });
    }
  }

  return tokens;
}
