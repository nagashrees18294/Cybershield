import { DetectionConfig, IntermediateRecord, PipelineResult, SecurityAlert } from './types';

function escapeCsvCell(value: string | number | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function alertsToCsv(alerts: SecurityAlert[]): string {
  const headers = [
    'Alert ID',
    'Attack Type',
    'Severity',
    'Source IP',
    'Username',
    'Timestamp',
    'Time Window',
    'Failed Attempts',
    'Matched Patterns',
    'Evidence',
    'Severity Rationale',
  ];
  const rows = alerts.map((a) =>
    [
      a.id,
      a.attack_type,
      a.severity,
      a.source_ip,
      a.username,
      a.timestamp,
      a.time_window ?? '',
      a.failed_attempts ?? '',
      a.matched_patterns.join(' | '),
      a.evidence,
      a.severity_explanation,
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function intermediateLogsToCsv(records: IntermediateRecord[]): string {
  const headers = [
    'Line Number',
    'Record Type',
    'Timestamp',
    'Source IP',
    'Username',
    'Event',
    'Message',
  ];
  const rows = records.map((r) =>
    [
      r.lineNumber,
      r.record_type,
      r.timestamp,
      r.source_ip,
      r.username,
      r.event,
      r.message,
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function generateSecurityReportText(
  result: PipelineResult,
  config: DetectionConfig
): string {
  const highCount = result.alerts.filter((a) => a.severity === 'HIGH').length;
  const medCount = result.alerts.filter((a) => a.severity === 'MEDIUM').length;
  const lowCount = result.alerts.filter((a) => a.severity === 'LOW').length;

  const lines: string[] = [
    'CYBERSHIELD — SECURITY LOG ANALYSIS REPORT',
    '==========================================',
    `Source File: ${result.fileName}`,
    `Generated At: ${result.processedAt}`,
    '',
    '1. COMPILER PIPELINE SUMMARY',
    '----------------------------',
    `Total Log Entries:        ${result.totalLines}`,
    `Valid Compiled Logs (IR): ${result.validCount}`,
    `Rejected Invalid Logs:    ${result.invalidCount}`,
    `  - Input Errors:         ${result.inputErrors.length}`,
    `  - Lexical Errors:       ${result.lexicalErrors.length}`,
    `  - Syntax Errors:        ${result.syntaxErrors.length}`,
    `  - Semantic Errors:      ${result.semanticErrors.length}`,
    '',
    '2. DETECTION ENGINE CONFIGURATION',
    '---------------------------------',
    `Brute-Force Threshold:    ${config.bruteForceThreshold} failed attempts (MEDIUM)`,
    `Brute-Force High Tier:    ${config.bruteForceHighThreshold}+ failed attempts (HIGH)`,
    `Sliding Time Window:      ${config.bruteForceWindowMinutes} minutes`,
    '',
    '3. SECURITY ALERTS SUMMARY',
    '--------------------------',
    `Total Alerts Generated:   ${result.alerts.length}`,
    `  - HIGH Severity:        ${highCount}`,
    `  - MEDIUM Severity:      ${medCount}`,
    `  - LOW Severity:         ${lowCount}`,
    '',
  ];

  if (result.alerts.length > 0) {
    lines.push('4. DETAILED ALERT FINDINGS', '--------------------------');
    result.alerts.forEach((a, idx) => {
      lines.push(
        `[${idx + 1}] ${a.id} | ${a.attack_type} | Severity: ${a.severity}`,
        `    Source IP:  ${a.source_ip} | User: ${a.username}`,
        `    Timestamp:  ${a.timestamp}`,
        `    Patterns:   ${a.matched_patterns.join('; ')}`,
        `    Evidence:   ${a.evidence}`,
        `    Rationale:  ${a.severity_explanation}`,
        ''
      );
    });
  } else {
    lines.push('4. DETAILED ALERT FINDINGS', '--------------------------', 'No security threats detected.', '');
  }

  if (result.allErrors.length > 0) {
    lines.push('5. COMPILER DIAGNOSTICS', '-----------------------');
    result.allErrors.forEach((e) => {
      lines.push(`Line ${e.lineNumber} [${e.category}]: ${e.description}`);
      if (e.rawLine) {
        lines.push(`    Raw: ${e.rawLine}`);
      }
    });
  }

  return lines.join('\n');
}

export function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
