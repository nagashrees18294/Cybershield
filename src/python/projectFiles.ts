export interface PythonProjectFile {
  path: string;
  phase: string;
  description: string;
  content: string;
}

export const PYTHON_PROJECT_FILES: PythonProjectFile[] = [
  {
    path: 'requirements.txt',
    phase: 'Setup',
    description: 'Python 3.13 package dependencies for Streamlit SOC dashboard, Pandas, Plotly, and pytest.',
    content: `streamlit>=1.39.0
pandas>=2.2.3
plotly>=5.24.0
pytest>=8.3.0
`,
  },
  {
    path: 'data/sample_logs.txt',
    phase: 'Data',
    description: 'Baseline academic sample dataset with 6 valid security events.',
    content: `2026-11-21 10:30:10 | 192.168.1.10 | admin | LOGIN_SUCCESS
2026-11-21 10:30:20 | 192.168.1.20 | admin | LOGIN_FAILED | Invalid password
2026-11-21 10:31:00 | 192.168.1.20 | admin | LOGIN_FAILED | Invalid password
2026-11-21 10:32:00 | 192.168.1.20 | admin | LOGIN_FAILED | Invalid password
2026-11-21 10:35:00 | 192.168.1.60 | guest | SQL_QUERY | SELECT * FROM users WHERE id=' OR 1=1 --
2026-11-21 10:40:00 | 192.168.1.70 | user1 | PRIVILEGE_ESCALATION | sudo access requested
`,
  },
  {
    path: 'utils/__init__.py',
    phase: 'Phase 1: Input Handling',
    description: 'Utils package initializer.',
    content: `from .log_loader import LogLoader, RawLogEntry

__all__ = ["LogLoader", "RawLogEntry"]
`,
  },
  {
    path: 'utils/log_loader.py',
    phase: 'Phase 1: Input Handling',
    description: 'Validates TXT/LOG files, reads entries line-by-line, and preserves line numbers.',
    content: `from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple
from compiler.error_handler import CompilerError


@dataclass
class RawLogEntry:
    line_number: int
    raw_line: str


class LogLoader:
    ALLOWED_EXTENSIONS = {".txt", ".log"}

    def load_file(self, file_path: str) -> Tuple[List[RawLogEntry], List[CompilerError]]:
        path = Path(file_path)
        if not path.exists():
            return [], [CompilerError(0, "INPUT", file_path, f"File not found: {file_path}")]
        if path.suffix.lower() not in self.ALLOWED_EXTENSIONS:
            return [], [
                CompilerError(
                    0,
                    "INPUT",
                    file_path,
                    f"Invalid file extension '{path.suffix}'. Only .txt and .log are supported.",
                )
            ]
        content = path.read_text(encoding="utf-8", errors="replace")
        return self.load_text(content)

    def load_text(self, content: str) -> Tuple[List[RawLogEntry], List[CompilerError]]:
        if not content or not content.strip():
            return [], [CompilerError(0, "INPUT", "", "Log input is empty.")]

        entries: List[RawLogEntry] = []
        for idx, line in enumerate(content.splitlines(), start=1):
            if line.strip():
                entries.append(RawLogEntry(line_number=idx, raw_line=line))

        if not entries:
            return [], [CompilerError(0, "INPUT", "", "No non-empty log records found.")]
        return entries, []
`,
  },
  {
    path: 'compiler/__init__.py',
    phase: 'Phases 2-5: Compiler Core',
    description: 'Compiler package exposing Lexer, Parser, SemanticAnalyzer, IntermediateCodeGenerator, and CompilerError.',
    content: `from .error_handler import CompilerError
from .lexer import Lexer, Token
from .parser import Parser, ParsedRecord
from .semantic_analyzer import SemanticAnalyzer, ValidatedRecord
from .intermediate_code import IntermediateCodeGenerator, IntermediateRecord

__all__ = [
    "CompilerError",
    "Lexer",
    "Token",
    "Parser",
    "ParsedRecord",
    "SemanticAnalyzer",
    "ValidatedRecord",
    "IntermediateCodeGenerator",
    "IntermediateRecord",
]
`,
  },
  {
    path: 'compiler/error_handler.py',
    phase: 'Compiler Diagnostics',
    description: 'Structured error representation differentiating INPUT, LEXICAL, SYNTAX, and SEMANTIC errors.',
    content: `from dataclasses import dataclass
from typing import Literal, Optional

ErrorCategory = Literal["INPUT", "LEXICAL", "SYNTAX", "SEMANTIC"]


@dataclass
class CompilerError:
    line_number: int
    category: ErrorCategory
    raw_line: str
    description: str
    token_value: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "line_number": self.line_number,
            "category": self.category,
            "raw_line": self.raw_line,
            "description": self.description,
            "token_value": self.token_value or "",
        }
`,
  },
  {
    path: 'compiler/lexer.py',
    phase: 'Phase 2: Lexical Analysis',
    description: 'Regex-based Lexer recognizing TIMESTAMP, IP_ADDRESS, USERNAME, EVENT, MESSAGE, and PIPE tokens.',
    content: `import re
from dataclasses import dataclass
from typing import List, Tuple
from compiler.error_handler import CompilerError


@dataclass
class Token:
    token_type: str
    value: str
    line_number: int
    column: int
    field_index: int


class Lexer:
    TIMESTAMP_RE = re.compile(r"^\\d{4}-\\d{2}-\\d{2}\\s+\\d{2}:\\d{2}:\\d{2}$")
    IP_RE = re.compile(r"^\\d{1,3}(?:\\.\\d{1,3}){3}$")
    EVENT_RE = re.compile(r"^[A-Z][A-Z0-9_]{2,}$")
    USERNAME_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_.-]*$")
    MESSAGE_RE = re.compile(r"^[\\x20-\\x7E]+$")
    KNOWN_EVENTS = {
        "LOGIN_SUCCESS",
        "LOGIN_FAILED",
        "ACCESS_DENIED",
        "PRIVILEGE_ESCALATION",
        "SQL_QUERY",
    }

    def _classify(self, lexeme: str, field_index: int) -> str:
        if field_index == 4:
            return "MESSAGE" if self.MESSAGE_RE.match(lexeme) else "UNKNOWN"
        if self.TIMESTAMP_RE.match(lexeme):
            return "TIMESTAMP"
        if self.IP_RE.match(lexeme):
            return "IP_ADDRESS"
        if lexeme in self.KNOWN_EVENTS or ("_" in lexeme and self.EVENT_RE.match(lexeme)):
            return "EVENT"
        if re.match(r"^\\d+\\.", lexeme):
            return "UNKNOWN"
        if self.USERNAME_RE.match(lexeme) or re.match(r"^[A-Za-z0-9][A-Za-z0-9_-]*$", lexeme):
            return "USERNAME"
        return "UNKNOWN"

    def tokenize_line(self, line_number: int, raw_line: str) -> Tuple[List[Token], List[CompilerError]]:
        tokens: List[Token] = []
        errors: List[CompilerError] = []
        cursor = 0
        field_index = 0

        while cursor <= len(raw_line):
            next_pipe = raw_line.find("|", cursor)
            end = len(raw_line) if next_pipe == -1 else next_pipe
            segment = raw_line[cursor:end]
            leading = len(segment) - len(segment.lstrip())
            trimmed = segment.strip()
            col = cursor + leading + 1

            if trimmed:
                tok_type = self._classify(trimmed, field_index)
                if tok_type == "UNKNOWN":
                    errors.append(
                        CompilerError(
                            line_number=line_number,
                            category="LEXICAL",
                            raw_line=raw_line,
                            token_value=trimmed,
                            description=f"Line {line_number}, Col {col}: Unrecognized token '{trimmed}'.",
                        )
                    )
                tokens.append(Token(tok_type, trimmed, line_number, col, field_index))

            if next_pipe == -1:
                break

            tokens.append(Token("PIPE", "|", line_number, next_pipe + 1, field_index))
            cursor = next_pipe + 1
            field_index += 1

        return tokens, errors
`,
  },
  {
    path: 'compiler/parser.py',
    phase: 'Phase 3: Syntax Analysis',
    description: 'Grammar parser verifying LOG -> TIMESTAMP | IP_ADDRESS | USERNAME | EVENT | OPTIONAL_MESSAGE.',
    content: `from dataclasses import dataclass
from typing import List, Optional, Tuple
from compiler.error_handler import CompilerError
from compiler.lexer import Token


@dataclass
class ParsedRecord:
    line_number: int
    raw_line: str
    timestamp: str
    ip_address: str
    username: str
    event: str
    message: str


class Parser:
    EXPECTED_ORDER = ["TIMESTAMP", "IP_ADDRESS", "USERNAME", "EVENT"]

    def parse(
        self, line_number: int, raw_line: str, tokens: List[Token]
    ) -> Tuple[Optional[ParsedRecord], Optional[CompilerError]]:
        slots: List[List[Token]] = [[]]
        pipe_count = 0
        for tok in tokens:
            if tok.token_type == "PIPE":
                pipe_count += 1
                slots.append([])
            else:
                slots[-1].append(tok)

        if pipe_count < 3:
            missing = self.EXPECTED_ORDER[min(pipe_count + 1, 3)]
            return None, CompilerError(
                line_number,
                "SYNTAX",
                raw_line,
                f"Line {line_number}: Incomplete log entry; missing mandatory {missing} field.",
            )

        if pipe_count > 4:
            return None, CompilerError(
                line_number,
                "SYNTAX",
                raw_line,
                f"Line {line_number}: Unexpected extra field beyond OPTIONAL_MESSAGE.",
            )

        for idx, expected_type in enumerate(self.EXPECTED_ORDER):
            if not slots[idx]:
                return None, CompilerError(
                    line_number,
                    "SYNTAX",
                    raw_line,
                    f"Line {line_number}: Empty mandatory {expected_type} field at position {idx + 1}.",
                )
            tok = slots[idx][0]
            if tok.token_type != expected_type:
                return None, CompilerError(
                    line_number,
                    "SYNTAX",
                    raw_line,
                    f"Line {line_number}: Expected {expected_type} at position {idx + 1}, found {tok.token_type} ('{tok.value}').",
                    token_value=tok.value,
                )

        message = ""
        if pipe_count == 4:
            if not slots[4]:
                return None, CompilerError(
                    line_number,
                    "SYNTAX",
                    raw_line,
                    f"Line {line_number}: Trailing '|' delimiter with empty MESSAGE.",
                )
            message = slots[4][0].value

        return (
            ParsedRecord(
                line_number=line_number,
                raw_line=raw_line,
                timestamp=slots[0][0].value,
                ip_address=slots[1][0].value,
                username=slots[2][0].value,
                event=slots[3][0].value,
                message=message,
            ),
            None,
        )
`,
  },
  {
    path: 'compiler/semantic_analyzer.py',
    phase: 'Phase 4: Semantic Analysis',
    description: 'Validates calendar timestamps, IPv4 octets (0-255), username length, and supported event enumeration.',
    content: `from dataclasses import dataclass
from datetime import datetime
import ipaddress
import re
from typing import List, Optional, Tuple
from compiler.error_handler import CompilerError
from compiler.parser import ParsedRecord


@dataclass
class ValidatedRecord:
    line_number: int
    raw_line: str
    timestamp: str
    ip_address: str
    username: str
    event: str
    message: str


class SemanticAnalyzer:
    SUPPORTED_EVENTS = {
        "LOGIN_SUCCESS",
        "LOGIN_FAILED",
        "ACCESS_DENIED",
        "PRIVILEGE_ESCALATION",
        "SQL_QUERY",
    }

    def analyze(self, record: ParsedRecord) -> Tuple[Optional[ValidatedRecord], List[CompilerError]]:
        errors: List[CompilerError] = []

        try:
            datetime.strptime(re.sub(r"\\s+", " ", record.timestamp), "%Y-%m-%d %H:%M:%S")
        except ValueError:
            errors.append(
                CompilerError(
                    record.line_number,
                    "SEMANTIC",
                    record.raw_line,
                    f"Line {record.line_number}: Invalid calendar timestamp '{record.timestamp}'.",
                    record.timestamp,
                )
            )

        try:
            ipaddress.IPv4Address(record.ip_address)
        except ValueError:
            errors.append(
                CompilerError(
                    record.line_number,
                    "SEMANTIC",
                    record.raw_line,
                    f"Line {record.line_number}: Invalid IPv4 address '{record.ip_address}'.",
                    record.ip_address,
                )
            )

        if not (1 <= len(record.username) <= 32):
            errors.append(
                CompilerError(
                    record.line_number,
                    "SEMANTIC",
                    record.raw_line,
                    f"Line {record.line_number}: Username '{record.username}' must be 1-32 characters.",
                    record.username,
                )
            )

        if record.event not in self.SUPPORTED_EVENTS:
            errors.append(
                CompilerError(
                    record.line_number,
                    "SEMANTIC",
                    record.raw_line,
                    f"Line {record.line_number}: Unsupported event '{record.event}'.",
                    record.event,
                )
            )

        if errors:
            return None, errors

        return (
            ValidatedRecord(
                line_number=record.line_number,
                raw_line=record.raw_line,
                timestamp=re.sub(r"\\s+", " ", record.timestamp),
                ip_address=record.ip_address,
                username=record.username,
                event=record.event,
                message=record.message,
            ),
            [],
        )
`,
  },
  {
    path: 'compiler/intermediate_code.py',
    phase: 'Phase 5: Intermediate Code Generation',
    description: 'Transforms validated AST records into normalized SECURITY_LOG intermediate representations.',
    content: `from dataclasses import dataclass, asdict
from typing import List
from compiler.semantic_analyzer import ValidatedRecord


@dataclass
class IntermediateRecord:
    record_type: str
    timestamp: str
    source_ip: str
    username: str
    event: str
    message: str

    def to_dict(self) -> dict:
        return asdict(self)


class IntermediateCodeGenerator:
    def generate_one(self, record: ValidatedRecord) -> IntermediateRecord:
        return IntermediateRecord(
            record_type="SECURITY_LOG",
            timestamp=record.timestamp.strip(),
            source_ip=record.ip_address.strip(),
            username=record.username.strip(),
            event=record.event.strip(),
            message=record.message.strip(),
        )

    def generate(self, records: List[ValidatedRecord]) -> List[IntermediateRecord]:
        return [self.generate_one(r) for r in records]
`,
  },
  {
    path: 'detection/__init__.py',
    phase: 'Phases 6-8: Security Detection',
    description: 'Detection package exposing BruteForceDetector, SQLInjectionDetector, PrivilegeEscalationDetector, SeverityClassifier, and PatternDetector.',
    content: `from .brute_force import BruteForceDetector
from .sql_injection import SQLInjectionDetector
from .privilege_escalation import PrivilegeEscalationDetector
from .severity import SeverityClassifier
from .pattern_detector import PatternDetector

__all__ = [
    "BruteForceDetector",
    "SQLInjectionDetector",
    "PrivilegeEscalationDetector",
    "SeverityClassifier",
    "PatternDetector",
]
`,
  },
  {
    path: 'detection/brute_force.py',
    phase: 'Phase 6A: Brute-Force Detection',
    description: 'Groups LOGIN_FAILED events by source IP within a configurable sliding time window.',
    content: `from collections import defaultdict
from datetime import datetime, timedelta
from typing import List
from compiler.intermediate_code import IntermediateRecord


class BruteForceDetector:
    def __init__(self, threshold: int = 3, window_minutes: int = 5):
        self.threshold = threshold
        self.window_minutes = window_minutes

    def detect(self, records: List[IntermediateRecord]) -> List[dict]:
        grouped = defaultdict(list)
        for rec in records:
            if rec.event == "LOGIN_FAILED":
                grouped[rec.source_ip].append(rec)

        findings = []
        delta = timedelta(minutes=self.window_minutes)
        for ip, attempts in grouped.items():
            ordered = sorted(
                attempts,
                key=lambda r: datetime.strptime(r.timestamp, "%Y-%m-%d %H:%M:%S"),
            )
            left = 0
            best_slice = []
            for right in range(len(ordered)):
                t_right = datetime.strptime(ordered[right].timestamp, "%Y-%m-%d %H:%M:%S")
                while t_right - datetime.strptime(ordered[left].timestamp, "%Y-%m-%d %H:%M:%S") > delta:
                    left += 1
                window_slice = ordered[left : right + 1]
                if len(window_slice) >= self.threshold and len(window_slice) > len(best_slice):
                    best_slice = window_slice

            if best_slice:
                users = sorted({r.username for r in best_slice})
                findings.append(
                    {
                        "attack_type": "POTENTIAL_BRUTE_FORCE",
                        "source_ip": ip,
                        "username": ", ".join(users),
                        "timestamp": f"{best_slice[0].timestamp} -> {best_slice[-1].timestamp}",
                        "failed_attempts": len(best_slice),
                        "time_window": f"{self.window_minutes} minutes",
                        "matched_patterns": [f"LOGIN_FAILED >= {self.threshold} in {self.window_minutes}m"],
                        "evidence": f"{len(best_slice)} failed login attempts detected.",
                    }
                )
        return findings
`,
  },
  {
    path: 'detection/sql_injection.py',
    phase: 'Phase 6B: SQL Injection Detection',
    description: 'Regex engine detecting SQL tautologies, UNION SELECT, DROP TABLE, SLEEP, and SQL comments.',
    content: `import re
from typing import List
from compiler.intermediate_code import IntermediateRecord


class SQLInjectionDetector:
    RULES = [
        ("TAUTOLOGY", re.compile(r"(?:'|\"|\\b)(?:OR|AND)\\s+(?:['\"]?\\w+['\"]?\\s*=\\s*['\"]?\\w+['\"]?|1\\s*=\\s*1|TRUE)\\b", re.I)),
        ("UNION_SELECT", re.compile(r"\\bUNION\\s+(?:ALL\\s+)?SELECT\\b", re.I)),
        ("DROP_TABLE", re.compile(r"\\bDROP\\s+(?:TABLE|DATABASE|SCHEMA)\\b", re.I)),
        ("SLEEP_FUNCTION", re.compile(r"\\b(?:SLEEP|BENCHMARK)\\s*\\(|\\bWAITFOR\\s+DELAY\\b", re.I)),
        ("SQL_COMMENT", re.compile(r"(?:--\\s*$|--\\s+|/\\*[\\s\\S]*?\\*/|/\\*|\\s#\\s*$)")),
        ("GENERAL_SELECT", re.compile(r"\\bSELECT\\b[\\s\\S]*?\\bFROM\\b", re.I)),
    ]

    def detect(self, records: List[IntermediateRecord]) -> List[dict]:
        findings = []
        for rec in records:
            if not rec.message and rec.event != "SQL_QUERY":
                continue
            categories = []
            patterns = []
            for label, regex in self.RULES:
                m = regex.search(rec.message)
                if m:
                    categories.append(label)
                    patterns.append(f"{label}: {m.group(0).strip()}")
            if categories:
                findings.append(
                    {
                        "attack_type": "SQL_INJECTION_ATTEMPT",
                        "source_ip": rec.source_ip,
                        "username": rec.username,
                        "timestamp": rec.timestamp,
                        "sql_categories": categories,
                        "matched_patterns": patterns,
                        "evidence": rec.message,
                    }
                )
        return findings
`,
  },
  {
    path: 'detection/privilege_escalation.py',
    phase: 'Phase 6C: Privilege Escalation Detection',
    description: 'Identifies sudo/su elevation, permission changes, account creation, and privileged group mutations.',
    content: `import re
from typing import List
from compiler.intermediate_code import IntermediateRecord


class PrivilegeEscalationDetector:
    RULES = [
        ("PERMISSION_CHANGE", re.compile(r"\\b(?:chmod|chown|visudo)\\b|/etc/sudoers|\\bpermission(?:s)?\\s+(?:change|changed|modified)\\b", re.I)),
        ("ACCOUNT_CREATION", re.compile(r"\\b(?:useradd|adduser|CREATE\\s+USER)\\b|\\baccount\\s+created\\b", re.I)),
        ("GROUP_MODIFICATION", re.compile(r"\\b(?:usermod\\s+.*-(?:a|G)|gpasswd)\\b|\\b(?:wheel|sudoers|sudo|root)\\s+group\\b", re.I)),
        ("SUDO_ACTIVITY", re.compile(r"\\bsudo\\b", re.I)),
        ("SU_ACTIVITY", re.compile(r"\\bsu\\s+(?:-|root|\\w+)\\b", re.I)),
    ]

    def detect(self, records: List[IntermediateRecord]) -> List[dict]:
        findings = []
        for rec in records:
            categories = []
            patterns = []
            for label, regex in self.RULES:
                m = regex.search(rec.message)
                if m:
                    categories.append(label)
                    patterns.append(f"{label}: {m.group(0).strip()}")
            if rec.event == "PRIVILEGE_ESCALATION" and not categories:
                categories.append("EXPLICIT_EVENT")
                patterns.append("EXPLICIT_EVENT: PRIVILEGE_ESCALATION")
            if categories:
                findings.append(
                    {
                        "attack_type": "PRIVILEGE_ESCALATION",
                        "source_ip": rec.source_ip,
                        "username": rec.username,
                        "timestamp": rec.timestamp,
                        "priv_categories": categories,
                        "matched_patterns": patterns,
                        "evidence": rec.message or "Explicit PRIVILEGE_ESCALATION event",
                    }
                )
        return findings
`,
  },
  {
    path: 'detection/severity.py',
    phase: 'Phase 7: Centralized Severity Classification',
    description: 'Applies configurable LOW/MEDIUM/HIGH severity with explicit decision explanations.',
    content: `from typing import Tuple


class SeverityClassifier:
    def __init__(self, brute_medium: int = 3, brute_high: int = 5):
        self.brute_medium = brute_medium
        self.brute_high = brute_high

    def classify(self, finding: dict) -> Tuple[str, str]:
        attack_type = finding["attack_type"]

        if attack_type == "POTENTIAL_BRUTE_FORCE":
            attempts = finding.get("failed_attempts", 0)
            if attempts >= self.brute_high:
                return "HIGH", f"{attempts} failed attempts >= high threshold ({self.brute_high})."
            if attempts >= self.brute_medium:
                return "MEDIUM", f"{attempts} failed attempts in medium range ({self.brute_medium}-{self.brute_high - 1})."
            return "LOW", f"{attempts} failed attempts below standard escalation threshold."

        if attack_type == "SQL_INJECTION_ATTEMPT":
            cats = set(finding.get("sql_categories", []))
            if cats & {"TAUTOLOGY", "UNION_SELECT", "DROP_TABLE", "SLEEP_FUNCTION"}:
                return "HIGH", "High-risk SQL injection exploit signature detected."
            if "SQL_COMMENT" in cats:
                return "MEDIUM", "SQL comment indicator detected without confirmed exploit payload."
            return "LOW", "Informational general SELECT statement without injection signature."

        if attack_type == "PRIVILEGE_ESCALATION":
            cats = set(finding.get("priv_categories", []))
            if cats & {"PERMISSION_CHANGE", "ACCOUNT_CREATION", "GROUP_MODIFICATION"}:
                return "HIGH", "Direct permission, account, or privileged group modification detected."
            return "MEDIUM", "SUDO/SU elevation or explicit privilege escalation activity detected."

        return "LOW", "Informational security event."
`,
  },
  {
    path: 'detection/pattern_detector.py',
    phase: 'Phase 8: Unified Detection Engine',
    description: 'Integrates all independent detectors and centralized SeverityClassifier.',
    content: `from typing import List
from compiler.intermediate_code import IntermediateRecord
from detection.brute_force import BruteForceDetector
from detection.sql_injection import SQLInjectionDetector
from detection.privilege_escalation import PrivilegeEscalationDetector
from detection.severity import SeverityClassifier


class PatternDetector:
    def __init__(self, brute_threshold: int = 3, window_minutes: int = 5, brute_high: int = 5):
        self.brute_force = BruteForceDetector(threshold=brute_threshold, window_minutes=window_minutes)
        self.sql_injection = SQLInjectionDetector()
        self.priv_esc = PrivilegeEscalationDetector()
        self.classifier = SeverityClassifier(brute_medium=brute_threshold, brute_high=brute_high)

    def analyze(self, records: List[IntermediateRecord]) -> List[dict]:
        raw_findings = (
            self.brute_force.detect(records)
            + self.sql_injection.detect(records)
            + self.priv_esc.detect(records)
        )
        alerts = []
        for finding in raw_findings:
            severity, rationale = self.classifier.classify(finding)
            alert = {
                "attack_type": finding["attack_type"],
                "source_ip": finding["source_ip"],
                "username": finding["username"],
                "timestamp": finding["timestamp"],
                "severity": severity,
                "severity_explanation": rationale,
                "matched_patterns": finding["matched_patterns"],
                "evidence": finding["evidence"],
            }
            if "failed_attempts" in finding:
                alert["failed_attempts"] = finding["failed_attempts"]
                alert["time_window"] = finding["time_window"]
            alerts.append(alert)
        return alerts
`,
  },
  {
    path: 'database/db_manager.py',
    phase: 'Storage',
    description: 'SQLite persistence layer for storing validated logs and generated security alerts.',
    content: `import sqlite3
from pathlib import Path
from typing import List


class DBManager:
    def __init__(self, db_path: str = "cybershield.db"):
        self.db_path = Path(db_path)
        self._init_schema()

    def _init_schema(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS security_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    attack_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    source_ip TEXT NOT NULL,
                    username TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    evidence TEXT NOT NULL
                )
                """
            )

    def save_alerts(self, alerts: List[dict]) -> None:
        with sqlite3.connect(self.db_path) as conn:
            for a in alerts:
                conn.execute(
                    "INSERT INTO security_alerts (attack_type, severity, source_ip, username, timestamp, evidence) VALUES (?, ?, ?, ?, ?, ?)",
                    (a["attack_type"], a["severity"], a["source_ip"], a["username"], a["timestamp"], a["evidence"]),
                )
`,
  },
  {
    path: 'reports/report_generator.py',
    phase: 'Reporting',
    description: 'Exports CSV alerts/logs and generates structured text security reports.',
    content: `import pandas as pd
from typing import List


class ReportGenerator:
    @staticmethod
    def alerts_to_csv(alerts: List[dict]) -> str:
        return pd.DataFrame(alerts).to_csv(index=False)

    @staticmethod
    def logs_to_csv(records: List[dict]) -> str:
        return pd.DataFrame(records).to_csv(index=False)
`,
  },
  {
    path: 'app.py',
    phase: 'Streamlit Dashboard',
    description: 'Main Streamlit SOC dashboard application integrating compiler pipeline, Plotly analytics, and CSV exports.',
    content: `import streamlit as st
import pandas as pd
import plotly.express as px
from pathlib import Path

from utils.log_loader import LogLoader
from compiler.lexer import Lexer
from compiler.parser import Parser
from compiler.semantic_analyzer import SemanticAnalyzer
from compiler.intermediate_code import IntermediateCodeGenerator
from detection.pattern_detector import PatternDetector
from reports.report_generator import ReportGenerator

st.set_page_config(page_title="CyberShield — Log Pattern Analyzer", layout="wide")

st.markdown(
    """
    <style>
    .stApp { background-color: #080d1a; color: #f1f5f9; }
    .metric-card { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("CyberShield — Cybersecurity Log Pattern Analyzer")
st.caption("Compiler-Design Security Log Processing & Threat Detection Engine")

uploaded = st.sidebar.file_uploader("Upload Log File (.txt / .log)", type=["txt", "log"])
threshold = st.sidebar.slider("Brute-Force Threshold", 2, 10, 3)
window_min = st.sidebar.slider("Time Window (minutes)", 1, 30, 5)

if uploaded:
    raw_text = uploaded.read().decode("utf-8", errors="replace")
else:
    raw_text = Path("data/sample_logs.txt").read_text(encoding="utf-8")

loader = LogLoader()
lexer = Lexer()
parser = Parser()
semantic = SemanticAnalyzer()
ir_gen = IntermediateCodeGenerator()

entries, errors = loader.load_text(raw_text)
validated = []

for entry in entries:
    tokens, lex_errs = lexer.tokenize_line(entry.line_number, entry.raw_line)
    if lex_errs:
        errors.extend(lex_errs)
        continue
    parsed, syn_err = parser.parse(entry.line_number, entry.raw_line, tokens)
    if syn_err:
        errors.append(syn_err)
        continue
    val_rec, sem_errs = semantic.analyze(parsed)
    if sem_errs:
        errors.extend(sem_errs)
        continue
    validated.append(val_rec)

ir_records = ir_gen.generate(validated)
detector = PatternDetector(brute_threshold=threshold, window_minutes=window_min)
alerts = detector.analyze(ir_records)

c1, c2, c3, c4 = st.columns(4)
c1.metric("Total Logs", len(entries))
c2.metric("Valid Logs (IR)", len(ir_records))
c3.metric("Compiler Errors", len(errors))
c4.metric("Security Alerts", len(alerts))

tab1, tab2, tab3, tab4 = st.tabs(["Security Alerts", "Validated Logs", "Compiler Errors", "Analytics"])
with tab1:
    st.dataframe(pd.DataFrame(alerts), use_container_width=True)
with tab2:
    st.dataframe(pd.DataFrame([r.to_dict() for r in ir_records]), use_container_width=True)
with tab3:
    st.dataframe(pd.DataFrame([e.to_dict() for e in errors]), use_container_width=True)
with tab4:
    if alerts:
        df_a = pd.DataFrame(alerts)
        st.plotly_chart(px.bar(df_a, x="attack_type", color="severity", title="Alert Distribution"), use_container_width=True)
        st.download_button("Download Alerts CSV", ReportGenerator.alerts_to_csv(alerts), "alerts.csv", "text/csv")
`,
  },
  {
    path: 'tests/test_detection.py',
    phase: 'Testing',
    description: 'Pytest unit suite verifying sample dataset benchmark (6 valid, 3 alerts: MEDIUM, HIGH, MEDIUM).',
    content: `from pathlib import Path
from utils.log_loader import LogLoader
from compiler.lexer import Lexer
from compiler.parser import Parser
from compiler.semantic_analyzer import SemanticAnalyzer
from compiler.intermediate_code import IntermediateCodeGenerator
from detection.pattern_detector import PatternDetector


def test_academic_baseline_sample():
    raw = Path("data/sample_logs.txt").read_text(encoding="utf-8")
    entries, errs = LogLoader().load_text(raw)
    assert len(entries) == 6
    assert len(errs) == 0

    lexer, parser, sem = Lexer(), Parser(), SemanticAnalyzer()
    validated = []
    for e in entries:
        tokens, lex_errs = lexer.tokenize_line(e.line_number, e.raw_line)
        assert not lex_errs
        parsed, syn_err = parser.parse(e.line_number, e.raw_line, tokens)
        assert syn_err is None
        val, sem_errs = sem.analyze(parsed)
        assert not sem_errs
        validated.append(val)

    ir_records = IntermediateCodeGenerator().generate(validated)
    assert len(ir_records) == 6

    alerts = PatternDetector().analyze(ir_records)
    assert len(alerts) == 3
    severities = {a["attack_type"]: a["severity"] for a in alerts}
    assert severities["POTENTIAL_BRUTE_FORCE"] == "MEDIUM"
    assert severities["SQL_INJECTION_ATTEMPT"] == "HIGH"
    assert severities["PRIVILEGE_ESCALATION"] == "MEDIUM"
`,
  },
];
