import type { ScriptLanguage } from "@/content/scripts";

/**
 * A very small, dependency-free tokeniser.
 *
 * Highlighting a code block does not need a parser — it needs to tell a
 * comment from a string from a keyword, and to be wrong in ways nobody
 * notices. So: an ordered list of anchored regexes per language, matched at
 * the cursor, first hit wins, one character consumed when nothing matches.
 *
 * It returns tokens, not HTML. The renderer turns them into React elements,
 * which means a string in the source can never become markup on the page.
 */

export type TokenType =
  | "plain"
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "builtin"
  | "function";

export interface Token {
  type: TokenType;
  value: string;
}

interface Rule {
  type: TokenType;
  /** Must be anchored with ^ — it is tested against the remaining source. */
  pattern: RegExp;
}

const PYTHON_KEYWORDS =
  /^(?:def|class|return|if|elif|else|for|while|in|not|and|or|import|from|as|with|try|except|finally|raise|lambda|None|True|False|pass|continue|break|global|nonlocal|yield|assert|del|is|async|await)\b/;

const PYTHON_BUILTINS =
  /^(?:print|len|str|int|float|bool|list|dict|set|tuple|range|sum|min|max|abs|round|open|sorted|enumerate|zip|map|filter|format|isinstance|type|Exception|SystemExit|Path|self)\b/;

const JS_KEYWORDS =
  /^(?:var|let|const|function|return|if|else|for|while|do|switch|case|default|break|continue|new|throw|try|catch|finally|typeof|instanceof|delete|void|this|null|undefined|true|false|in|of)\b/;

const JS_BUILTINS =
  /^(?:Math|Number|String|Object|Array|JSON|Date|Boolean|isNaN|parseInt|parseFloat|Infinity|SpreadsheetApp|Utilities|Session|MailApp|HtmlService|Logger|PropertiesService|UrlFetchApp)\b/;

const SQL_KEYWORDS =
  /^(?:WITH|SELECT|FROM|WHERE|GROUP|BY|ORDER|HAVING|AS|AND|OR|NOT|NULL|CASE|WHEN|THEN|ELSE|END|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|ON|UNION|ALL|DISTINCT|LIMIT|OFFSET|CAST|OVER|PARTITION|ASC|DESC|IS|IN|BETWEEN|LIKE|COPY|TO|INSERT|INTO|VALUES|CREATE|TABLE|EXISTS|USING)\b/i;

const SQL_TYPES = /^(?:BIGINT|DOUBLE|TIMESTAMP|VARCHAR|INTEGER|INT|DECIMAL|NUMERIC|DATE|BOOLEAN|TEXT)\b/i;

const RULES: Record<ScriptLanguage, Rule[]> = {
  python: [
    { type: "comment", pattern: /^#[^\n]*/ },
    { type: "string", pattern: /^(?:"""[\s\S]*?"""|'''[\s\S]*?''')/ },
    { type: "string", pattern: /^(?:[rfb]{0,2}"(?:\\.|[^"\\\n])*"|[rfb]{0,2}'(?:\\.|[^'\\\n])*')/ },
    { type: "number", pattern: /^\d[\d_]*(?:\.\d+)?/ },
    { type: "keyword", pattern: PYTHON_KEYWORDS },
    { type: "builtin", pattern: PYTHON_BUILTINS },
    { type: "builtin", pattern: /^@[A-Za-z_]\w*/ },
    { type: "function", pattern: /^[A-Za-z_]\w*(?=\()/ },
    { type: "plain", pattern: /^[A-Za-z_]\w*/ },
  ],
  "google-apps-script": [
    { type: "comment", pattern: /^\/\/[^\n]*/ },
    { type: "comment", pattern: /^\/\*[\s\S]*?\*\// },
    { type: "string", pattern: /^(?:"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/ },
    { type: "number", pattern: /^\d[\d_]*(?:\.\d+)?/ },
    { type: "keyword", pattern: JS_KEYWORDS },
    { type: "builtin", pattern: JS_BUILTINS },
    { type: "function", pattern: /^[A-Za-z_$][\w$]*(?=\()/ },
    { type: "plain", pattern: /^[A-Za-z_$][\w$]*/ },
  ],
  sql: [
    { type: "comment", pattern: /^--[^\n]*/ },
    { type: "comment", pattern: /^\/\*[\s\S]*?\*\// },
    { type: "string", pattern: /^'(?:''|[^'\n])*'/ },
    { type: "number", pattern: /^\d[\d_]*(?:\.\d+)?/ },
    { type: "keyword", pattern: SQL_KEYWORDS },
    { type: "builtin", pattern: SQL_TYPES },
    { type: "function", pattern: /^[A-Za-z_]\w*(?=\s*\()/ },
    { type: "plain", pattern: /^[A-Za-z_]\w*/ },
  ],
  "bulk-sheet-formula": [
    { type: "comment", pattern: /^[-=]{4,}/ },
    { type: "string", pattern: /^"[^"\n]*"/ },
    { type: "function", pattern: /^[A-Z][A-Z0-9_.]*(?=\()/ },
    { type: "keyword", pattern: /^\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{0,3}\$?\d*)?/ },
    { type: "number", pattern: /^\d[\d_]*(?:\.\d+)?%?/ },
    { type: "builtin", pattern: /^(?:Settings|Bulk|Sheet\d*)!/ },
    { type: "plain", pattern: /^[A-Za-z_]\w*/ },
  ],
};

/** Tokenise a whole source string, then split the run into lines of tokens. */
export function tokenizeLines(source: string, language: ScriptLanguage): Token[][] {
  const rules = RULES[language];
  const tokens: Token[] = [];
  let rest = source;

  const push = (type: TokenType, value: string) => {
    const last = tokens[tokens.length - 1];
    if (last && last.type === type) last.value += value;
    else tokens.push({ type, value });
  };

  let guard = 0;
  while (rest.length > 0 && guard < 200_000) {
    guard += 1;

    const whitespace = /^\s+/.exec(rest);
    if (whitespace) {
      push("plain", whitespace[0]);
      rest = rest.slice(whitespace[0].length);
      continue;
    }

    let matched = false;
    for (const rule of rules) {
      const found = rule.pattern.exec(rest);
      if (found && found[0].length > 0) {
        push(rule.type, found[0]);
        rest = rest.slice(found[0].length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      push("plain", rest[0]);
      rest = rest.slice(1);
    }
  }

  // Split the flat token run on newlines so the renderer can number lines.
  const lines: Token[][] = [[]];
  for (const token of tokens) {
    const parts = token.value.split("\n");
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part.length > 0) lines[lines.length - 1].push({ type: token.type, value: part });
    });
  }
  return lines;
}

export const TOKEN_CLASS: Record<TokenType, string> = {
  plain: "text-ink",
  comment: "text-faint italic",
  string: "text-good",
  number: "text-warn",
  keyword: "text-info",
  builtin: "text-brand",
  function: "text-ember-ink",
};

/** "14-28" or "31" -> [14, 28]. Returns null for anything unparseable. */
export function parseLineRange(range: string): [number, number] | null {
  const match = /^(\d+)(?:\s*[-–]\s*(\d+))?$/.exec(range.trim());
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : start;
  return [Math.min(start, end), Math.max(start, end)];
}
