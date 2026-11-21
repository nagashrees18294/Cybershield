import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Cpu,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Menu,
  Shield,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';
import { AlertsView } from './components/AlertsView';
import { CompilerErrorsView } from './components/CompilerErrorsView';
import { LogInputModal } from './components/LogInputModal';
import { DashboardTab, OverviewView } from './components/OverviewView';
import { PipelineInspectorView } from './components/PipelineInspectorView';
import { ReportsView } from './components/ReportsView';
import { ValidatedLogsView } from './components/ValidatedLogsView';
import { DEFAULT_DETECTION_CONFIG } from './engine/detection/severity';
import { runCompilerPipeline } from './engine/pipeline';
import { SAMPLE_DATASETS } from './engine/sampleData';
import { DetectionConfig, SecurityAlert } from './engine/types';

const TAB_LABELS: Record<DashboardTab, string> = {
  overview: 'Overview',
  alerts: 'Security Alerts',
  pipeline: 'Pipeline & IR',
  logs: 'Validated Logs',
  errors: 'Compiler Errors',
  reports: 'Reports & Config',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [rawLogText, setRawLogText] = useState<string>(SAMPLE_DATASETS[0].content);
  const [fileName, setFileName] = useState<string>(SAMPLE_DATASETS[0].fileName);
  const [activeDatasetId, setActiveDatasetId] = useState<string>(SAMPLE_DATASETS[0].id);
  const [config, setConfig] = useState<DetectionConfig>(DEFAULT_DETECTION_CONFIG);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pipelineResult = useMemo(
    () => runCompilerPipeline(rawLogText, fileName, config),
    [rawLogText, fileName, config]
  );

  const navItems: Array<{
    id: DashboardTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'alerts',
      label: 'Security Alerts',
      icon: ShieldAlert,
      count: pipelineResult.alerts.length,
    },
    {
      id: 'pipeline',
      label: 'Pipeline & IR',
      icon: Cpu,
      count: pipelineResult.lineTraces.length,
    },
    {
      id: 'logs',
      label: 'Validated Logs',
      icon: FileCheck2,
      count: pipelineResult.validCount,
    },
    {
      id: 'errors',
      label: 'Compiler Errors',
      icon: AlertTriangle,
      count: pipelineResult.allErrors.length,
    },
    { id: 'reports', label: 'Reports & Config', icon: FileText },
  ];

  const handleSelectPreset = (id: string) => {
    const found = SAMPLE_DATASETS.find((d) => d.id === id);
    if (!found) return;
    setActiveDatasetId(found.id);
    setRawLogText(found.content);
    setFileName(found.fileName);
    setSelectedAlert(null);
  };

  return (
    <div className="min-h-screen bg-[#080D1A] text-slate-100 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      {/* Left Sidebar (256px) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 shrink-0 bg-[#0B1121] border-r border-slate-800/90 flex flex-col justify-between transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Zone */}
          <div className="h-14 px-5 border-b border-slate-800/90 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-blue-500 shrink-0" />
              <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
                CyberShield
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
              className="p-1 text-slate-400 hover:text-white lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Navigation */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                      : 'text-slate-300 hover:bg-[#131C31] hover:text-slate-100 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.count !== undefined && (
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Dataset Presets */}
        <div className="p-4 border-t border-slate-800/90 space-y-2.5">
          <div className="text-[11px] font-medium text-slate-400">Sample Datasets</div>
          <div className="space-y-1.5">
            {SAMPLE_DATASETS.map((ds) => {
              const isCurrent = activeDatasetId === ds.id && fileName === ds.fileName;
              return (
                <button
                  key={ds.id}
                  onClick={() => handleSelectPreset(ds.id)}
                  className={`w-full text-left px-3 py-2 text-xs rounded-md border transition-colors ${
                    isCurrent
                      ? 'bg-[#131C31] border-blue-500/40 text-slate-100'
                      : 'bg-[#080D1A] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="font-medium truncate">{ds.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb left, 1 primary action right */}
        <header className="h-14 px-6 border-b border-slate-800/90 bg-[#0B1121]/90 flex items-center justify-between gap-8 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="p-1.5 text-slate-400 hover:text-white lg:hidden"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
              <span className="font-medium text-slate-200 whitespace-nowrap">
                {TAB_LABELS[activeTab]}
              </span>
              <span aria-hidden="true">/</span>
              <span className="font-mono truncate">{pipelineResult.fileName}</span>
            </div>
          </div>

          <button
            onClick={() => setIsInputModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload / Edit Logs</span>
          </button>
        </header>

        {/* Active Module Viewport */}
        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewView
              result={pipelineResult}
              onNavigate={setActiveTab}
              onSelectAlert={(a) => setSelectedAlert(a)}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsView
              alerts={pipelineResult.alerts}
              initialSelectedAlert={selectedAlert}
            />
          )}

          {activeTab === 'pipeline' && (
            <PipelineInspectorView traces={pipelineResult.lineTraces} />
          )}

          {activeTab === 'logs' && (
            <ValidatedLogsView records={pipelineResult.intermediateRecords} />
          )}

          {activeTab === 'errors' && (
            <CompilerErrorsView errors={pipelineResult.allErrors} />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              result={pipelineResult}
              config={config}
              onUpdateConfig={setConfig}
            />
          )}
        </main>
      </div>

      {/* Modal for Editing / Uploading Logs */}
      <LogInputModal
        isOpen={isInputModalOpen}
        currentText={rawLogText}
        currentFileName={fileName}
        onClose={() => setIsInputModalOpen(false)}
        onApply={(nextText, nextFile) => {
          setRawLogText(nextText);
          setFileName(nextFile);
          setActiveDatasetId('custom');
          setSelectedAlert(null);
        }}
      />
    </div>
  );
}
