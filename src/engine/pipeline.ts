import { PatternDetector } from './detection/patternDetector';
import { DEFAULT_DETECTION_CONFIG } from './detection/severity';
import { generateIntermediateRecord } from './intermediateCode';
import { tokenizeLine } from './lexer';
import { loadLogInput } from './logLoader';
import { parseLineTokens } from './parser';
import { analyzeSemantics } from './semanticAnalyzer';
import {
  CompilerError,
  DetectionConfig,
  IntermediateRecord,
  LineTrace,
  ParsedRecord,
  PipelineResult,
  SemanticallyValidatedRecord,
} from './types';

/**
 * Executes the complete 8-phase CyberShield Compiler & Detection Pipeline.
 */
export function runCompilerPipeline(
  rawContent: string,
  fileName = 'sample_logs.txt',
  config: DetectionConfig = DEFAULT_DETECTION_CONFIG
): PipelineResult {
  // Phase 1: Input Handling
  const inputResult = loadLogInput(rawContent, fileName);
  const inputErrors: CompilerError[] = [...inputResult.errors];
  const lexicalErrors: CompilerError[] = [];
  const syntaxErrors: CompilerError[] = [];
  const semanticErrors: CompilerError[] = [];

  const parsedRecords: ParsedRecord[] = [];
  const validatedRecords: SemanticallyValidatedRecord[] = [];
  const intermediateRecords: IntermediateRecord[] = [];
  const lineTraces: LineTrace[] = [];

  for (const entry of inputResult.entries) {
    // Phase 2: Lexical Analysis
    const lexResult = tokenizeLine(entry);
    if (lexResult.errors.length > 0) {
      lexicalErrors.push(...lexResult.errors);
      lineTraces.push({
        lineNumber: entry.lineNumber,
        rawLine: entry.rawLine,
        status: 'LEXICAL_ERROR',
        tokens: lexResult.tokens,
        errors: lexResult.errors,
      });
      continue;
    }

    // Phase 3: Syntax Analysis
    const parseResult = parseLineTokens(lexResult);
    if (parseResult.error || !parseResult.parsedRecord) {
      const err = parseResult.error!;
      syntaxErrors.push(err);
      lineTraces.push({
        lineNumber: entry.lineNumber,
        rawLine: entry.rawLine,
        status: 'SYNTAX_ERROR',
        tokens: lexResult.tokens,
        errors: [err],
      });
      continue;
    }

    parsedRecords.push(parseResult.parsedRecord);

    // Phase 4: Semantic Analysis
    const semanticResult = analyzeSemantics(parseResult.parsedRecord);
    if (semanticResult.errors.length > 0 || !semanticResult.validatedRecord) {
      semanticErrors.push(...semanticResult.errors);
      lineTraces.push({
        lineNumber: entry.lineNumber,
        rawLine: entry.rawLine,
        status: 'SEMANTIC_ERROR',
        tokens: lexResult.tokens,
        parseTree: parseResult.parsedRecord.parseTree,
        semanticChecks: semanticResult.checks,
        errors: semanticResult.errors,
      });
      continue;
    }

    validatedRecords.push(semanticResult.validatedRecord);

    // Phase 5: Intermediate Code Generation
    const irRecord = generateIntermediateRecord(semanticResult.validatedRecord);
    intermediateRecords.push(irRecord);

    lineTraces.push({
      lineNumber: entry.lineNumber,
      rawLine: entry.rawLine,
      status: 'VALID',
      tokens: lexResult.tokens,
      parseTree: parseResult.parsedRecord.parseTree,
      semanticChecks: semanticResult.checks,
      intermediateRecord: irRecord,
      errors: [],
    });
  }

  // Phases 6–8: Security Pattern Detection + Centralized Severity Classification
  const detector = new PatternDetector(config);
  const alerts = detector.analyze(intermediateRecords);

  const allErrors = [...inputErrors, ...lexicalErrors, ...syntaxErrors, ...semanticErrors];

  return {
    fileName,
    processedAt: new Date().toISOString(),
    totalLines: inputResult.totalNonEmptyLines,
    validCount: intermediateRecords.length,
    invalidCount: inputResult.totalNonEmptyLines - intermediateRecords.length,
    inputErrors,
    lexicalErrors,
    syntaxErrors,
    semanticErrors,
    allErrors,
    parsedRecords,
    validatedRecords,
    intermediateRecords,
    alerts,
    lineTraces,
  };
}
