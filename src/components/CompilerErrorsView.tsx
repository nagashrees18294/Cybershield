import React, { useMemo, useState } from 'react';
import { CheckCircle2, FileWarning } from 'lucide-react';
import { CompilerError, ErrorCategory } from '../engine/types';

interface CompilerErrorsViewProps {
  errors: CompilerError[];
}

export const CompilerErrorsView: React.FC<CompilerErrorsViewProps> = ({ errors }) => {
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ErrorCategory>('ALL');

  const counts = useMemo(() => {
    return {
      ALL: errors.length,
      LEXICAL: errors.filter((e) => e.category === 'LEXICAL').length,
      SYNTAX: errors.filter((e) => e.category === 'SYNTAX').length,
      SEMANTIC: errors.filter((e) => e.category === 'SEMANTIC').length,
      INPUT: errors.filter((e) => e.category === 'INPUT').length,
    };
  }, [errors]);

  const filtered = useMemo(() => {
    if (categoryFilter === 'ALL') return errors;
    return errors.filter((e) => e.category === categoryFilter);
  }, [errors, categoryFilter]);

  return (
    <div className="space-y-5">
      <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Compiler Phase Diagnostics</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict separation of Input, Lexical (invalid tokens), Syntax (grammar violations), and Semantic (logical validity) errors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#080D1A] border border-slate-800 rounded-md">
          {(['ALL', 'LEXICAL', 'SYNTAX', 'SEMANTIC', 'INPUT'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                categoryFilter === cat
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All Errors' : cat} ({counts[cat]})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-12 text-center">
          <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-200">Zero compiler errors in this category</p>
          <p className="text-xs text-slate-400 mt-1">
            All processed entries conformed to lexical, syntactic, and semantic rules.
          </p>
        </div>
      ) : (
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-[#0B1222]">
                  <th className="py-2.5 px-4">Line</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Error Description</th>
                  <th className="py-2.5 px-4">Original Log Line</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {filtered.map((err, idx) => (
                  <tr key={idx} className="hover:bg-[#131C31] transition-colors align-top">
                    <td className="py-3 px-4 font-mono text-slate-300 tabular-nums whitespace-nowrap">
                      {err.lineNumber > 0 ? `#${err.lineNumber}` : 'FILE'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 font-medium ${
                          err.category === 'LEXICAL'
                            ? 'text-red-400'
                            : err.category === 'SYNTAX'
                            ? 'text-amber-400'
                            : err.category === 'SEMANTIC'
                            ? 'text-sky-400'
                            : 'text-slate-300'
                        }`}
                      >
                        <FileWarning className="w-3.5 h-3.5" />
                        {err.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200 max-w-md">{err.description}</td>
                    <td className="py-3 px-4 font-mono text-slate-400 max-w-md break-all">
                      {err.rawLine || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
