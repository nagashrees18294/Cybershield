import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { LineTrace } from '../engine/types';

interface PipelineInspectorViewProps {
  traces: LineTrace[];
}

const TOKEN_STYLE: Record<string, string> = {
  TIMESTAMP: 'border-blue-500/40 text-blue-300 bg-blue-500/10',
  IP_ADDRESS: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
  USERNAME: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  EVENT: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
  MESSAGE: 'border-slate-600 text-slate-200 bg-slate-800/60',
  PIPE: 'border-slate-700 text-slate-500 bg-slate-900',
  UNKNOWN: 'border-red-500/50 text-red-300 bg-red-500/10',
};

export const PipelineInspectorView: React.FC<PipelineInspectorViewProps> = ({ traces }) => {
  const [selectedLine, setSelectedLine] = useState<number>(traces[0]?.lineNumber ?? 1);

  const activeTrace =
    traces.find((t) => t.lineNumber === selectedLine) ?? traces[0] ?? null;

  if (!activeTrace) {
    return (
      <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-12 text-center text-xs text-slate-400">
        Load or paste log entries to trace Lexical, Syntax, Semantic, and IR stages.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Line Selector */}
      <div className="lg:col-span-4 bg-[#0F172A] border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 bg-[#0B1222]">
          <h2 className="text-xs font-semibold text-slate-200">
            Select Log Line to Trace ({traces.length})
          </h2>
        </div>
        <div className="divide-y divide-slate-800/80 max-h-[620px] overflow-y-auto">
          {traces.map((t) => {
            const isSelected = t.lineNumber === activeTrace.lineNumber;
            return (
              <button
                key={t.lineNumber}
                onClick={() => setSelectedLine(t.lineNumber)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  isSelected ? 'bg-[#172542]' : 'hover:bg-[#131C31]'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono text-slate-400 tabular-nums">
                    Line {t.lineNumber}
                  </span>
                  <span
                    className={`font-medium ${
                      t.status === 'VALID' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="font-mono text-xs text-slate-200 truncate">{t.rawLine}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Stage-by-Stage Compiler Trace */}
      <div className="lg:col-span-8 space-y-5">
        {/* Raw Input */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-300">
              01. Raw Input Line #{activeTrace.lineNumber}
            </h3>
            <span
              className={`text-xs font-medium ${
                activeTrace.status === 'VALID' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {activeTrace.status.replace('_', ' ')}
            </span>
          </div>
          <pre className="p-3 bg-[#080D1A] border border-slate-800 rounded-md font-mono text-xs text-slate-100 overflow-x-auto">
            {activeTrace.rawLine}
          </pre>
        </div>

        {/* Phase 2: Lexer Tokens */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5">
          <h3 className="text-xs font-semibold text-slate-300 mb-3">
            02. Lexical Analysis — Token Stream
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeTrace.tokens.map((tok, i) => (
              <div
                key={i}
                className={`border rounded px-2.5 py-1.5 text-xs font-mono ${
                  TOKEN_STYLE[tok.type] ?? TOKEN_STYLE.MESSAGE
                }`}
              >
                <div className="text-[10px] opacity-75">
                  {tok.type} · col {tok.column}
                </div>
                <div className="font-medium break-all">{tok.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Phase 3: Syntax Parse Tree */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5">
          <h3 className="text-xs font-semibold text-slate-300 mb-2">
            03. Syntax Analysis — Grammar Derivation
          </h3>
          <p className="text-xs font-mono text-slate-400 mb-3">
            LOG → TIMESTAMP | IP_ADDRESS | USERNAME | EVENT | OPTIONAL_MESSAGE
          </p>
          {activeTrace.parseTree ? (
            <div className="bg-[#080D1A] border border-slate-800 rounded-md p-3 font-mono text-xs text-slate-200 space-y-1">
              <div className="text-blue-400 font-semibold">{activeTrace.parseTree.symbol}</div>
              {activeTrace.parseTree.children?.map((child, idx) => (
                <div key={idx} className="pl-4 flex items-start gap-2">
                  <span className="text-slate-600">├─</span>
                  <span className="text-slate-400">{child.symbol}:</span>
                  {child.value !== undefined ? (
                    <span className="text-slate-100 break-all">{child.value}</span>
                  ) : (
                    <span className="text-slate-200">
                      {child.children?.map((c) => `${c.symbol}(${c.value})`).join(', ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-md text-xs text-red-300">
              Halted before Parse Tree construction due to upstream error.
            </div>
          )}
        </div>

        {/* Phase 4: Semantic Validation */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5">
          <h3 className="text-xs font-semibold text-slate-300 mb-3">
            04. Semantic Analysis — Logical Validation
          </h3>
          {activeTrace.semanticChecks ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeTrace.semanticChecks.map((chk, idx) => (
                <div
                  key={idx}
                  className="bg-[#080D1A] border border-slate-800 rounded-md p-3 flex items-start gap-2.5"
                >
                  {chk.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-200">
                      {chk.field} — {chk.rule}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 break-words">{chk.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-[#080D1A] border border-slate-800 rounded-md text-xs text-slate-400">
              Semantic checks run only after Syntax Analysis succeeds.
            </div>
          )}
        </div>

        {/* Phase 5: Intermediate Code Generation */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5">
          <h3 className="text-xs font-semibold text-slate-300 mb-3">
            05. Intermediate Code Generation (IR Output)
          </h3>
          {activeTrace.intermediateRecord ? (
            <pre className="p-3.5 bg-[#080D1A] border border-slate-800 rounded-md font-mono text-xs text-emerald-300 overflow-x-auto">
              {JSON.stringify(
                {
                  record_type: activeTrace.intermediateRecord.record_type,
                  timestamp: activeTrace.intermediateRecord.timestamp,
                  source_ip: activeTrace.intermediateRecord.source_ip,
                  username: activeTrace.intermediateRecord.username,
                  event: activeTrace.intermediateRecord.event,
                  message: activeTrace.intermediateRecord.message,
                },
                null,
                2
              )}
            </pre>
          ) : (
            <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-md text-xs text-red-300 space-y-1">
              <div className="font-medium">No Intermediate Representation emitted</div>
              {activeTrace.errors.map((err, i) => (
                <div key={i} className="font-mono text-xs">
                  [{err.category}] {err.description}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
