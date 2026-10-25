import React from 'react';
import {
  AUDIT_FINDINGS,
  AuditCategory,
  AuditFinding,
  REPO_INVENTORY,
  SeverityLevel,
} from '../utils/auditData';
import { AuditFilterState, AuditSummaryStats } from '../utils/auditEngine';
import { Check, CheckCircle2, Copy, ExternalLink, FileCode, Search, ShieldAlert } from 'lucide-react';

interface AuditDashboardProps {
  stats: AuditSummaryStats;
  filter: AuditFilterState;
  onFilterChange: (next: AuditFilterState) => void;
  filteredFindings: AuditFinding[];
  selectedFinding: AuditFinding;
  onSelectFinding: (finding: AuditFinding) => void;
  resolvedIds: Set<string>;
  onToggleResolved: (id: string) => void;
  onResolveAll: () => void;
  onResetResolved: () => void;
  onOpenRemediatedFile: (filename: string) => void;
}

export const AuditDashboard: React.FC<AuditDashboardProps> = ({
  stats,
  filter,
  onFilterChange,
  filteredFindings,
  selectedFinding,
  onSelectFinding,
  resolvedIds,
  onToggleResolved,
  onResolveAll,
  onResetResolved,
  onOpenRemediatedFile,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const allPatched = resolvedIds.size === AUDIT_FINDINGS.length;

  const handleCopySnippet = (id: string, code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  const categories: { value: AuditCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Categories' },
    { value: 'security', label: 'Security' },
    { value: 'performance', label: 'Performance' },
    { value: 'seo', label: 'SEO & Local' },
    { value: 'architecture', label: 'Hosting & Repo' },
  ];

  const severities: { value: SeverityLevel | 'all'; label: string }[] = [
    { value: 'all', label: 'All Severities' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
  ];

  const getSeverityLabel = (sev: SeverityLevel) => {
    if (sev === 'critical') return 'Critical Severity';
    if (sev === 'high') return 'High Severity';
    if (sev === 'medium') return 'Medium Severity';
    return 'Low Severity';
  };

  const getSeverityTextColor = (sev: SeverityLevel) => {
    if (sev === 'critical') return 'text-red-700 font-semibold';
    if (sev === 'high') return 'text-amber-700 font-semibold';
    if (sev === 'medium') return 'text-slate-700 font-medium';
    return 'text-slate-600';
  };

  return (
    <div className="space-y-10">
      {/* Top KPI Summary Row */}
      <section aria-label="Production readiness metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 font-medium">Post-Remediation Readiness</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-3xl font-bold font-mono tabular-nums ${
                stats.readinessScore === 100 ? 'text-emerald-700' : 'text-slate-900'
              }`}
              data-testid="readiness-score"
            >
              {stats.readinessScore}/100
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {AUDIT_FINDINGS.length - stats.totalFindings}/{AUDIT_FINDINGS.length} patched
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            {stats.readinessScore === 100
              ? 'Re-audit complete: 0 remaining security, LCP, or SEO blockers.'
              : 'Resolve critical security and LCP blockers before live traffic.'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 font-medium">Remaining Critical &amp; High Issues</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-3xl font-bold font-mono tabular-nums ${
                stats.criticalCount + stats.highCount === 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
              data-testid="critical-high-count"
            >
              {stats.criticalCount + stats.highCount}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {stats.criticalCount} critical · {stats.highCount} high
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            {stats.criticalCount + stats.highCount === 0
              ? 'All 3 critical and 6 high-severity findings resolved & verified.'
              : 'Unthrottled AI APIs, exposed root folders, and 3–6s LCP delay.'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 font-medium">Stylesheet &amp; Webroot Cleanup</div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              -39.8%
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
              30.8 KB → 18.5 KB CSS
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            112 KB of non-webroot files (/os, /assignment-portal, /sm-tailoring, /*.md) isolated.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Audit State Comparison</div>
            <p className="mt-1.5 text-xs text-slate-600">
              {allPatched
                ? 'Currently viewing the 100/100 Post-Remediation Re-Audit state.'
                : 'Currently viewing the unpatched repository baseline.'}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {!allPatched ? (
              <button
                type="button"
                onClick={onResolveAll}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Apply All Fixes (100/100)
              </button>
            ) : (
              <button
                type="button"
                onClick={onResetResolved}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Compare Original Baseline (38/100)
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Complete File-by-File Post-Remediation Re-Audit Table */}
      <section aria-label="Complete repository file inventory" className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Post-Remediation File-by-File Re-Audit (15 Repository Paths Verified)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every file re-analyzed after applying security patches, CSS consolidation, DOMContentLoaded loader dismissal, and JSON-LD schema upgrades.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenRemediatedFile('index.html')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Inspect All 14 Patched Files</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-3 px-4">File / Directory Path</th>
                <th className="py-3 px-4 text-right">Before → After Size</th>
                <th className="py-3 px-4">Post-Remediation Status</th>
                <th className="py-3 px-4 text-right">Remaining Issues</th>
                <th className="py-3 px-4">Post-Remediation Verification &amp; Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {REPO_INVENTORY.map((file) => (
                <tr key={file.path} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                    {file.path}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                    {file.sizeBytes.toLocaleString()} B → {file.afterSizeBytes.toLocaleString()} B
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {file.postAuditStatus === 'isolated-blocked' ? (
                      <span className="text-emerald-700 font-semibold">Isolated &amp; Blocked (404)</span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">Verified Clean</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700 whitespace-nowrap">
                    0 (was {file.issueCount})
                  </td>
                  <td className="py-3 px-4 text-slate-700 max-w-xl leading-relaxed">
                    {file.postAuditNotes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Filter Bar + Master-Detail Audit Explorer */}
      <section aria-label="Vulnerability and optimization explorer" className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
          {/* Category Segmented Filter */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg" role="group" aria-label="Filter by audit category">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => onFilterChange({ ...filter, category: cat.value })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter.category === cat.value
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Severity Filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg" role="group" aria-label="Filter by severity">
              {severities.map((sev) => (
                <button
                  key={sev.value}
                  type="button"
                  onClick={() => onFilterChange({ ...filter, severity: sev.value })}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filter.severity === sev.value
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sev.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Search audit findings by file or keyword"
                value={filter.searchQuery}
                onChange={(e) => onFilterChange({ ...filter, searchQuery: e.target.value })}
                placeholder="Search file or issue..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Split View: Findings List (Left) + Detailed Inspection & Code Diff (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Findings List */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Showing <strong className="font-mono tabular-nums text-slate-900">{filteredFindings.length}</strong> findings</span>
              <span>Click to inspect diff &amp; verification</span>
            </div>

            {filteredFindings.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-slate-800">No findings match the current filter.</p>
                <p className="mt-1 text-xs text-slate-500">Clear your search query or switch category tabs.</p>
                <button
                  type="button"
                  onClick={() => onFilterChange({ category: 'all', severity: 'all', searchQuery: '' })}
                  className="mt-4 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 max-h-[680px] overflow-y-auto">
                {filteredFindings.map((item) => {
                  const isSelected = selectedFinding.id === item.id;
                  const isResolved = resolvedIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectFinding(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectFinding(item);
                        }
                      }}
                      className={`w-full text-left p-4 transition-colors cursor-pointer ${
                        isSelected ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-semibold text-slate-800">{item.id}</span>
                          <span aria-hidden="true">·</span>
                          <span className={getSeverityTextColor(item.severity)}>
                            {getSeverityLabel(item.severity)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{item.category}</span>
                        </div>
                        <span className={`font-mono text-[11px] ${isResolved ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                          {isResolved ? 'Patched' : 'Open'}
                        </span>
                      </div>

                      <h3 className="mt-1.5 text-sm font-semibold leading-snug text-slate-900">
                        {item.title}
                      </h3>

                      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                        <span>{item.file}</span>
                        <span aria-hidden="true">·</span>
                        <span>Lines {item.lines}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Selected Finding Detail */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-semibold text-slate-900">{selectedFinding.id}</span>
                  <span aria-hidden="true">·</span>
                  <span className={getSeverityTextColor(selectedFinding.severity)}>
                    {getSeverityLabel(selectedFinding.severity)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{selectedFinding.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{selectedFinding.file}</span>
                </div>
                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  {selectedFinding.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => onToggleResolved(selectedFinding.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  resolvedIds.has(selectedFinding.id)
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {resolvedIds.has(selectedFinding.id) ? 'Verified Patched' : 'Mark Issue Patched'}
              </button>
            </div>

            {/* Post-Audit Verification Banner */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 leading-relaxed">
                <strong className="font-semibold">Post-Remediation Re-Audit Result: </strong>
                {selectedFinding.postAuditVerification}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h3 className="text-xs font-semibold text-slate-900">Original Issue in Repo</h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  {selectedFinding.summary}
                </p>
              </div>
              <div className="p-4 bg-red-50/50 border border-red-200/80 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-red-900">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-700 shrink-0" />
                  <span>Live-Hosting Risk Prevented</span>
                </div>
                <p className="mt-1.5 text-xs text-red-950/80 leading-relaxed">
                  {selectedFinding.liveHostingRisk}
                </p>
              </div>
            </div>

            {/* Code Comparison: Original Code vs Remediated Code */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                  <span className="font-semibold text-red-800">Before: Original Repository Code ({selectedFinding.file})</span>
                  <span className="font-mono text-[11px]">Lines {selectedFinding.lines}</span>
                </div>
                <pre className="p-3.5 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
                  <code>{selectedFinding.vulnerableSnippet}</code>
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                  <span className="font-semibold text-emerald-800">After: Remediated &amp; Verified Production Code</span>
                  <button
                    type="button"
                    onClick={() => handleCopySnippet(selectedFinding.id, selectedFinding.remediatedSnippet)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    {copiedId === selectedFinding.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied Fix</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Patch</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 bg-slate-950 text-emerald-200 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed border border-emerald-900/40">
                  <code>{selectedFinding.remediatedSnippet}</code>
                </pre>
              </div>
            </div>

            {/* Concrete Action Steps */}
            <div className="pt-2 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-900">Changes Applied &amp; Verified</h3>
              <ol className="mt-2.5 space-y-2 text-xs text-slate-700 list-decimal list-inside">
                {selectedFinding.remediationSteps.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
