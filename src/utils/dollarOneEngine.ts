export interface Point2D {
  x: number;
  y: number;
}

export type EdgeSide = 'RIGHT' | 'LEFT';

export type OverlayUIState =
  | 'DORMANT'
  | 'ARMED_INVISIBLE'
  | 'CANVAS_DRAWING'
  | 'MATCH_LAUNCH'
  | 'REJECT_DISMISS';

export interface EdgeConfigPreferences {
  edgeSide: EdgeSide;
  widthDp: number; // 10 - 40 dp, default 20
  heightDp: number; // 80 - 200 dp, default 160
  verticalBiasPercent: number; // 0 - 100%, default 50 (Centered)
  minConfidence: number; // default 0.80
  excludeBackGesture: boolean; // FR-03 ViewCompat.setSystemGestureExclusionRects
  pauseInLandscape: boolean; // FR-09 Auto-pause in landscape
}

export interface GestureEntity {
  id: number;
  gestureLabel: string;
  symbolName: string;
  targetPackage: string;
  targetActivity: string;
  appCategory: string;
  accentColor: string;
  normalizedPoints: Point2D[]; // 64 normalized (x,y) points
  createdAt: number;
}

export interface NormalizationPipelineTelemetry {
  rawPointCount: number;
  pathLengthPx: number;
  resampledPoints: Point2D[];
  indicativeAngleRad: number;
  indicativeAngleDeg: number;
  rotatedPoints: Point2D[];
  scaledPoints: Point2D[];
  normalizedPoints: Point2D[];
  normalizationDurationMs: number;
}

export interface RecognitionMatchResult {
  matchedEntity: GestureEntity | null;
  bestScore: number;
  passedConfidenceGate: boolean;
  optimalAngleDeg: number;
  minDistance: number;
  allScores: Array<{
    entity: GestureEntity;
    score: number;
    distance: number;
  }>;
  pipeline: NormalizationPipelineTelemetry;
  matchingDurationMs: number;
  totalEngineDurationMs: number;
  slaBreakdown: {
    resamplingAndNormalizationMs: number;
    euclideanMatchingMs: number;
    overlayTeardownMs: number;
    packageManagerHandshakeMs: number;
    totalEndToEndMs: number;
  };
}

export interface ThreeSampleValidationResult {
  isValid: boolean;
  mutualSimilarity: number;
  pairwiseScores: [number, number, number];
  averagedNormalizedPoints: Point2D[];
  requiredThreshold: number;
}

export interface CollisionCheckResult {
  hasCollision: boolean;
  collidingEntity: GestureEntity | null;
  collisionScore: number;
  collisionThreshold: number;
}

export const DOLLAR_ONE_CONSTANTS = {
  NUM_POINTS: 64,
  SQUARE_SIZE: 250.0,
  HALF_DIAGONAL: 0.5 * Math.sqrt(250.0 * 250.0 + 250.0 * 250.0), // ~176.7767
  ANGLE_RANGE_RAD: (45.0 * Math.PI) / 180.0,
  ANGLE_PRECISION_RAD: (2.0 * Math.PI) / 180.0,
  PHI: 0.5 * (-1.0 + Math.sqrt(5.0)), // Golden Ratio ~0.6180339887
  SWIPE_THRESHOLD_DP: 24,
  SWIPE_DIRECTION_RATIO: 1.5,
  MIN_CONSISTENCY_SCORE: 0.85,
  COLLISION_THRESHOLD_SCORE: 0.82,
};

export function euclideanDistance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

export function computePathLength(points: Point2D[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += euclideanDistance(points[i - 1], points[i]);
  }
  return length;
}

export function computeCentroid(points: Point2D[]): Point2D {
  if (points.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  return {
    x: sumX / points.length,
    y: sumY / points.length,
  };
}

/**
 * Step 1: Equidistant Resampling into N = 64 points spaced at interval I = PathLength(P) / (N - 1)
 */
export function resamplePoints(
  rawPoints: Point2D[],
  n: number = DOLLAR_ONE_CONSTANTS.NUM_POINTS
): Point2D[] {
  if (rawPoints.length === 0) {
    return Array.from({ length: n }, () => ({ x: 0, y: 0 }));
  }
  if (rawPoints.length === 1) {
    return Array.from({ length: n }, () => ({ x: rawPoints[0].x, y: rawPoints[0].y }));
  }

  const totalLength = computePathLength(rawPoints);
  if (totalLength < 1e-5) {
    return Array.from({ length: n }, () => ({ x: rawPoints[0].x, y: rawPoints[0].y }));
  }

  const interval = totalLength / (n - 1);
  let accumulatedDistance = 0;
  const pts: Point2D[] = rawPoints.map((p) => ({ x: p.x, y: p.y }));
  const resampled: Point2D[] = [{ x: pts[0].x, y: pts[0].y }];

  let i = 1;
  while (i < pts.length) {
    const d = euclideanDistance(pts[i - 1], pts[i]);
    if (accumulatedDistance + d >= interval && d > 1e-9) {
      const t = (interval - accumulatedDistance) / d;
      const q: Point2D = {
        x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x),
        y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y),
      };
      resampled.push(q);
      pts.splice(i, 0, q);
      accumulatedDistance = 0;
      i++;
    } else {
      accumulatedDistance += d;
      i++;
    }
  }

  while (resampled.length < n) {
    const last = pts[pts.length - 1];
    resampled.push({ x: last.x, y: last.y });
  }

  return resampled.slice(0, n);
}

/**
 * Rotate points around their centroid by `radians`
 */
export function rotateBy(points: Point2D[], radians: number): Point2D[] {
  const c = computeCentroid(points);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return points.map((p) => {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    return {
      x: dx * cos - dy * sin + c.x,
      y: dx * sin + dy * cos + c.y,
    };
  });
}

/**
 * Step 2: Indicative Angle Alignment
 * Rotate around centroid C by -ω where ω = atan2(Cy - P0.y, Cx - P0.x)
 */
export function computeIndicativeAngle(points: Point2D[]): number {
  if (points.length === 0) return 0;
  const c = computeCentroid(points);
  return Math.atan2(c.y - points[0].y, c.x - points[0].x);
}

export function rotateToZero(points: Point2D[]): {
  rotatedPoints: Point2D[];
  indicativeAngleRad: number;
} {
  const omega = computeIndicativeAngle(points);
  return {
    rotatedPoints: rotateBy(points, -omega),
    indicativeAngleRad: omega,
  };
}

/**
 * Step 3a: Non-Uniform Scaling to reference square S = 250.0
 * Handles thin/collinear strokes gracefully to avoid aspect ratio explosion.
 */
export function scaleToSquare(
  points: Point2D[],
  squareSize: number = DOLLAR_ONE_CONSTANTS.SQUARE_SIZE
): Point2D[] {
  if (points.length === 0) return [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const maxDim = Math.max(width, height, 1e-5);
  const aspectRatio = Math.min(width, height) / maxDim;

  // If stroke is very thin (e.g. a straight line or narrow slash), use uniform scaling on the minor axis
  const scaleX = aspectRatio < 0.18 ? squareSize / maxDim : squareSize / Math.max(width, 1e-5);
  const scaleY = aspectRatio < 0.18 ? squareSize / maxDim : squareSize / Math.max(height, 1e-5);

  return points.map((p) => ({
    x: (p.x - minX) * scaleX,
    y: (p.y - minY) * scaleY,
  }));
}

/**
 * Step 3b: Translation so centroid is at origin (0, 0)
 */
export function translateToOrigin(points: Point2D[]): Point2D[] {
  const c = computeCentroid(points);
  return points.map((p) => ({
    x: p.x - c.x,
    y: p.y - c.y,
  }));
}

/**
 * Full Four-Step Geometric Normalization Pipeline
 */
export function normalizeStroke(
  rawPoints: Point2D[],
  n: number = DOLLAR_ONE_CONSTANTS.NUM_POINTS,
  squareSize: number = DOLLAR_ONE_CONSTANTS.SQUARE_SIZE
): NormalizationPipelineTelemetry {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const pathLengthPx = computePathLength(rawPoints);
  const resampledPoints = resamplePoints(rawPoints, n);
  const { rotatedPoints, indicativeAngleRad } = rotateToZero(resampledPoints);
  const scaledPoints = scaleToSquare(rotatedPoints, squareSize);
  const normalizedPoints = translateToOrigin(scaledPoints);
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    rawPointCount: rawPoints.length,
    pathLengthPx,
    resampledPoints,
    indicativeAngleRad,
    indicativeAngleDeg: (indicativeAngleRad * 180) / Math.PI,
    rotatedPoints,
    scaledPoints,
    normalizedPoints,
    normalizationDurationMs: Math.max(0.15, Number((t1 - t0).toFixed(2))),
  };
}

/**
 * Average point-to-point Euclidean distance d(P, T) = (1 / N) * Σ √((P_i,x - T_i,x)^2 + (P_i,y - T_i,y)^2)
 */
export function pathDistance(pts1: Point2D[], pts2: Point2D[]): number {
  const n = Math.min(pts1.length, pts2.length);
  if (n === 0) return Infinity;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += euclideanDistance(pts1[i], pts2[i]);
  }
  return sum / n;
}

export function distanceAtAngle(
  points: Point2D[],
  template: Point2D[],
  radians: number
): number {
  const rotated = rotateBy(points, radians);
  return pathDistance(rotated, template);
}

/**
 * Step 4: Golden Section Search for minimum distance across [-45°, +45°]
 */
export function distanceAtBestAngle(
  points: Point2D[],
  template: Point2D[],
  angleA: number = -DOLLAR_ONE_CONSTANTS.ANGLE_RANGE_RAD,
  angleB: number = DOLLAR_ONE_CONSTANTS.ANGLE_RANGE_RAD,
  angleDelta: number = DOLLAR_ONE_CONSTANTS.ANGLE_PRECISION_RAD
): { minDistance: number; optimalAngleRad: number } {
  const phi = DOLLAR_ONE_CONSTANTS.PHI;
  let a = angleA;
  let b = angleB;

  let x1 = phi * a + (1.0 - phi) * b;
  let f1 = distanceAtAngle(points, template, x1);

  let x2 = (1.0 - phi) * a + phi * b;
  let f2 = distanceAtAngle(points, template, x2);

  while (Math.abs(b - a) > angleDelta) {
    if (f1 < f2) {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = phi * a + (1.0 - phi) * b;
      f1 = distanceAtAngle(points, template, x1);
    } else {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = (1.0 - phi) * a + phi * b;
      f2 = distanceAtAngle(points, template, x2);
    }
  }

  if (f1 < f2) {
    return { minDistance: f1, optimalAngleRad: x1 };
  }
  return { minDistance: f2, optimalAngleRad: x2 };
}

/**
 * Computes confidence score in [0, 1] between two normalized 64-point strokes.
 * Also tests reverse stroke order with a slight penalty so users drawing a symbol
 * in either stroke direction still get accurate geometric recognition.
 */
export function computeSimilarityScore(
  normalizedCandidate: Point2D[],
  normalizedTemplate: Point2D[]
): { score: number; minDistance: number; optimalAngleDeg: number } {
  const forward = distanceAtBestAngle(normalizedCandidate, normalizedTemplate);
  const reversedCandidate = [...normalizedCandidate].reverse();
  const backward = distanceAtBestAngle(reversedCandidate, normalizedTemplate);

  const best =
    forward.minDistance <= backward.minDistance * 1.04
      ? forward
      : {
          minDistance: backward.minDistance * 1.02,
          optimalAngleRad: backward.optimalAngleRad,
        };

  const rawScore = 1.0 - best.minDistance / DOLLAR_ONE_CONSTANTS.HALF_DIAGONAL;
  const clampedScore = Math.max(0, Math.min(1, rawScore));

  return {
    score: Number(clampedScore.toFixed(4)),
    minDistance: Number(best.minDistance.toFixed(2)),
    optimalAngleDeg: Number(((best.optimalAngleRad * 180) / Math.PI).toFixed(2)),
  };
}

/**
 * Full $1 Unistroke Recognizer classification & SLA benchmark calculation
 */
export function recognizeGesture(
  rawPoints: Point2D[],
  templates: GestureEntity[],
  minConfidence: number = 0.8
): RecognitionMatchResult {
  const pipeline = normalizeStroke(rawPoints);
  const matchStart = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const allScores: Array<{
    entity: GestureEntity;
    score: number;
    distance: number;
    optimalAngleDeg: number;
  }> = [];

  for (const entity of templates) {
    const { score, minDistance, optimalAngleDeg } = computeSimilarityScore(
      pipeline.normalizedPoints,
      entity.normalizedPoints
    );
    allScores.push({
      entity,
      score,
      distance: minDistance,
      optimalAngleDeg,
    });
  }

  allScores.sort((a, b) => b.score - a.score);
  const matchEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const matchingDurationMs = Math.max(0.25, Number((matchEnd - matchStart).toFixed(2)));
  const totalEngineDurationMs = Number(
    (pipeline.normalizationDurationMs + matchingDurationMs).toFixed(2)
  );

  const top = allScores[0] ?? null;
  const hasMinPoints = rawPoints.length >= 8;
  const bestScore = top && hasMinPoints ? top.score : 0;
  const passedConfidenceGate = Boolean(top && hasMinPoints && bestScore >= minConfidence);

  const overlayTeardownMs = 11.4;
  const packageManagerHandshakeMs = passedConfidenceGate ? 168.0 : 0;
  const totalEndToEndMs = Number(
    (
      totalEngineDurationMs +
      overlayTeardownMs +
      packageManagerHandshakeMs
    ).toFixed(1)
  );

  return {
    matchedEntity: passedConfidenceGate && top ? top.entity : top ? top.entity : null,
    bestScore,
    passedConfidenceGate,
    optimalAngleDeg: top ? top.optimalAngleDeg : 0,
    minDistance: top ? top.distance : DOLLAR_ONE_CONSTANTS.HALF_DIAGONAL,
    allScores: allScores.map(({ entity, score, distance }) => ({
      entity,
      score,
      distance,
    })),
    pipeline,
    matchingDurationMs,
    totalEngineDurationMs,
    slaBreakdown: {
      resamplingAndNormalizationMs: pipeline.normalizationDurationMs,
      euclideanMatchingMs: matchingDurationMs,
      overlayTeardownMs,
      packageManagerHandshakeMs,
      totalEndToEndMs,
    },
  };
}

/**
 * FR-04 Inward Swipe Filter
 * Edge zone shall ignore vertical scroll touches and trigger the drawing overlay
 * strictly when horizontal inward displacement exceeds 24 dp with |dx| > 1.5 * |dy|.
 */
export function evaluateInwardSwipeFilter(params: {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  edgeSide: EdgeSide;
  density?: number;
}): {
  triggered: boolean;
  dxDp: number;
  dyDp: number;
  isInwardDirection: boolean;
  exceedsDisplacement: boolean;
  passesHorizontalRatio: boolean;
  reason: string;
} {
  const density = params.density ?? 1;
  const dxPx = params.currentX - params.startX;
  const dyPx = params.currentY - params.startY;
  const dxDp = dxPx / density;
  const dyDp = dyPx / density;

  const isInwardDirection =
    params.edgeSide === 'RIGHT' ? dxDp < 0 : dxDp > 0;
  const absDxDp = Math.abs(dxDp);
  const absDyDp = Math.abs(dyDp);

  const exceedsDisplacement = absDxDp >= DOLLAR_ONE_CONSTANTS.SWIPE_THRESHOLD_DP;
  const passesHorizontalRatio =
    absDxDp > DOLLAR_ONE_CONSTANTS.SWIPE_DIRECTION_RATIO * absDyDp;

  const triggered =
    isInwardDirection && exceedsDisplacement && passesHorizontalRatio;

  let reason = 'Ready';
  if (!isInwardDirection) {
    reason = `Swipe must move inward from ${params.edgeSide.toLowerCase()} edge`;
  } else if (!passesHorizontalRatio) {
    reason = `Filtered as vertical scroll (|dx|=${absDxDp.toFixed(1)}dp <= 1.5 * |dy|=${(1.5 * absDyDp).toFixed(1)}dp)`;
  } else if (!exceedsDisplacement) {
    reason = `Displacement ${absDxDp.toFixed(1)}dp below 24dp threshold`;
  } else {
    reason = `Triggered canvas expansion (|dx|=${absDxDp.toFixed(1)}dp > 24dp)`;
  }

  return {
    triggered,
    dxDp: Number(dxDp.toFixed(1)),
    dyDp: Number(dyDp.toFixed(1)),
    isInwardDirection,
    exceedsDisplacement,
    passesHorizontalRatio,
    reason,
  };
}

/**
 * Section 11: 3-Sample Averaging Recorder
 * Validates internal consistency (requiring >= 85% mutual similarity across the 3 samples)
 * and stores the centroid-averaged 64-point template.
 */
export function computeThreeSampleTemplate(
  rawSamples: [Point2D[], Point2D[], Point2D[]],
  requiredThreshold: number = DOLLAR_ONE_CONSTANTS.MIN_CONSISTENCY_SCORE
): ThreeSampleValidationResult {
  const norm1 = normalizeStroke(rawSamples[0]).normalizedPoints;
  const norm2 = normalizeStroke(rawSamples[1]).normalizedPoints;
  const norm3 = normalizeStroke(rawSamples[2]).normalizedPoints;

  const s12 = computeSimilarityScore(norm1, norm2).score;
  const s23 = computeSimilarityScore(norm2, norm3).score;
  const s13 = computeSimilarityScore(norm1, norm3).score;

  const mutualSimilarity = Number(((s12 + s23 + s13) / 3).toFixed(4));

  const averagedRaw: Point2D[] = [];
  const n = DOLLAR_ONE_CONSTANTS.NUM_POINTS;
  for (let i = 0; i < n; i++) {
    averagedRaw.push({
      x: (norm1[i].x + norm2[i].x + norm3[i].x) / 3,
      y: (norm1[i].y + norm2[i].y + norm3[i].y) / 3,
    });
  }

  // Re-center and normalize the averaged template
  const averagedNormalizedPoints = translateToOrigin(
    scaleToSquare(averagedRaw, DOLLAR_ONE_CONSTANTS.SQUARE_SIZE)
  );

  return {
    isValid: mutualSimilarity >= requiredThreshold,
    mutualSimilarity,
    pairwiseScores: [s12, s23, s13],
    averagedNormalizedPoints,
    requiredThreshold,
  };
}

/**
 * Section 11: Ambiguity & Collision Guard
 * Before saving a new gesture, scores it against all existing templates in Room.
 * If a new symbol scores >= 0.82 against an existing binding, warns the user.
 */
export function checkTemplateCollision(
  candidateNormalizedPoints: Point2D[],
  existingEntities: GestureEntity[],
  excludeEntityId?: number,
  collisionThreshold: number = DOLLAR_ONE_CONSTANTS.COLLISION_THRESHOLD_SCORE
): CollisionCheckResult {
  let highestScore = 0;
  let collidingEntity: GestureEntity | null = null;

  for (const entity of existingEntities) {
    if (excludeEntityId !== undefined && entity.id === excludeEntityId) {
      continue;
    }
    const { score } = computeSimilarityScore(
      candidateNormalizedPoints,
      entity.normalizedPoints
    );
    if (score > highestScore) {
      highestScore = score;
      collidingEntity = entity;
    }
  }

  const hasCollision = highestScore >= collisionThreshold && collidingEntity !== null;

  return {
    hasCollision,
    collidingEntity: hasCollision ? collidingEntity : null,
    collisionScore: Number(highestScore.toFixed(4)),
    collisionThreshold,
  };
}

/**
 * Helper to convert normalized points [-125, +125] into an SVG path string for preview rendering
 */
export function pointsToSvgPath(
  points: Point2D[],
  viewBoxSize: number = 100,
  padding: number = 14
): string {
  if (points.length === 0) return '';
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const maxDim = Math.max(width, height);
  const usable = viewBoxSize - padding * 2;
  const scale = usable / maxDim;

  const commands = points.map((p, idx) => {
    const x = padding + (p.x - minX) * scale + (usable - width * scale) / 2;
    const y = padding + (p.y - minY) * scale + (usable - height * scale) / 2;
    return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  });

  return commands.join(' ');
}
