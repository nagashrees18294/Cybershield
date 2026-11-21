import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileWarning,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { PipelineResult, SecurityAlert } from '../engine/types';

export type DashboardTab =
  | 'overview'
  | 'alerts'
  | 'pipeline'
  | 'logs'
  | 'errors'
  | 'reports';

interface OverviewViewProps {
  result: PipelineResult;
  onNavigate: (tab: DashboardTab) => void;
  onSelectAlert: (alert: SecurityAlert) => void;
}

const ATTACK_LABELS: Record<string, string> = {
  POTENTIAL_BRUTE_FORCE: 'Brute-Force Login',
  SQL_INJECTION_ATTEMPT: 'SQL Injection',
  PRIVILEGE_ESCALATION: 'Privilege Escalation',
};

export const OverviewView: React.FC<OverviewViewProps> = ({
  result,
  onNavigate,
  onSelectAlert,
}) => {
  const highCount = result.alerts.filter((a) => a.severity === 'HIGH').length;
  const medCount = result.alerts.filter((a) => a.severity === 'MEDIUM').length;
  const lowCount = result.alerts.filter((a) => a.severity === 'LOW').length;

  const attackCounts = [
    {
      key: 'POTENTIAL_BRUTE_FORCE',
      label: 'Brute-Force Attempts',
      count: result.alerts.filter((a) => a.attack_type === 'POTENTIAL_BRUTE_FORCE').length,
      barColor: 'bg-amber-400',
    },
    {
      key: 'SQL_INJECTION_ATTEMPT',
      label: 'SQL Injection Indicators',
      count: result.alerts.filter((a) => a.attack_type === 'SQL_INJECTION_ATTEMPT').length,
      barColor: 'bg-red-500',
    },
    {
      key: 'PRIVILEGE_ESCALATION',
      label: 'Privilege Escalation',
      count: result.alerts.filter((a) => a.attack_type === 'PRIVILEGE_ESCALATION').length,
      barColor: 'bg-blue-500',
    },
  ];

  const maxAttackCount = Math.max(1, ...attackCounts.map((c) => c.count));

  // SVG Donut calculations
  const totalAlerts = result.alerts.length;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const highFrac = totalAlerts ? highCount / totalAlerts : 0;
  const medFrac = totalAlerts ? medCount / totalAlerts : 0;
  const lowFrac = totalAlerts ? lowCount / totalAlerts : 0;

  const highLen = highFrac * circumference;
  const medLen = medFrac * circumference;
  const lowLen = lowFrac * circumference;

  const pipelineStages = [
    {
      step: '01',
      name: 'Input Loader',
      metric: `${result.totalLines} lines`,
      sub: result.inputErrors.length ? `${result.inputErrors.length} file errors` : 'UTF-8 stream',
      tab: 'logs' as DashboardTab,
    },
    {
      step: '02',
      name: 'Lexical Analysis',
      metric: `${result.totalLines - result.lexicalErrors.length} tokenized`,
      sub: `${result.lexicalErrors.length} lexical errors`,
      tab: result.lexicalErrors.length ? ('errors' as DashboardTab) : ('pipeline' as DashboardTab),
    },
    {
      step: '03',
      name: 'Syntax Parser',
      metric: `${result.parsedRecords.length} ASTs`,
      sub: `${result.syntaxErrors.length} syntax errors`,
      tab: result.syntaxErrors.length ? ('errors' as DashboardTab) : ('pipeline' as DashboardTab),
    },
    {
      step: '04',
      name: 'Semantic Check',
      metric: `${result.validatedRecords.length} verified`,
      sub: `${result.semanticErrors.length} semantic errors`,
      tab: result.semanticErrors.length ? ('errors' as DashboardTab) : ('pipeline' as DashboardTab),
    },
    {
      step: '05',
      name: 'IR Generation',
      metric: `${result.intermediateRecords.length} IR records`,
      sub: 'SECURITY_LOG',
      tab: 'logs' as DashboardTab,
    },
    {
      step: '06–08',
      name: 'Detection Engine',
      metric: `${result.alerts.length} alerts`,
      sub: `${highCount} high · ${medCount} med`,
      tab: 'alerts' as DashboardTab,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Primary Metric Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-400">Total Log Entries</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-semibold tracking-tight text-slate-100 tabular-nums">
              {result.totalLines}
            </span>
            <span className="text-xs text-slate-400 tabular-nums">{result.fileName}</span>
          </div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-400">Validated Logs (IR)</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-semibold tracking-tight text-emerald-400 tabular-nums">
              {result.validCount}
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              {result.totalLines > 0
                ? `${Math.round((result.validCount / result.totalLines) * 100)}% passed`
                : '0% passed'}
            </span>
          </div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-400">Compiler Rejections</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-3xl font-semibold tracking-tight tabular-nums ${
                result.invalidCount > 0 ? 'text-amber-400' : 'text-slate-100'
              }`}
            >
              {result.invalidCount}
            </span>
            <button
              onClick={() => onNavigate('errors')}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Inspect errors
            </button>
          </div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-400">Security Alerts</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-3xl font-semibold tracking-tight tabular-nums ${
                highCount > 0 ? 'text-red-400' : 'text-slate-100'
              }`}
            >
              {result.alerts.length}
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              {highCount} High · {medCount} Med · {lowCount} Low
            </span>
          </div>
        </div>
      </section>

      {/* Compiler Pipeline Flow */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Compiler & Detection Pipeline Execution
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Only logs passing lexical, syntax, and semantic verification reach Intermediate Code Generation and threat detection.
            </p>
          </div>
          <button
            onClick={() => onNavigate('pipeline')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap shrink-0"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Open Line-by-Line Tracer</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
          {pipelineStages.map((stage, idx) => (
            <button
              key={stage.step}
              onClick={() => onNavigate(stage.tab)}
              className="group relative text-left bg-[#131C31] hover:bg-[#18233C] border border-slate-800 hover:border-blue-500/50 rounded-md p-3.5 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono tabular-nums text-blue-400">{stage.step}</span>
                {idx < pipelineStages.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors hidden xl:block" />
                )}
              </div>
              <div className="mt-1.5 text-sm font-medium text-slate-100">{stage.name}</div>
              <div className="mt-1 text-xs font-mono text-slate-200 tabular-nums">{stage.metric}</div>
              <div className="mt-0.5 text-xs text-slate-400 tabular-nums">{stage.sub}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Charts Row: Attack Distribution & Severity Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#0F172A] border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Attack Vector Distribution</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Alerts grouped by independent detection module
              </p>
            </div>
            <span className="text-xs text-slate-400 tabular-nums">
              {totalAlerts} total alerts
            </span>
          </div>

          <div className="space-y-4">
            {attackCounts.map((item) => {
              const pct = totalAlerts > 0 ? Math.round((item.count / totalAlerts) * 100) : 0;
              const widthPct = totalAlerts > 0 ? (item.count / maxAttackCount) * 100 : 0;
              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{item.label}</span>
                    <span className="font-mono text-slate-300 tabular-nums">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-900 rounded-sm overflow-hidden border border-slate-800/80">
                    <div
                      className={`h-full ${item.barColor} transition-all duration-300`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400">Lexical Errors</span>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-100 tabular-nums">
                {result.lexicalErrors.length}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Syntax Errors</span>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-100 tabular-nums">
                {result.syntaxErrors.length}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Semantic Errors</span>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-100 tabular-nums">
                {result.semanticErrors.length}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#0F172A] border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Severity Distribution</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized SeverityClassifier breakdown
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 132 132" className="w-full h-full -rotate-90">
                <circle
                  cx="66"
                  cy="66"
                  r={radius}
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="14"
                />
                {highLen > 0 && (
                  <circle
                    cx="66"
                    cy="66"
                    r={radius}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="14"
                    strokeDasharray={`${highLen} ${circumference - highLen}`}
                    strokeDashoffset={0}
                  />
                )}
                {medLen > 0 && (
                  <circle
                    cx="66"
                    cy="66"
                    r={radius}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="14"
                    strokeDasharray={`${medLen} ${circumference - medLen}`}
                    strokeDashoffset={-highLen}
                  />
                )}
                {lowLen > 0 && (
                  <circle
                    cx="66"
                    cy="66"
                    r={radius}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="14"
                    strokeDasharray={`${lowLen} ${circumference - lowLen}`}
                    strokeDashoffset={-(highLen + medLen)}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-slate-100 tabular-nums">
                  {totalAlerts}
                </span>
                <span className="text-[11px] text-slate-400">Alerts</span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                <span className="flex items-center gap-2 text-red-400 font-medium">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  High Severity
                </span>
                <span className="font-mono text-slate-100 tabular-nums">{highCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                <span className="flex items-center gap-2 text-amber-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Medium Severity
                </span>
                <span className="font-mono text-slate-100 tabular-nums">{medCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="flex items-center gap-2 text-sky-400 font-medium">
                  <FileWarning className="w-3.5 h-3.5" />
                  Low / Informational
                </span>
                <span className="font-mono text-slate-100 tabular-nums">{lowCount}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Security Alerts Table */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Detected Security Alerts</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Unified alerts produced from semantically verified Intermediate Representations
            </p>
          </div>
          <button
            onClick={() => onNavigate('alerts')}
            className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap shrink-0"
          >
            View all alerts
          </button>
        </div>

        {result.alerts.length === 0 ? (
          <div className="p-8 text-center">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-200">No threat patterns triggered</p>
            <p className="text-xs text-slate-400 mt-1">
              All validated log entries fell within configured normal thresholds.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-[#0B1222]">
                  <th className="py-2.5 px-4">ID</th>
                  <th className="py-2.5 px-4">Attack Type</th>
                  <th className="py-2.5 px-4">Severity</th>
                  <th className="py-2.5 px-4">Source IP</th>
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-4">Evidence Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {result.alerts.slice(0, 6).map((alert) => (
                  <tr
                    key={alert.id}
                    onClick={() => {
                      onSelectAlert(alert);
                      onNavigate('alerts');
                    }}
                    className="hover:bg-[#152038] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-slate-400 tabular-nums whitespace-nowrap">
                      {alert.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-100 whitespace-nowrap">
                      {ATTACK_LABELS[alert.attack_type] ?? alert.attack_type}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {alert.severity === 'HIGH' && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-red-400">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          HIGH
                        </span>
                      )}
                      {alert.severity === 'MEDIUM' && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          MEDIUM
                        </span>
                      )}
                      {alert.severity === 'LOW' && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-sky-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          LOW
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-200 tabular-nums whitespace-nowrap">
                      {alert.source_ip}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {alert.username}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-md truncate">
                      {alert.evidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
