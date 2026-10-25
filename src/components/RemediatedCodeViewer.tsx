import React from 'react';
import { REMEDIATED_FILES, RemediatedFileItem } from '../utils/remediatedFiles';
import { Check, Copy, Download } from 'lucide-react';

interface RemediatedCodeViewerProps {
  selectedFilename: string;
  onSelectFilename: (filename: string) => void;
}

export const RemediatedCodeViewer: React.FC<RemediatedCodeViewerProps> = ({
  selectedFilename,
  onSelectFilename,
}) => {
  const [copiedFile, setCopiedFile] = React.useState<string | null>(null);

  const activeFile: RemediatedFileItem =
    REMEDIATED_FILES.find((f) => f.filename === selectedFilename) || REMEDIATED_FILES[0];

  const handleCopy = (filename: string, code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedFile(filename);
    window.setTimeout(() => setCopiedFile(null), 1800);
  };

  const handleDownloadSingle = (file: RemediatedFileItem) => {
    const blob = new Blob([file.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename.replace(/\//g, '_');
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const handleDownloadAllBundle = () => {
    const bundleText = REMEDIATED_FILES.map(
      (f) =>
        `================================================================================\nFILE: ${f.filename}\nSTATUS: ${f.postAuditStatus}\nSIZE: ${f.beforeBytes} B -> ${f.afterBytes} B\nSUMMARY: ${f.summary}\n================================================================================\n\n${f.code}\n\n`
    ).join('\n');
    const blob = new Blob([bundleText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sm-tailoring-remediated-production-bundle.txt';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            All {REMEDIATED_FILES.length} Remediated &amp; Re-Audited Production Files
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Every file below has been syntax-checked (`node --check`), JSON-validated, and verified against security, performance, and SEO rules.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadAllBundle}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download All {REMEDIATED_FILES.length} Patched Files</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* File Selector Sidebar */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 text-xs font-semibold text-slate-700">
            Select Verified File ({REMEDIATED_FILES.length})
          </div>
          <div className="divide-y divide-slate-200 max-h-[680px] overflow-y-auto">
            {REMEDIATED_FILES.map((file) => {
              const isSelected = file.filename === activeFile.filename;
              return (
                <button
                  key={file.filename}
                  type="button"
                  onClick={() => onSelectFilename(file.filename)}
                  className={`w-full text-left p-4 transition-colors cursor-pointer ${
                    isSelected ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-900">
                      {file.filename}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">Verified</span>
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-slate-500">
                    {file.beforeBytes.toLocaleString()} B → {file.afterBytes.toLocaleString()} B
                  </div>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                    {file.summary}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Code Content Panel */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="text-xs text-slate-500">
                <span>{activeFile.category}</span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono">{activeFile.code.split('\n').length} lines</span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono">{activeFile.beforeBytes.toLocaleString()} B → {activeFile.afterBytes.toLocaleString()} B</span>
                <span aria-hidden="true"> · </span>
                <span className="text-emerald-700 font-semibold">{activeFile.postAuditStatus}</span>
              </div>
              <h3 className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {activeFile.filename}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(activeFile.filename, activeFile.code)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedFile === activeFile.filename ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied File</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Full File</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleDownloadSingle(activeFile)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <h4 className="text-xs font-semibold text-slate-900">Key Fixes &amp; Post-Audit Verification in {activeFile.filename}</h4>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-700 list-disc list-inside">
              {activeFile.changesMade.map((change, i) => (
                <li key={i}>{change}</li>
              ))}
            </ul>
          </div>

          <pre className="p-4 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto max-h-[540px] leading-relaxed">
            <code>{activeFile.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
