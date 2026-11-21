import {
  CompilerError,
  LexerLineResult,
  ParsedRecord,
  ParseTreeNode,
  Token,
  TokenType,
} from './types';

export interface ParserLineResult {
  parsedRecord?: ParsedRecord;
  error?: CompilerError;
}

const EXPECTED_SEQUENCE: Array<{ type: TokenType; label: string }> = [
  { type: 'TIMESTAMP', label: 'TIMESTAMP' },
  { type: 'IP_ADDRESS', label: 'IP_ADDRESS' },
  { type: 'USERNAME', label: 'USERNAME' },
  { type: 'EVENT', label: 'EVENT' },
];

/**
 * Phase 3: Syntax Analysis
 * Verifies the grammar:
 *   LOG -> TIMESTAMP | IP_ADDRESS | USERNAME | EVENT | OPTIONAL_MESSAGE
 *   OPTIONAL_MESSAGE -> MESSAGE | ε
 */
export function parseLineTokens(lexResult: LexerLineResult): ParserLineResult {
  const { lineNumber, rawLine, tokens } = lexResult;

  // Group tokens by pipe-delimited field slots
  const fieldSlots: Token[][] = [[]];
  let pipeCount = 0;

  for (const token of tokens) {
    if (token.type === 'PIPE') {
      pipeCount += 1;
      fieldSlots.push([]);
    } else {
      fieldSlots[fieldSlots.length - 1].push(token);
    }
  }

  // Must have at least 3 pipes for the 4 mandatory fields
  if (pipeCount < 3) {
    const missingField = EXPECTED_SEQUENCE[pipeCount + 1]?.label ?? 'mandatory fields';
    return {
      error: {
        lineNumber,
        category: 'SYNTAX',
        rawLine,
        description: `Line ${lineNumber}: Incomplete log structure. Expected 4 mandatory pipe-delimited fields, missing ${missingField}.`,
      },
    };
  }

  // More than 4 pipes means unexpected extra fields after OPTIONAL_MESSAGE
  if (pipeCount > 4) {
    return {
      error: {
        lineNumber,
        category: 'SYNTAX',
        rawLine,
        description: `Line ${lineNumber}: Unexpected extra delimiter/field after OPTIONAL_MESSAGE (${pipeCount + 1} fields found, max 5 allowed).`,
      },
    };
  }

  // Verify each of the 4 mandatory field slots has exactly 1 token of expected type
  for (let i = 0; i < EXPECTED_SEQUENCE.length; i++) {
    const expected = EXPECTED_SEQUENCE[i];
    const slotTokens = fieldSlots[i];

    if (!slotTokens || slotTokens.length === 0) {
      return {
        error: {
          lineNumber,
          category: 'SYNTAX',
          rawLine,
          description: `Line ${lineNumber}: Missing mandatory ${expected.label} token in field ${i + 1}.`,
        },
      };
    }

    const foundToken = slotTokens[0];
    if (foundToken.type !== expected.type) {
      return {
        error: {
          lineNumber,
          category: 'SYNTAX',
          rawLine,
          tokenValue: foundToken.value,
          description: `Line ${lineNumber}: Syntax error at field ${i + 1}. Expected ${expected.label}, found ${foundToken.type} ("${foundToken.value}").`,
        },
      };
    }
  }

  // Validate OPTIONAL_MESSAGE -> MESSAGE | ε
  let messageValue = '';
  const optionalChildren: ParseTreeNode[] = [];

  if (pipeCount === 4) {
    const msgSlot = fieldSlots[4];
    if (!msgSlot || msgSlot.length === 0) {
      return {
        error: {
          lineNumber,
          category: 'SYNTAX',
          rawLine,
          description: `Line ${lineNumber}: Trailing pipe "|" found with empty MESSAGE token.`,
        },
      };
    }
    messageValue = msgSlot[0].value;
    optionalChildren.push({ symbol: 'MESSAGE', value: messageValue });
  } else {
    optionalChildren.push({ symbol: 'ε', value: '(empty)' });
  }

  const ts = fieldSlots[0][0].value;
  const ip = fieldSlots[1][0].value;
  const user = fieldSlots[2][0].value;
  const evt = fieldSlots[3][0].value;

  const parseTree: ParseTreeNode = {
    symbol: 'LOG',
    children: [
      { symbol: 'TIMESTAMP', value: ts },
      { symbol: 'PIPE', value: '|' },
      { symbol: 'IP_ADDRESS', value: ip },
      { symbol: 'PIPE', value: '|' },
      { symbol: 'USERNAME', value: user },
      { symbol: 'PIPE', value: '|' },
      { symbol: 'EVENT', value: evt },
      { symbol: 'OPTIONAL_MESSAGE', children: optionalChildren },
    ],
  };

  return {
    parsedRecord: {
      lineNumber,
      rawLine,
      timestamp: ts,
      ipAddress: ip,
      username: user,
      event: evt,
      message: messageValue,
      tokens,
      parseTree,
    },
  };
}
