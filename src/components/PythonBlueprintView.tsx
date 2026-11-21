import React, { useState } from 'react';
import { Check, Copy, Download, FileCode2, FolderTree } from 'lucide-react';
import { triggerFileDownload } from '../engine/reportGenerator';
import { PYTHON_PROJECT_FILES } from '../python/projectFiles';

export const PythonBlueprintView: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState<string>(PYTHON_PROJECT_FILES[0].path);
  const [copied, setCopied] = useState(false);

  const activeFile =
    PYTHON_PROJECT_FILES.find((f) => f.path === selectedPath) ?? PYTHON_PROJECT_FILES[0];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadSetupScript = () => {
    const psLines = [
      '# PowerShell script to scaffold Cybersecurity-Log-Pattern-Analyzer on Windows',
      '$root = "Cybersecurity-Log-Pattern-Analyzer"',
      'New-Item -ItemType Directory -Force -Path $root | Out-Null',
      ...PYTHON_PROJECT_FILES.flatMap((file) => {
        const winPath = `$root/${file.path}`;
        const parent = file.path.includes('/') ? `$root/${file.path.split('/').slice(0, -1).join('/')}` : null;
        const cmds: string[] = [];
        if (parent) {
          cmds.push(`New-Item -ItemType Directory -Force -Path "${parent}" | Out-Null`);
        }
        cmds.push(`@'\n${file.content.replace(/\r?\n$/, '')}\n'@ | Set-Content -Path "${winPath}" -Encoding UTF8`);
        return cmds;
      }),
      'Write-Host "Scaffold complete. Run: cd Cybersecurity-Log-Pattern-Analyzer; python -m venv .venv; .\\.venv\\Scripts\\Activate.ps1; pip install -r requirements.txt; streamlit run app.py"',
    ];
    triggerFileDownload(
      'scaffold_cybershield_python.ps1',
      psLines.join('\n\n'),
      'text/plain;charset=utf-8;'
    );
  };

  return (
    <div className="space-y-5">
      <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Python 3.13 & Streamlit Reference Implementation
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse every modular file in the academic <span className="font-mono text-slate-300">Cybersecurity-Log-Pattern-Analyzer/</span> directory or download a Windows PowerShell bootstrapper.
          </p>
        </div>

        <button
          onClick={handleDownloadSetupScript}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download PowerShell Scaffold (.ps1)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Directory Tree */}
        <div className="lg:col-span-4 bg-[#0F172A] border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 bg-[#0B1222] flex items-center gap-2">
            <FolderTree className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-slate-200">
              Project Tree ({PYTHON_PROJECT_FILES.length} files)
            </span>
          </div>
          <div className="divide-y divide-slate-800/70 max-h-[580px] overflow-y-auto">
            {PYTHON_PROJECT_FILES.map((file) => {
              const isSelected = file.path === activeFile.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedPath(file.path)}
                  className={`w-full text-left px-4 py-2.5 transition-colors ${
                    isSelected ? 'bg-[#172542]' : 'hover:bg-[#131C31]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-xs text-slate-100 truncate">{file.path}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 pl-5">{file.phase}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Code Viewer */}
        <div className="lg:col-span-8 bg-[#0F172A] border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800 bg-[#0B1222] flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-mono text-xs font-semibold text-slate-100">
                {activeFile.path}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{activeFile.description}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#131C31] hover:bg-[#1B2742] border border-slate-700 text-slate-200 rounded-md transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={() =>
                  triggerFileDownload(
                    activeFile.path.split('/').pop() || 'file.py',
                    activeFile.content,
                    'text/plain;charset=utf-8;'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#131C31] hover:bg-[#1B2742] border border-slate-700 text-slate-200 rounded-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          <pre className="p-4 bg-[#080D1A] font-mono text-xs text-slate-200 overflow-x-auto max-h-[520px] leading-relaxed">
            {activeFile.content}
          </pre>
        </div>
      </div>
    </div>
  );
};
