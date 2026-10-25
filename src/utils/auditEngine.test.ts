import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIT_FINDINGS, REPO_INVENTORY } from './auditData';
import { REMEDIATED_FILES } from './remediatedFiles';
import { buildWhatsAppEnquiryUrl, computeAuditStats, filterFindings, getCleanupFilesCount } from './auditEngine';

test('computeAuditStats calculates accurate initial counts and 100% readiness when all resolved', () => {
  const initial = computeAuditStats(AUDIT_FINDINGS, new Set());
  assert.equal(initial.totalFindings, AUDIT_FINDINGS.length);
  assert.equal(initial.criticalCount, 3);
  assert.ok(initial.readinessScore >= 38 && initial.readinessScore < 100);

  const allIds = new Set(AUDIT_FINDINGS.map((f) => f.id));
  const resolved = computeAuditStats(AUDIT_FINDINGS, allIds);
  assert.equal(resolved.totalFindings, 0);
  assert.equal(resolved.criticalCount, 0);
  assert.equal(resolved.readinessScore, 100);
});

test('filterFindings filters by category, severity, and search query accurately', () => {
  const securityOnly = filterFindings(AUDIT_FINDINGS, {
    category: 'security',
    severity: 'all',
    searchQuery: '',
  });
  assert.ok(securityOnly.length > 0);
  assert.ok(securityOnly.every((f) => f.category === 'security'));

  const criticalOnly = filterFindings(AUDIT_FINDINGS, {
    category: 'all',
    severity: 'critical',
    searchQuery: '',
  });
  assert.equal(criticalOnly.length, 3);

  const searchCanvas = filterFindings(AUDIT_FINDINGS, {
    category: 'all',
    severity: 'all',
    searchQuery: 'canvas',
  });
  assert.equal(searchCanvas.length, 1);
  assert.equal(searchCanvas[0].id, 'PERF-02');
});

test('buildWhatsAppEnquiryUrl validates required inputs and encodes WhatsApp URL properly', () => {
  const missingName = buildWhatsAppEnquiryUrl({ name: '   ', service: 'Custom blouse stitching' });
  assert.equal(missingName.valid, false);
  assert.ok(missingName.error?.includes('name'));

  const missingService = buildWhatsAppEnquiryUrl({ name: 'Ananya', service: '' });
  assert.equal(missingService.valid, false);
  assert.ok(missingService.error?.includes('service'));

  const validResult = buildWhatsAppEnquiryUrl({
    name: 'Ananya Rao',
    service: 'Custom blouse stitching',
    message: 'Bridal silk blouse with maggam embroidery',
  });
  assert.equal(validResult.valid, true);
  assert.ok(validResult.url?.startsWith('https://wa.me/919177787592?text='));
  assert.ok(validResult.formattedBody?.includes('My name is Ananya Rao.'));
});

test('post-remediation inventory and remediated files pass structural and JSON checks', () => {
  assert.equal(getCleanupFilesCount(), 2);
  assert.equal(REMEDIATED_FILES.length, 14);
  assert.ok(REPO_INVENTORY.every((item) => item.postAuditNotes.startsWith('RE-AUDIT PASS:')));

  const vercelFile = REMEDIATED_FILES.find((f) => f.filename === 'vercel.json')!;
  const parsedVercel = JSON.parse(vercelFile.code);
  assert.equal(parsedVercel.headers[0].headers.length, 5);

  const manifestFile = REMEDIATED_FILES.find((f) => f.filename === 'manifest.webmanifest')!;
  const parsedManifest = JSON.parse(manifestFile.code);
  assert.equal(parsedManifest.theme_color, '#4b0d20');
});
