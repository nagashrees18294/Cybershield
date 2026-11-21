export interface SampleDataset {
  id: string;
  label: string;
  fileName: string;
  description: string;
  content: string;
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'baseline',
    label: 'Academic Baseline (6 logs)',
    fileName: 'sample_logs.txt',
    description:
      'Exact Section 7 benchmark dataset: 6 valid logs producing 3 alerts (Brute-Force MEDIUM, SQL Injection HIGH, Privilege Escalation MEDIUM).',
    content: `2026-11-21 10:30:10 | 192.168.1.10 | admin | LOGIN_SUCCESS
2026-11-21 10:30:20 | 192.168.1.20 | admin | LOGIN_FAILED | Invalid password
2026-11-21 10:31:00 | 192.168.1.20 | admin | LOGIN_FAILED | Invalid password
2026-11-21 10:32:00 | 192.168.1.20 | admin | LOGIN_FAILED | Invalid password
2026-11-21 10:35:00 | 192.168.1.60 | guest | SQL_QUERY | SELECT * FROM users WHERE id=' OR 1=1 --
2026-11-21 10:40:00 | 192.168.1.70 | user1 | PRIVILEGE_ESCALATION | sudo access requested`,
  },
  {
    id: 'extended_soc',
    label: 'Extended SOC + Error Suite (16 logs)',
    fileName: 'extended_soc_audit.log',
    description:
      'Mixed normal activity, 5-attempt high brute force, UNION SELECT, SQL comment, permission mutation, plus Lexical, Syntax, and Semantic errors.',
    content: `2026-11-21 09:00:05 | 10.0.4.12 | svc_monitor | LOGIN_SUCCESS
2026-11-21 09:05:10 | 10.0.4.18 | analyst | SQL_QUERY | SELECT id, hostname FROM assets WHERE active = 1
2026-11-21 09:10:00 | 185.220.101.4 | root | LOGIN_FAILED | Bad SSH key
2026-11-21 09:10:35 | 185.220.101.4 | root | LOGIN_FAILED | Bad SSH key
2026-11-21 09:11:12 | 185.220.101.4 | root | LOGIN_FAILED | Bad SSH key
2026-11-21 09:11:50 | 185.220.101.4 | admin | LOGIN_FAILED | Invalid password
2026-11-21 09:12:25 | 185.220.101.4 | admin | LOGIN_FAILED | Invalid password
2026-11-21 09:15:40 | 172.16.0.55 | dev_user | SQL_QUERY | SELECT username, password FROM users UNION SELECT null, version()
2026-11-21 09:18:10 | 172.16.0.62 | reporting | SQL_QUERY | SELECT count(*) FROM audit_log -- nightly check
2026-11-21 09:20:00 | 192.168.1.70 | user1 | PRIVILEGE_ESCALATION | sudo access requested
2026-11-21 09:22:30 | 10.0.8.90 | ops_temp | PRIVILEGE_ESCALATION | usermod -aG sudo ops_temp && chmod 777 /etc/sudoers
2026-11-21 09:24:00 | 10.0.4.21 | guest | ACCESS_DENIED | Restricted /admin endpoint
2026-11-21 09:25:15 | 192.168.abc.10 | guest | LOGIN_FAILED | Malformed IP lexeme
2026-11-21 09:26:00 | 192.168.1.50 | alice
admin | 192.168.1.10 | 2026-11-21 09:27:00 | LOGIN_SUCCESS
2026-02-30 09:28:00 | 999.168.1.10 | bob | FILE_DELETE | Semantic failures`,
  },
];
