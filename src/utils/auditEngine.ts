import { AUDIT_FINDINGS, AuditCategory, AuditFinding, REPO_INVENTORY, SeverityLevel } from './auditData';

export interface AuditFilterState {
  category: AuditCategory | 'all';
  severity: SeverityLevel | 'all';
  searchQuery: string;
}

export interface AuditSummaryStats {
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  byCategory: Record<AuditCategory, number>;
  readinessScore: number;
}

export function filterFindings(
  findings: AuditFinding[],
  filter: AuditFilterState,
  resolvedIds: Set<string> = new Set()
): AuditFinding[] {
  const q = filter.searchQuery.trim().toLowerCase();
  return findings.filter((item) => {
    if (filter.category !== 'all' && item.category !== filter.category) {
      return false;
    }
    if (filter.severity !== 'all' && item.severity !== filter.severity) {
      return false;
    }
    if (q) {
      const haystack = `${item.id} ${item.title} ${item.file} ${item.summary} ${item.liveHostingRisk}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    const aResolved = resolvedIds.has(a.id) ? 1 : 0;
    const bResolved = resolvedIds.has(b.id) ? 1 : 0;
    if (aResolved !== bResolved) return aResolved - bResolved;
    const weight: Record<SeverityLevel, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return weight[b.severity] - weight[a.severity];
  });
}

export function computeAuditStats(
  findings: AuditFinding[] = AUDIT_FINDINGS,
  resolvedIds: Set<string> = new Set()
): AuditSummaryStats {
  const active = findings.filter((f) => !resolvedIds.has(f.id));
  const byCategory: Record<AuditCategory, number> = {
    security: 0,
    performance: 0,
    seo: 0,
    architecture: 0,
  };

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const f of active) {
    byCategory[f.category] += 1;
    if (f.severity === 'critical') criticalCount += 1;
    else if (f.severity === 'high') highCount += 1;
    else if (f.severity === 'medium') mediumCount += 1;
    else lowCount += 1;
  }

  // Calculate production readiness score out of 100 based on remaining weighted penalties
  const maxPenalty = findings.reduce((acc, f) => {
    const w = f.severity === 'critical' ? 14 : f.severity === 'high' ? 8 : f.severity === 'medium' ? 4 : 2;
    return acc + w;
  }, 0);

  const currentPenalty = active.reduce((acc, f) => {
    const w = f.severity === 'critical' ? 14 : f.severity === 'high' ? 8 : f.severity === 'medium' ? 4 : 2;
    return acc + w;
  }, 0);

  const readinessScore = maxPenalty > 0
    ? Math.max(0, Math.min(100, Math.round(((maxPenalty - currentPenalty) / maxPenalty) * 62 + 38)))
    : 100;

  return {
    totalFindings: active.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    byCategory,
    readinessScore,
  };
}

export function buildWhatsAppEnquiryUrl(params: {
  name: string;
  service: string;
  message?: string;
}): { valid: boolean; error?: string; url?: string; formattedBody?: string } {
  const cleanName = params.name.trim();
  const cleanService = params.service.trim();
  const cleanMessage = (params.message || '').trim();

  if (!cleanName) {
    return { valid: false, error: 'Please enter your name before continuing.' };
  }
  if (cleanName.length > 80) {
    return { valid: false, error: 'Name must be 80 characters or fewer.' };
  }
  if (!cleanService) {
    return { valid: false, error: 'Please choose a tailoring service.' };
  }
  if (cleanMessage.length > 500) {
    return { valid: false, error: 'Details must be 500 characters or fewer.' };
  }

  const lines = [
    'Hello SM Tailoring,',
    `My name is ${cleanName}.`,
    `I am enquiring about: ${cleanService}.`,
    cleanMessage ? `Details: ${cleanMessage}` : '',
  ].filter(Boolean);

  const formattedBody = lines.join('\n');
  const url = `https://wa.me/919177787592?text=${encodeURIComponent(formattedBody)}`;
  return { valid: true, url, formattedBody };
}

export function getCleanupFilesCount(): number {
  return REPO_INVENTORY.filter((f) => f.status === 'remove-from-webroot').length;
}
