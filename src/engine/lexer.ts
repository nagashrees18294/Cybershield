import { CompilerError, LexerLineResult, RawLogEntry, Token, TokenType } from './types';

// Phase 2: Lexical regex definitions
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/;
const IP_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const EVENT_PATTERN = /^[A-Z][A-Z0-9_]{2,}$/;
const USERNAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const MESSAGE_PATTERN = /^[\x20-\x7E]+$/;

const KNOWN_EVENTS = new Set([
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'ACCESS_DENIED',
  'PRIVILEGE_ESCALATION',
  'SQL_QUERY',
]);

/**
 * Classifies a single trimmed field lexeme into a compiler TokenType.
 */
function classifyFieldToken(lexeme: string, fieldIndex: number): TokenType {
  // Position 4 (after 4th pipe) is the OPTIONAL_MESSAGE field
  if (fieldIndex === 4) {
    return MESSAGE_PATTERN.test(lexeme) ? 'MESSAGE' : 'UNKNOWN';
  }

  if (TIMESTAMP_PATTERN.test(lexeme)) {
    return 'TIMESTAMP';
  }

  if (IP_PATTERN.test(lexeme)) {
    return 'IP_ADDRESS';
  }

  if (KNOWN_EVENTS.has(lexeme) || (lexeme.includes('_') && EVENT_PATTERN.test(lexeme))) {
    return 'EVENT';
  }

  // Reject malformed IP-like patterns (e.g. 192.168.abc.1) rather than letting them pass as USERNAME
  if (/^\d+\./.test(lexeme)) {
    return 'UNKNOWN';
  }

  if (USERNAME_PATTERN.test(lexeme)) {
    return 'USERNAME';
  }

  // Allow numeric-prefixed usernames only if they don't contain whitespace or date/punctuation separators
  if (/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(lexeme)) {
    return 'USERNAME';
  }

  return 'UNKNOWN';
}

/**
 * Phase 2: Lexical Analysis
 * Tokenizes a single raw log line into compiler tokens and detects unknown/invalid lexemes.
 */
export function tokenizeLine(entry: RawLogEntry): LexerLineResult {
  const { lineNumber, rawLine } = entry;
  const tokens: Token[] = [];
  const errors: CompilerError[] = [];

  // Split by pipe delimiter while tracking exact column offsets
  let cursor = 0;
  let fieldIndex = 0;

  while (cursor <= rawLine.length) {
    const nextPipe = rawLine.indexOf('|', cursor);
    const segmentEnd = nextPipe === -1 ? rawLine.length : nextPipe;
    const rawSegment = rawLine.slice(cursor, segmentEnd);
    const leadingSpaces = rawSegment.length - rawSegment.trimStart().length;
    const trimmed = rawSegment.trim();
    const tokenCol = cursor + leadingSpaces + 1;

    if (trimmed.length > 0) {
      const tokenType = classifyFieldToken(trimmed, fieldIndex);

      if (tokenType === 'UNKNOWN') {
        errors.push({
          lineNumber,
          category: 'LEXICAL',
          rawLine,
          tokenValue: trimmed,
          description: `Line ${lineNumber}, Col ${tokenCol}: Invalid or unrecognized token "${trimmed}".`,
        });
      }

      tokens.push({
        type: tokenType,
        value: trimmed,
        lineNumber,
        column: tokenCol,
        fieldIndex,
      });
    }

    if (nextPipe === -1) {
      break;
    }

    tokens.push({
      type: 'PIPE',
      value: '|',
      lineNumber,
      column: nextPipe + 1,
      fieldIndex,
    });

    cursor = nextPipe + 1;
    fieldIndex += 1;
  }

  return {
    lineNumber,
    rawLine,
    tokens,
    errors,
  };
}

export function tokenizeEntries(entries: RawLogEntry[]): {
  results: LexerLineResult[];
  lexicalErrors: CompilerError[];
} {
  const results = entries.map(tokenizeLine);
  const lexicalErrors = results.flatMap((r) => r.errors);
  return { results, lexicalErrors };
}
