import React, { useMemo } from 'react';
import { Download, FileText, SlidersHorizontal } from 'lucide-react';
import {
  alertsToCsv,
  generateSecurityReportText,
  intermediateLogsToCsv,
  triggerFileDownload,
} from '../engine/reportGenerator';
import { DetectionConfig, PipelineResult } from '../engine/types';

interface ReportsViewProps {
  result: PipelineResult;
  config: DetectionConfig;
  onUpdateConfig: (next: DetectionConfig) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  result,
  config,
  onUpdateConfig,
}) => {
  const reportText = useMemo(
    () => generateSecurityReportText(result, config),
    [result, config]
  );

  return (
    <div className="space-y-6">
      {/* Configurable Detection Thresholds */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-100">
            Detection & Severity Engine Configuration
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label
              htmlFor="bf-threshold"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Brute-Force Medium Threshold (attempts)
            </label>
            <input
              id="bf-threshold"
              type="number"
              min={2}
              max={20}
              value={config.bruteForceThreshold}
              onChange={(e) => {
                const val = Math.max(2, Number(e.target.value) || 3);
                onUpdateConfig({
                  ...config,
                  bruteForceThreshold: val,
                  bruteForceHighThreshold: Math.max(val + 1, config.bruteForceHighThreshold),
                });
              }}
              className="w-full px-3 py-2 text-xs font-mono bg-[#080D1A] border border-slate-800 rounded-md text-slate-100 tabular-nums focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">Default: 3 failed attempts</p>
          </div>

          <div>
            <label
              htmlFor="bf-high"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Brute-Force High Threshold (attempts)
            </label>
            <input
              id="bf-high"
              type="number"
              min={config.bruteForceThreshold + 1}
              max={50}
              value={config.bruteForceHighThreshold}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  bruteForceHighThreshold: Math.max(
                    config.bruteForceThreshold + 1,
                    Number(e.target.value) || 5
                  ),
                })
              }
              className="w-full px-3 py-2 text-xs font-mono bg-[#080D1A] border border-slate-800 rounded-md text-slate-100 tabular-nums focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">Default: 5+ failed attempts</p>
          </div>

          <div>
            <label
              htmlFor="bf-window"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Sliding Time Window (minutes)
            </label>
            <input
              id="bf-window"
              type="number"
              min={1}
              max={120}
              value={config.bruteForceWindowMinutes}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  bruteForceWindowMinutes: Math.max(1, Number(e.target.value) || 5),
                })
              }
              className="w-full px-3 py-2 text-xs font-mono bg-[#080D1A] border border-slate-800 rounded-md text-slate-100 tabular-nums focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">Default: 5 minutes</p>
          </div>
        </div>
      </section>

      {/* Export Controls */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Security Alerts CSV</h3>
            <p className="text-xs text-slate-400 mt-1">
              Export all {result.alerts.length} unified alerts including severity rationale, matched patterns, and evidence.
            </p>
          </div>
          <button
            onClick={() =>
              triggerFileDownload(
                'cybershield_alerts.csv',
                alertsToCsv(result.alerts),
                'text/csv;charset=utf-8;'
              )
            }
            disabled={result.alerts.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Alerts CSV</span>
          </button>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Validated Logs (IR) CSV</h3>
            <p className="text-xs text-slate-400 mt-1">
              Export all {result.intermediateRecords.length} normalized Intermediate Representation records.
            </p>
          </div>
          <button
            onClick={() =>
              triggerFileDownload(
                'cybershield_validated_logs.csv',
                intermediateLogsToCsv(result.intermediateRecords),
                'text/csv;charset=utf-8;'
              )
            }
            disabled={result.intermediateRecords.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-[#131C31] hover:bg-[#1B2742] border border-slate-700 disabled:opacity-40 text-slate-100 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Logs CSV</span>
          </button>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Full Security Report</h3>
            <p className="text-xs text-slate-400 mt-1">
              Download formatted plain-text executive summary with compiler diagnostics and findings.
            </p>
          </div>
          <button
            onClick={() =>
              triggerFileDownload(
                'cybershield_security_report.txt',
                reportText,
                'text/plain;charset=utf-8;'
              )
            }
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-[#131C31] hover:bg-[#1B2742] border border-slate-700 text-slate-100 rounded-md transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download Analysis Report</span>
          </button>
        </div>
      </section>

      {/* Report Preview */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-slate-300 mb-3">Generated Report Preview</h3>
        <pre className="p-4 bg-[#080D1A] border border-slate-800 rounded-md font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed max-h-[420px]">
          {reportText}
        </pre>
      </section>
    </div>
  );
};
