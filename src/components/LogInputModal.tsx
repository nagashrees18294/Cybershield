import React, { useEffect, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { SAMPLE_DATASETS } from '../engine/sampleData';

interface LogInputModalProps {
  isOpen: boolean;
  currentText: string;
  currentFileName: string;
  onClose: () => void;
  onApply: (text: string, fileName: string) => void;
}

export const LogInputModal: React.FC<LogInputModalProps> = ({
  isOpen,
  currentText,
  currentFileName,
  onClose,
  onApply,
}) => {
  const [draftText, setDraftText] = useState(currentText);
  const [draftName, setDraftName] = useState(currentFileName);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftText(currentText);
      setDraftName(currentFileName);
      setFileError(null);
    }
  }, [isOpen, currentText, currentFileName]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.txt') && !lower.endsWith('.log')) {
      setFileError(`Invalid file "${file.name}". Please upload a .txt or .log file.`);
      return;
    }

    setFileError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setDraftText(String(reader.result ?? ''));
      setDraftName(file.name);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-slate-800 rounded-lg w-full max-w-3xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Log Input & Dataset Loader
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Format: TIMESTAMP | IP_ADDRESS | USERNAME | EVENT | OPTIONAL_MESSAGE
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Quick Presets & File Upload */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {SAMPLE_DATASETS.map((ds) => (
                <button
                  key={ds.id}
                  onClick={() => {
                    setDraftText(ds.content);
                    setDraftName(ds.fileName);
                    setFileError(null);
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-[#131C31] hover:bg-[#1B2742] border border-slate-700 text-slate-200 rounded-md transition-colors"
                >
                  {ds.label}
                </button>
              ))}
            </div>

            <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-[#131C31] hover:bg-[#1B2742] border border-slate-700 text-blue-300 rounded-md cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload .txt / .log</span>
              <input
                type="file"
                accept=".txt,.log"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {fileError && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-md text-xs text-red-300">
              {fileError}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>Active Source: {draftName}</span>
              <span className="tabular-nums">
                {draftText.split(/\r?\n/).filter((l) => l.trim().length > 0).length} non-empty lines
              </span>
            </div>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={12}
              spellCheck={false}
              className="w-full p-3.5 bg-[#080D1A] border border-slate-800 rounded-md font-mono text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-blue-500"
              placeholder="2026-11-21 10:30:10 | 192.168.1.10 | admin | LOGIN_SUCCESS"
            />
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-800 bg-[#0B1222] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onApply(draftText, draftName);
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
          >
            Compile & Analyze Logs
          </button>
        </div>
      </div>
    </div>
  );
};
