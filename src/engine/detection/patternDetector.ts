import { DetectionConfig, IntermediateRecord, SecurityAlert } from '../types';
import { BruteForceDetector } from './bruteForce';
import { PrivilegeEscalationDetector } from './privilegeEscalation';
import { DEFAULT_DETECTION_CONFIG, SeverityClassifier } from './severity';
import { SQLInjectionDetector } from './sqlInjection';

/**
 * Phase 8: Unified Detection Engine
 * Integrates BruteForceDetector, SQLInjectionDetector, PrivilegeEscalationDetector,
 * and SeverityClassifier to produce normalized SecurityAlert records.
 */
export class PatternDetector {
  private bruteForceDetector: BruteForceDetector;
  private sqlDetector: SQLInjectionDetector;
  private privEscDetector: PrivilegeEscalationDetector;
  private severityClassifier: SeverityClassifier;

  constructor(config: DetectionConfig = DEFAULT_DETECTION_CONFIG) {
    this.bruteForceDetector = new BruteForceDetector(config);
    this.sqlDetector = new SQLInjectionDetector();
    this.privEscDetector = new PrivilegeEscalationDetector();
    this.severityClassifier = new SeverityClassifier(config);
  }

  public analyze(records: IntermediateRecord[]): SecurityAlert[] {
    const alerts: SecurityAlert[] = [];
    let counter = 1;

    // 1. Brute-force detection
    const bruteFindings = this.bruteForceDetector.detect(records);
    for (const bf of bruteFindings) {
      const sev = this.severityClassifier.classify({
        attackType: 'POTENTIAL_BRUTE_FORCE',
        failedAttempts: bf.failed_attempts,
      });
      alerts.push({
        id: `ALT-${String(counter++).padStart(3, '0')}`,
        attack_type: 'POTENTIAL_BRUTE_FORCE',
        severity: sev.severity,
        source_ip: bf.source_ip,
        username: bf.usernames.join(', '),
        timestamp:
          bf.first_timestamp === bf.last_timestamp
            ? bf.first_timestamp
            : `${bf.first_timestamp} → ${bf.last_timestamp}`,
        time_window: bf.time_window,
        failed_attempts: bf.failed_attempts,
        matched_patterns: bf.matched_patterns,
        evidence: bf.evidence,
        reason: `Repeated LOGIN_FAILED events from ${bf.source_ip} exceeded brute-force threshold within ${bf.time_window}.`,
        severity_explanation: sev.explanation,
        lineNumbers: bf.lineNumbers,
      });
    }

    // 2. SQL Injection detection
    const sqlFindings = this.sqlDetector.detect(records);
    for (const sqli of sqlFindings) {
      const sev = this.severityClassifier.classify({
        attackType: 'SQL_INJECTION_ATTEMPT',
        sqlCategories: sqli.categories,
      });
      alerts.push({
        id: `ALT-${String(counter++).padStart(3, '0')}`,
        attack_type: 'SQL_INJECTION_ATTEMPT',
        severity: sev.severity,
        source_ip: sqli.record.source_ip,
        username: sqli.record.username,
        timestamp: sqli.record.timestamp,
        matched_patterns: sqli.matched_patterns,
        evidence: sqli.evidence,
        reason: sqli.isConfirmedAttack
          ? 'High-confidence SQL injection payload matched exploit signatures.'
          : 'SQL query structure or comment indicator flagged for analyst review.',
        severity_explanation: sev.explanation,
        lineNumbers: [sqli.record.lineNumber],
      });
    }

    // 3. Privilege Escalation detection
    const privFindings = this.privEscDetector.detect(records);
    for (const priv of privFindings) {
      const sev = this.severityClassifier.classify({
        attackType: 'PRIVILEGE_ESCALATION',
        privCategories: priv.categories,
      });
      alerts.push({
        id: `ALT-${String(counter++).padStart(3, '0')}`,
        attack_type: 'PRIVILEGE_ESCALATION',
        severity: sev.severity,
        source_ip: priv.record.source_ip,
        username: priv.record.username,
        timestamp: priv.record.timestamp,
        matched_patterns: priv.matched_patterns,
        evidence: priv.evidence,
        reason: 'Privilege escalation command or security event detected.',
        severity_explanation: sev.explanation,
        lineNumbers: [priv.record.lineNumber],
      });
    }

    // Sort by severity (HIGH -> MEDIUM -> LOW) then timestamp
    const rank: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);
  }
}
