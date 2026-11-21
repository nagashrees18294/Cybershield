import { AttackType, DetectionConfig, SeverityLevel } from '../types';

export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  bruteForceThreshold: 3,
  bruteForceWindowMinutes: 5,
  bruteForceHighThreshold: 5,
};

export interface SeverityDecision {
  severity: SeverityLevel;
  explanation: string;
}

export interface SeverityContext {
  attackType: AttackType;
  failedAttempts?: number;
  sqlCategories?: Array<'TAUTOLOGY' | 'UNION_SELECT' | 'DROP_TABLE' | 'SLEEP_FUNCTION' | 'STACKED_QUERY' | 'SQL_COMMENT' | 'GENERAL_SELECT'>;
  privCategories?: Array<'PERMISSION_CHANGE' | 'ACCOUNT_CREATION' | 'GROUP_MODIFICATION' | 'SUDO_ACTIVITY' | 'SU_ACTIVITY' | 'EXPLICIT_EVENT'>;
}

/**
 * Phase 7: Centralized Severity Classification
 * Assigns LOW / MEDIUM / HIGH severity with an explicit rationale based on configurable thresholds.
 */
export class SeverityClassifier {
  private config: DetectionConfig;

  constructor(config: DetectionConfig = DEFAULT_DETECTION_CONFIG) {
    this.config = config;
  }

  public classify(ctx: SeverityContext): SeverityDecision {
    switch (ctx.attackType) {
      case 'POTENTIAL_BRUTE_FORCE': {
        const attempts = ctx.failedAttempts ?? 0;
        if (attempts >= this.config.bruteForceHighThreshold) {
          return {
            severity: 'HIGH',
            explanation: `${attempts} failed login attempts reached the high-severity threshold (>= ${this.config.bruteForceHighThreshold} attempts within ${this.config.bruteForceWindowMinutes} minutes).`,
          };
        }
        if (attempts >= this.config.bruteForceThreshold) {
          return {
            severity: 'MEDIUM',
            explanation: `${attempts} failed login attempts fall in the medium-severity bracket (${this.config.bruteForceThreshold}–${this.config.bruteForceHighThreshold - 1} attempts within ${this.config.bruteForceWindowMinutes} minutes).`,
          };
        }
        return {
          severity: 'LOW',
          explanation: `${attempts} failed login attempts are below standard escalation threshold.`,
        };
      }

      case 'SQL_INJECTION_ATTEMPT': {
        const cats = new Set(ctx.sqlCategories ?? []);
        const highRiskIndicators: string[] = [];
        if (cats.has('TAUTOLOGY')) highRiskIndicators.push('SQL tautology');
        if (cats.has('UNION_SELECT')) highRiskIndicators.push('UNION SELECT');
        if (cats.has('DROP_TABLE')) highRiskIndicators.push('DROP TABLE');
        if (cats.has('SLEEP_FUNCTION')) highRiskIndicators.push('time-based SLEEP/BENCHMARK');
        if (cats.has('STACKED_QUERY')) highRiskIndicators.push('stacked query');

        if (highRiskIndicators.length > 0) {
          return {
            severity: 'HIGH',
            explanation: `Confirmed high-risk SQL injection signature(s) detected: ${highRiskIndicators.join(', ')}.`,
          };
        }
        if (cats.has('SQL_COMMENT')) {
          return {
            severity: 'MEDIUM',
            explanation: 'Suspicious SQL comment indicator detected without a confirmed tautology, UNION, DROP, or SLEEP payload.',
          };
        }
        return {
          severity: 'LOW',
          explanation: 'Informational general SELECT structure observed without injection exploit signatures.',
        };
      }

      case 'PRIVILEGE_ESCALATION': {
        const cats = new Set(ctx.privCategories ?? []);
        const highRiskPriv: string[] = [];
        if (cats.has('PERMISSION_CHANGE')) highRiskPriv.push('permission modification');
        if (cats.has('ACCOUNT_CREATION')) highRiskPriv.push('account creation');
        if (cats.has('GROUP_MODIFICATION')) highRiskPriv.push('privileged group modification');

        if (highRiskPriv.length > 0) {
          return {
            severity: 'HIGH',
            explanation: `Elevated privilege mutation detected: ${highRiskPriv.join(', ')}.`,
          };
        }
        if (cats.has('SUDO_ACTIVITY') || cats.has('SU_ACTIVITY')) {
          return {
            severity: 'MEDIUM',
            explanation: 'SUDO or SU elevation activity detected without direct account or permission mutations.',
          };
        }
        return {
          severity: 'MEDIUM',
          explanation: 'Explicit PRIVILEGE_ESCALATION event logged; review host command context.',
        };
      }
    }
  }
}
