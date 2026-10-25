import React from 'react';
import {
  KOTLIN_SOURCE_MODULES,
  SRS_FUNCTIONAL_REQUIREMENTS,
} from '../utils/kotlinScaffolding';

interface KotlinSourceAndSrsViewerProps {
  selectedModuleId: string;
  onSelectModuleId: (id: string) => void;
  onExportKotlinBundle: () => void;
}

export const KotlinSourceAndSrsViewer: React.FC<KotlinSourceAndSrsViewerProps> = ({
  selectedModuleId,
  onSelectModuleId,
  onExportKotlinBundle,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const activeModule =
    KOTLIN_SOURCE_MODULES.find((m) => m.id === selectedModuleId) ??
    KOTLIN_SOURCE_MODULES[0];

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeModule.code);
      setCopiedId(activeModule.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="space-y-6">
      {/* Production Kotlin Scaffolding Viewer (Section 12) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              Section 12 · Production Android Kotlin Scaffolding &amp; Manifest
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight font-display mt-0.5">
              Three-Tier Modular Architecture Implementation
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/assets/aistudio/ShadowGestures_SRS_and_Technical_Architecture_Proposal__1__4296ab51.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Open Original SRS PDF
            </a>
            <button
              type="button"
              onClick={onExportKotlinBundle}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Download All Kotlin Modules
            </button>
          </div>
        </div>

        {/* File Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {KOTLIN_SOURCE_MODULES.map((mod) => (
            <button
              key={mod.id}
              type="button"
              onClick={() => onSelectModuleId(mod.id)}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeModule.id === mod.id
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {mod.filename}
            </button>
          ))}
        </div>

        {/* Active Module Metadata & Code Block */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-slate-900/90 border-b border-slate-800">
            <div className="space-y-0.5">
              <div className="text-xs font-mono text-white font-semibold">
                {activeModule.filename}{' '}
                <span className="text-slate-400 font-normal">
                  · {activeModule.packagePath}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {activeModule.layer} · Covers: {activeModule.requirementsCovered.join(', ')}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-1.5 text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap shrink-0"
            >
              {copiedId === activeModule.id ? 'Copied to Clipboard' : 'Copy Source'}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-[460px]">
            <code>{activeModule.code}</code>
          </pre>
        </div>
      </div>

      {/* Section 4 Functional Requirements Specification Table (FR-01 to FR-09) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <div className="text-xs font-mono text-cyan-400">
            Section 04 &amp; Section 06 · IEEE 830 Functional &amp; Security Requirements Matrix
          </div>
          <h3 className="text-base font-bold text-white font-display mt-0.5">
            SG-SRS-2026-V1.0 Verification Matrix (FR-01 to FR-09)
          </h3>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-300 font-mono">
                <th className="py-3 px-4">Req ID</th>
                <th className="py-3 px-4">Feature Module</th>
                <th className="py-3 px-4">Technical Requirement Specification</th>
                <th className="py-3 px-4">SLA / Bound</th>
                <th className="py-3 px-4">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {SRS_FUNCTIONAL_REQUIREMENTS.map((req) => (
                <tr key={req.reqId} className="hover:bg-slate-900/40">
                  <td className="py-3 px-4 font-mono font-semibold text-cyan-400 whitespace-nowrap">
                    {req.reqId}
                  </td>
                  <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                    {req.module}
                  </td>
                  <td className="py-3 px-4 leading-relaxed text-slate-300">
                    {req.specification}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                    {req.slaTarget}
                  </td>
                  <td className="py-3 px-4 font-mono whitespace-nowrap">
                    <span
                      className={
                        req.priority === 'P0-Crit'
                          ? 'text-rose-400 font-semibold'
                          : 'text-cyan-400 font-semibold'
                      }
                    >
                      {req.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
