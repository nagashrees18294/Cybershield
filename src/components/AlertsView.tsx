import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { AttackType, SecurityAlert, SeverityLevel } from '../engine/types';

interface AlertsViewProps {
  alerts: SecurityAlert[];
  initialSelectedAlert?: SecurityAlert | null;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  initialSelectedAlert,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | SeverityLevel>('ALL');
  const [attackFilter, setAttackFilter] = useState<'ALL' | AttackType>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedAlert?.id ?? alerts[0]?.id ?? null
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return alerts.filter((a) => {
      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
      if (attackFilter !== 'ALL' && a.attack_type !== attackFilter) return false;
      if (q) {
        const hay = `${a.source_ip} ${a.username} ${a.evidence} ${a.attack_type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [alerts, searchQuery, severityFilter, attackFilter]);

  const activeAlert =
    filtered.find((a) => a.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="space-y-5">
      {/* Filter Toolbar */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by IP address, username, or evidence..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#080D1A] border border-slate-800 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Severity segmented filter */}
          <div className="flex items-center gap-1 p-1 bg-[#080D1A] border border-slate-800 rounded-md">
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  severityFilter === sev
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev === 'ALL' ? 'All Severities' : sev}
              </button>
            ))}
          </div>

          {/* Attack Type dropdown */}
          <select
            value={attackFilter}
            onChange={(e) => setAttackFilter(e.target.value as 'ALL' | AttackType)}
            aria-label="Filter by attack type"
            className="px-3 py-1.5 text-xs bg-[#080D1A] border border-slate-800 rounded-md text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Attack Types</option>
            <option value="POTENTIAL_BRUTE_FORCE">Brute-Force</option>
            <option value="SQL_INJECTION_ATTEMPT">SQL Injection</option>
            <option value="PRIVILEGE_ESCALATION">Privilege Escalation</option>
          </select>
        </div>
      </div>

      {/* Master-Detail View */}
      {filtered.length === 0 ? (
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-12 text-center">
          <ShieldCheck className="w-9 h-9 text-slate-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-200">No matching alerts</p>
          <p className="text-xs text-slate-400 mt-1">
            Adjust search terms or severity filters to view detected alerts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-7 bg-[#0F172A] border border-slate-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-[#0B1222]">
                    <th className="py-2.5 px-4">ID</th>
                    <th className="py-2.5 px-4">Attack Type</th>
                    <th className="py-2.5 px-4">Severity</th>
                    <th className="py-2.5 px-4">Source IP</th>
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {filtered.map((alert) => {
                    const isSelected = activeAlert?.id === alert.id;
                    return (
                      <tr
                        key={alert.id}
                        onClick={() => setSelectedId(alert.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#172542]' : 'hover:bg-[#131C31]'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono text-slate-400 tabular-nums whitespace-nowrap">
                          {alert.id}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-100 whitespace-nowrap">
                          {alert.attack_type}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {alert.severity === 'HIGH' && (
                            <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              HIGH
                            </span>
                          )}
                          {alert.severity === 'MEDIUM' && (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              MEDIUM
                            </span>
                          )}
                          {alert.severity === 'LOW' && (
                            <span className="inline-flex items-center gap-1 text-sky-400 font-medium">
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
                        <td className="py-3 px-4 font-mono text-slate-400 tabular-nums whitespace-nowrap">
                          {alert.timestamp}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Panel */}
          {activeAlert && (
            <div className="xl:col-span-5 bg-[#0F172A] border border-slate-800 rounded-lg p-5 space-y-5">
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="text-xs text-slate-400 font-mono tabular-nums">
                    {activeAlert.id} · Line {activeAlert.lineNumbers.join(', ')}
                  </div>
                  <h3 className="text-base font-semibold text-slate-100 mt-1">
                    {activeAlert.attack_type}
                  </h3>
                </div>
                <span
                  className={`text-xs font-semibold tracking-wide ${
                    activeAlert.severity === 'HIGH'
                      ? 'text-red-400'
                      : activeAlert.severity === 'MEDIUM'
                      ? 'text-amber-400'
                      : 'text-sky-400'
                  }`}
                >
                  {activeAlert.severity} SEVERITY
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400">Source IP</span>
                  <p className="mt-1 font-mono text-slate-100 tabular-nums">
                    {activeAlert.source_ip}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Target Username</span>
                  <p className="mt-1 font-mono text-slate-100">{activeAlert.username}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Timestamp / Window</span>
                  <p className="mt-1 font-mono text-slate-200 tabular-nums">
                    {activeAlert.timestamp}
                    {activeAlert.time_window ? ` (${activeAlert.time_window})` : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-slate-400">Matched Detection Patterns</h4>
                <div className="bg-[#080D1A] border border-slate-800 rounded-md p-3 space-y-1.5">
                  {activeAlert.matched_patterns.map((pat, i) => (
                    <div key={i} className="text-xs font-mono text-blue-300 break-all">
                      {pat}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-slate-400">Supporting Evidence</h4>
                <p className="text-xs font-mono text-slate-200 bg-[#080D1A] border border-slate-800 rounded-md p-3 break-all">
                  {activeAlert.evidence}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-medium text-slate-400">
                  Detection & Severity Rationale
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">{activeAlert.reason}</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {activeAlert.severity_explanation}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
