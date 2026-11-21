import { DetectionConfig, IntermediateRecord } from '../types';
import { DEFAULT_DETECTION_CONFIG } from './severity';

export interface BruteForceFinding {
  source_ip: string;
  usernames: string[];
  failed_attempts: number;
  first_timestamp: string;
  last_timestamp: string;
  time_window: string;
  matched_patterns: string[];
  evidence: string;
  lineNumbers: number[];
}

function parseTimestampMs(ts: string): number {
  const iso = ts.replace(' ', 'T') + 'Z';
  return Date.parse(iso);
}

/**
 * Phase 6A: Brute-Force Detection
 * Groups LOGIN_FAILED records by source IP and detects clusters exceeding the configured
 * attempt threshold within the configured sliding time window.
 */
export class BruteForceDetector {
  private config: DetectionConfig;

  constructor(config: DetectionConfig = DEFAULT_DETECTION_CONFIG) {
    this.config = config;
  }

  public detect(records: IntermediateRecord[]): BruteForceFinding[] {
    const failedByIp = new Map<string, IntermediateRecord[]>();

    for (const rec of records) {
      if (rec.event !== 'LOGIN_FAILED') continue;
      const list = failedByIp.get(rec.source_ip) ?? [];
      list.push(rec);
      failedByIp.set(rec.source_ip, list);
    }

    const windowMs = this.config.bruteForceWindowMinutes * 60 * 1000;
    const findings: BruteForceFinding[] = [];

    for (const [ip, attempts] of failedByIp.entries()) {
      const sorted = [...attempts].sort(
        (a, b) => parseTimestampMs(a.timestamp) - parseTimestampMs(b.timestamp)
      );

      let bestStart = 0;
      let bestEnd = -1;
      let left = 0;

      for (let right = 0; right < sorted.length; right++) {
        const rightMs = parseTimestampMs(sorted[right].timestamp);
        while (rightMs - parseTimestampMs(sorted[left].timestamp) > windowMs) {
          left++;
        }
        const count = right - left + 1;
        if (count >= this.config.bruteForceThreshold && count > bestEnd - bestStart + 1) {
          bestStart = left;
          bestEnd = right;
        }
      }

      if (bestEnd >= bestStart) {
        const cluster = sorted.slice(bestStart, bestEnd + 1);
        const usernames = Array.from(new Set(cluster.map((c) => c.username)));
        findings.push({
          source_ip: ip,
          usernames,
          failed_attempts: cluster.length,
          first_timestamp: cluster[0].timestamp,
          last_timestamp: cluster[cluster.length - 1].timestamp,
          time_window: `${this.config.bruteForceWindowMinutes} minutes`,
          matched_patterns: [
            `LOGIN_FAILED >= ${this.config.bruteForceThreshold} within ${this.config.bruteForceWindowMinutes}m`,
          ],
          evidence: `${cluster.length} failed login attempts detected from ${ip} targeting [${usernames.join(', ')}] between ${cluster[0].timestamp} and ${cluster[cluster.length - 1].timestamp}.`,
          lineNumbers: cluster.map((c) => c.lineNumber),
        });
      }
    }

    return findings;
  }
}
