import {
  CompilerError,
  ParsedRecord,
  SemanticCheckDetail,
  SemanticallyValidatedRecord,
  SupportedEvent,
} from './types';

export const SUPPORTED_EVENTS: ReadonlySet<SupportedEvent> = new Set([
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'ACCESS_DENIED',
  'PRIVILEGE_ESCALATION',
  'SQL_QUERY',
]);

export interface SemanticLineResult {
  validatedRecord?: SemanticallyValidatedRecord;
  errors: CompilerError[];
  checks: SemanticCheckDetail[];
}

function validateCalendarTimestamp(ts: string): { valid: boolean; detail: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(ts);
  if (!match) {
    return { valid: false, detail: `Timestamp "${ts}" does not match YYYY-MM-DD HH:MM:SS.` };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  if (month < 1 || month > 12) {
    return { valid: false, detail: `Invalid month ${month} in timestamp "${ts}".` };
  }
  if (hour > 23 || minute > 59 || second > 59) {
    return { valid: false, detail: `Invalid time component in "${ts}" (HH:00-23, MM/SS:00-59).` };
  }

  // Construct UTC Date to verify exact calendar day (catches Feb 30, Apr 31, non-leap Feb 29)
  const dt = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return { valid: false, detail: `Non-existent calendar date "${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}".` };
  }

  return { valid: true, detail: `Valid ISO-style calendar timestamp (${ts}).` };
}

function validateIPv4(ip: string): { valid: boolean; detail: string } {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return { valid: false, detail: `IPv4 address "${ip}" must contain 4 octets.` };
  }

  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      return { valid: false, detail: `Invalid octet "${part}" in IP "${ip}".` };
    }
    const num = Number(part);
    if (num < 0 || num > 255) {
      return { valid: false, detail: `IPv4 octet ${num} out of range (0–255) in "${ip}".` };
    }
  }

  return { valid: true, detail: `Valid IPv4 address (${ip}).` };
}

function validateUsername(username: string): { valid: boolean; detail: string } {
  if (username.length < 1 || username.length > 32) {
    return { valid: false, detail: `Username "${username}" length (${username.length}) must be between 1 and 32 characters.` };
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(username)) {
    return { valid: false, detail: `Username "${username}" contains unsupported characters.` };
  }
  return { valid: true, detail: `Valid principal identifier (${username}).` };
}

function validateEvent(event: string): { valid: boolean; detail: string } {
  if (!SUPPORTED_EVENTS.has(event as SupportedEvent)) {
    return {
      valid: false,
      detail: `Unsupported event type "${event}". Supported: ${Array.from(SUPPORTED_EVENTS).join(', ')}.`,
    };
  }
  return { valid: true, detail: `Supported security event (${event}).` };
}

/**
 * Phase 4: Semantic Analysis
 * Validates logical correctness of parsed log records:
 * calendar timestamp validity, IPv4 octet range, username constraints, and supported event types.
 */
export function analyzeSemantics(record: ParsedRecord): SemanticLineResult {
  const errors: CompilerError[] = [];
  const checks: SemanticCheckDetail[] = [];

  const tsCheck = validateCalendarTimestamp(record.timestamp);
  checks.push({
    field: 'timestamp',
    valid: tsCheck.valid,
    rule: 'Calendar Date & 24h Clock Range',
    detail: tsCheck.detail,
  });
  if (!tsCheck.valid) {
    errors.push({
      lineNumber: record.lineNumber,
      category: 'SEMANTIC',
      rawLine: record.rawLine,
      tokenValue: record.timestamp,
      description: `Line ${record.lineNumber}: Semantic error — ${tsCheck.detail}`,
    });
  }

  const ipCheck = validateIPv4(record.ipAddress);
  checks.push({
    field: 'ipAddress',
    valid: ipCheck.valid,
    rule: 'IPv4 Octet Range (0–255)',
    detail: ipCheck.detail,
  });
  if (!ipCheck.valid) {
    errors.push({
      lineNumber: record.lineNumber,
      category: 'SEMANTIC',
      rawLine: record.rawLine,
      tokenValue: record.ipAddress,
      description: `Line ${record.lineNumber}: Semantic error — ${ipCheck.detail}`,
    });
  }

  const userCheck = validateUsername(record.username);
  checks.push({
    field: 'username',
    valid: userCheck.valid,
    rule: 'Identifier Length (1–32) & Charset',
    detail: userCheck.detail,
  });
  if (!userCheck.valid) {
    errors.push({
      lineNumber: record.lineNumber,
      category: 'SEMANTIC',
      rawLine: record.rawLine,
      tokenValue: record.username,
      description: `Line ${record.lineNumber}: Semantic error — ${userCheck.detail}`,
    });
  }

  const eventCheck = validateEvent(record.event);
  checks.push({
    field: 'event',
    valid: eventCheck.valid,
    rule: 'Supported Event Symbol Table',
    detail: eventCheck.detail,
  });
  if (!eventCheck.valid) {
    errors.push({
      lineNumber: record.lineNumber,
      category: 'SEMANTIC',
      rawLine: record.rawLine,
      tokenValue: record.event,
      description: `Line ${record.lineNumber}: Semantic error — ${eventCheck.detail}`,
    });
  }

  if (errors.length > 0) {
    return { errors, checks };
  }

  return {
    validatedRecord: {
      ...record,
      checks,
    },
    errors: [],
    checks,
  };
}
