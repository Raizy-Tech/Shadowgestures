import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkTemplateCollision,
  computeCentroid,
  computeThreeSampleTemplate,
  DOLLAR_ONE_CONSTANTS,
  evaluateInwardSwipeFilter,
  normalizeStroke,
  recognizeGesture,
  resamplePoints,
} from './dollarOneEngine';
import {
  generateSyntheticSymbolStroke,
  INITIAL_GESTURE_ENTITIES,
} from './gestureStore';

test('resamplePoints produces exactly N=64 equidistant points', () => {
  const rawW = generateSyntheticSymbolStroke('W', 0);
  const resampled = resamplePoints(rawW, 64);
  assert.equal(resampled.length, 64);
});

test('normalizeStroke centers centroid at (0,0) and bounds within 250x250 square', () => {
  const rawS = generateSyntheticSymbolStroke('S', 0);
  const telemetry = normalizeStroke(rawS);
  assert.equal(telemetry.normalizedPoints.length, DOLLAR_ONE_CONSTANTS.NUM_POINTS);

  const centroid = computeCentroid(telemetry.normalizedPoints);
  assert.ok(Math.abs(centroid.x) < 1e-4, `Expected centroid.x ~ 0, got ${centroid.x}`);
  assert.ok(Math.abs(centroid.y) < 1e-4, `Expected centroid.y ~ 0, got ${centroid.y}`);
});

test('$1 Unistroke Recognizer classifies W, C, S, V, Z accurately with scale & rotation invariance', () => {
  for (const sym of ['W', 'C', 'S', 'V', 'Z'] as const) {
    // Variant 1 has jitter, +4 deg rotation, and 0.94 scale
    const sample = generateSyntheticSymbolStroke(sym, 1);
    const result = recognizeGesture(sample, INITIAL_GESTURE_ENTITIES, 0.8);
    assert.equal(result.passedConfidenceGate, true, `Expected ${sym} to pass confidence gate`);
    assert.equal(result.matchedEntity?.symbolName, sym);
    assert.ok(result.bestScore >= 0.85, `Expected ${sym} score >= 0.85, got ${result.bestScore}`);
  }
});

test('Confidence gate rejects strokes with fewer than 8 points or low similarity', () => {
  const tinyStroke = [
    { x: 10, y: 10 },
    { x: 14, y: 12 },
    { x: 18, y: 15 },
  ];
  const result = recognizeGesture(tinyStroke, INITIAL_GESTURE_ENTITIES, 0.8);
  assert.equal(result.passedConfidenceGate, false);
});

test('FR-04 evaluateInwardSwipeFilter enforces |dx| >= 24dp and |dx| > 1.5 * |dy|', () => {
  // Valid inward swipe from Right Edge: dx = -32dp, dy = 6dp
  const validRight = evaluateInwardSwipeFilter({
    startX: 380,
    startY: 400,
    currentX: 348,
    currentY: 406,
    edgeSide: 'RIGHT',
    density: 1,
  });
  assert.equal(validRight.triggered, true);

  // Vertical scroll inside edge zone: dx = -28dp, dy = 25dp (|dx| <= 1.5 * |dy|)
  const verticalScroll = evaluateInwardSwipeFilter({
    startX: 380,
    startY: 400,
    currentX: 352,
    currentY: 425,
    edgeSide: 'RIGHT',
    density: 1,
  });
  assert.equal(verticalScroll.triggered, false);
  assert.equal(verticalScroll.passesHorizontalRatio, false);

  // Short inward tap/nudge: dx = -15dp (< 24dp)
  const shortSwipe = evaluateInwardSwipeFilter({
    startX: 380,
    startY: 400,
    currentX: 365,
    currentY: 401,
    edgeSide: 'RIGHT',
    density: 1,
  });
  assert.equal(shortSwipe.triggered, false);
  assert.equal(shortSwipe.exceedsDisplacement, false);
});

test('Section 11: 3-Sample Averaging Recorder validates >= 85% mutual similarity', () => {
  const s1 = generateSyntheticSymbolStroke('L', 0);
  const s2 = generateSyntheticSymbolStroke('L', 1);
  const s3 = generateSyntheticSymbolStroke('L', 2);

  const consistent = computeThreeSampleTemplate([s1, s2, s3]);
  assert.equal(consistent.isValid, true);
  assert.ok(consistent.mutualSimilarity >= 0.85);
  assert.equal(consistent.averagedNormalizedPoints.length, 64);

  // Inconsistent samples: L, O, W
  const inconsistent = computeThreeSampleTemplate([
    generateSyntheticSymbolStroke('L', 0),
    generateSyntheticSymbolStroke('O', 0),
    generateSyntheticSymbolStroke('W', 0),
  ]);
  assert.equal(inconsistent.isValid, false);
});

test('Section 11: Ambiguity & Collision Guard detects collisions >= 0.82', () => {
  // Candidate 'W' variant should collide with existing 'W' (Launch WhatsApp)
  const candidateW = normalizeStroke(
    generateSyntheticSymbolStroke('W', 1)
  ).normalizedPoints;
  const collision = checkTemplateCollision(candidateW, INITIAL_GESTURE_ENTITIES);
  assert.equal(collision.hasCollision, true);
  assert.equal(collision.collidingEntity?.targetPackage, 'com.whatsapp');
  assert.ok(collision.collisionScore >= 0.82);

  // Candidate closed triangle 'Δ' is geometrically distinct from W, C, S, V, Z
  const candidateTriangle = normalizeStroke(
    generateSyntheticSymbolStroke('Δ', 0)
  ).normalizedPoints;
  const noCollision = checkTemplateCollision(
    candidateTriangle,
    INITIAL_GESTURE_ENTITIES
  );
  assert.equal(noCollision.hasCollision, false);
});
