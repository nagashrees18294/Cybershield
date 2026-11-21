import React, { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { intermediateLogsToCsv, triggerFileDownload } from '../engine/reportGenerator';
import { IntermediateRecord, SupportedEvent } from '../engine/types';

interface ValidatedLogsViewProps {
  records: IntermediateRecord[];
}

export const ValidatedLogsView: React.FC<ValidatedLogsViewProps> = ({ records }) => {
  const [query, setQuery] = useState('');
  const [eventFilter, setEventFilter] = useState<'ALL' | SupportedEvent>('ALL');
  const [selectedLine, setSelectedLine] = useState<number | null>(records[0]?.lineNumber ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (eventFilter !== 'ALL' && r.event !== eventFilter) return false;
      if (q) {
        const hay = `${r.source_ip} ${r.username} ${r.event} ${r.message} ${r.timestamp}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, query, eventFilter]);

  const activeRecord =
    filtered.find((r) => r.lineNumber === selectedLine) ?? filtered[0] ?? null;

  const handleExportCsv = () => {
    const csv = intermediateLogsToCsv(filtered);
    triggerFileDownload('validated_security_logs.csv', csv, 'text/csv;charset=utf-8;');
  };

  return (
    <div className="space-y-5">
      <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter validated IR records by IP, user, message..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#080D1A] border border-slate-800 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value as 'ALL' | SupportedEvent)}
            aria-label="Filter by event type"
            className="px-3 py-2 text-xs bg-[#080D1A] border border-slate-800 rounded-md text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Events</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="ACCESS_DENIED">ACCESS_DENIED</option>
            <option value="PRIVILEGE_ESCALATION">PRIVILEGE_ESCALATION</option>
            <option value="SQL_QUERY">SQL_QUERY</option>
          </select>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Validated CSV</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-12 text-center text-xs text-slate-400">
          No validated intermediate records match the current filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 bg-[#0F172A] border border-slate-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-[#0B1222]">
                    <th className="py-2.5 px-4">Line</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Source IP</th>
                    <th className="py-2.5 px-4">Username</th>
                    <th className="py-2.5 px-4">Event</th>
                    <th className="py-2.5 px-4">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {filtered.map((rec) => {
                    const isSelected = activeRecord?.lineNumber === rec.lineNumber;
                    return (
                      <tr
                        key={rec.lineNumber}
                        onClick={() => setSelectedLine(rec.lineNumber)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#172542]' : 'hover:bg-[#131C31]'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono text-slate-400 tabular-nums whitespace-nowrap">
                          {rec.lineNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-200 tabular-nums whitespace-nowrap">
                          {rec.timestamp}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-200 tabular-nums whitespace-nowrap">
                          {rec.source_ip}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                          {rec.username}
                        </td>
                        <td className="py-3 px-4 font-mono text-blue-300 whitespace-nowrap">
                          {rec.event}
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                          {rec.message || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="xl:col-span-4 bg-[#0F172A] border border-slate-800 rounded-lg p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-200">
              Normalized Intermediate Representation (IR)
            </h3>
            <p className="text-xs text-slate-400">
              Structured SECURITY_LOG payload emitted by Phase 5 for Line #{activeRecord?.lineNumber}.
            </p>
            {activeRecord && (
              <pre className="p-3.5 bg-[#080D1A] border border-slate-800 rounded-md font-mono text-xs text-emerald-300 overflow-x-auto">
                {JSON.stringify(
                  {
                    record_type: activeRecord.record_type,
                    timestamp: activeRecord.timestamp,
                    source_ip: activeRecord.source_ip,
                    username: activeRecord.username,
                    event: activeRecord.event,
                    message: activeRecord.message,
                  },
                  null,
                  2
                )}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
