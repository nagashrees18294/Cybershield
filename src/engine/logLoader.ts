import { CompilerError, RawLogEntry } from './types';

export interface InputLoadResult {
  entries: RawLogEntry[];
  errors: CompilerError[];
  totalNonEmptyLines: number;
}

const ALLOWED_EXTENSIONS = ['.txt', '.log'];

export function validateLogFileName(fileName: string): string | null {
  const lower = fileName.toLowerCase().trim();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!hasValidExt) {
    return `Unsupported file format for "${fileName}". Only .txt and .log files are accepted.`;
  }
  return null;
}

/**
 * Phase 1: Input Handling
 * Reads raw log text line-by-line, preserves original lines and 1-based line numbers,
 * and flags empty files or invalid file metadata.
 */
export function loadLogInput(rawContent: string, fileName = 'manual_input.log'): InputLoadResult {
  const errors: CompilerError[] = [];

  if (fileName && fileName !== 'manual_input.log') {
    const fileError = validateLogFileName(fileName);
    if (fileError) {
      errors.push({
        lineNumber: 0,
        category: 'INPUT',
        rawLine: fileName,
        description: fileError,
      });
      return { entries: [], errors, totalNonEmptyLines: 0 };
    }
  }

  if (!rawContent || rawContent.trim().length === 0) {
    errors.push({
      lineNumber: 0,
      category: 'INPUT',
      rawLine: '',
      description: 'Input log source is empty. Provide at least one log entry.',
    });
    return { entries: [], errors, totalNonEmptyLines: 0 };
  }

  const lines = rawContent.split(/\r?\n/);
  const entries: RawLogEntry[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return;
    }
    entries.push({
      lineNumber: idx + 1,
      rawLine: line,
    });
  });

  if (entries.length === 0) {
    errors.push({
      lineNumber: 0,
      category: 'INPUT',
      rawLine: '',
      description: 'No readable log records found after stripping blank lines.',
    });
  }

  return {
    entries,
    errors,
    totalNonEmptyLines: entries.length,
  };
}
