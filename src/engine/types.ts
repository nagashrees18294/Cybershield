export type TokenType =
  | 'TIMESTAMP'
  | 'IP_ADDRESS'
  | 'USERNAME'
  | 'EVENT'
  | 'MESSAGE'
  | 'PIPE'
  | 'UNKNOWN';

export interface Token {
  type: TokenType;
  value: string;
  lineNumber: number;
  column: number;
  fieldIndex: number;
}

export type ErrorCategory = 'INPUT' | 'LEXICAL' | 'SYNTAX' | 'SEMANTIC';

export interface CompilerError {
  lineNumber: number;
  category: ErrorCategory;
  rawLine: string;
  description: string;
  tokenValue?: string;
}

export interface RawLogEntry {
  lineNumber: number;
  rawLine: string;
}

export interface LexerLineResult {
  lineNumber: number;
  rawLine: string;
  tokens: Token[];
  errors: CompilerError[];
}

export interface ParseTreeNode {
  symbol: string;
  value?: string;
  children?: ParseTreeNode[];
}

export interface ParsedRecord {
  lineNumber: number;
  rawLine: string;
  timestamp: string;
  ipAddress: string;
  username: string;
  event: string;
  message: string;
  tokens: Token[];
  parseTree: ParseTreeNode;
}

export interface SemanticCheckDetail {
  field: string;
  valid: boolean;
  rule: string;
  detail: string;
}

export interface SemanticallyValidatedRecord extends ParsedRecord {
  checks: SemanticCheckDetail[];
}

export type SupportedEvent =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'ACCESS_DENIED'
  | 'PRIVILEGE_ESCALATION'
  | 'SQL_QUERY';

export interface IntermediateRecord {
  record_type: 'SECURITY_LOG';
  lineNumber: number;
  timestamp: string;
  source_ip: string;
  username: string;
  event: SupportedEvent;
  message: string;
  rawLine: string;
}

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type AttackType =
  | 'POTENTIAL_BRUTE_FORCE'
  | 'SQL_INJECTION_ATTEMPT'
  | 'PRIVILEGE_ESCALATION';

export interface SecurityAlert {
  id: string;
  attack_type: AttackType;
  severity: SeverityLevel;
  source_ip: string;
  username: string;
  timestamp: string;
  time_window?: string;
  failed_attempts?: number;
  matched_patterns: string[];
  evidence: string;
  reason: string;
  severity_explanation: string;
  lineNumbers: number[];
}

export interface DetectionConfig {
  bruteForceThreshold: number;
  bruteForceWindowMinutes: number;
  bruteForceHighThreshold: number;
}

export interface LineTrace {
  lineNumber: number;
  rawLine: string;
  status: 'VALID' | 'LEXICAL_ERROR' | 'SYNTAX_ERROR' | 'SEMANTIC_ERROR';
  tokens: Token[];
  parseTree?: ParseTreeNode;
  semanticChecks?: SemanticCheckDetail[];
  intermediateRecord?: IntermediateRecord;
  errors: CompilerError[];
}

export interface PipelineResult {
  fileName: string;
  processedAt: string;
  totalLines: number;
  validCount: number;
  invalidCount: number;
  inputErrors: CompilerError[];
  lexicalErrors: CompilerError[];
  syntaxErrors: CompilerError[];
  semanticErrors: CompilerError[];
  allErrors: CompilerError[];
  parsedRecords: ParsedRecord[];
  validatedRecords: SemanticallyValidatedRecord[];
  intermediateRecords: IntermediateRecord[];
  alerts: SecurityAlert[];
  lineTraces: LineTrace[];
}
