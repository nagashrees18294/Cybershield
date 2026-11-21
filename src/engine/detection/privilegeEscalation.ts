import { IntermediateRecord } from '../types';

export type PrivEscCategory =
  | 'PERMISSION_CHANGE'
  | 'ACCOUNT_CREATION'
  | 'GROUP_MODIFICATION'
  | 'SUDO_ACTIVITY'
  | 'SU_ACTIVITY'
  | 'EXPLICIT_EVENT';

export interface PrivilegeEscalationFinding {
  record: IntermediateRecord;
  categories: PrivEscCategory[];
  matched_patterns: string[];
  evidence: string;
}

interface PrivRule {
  category: PrivEscCategory;
  label: string;
  regex: RegExp;
}

const PRIV_RULES: PrivRule[] = [
  {
    category: 'PERMISSION_CHANGE',
    label: 'Permission / Sudoers Modification',
    regex: /\b(?:chmod|chown|visudo|icacls|setfacl)\b|\/etc\/sudoers|\bpermission(?:s)?\s+(?:change|changed|modified|granted|escalated)\b|\bGRANT\s+ALL\b/i,
  },
  {
    category: 'ACCOUNT_CREATION',
    label: 'Privileged Account Creation',
    regex: /\b(?:useradd|adduser|net\s+user\s+\S+\s+\/add|CREATE\s+USER)\b|\baccount\s+created\b/i,
  },
  {
    category: 'GROUP_MODIFICATION',
    label: 'Privileged Group Modification',
    regex: /\b(?:usermod\s+.*-(?:a|G)|gpasswd)\b|\b(?:wheel|sudoers|sudo|root|administrators)\s+group\b|\badded\s+to\s+(?:sudo|wheel|admin|root)\b/i,
  },
  {
    category: 'SUDO_ACTIVITY',
    label: 'SUDO Elevation Command',
    regex: /\bsudo\b/i,
  },
  {
    category: 'SU_ACTIVITY',
    label: 'SU Switch User Command',
    regex: /\bsu\s+(?:-|root|\w+)\b|\bsu\s+session\b/i,
  },
];

/**
 * Phase 6C: Privilege Escalation Detection
 * Identifies sudo/su activity, permission changes, account creation, group edits,
 * and explicit PRIVILEGE_ESCALATION events.
 */
export class PrivilegeEscalationDetector {
  public detect(records: IntermediateRecord[]): PrivilegeEscalationFinding[] {
    const findings: PrivilegeEscalationFinding[] = [];

    for (const rec of records) {
      const msg = rec.message;
      const categories: PrivEscCategory[] = [];
      const matchedPatterns: string[] = [];

      for (const rule of PRIV_RULES) {
        const m = rule.regex.exec(msg);
        if (m) {
          categories.push(rule.category);
          matchedPatterns.push(`${rule.label}: "${m[0].trim()}"`);
        }
      }

      if (rec.event === 'PRIVILEGE_ESCALATION') {
        if (!categories.includes('EXPLICIT_EVENT')) {
          categories.push('EXPLICIT_EVENT');
        }
        if (matchedPatterns.length === 0) {
          matchedPatterns.push('Explicit Event: PRIVILEGE_ESCALATION');
        }
      }

      if (categories.length === 0) {
        continue;
      }

      findings.push({
        record: rec,
        categories,
        matched_patterns: matchedPatterns,
        evidence: msg || `Explicit PRIVILEGE_ESCALATION event by ${rec.username}`,
      });
    }

    return findings;
  }
}
