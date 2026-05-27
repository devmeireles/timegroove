"use client";

import { useMemo } from "react";

import { tokenizeJson, type JsonTokenKind } from "@/lib/json/highlight";

interface JsonViewerProps {
  data: unknown;
  /** Indent width, in spaces. */
  indent?: number;
}

const CLASS_BY_KIND: Record<JsonTokenKind, string> = {
  key: "tg-json-key",
  string: "tg-json-string",
  number: "tg-json-number",
  boolean: "tg-json-boolean",
  null: "tg-json-null",
  punctuation: "tg-json-punctuation",
  whitespace: "",
};

export function JsonViewer({ data, indent = 2 }: JsonViewerProps) {
  const tokens = useMemo(() => {
    const serialized = JSON.stringify(data, null, indent);
    return tokenizeJson(serialized);
  }, [data, indent]);

  return (
    <pre className="m-0 font-mono text-[12.5px] leading-[1.65] text-(--color-foreground) whitespace-pre">
      <code>
        {tokens.map((token, index) => {
          if (token.kind === "whitespace") {
            return <span key={index}>{token.text}</span>;
          }
          return (
            <span key={index} className={CLASS_BY_KIND[token.kind]}>
              {token.text}
            </span>
          );
        })}
      </code>
    </pre>
  );
}
