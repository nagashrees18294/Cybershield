import { IntermediateRecord } from '../types';

export type SQLPatternCategory =
  | 'TAUTOLOGY'
  | 'UNION_SELECT'
  | 'DROP_TABLE'
  | 'SLEEP_FUNCTION'
  | 'STACKED_QUERY'
  | 'SQL_COMMENT'
  | 'GENERAL_SELECT';

export interface SQLInjectionFinding {
  record: IntermediateRecord;
  categories: SQLPatternCategory[];
  matched_patterns: string[];
  evidence: string;
  isConfirmedAttack: boolean;
}

interface SQLRule {
  category: SQLPatternCategory;
  label: string;
  regex: RegExp;
}

const SQL_RULES: SQLRule[] = [
  {
    category: 'TAUTOLOGY',
    label: 'SQL Tautology (OR/AND comparison)',
    regex: /(?:'|"|\b)(?:OR|AND)\s+(?:['"]?\w+['"]?\s*=\s*['"]?\w+['"]?|1\s*=\s*1|TRUE)\b/i,
  },
  {
    category: 'UNION_SELECT',
    label: 'UNION SELECT Injection',
    regex: /\bUNION\s+(?:ALL\s+)?SELECT\b/i,
  },
  {
    category: 'DROP_TABLE',
    label: 'Destructive DROP Statement',
    regex: /\bDROP\s+(?:TABLE|DATABASE|SCHEMA)\b/i,
  },
  {
    category: 'SLEEP_FUNCTION',
    label: 'Time-Based Blind SQLi (SLEEP/BENCHMARK/WAITFOR)',
    regex: /\b(?:SLEEP|BENCHMARK)\s*\(|\bWAITFOR\s+DELAY\b/i,
  },
  {
    category: 'STACKED_QUERY',
    label: 'Stacked Query Separator',
    regex: /;\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC)\b/i,
  },
  {
    category: 'SQL_COMMENT',
    label: 'SQL Comment Indicator (--, #, /* */)',
    regex: /(?:--\s*$|--\s+|\/\*[\s\S]*?\*\/|\/\*|\s#\s*$)/,
  },
  {
    category: 'GENERAL_SELECT',
    label: 'General SELECT Query Pattern',
    regex: /\bSELECT\b[\s\S]*?\bFROM\b/i,
  },
];

/**
 * Phase 6B: SQL Injection Detection
 * Distinguishes confirmed exploit payloads (tautology, UNION SELECT, DROP TABLE, SLEEP)
 * from suspicious comment indicators or benign general SELECT statements.
 */
export class SQLInjectionDetector {
  public detect(records: IntermediateRecord[]): SQLInjectionFinding[] {
    const findings: SQLInjectionFinding[] = [];

    for (const rec of records) {
      const msg = rec.message;
      if (!msg && rec.event !== 'SQL_QUERY') {
        continue;
      }

      const matchedCategories: SQLPatternCategory[] = [];
      const matchedPatterns: string[] = [];

      for (const rule of SQL_RULES) {
        const m = rule.regex.exec(msg);
        if (m) {
          matchedCategories.push(rule.category);
          matchedPatterns.push(`${rule.label}: "${m[0].trim()}"`);
        }
      }

      if (matchedCategories.length === 0) {
        continue;
      }

      const hasHighRisk = matchedCategories.some((c) =>
        ['TAUTOLOGY', 'UNION_SELECT', 'DROP_TABLE', 'SLEEP_FUNCTION', 'STACKED_QUERY'].includes(c)
      );

      findings.push({
        record: rec,
        categories: matchedCategories,
        matched_patterns: matchedPatterns,
        evidence: msg,
        isConfirmedAttack: hasHighRisk,
      });
    }

    return findings;
  }
}
