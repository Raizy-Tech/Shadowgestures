import React from 'react';
import {
  DOLLAR_ONE_CONSTANTS,
  Point2D,
  pointsToSvgPath,
  RecognitionMatchResult,
} from '../utils/dollarOneEngine';

interface MathPipelineAndSlaPanelProps {
  lastMatchResult: RecognitionMatchResult | null;
  lastRawStroke: Point2D[];
  minConfidence: number;
}

export const MathPipelineAndSlaPanel: React.FC<MathPipelineAndSlaPanelProps> = ({
  lastMatchResult,
  lastRawStroke,
  minConfidence,
}) => {
  if (!lastMatchResult) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
        <p className="text-sm text-slate-300 font-medium">
          Sketch any symbol in the Live Overlay Simulator on the left to inspect the 4-Step $1 Geometric Normalization Pipeline.
        </p>
      </div>
    );
  }

  const { pipeline, slaBreakdown, allScores } = lastMatchResult;
  const intervalPx =
    pipeline.pathLengthPx / (DOLLAR_ONE_CONSTANTS.NUM_POINTS - 1);

  return (
    <div className="space-y-6">
      {/* Four-Step Geometric Normalization Visualizer (Section 8) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              Section 08 · Four-Step Geometric Normalization &amp; Scoring Equations
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight font-display mt-0.5">
              Live $1 Unistroke Recognizer Transformation Pipeline
            </h2>
          </div>
          <span className="text-xs font-mono text-emerald-400">
            Classified in {lastMatchResult.totalEngineDurationMs} ms (&lt; 15 ms SLA)
          </span>
        </div>

        {/* 4 Stage SVG Visual Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stage 1: Raw -> N=64 Equidistant Resampling */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-mono text-cyan-400">
                1. Equidistant Resampling
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                N = 64 pts · I = {intervalPx.toFixed(1)} px
              </p>
            </div>
            <div className="h-28 bg-slate-900/80 border border-slate-800/80 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-20 h-20 overflow-visible">
                <path
                  d={pointsToSvgPath(
                    lastRawStroke.length > 1
                      ? lastRawStroke
                      : pipeline.resampledPoints,
                    100,
                    12
                  )}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Raw: {pipeline.rawPointCount} pts &rarr; 64 equidistant
            </div>
          </div>

          {/* Stage 2: Indicative Angle Alignment */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-mono text-cyan-400">
                2. Indicative Angle (0&deg;)
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                -&omega; = {(-pipeline.indicativeAngleDeg).toFixed(1)}&deg; ({(-pipeline.indicativeAngleRad).toFixed(2)} rad)
              </p>
            </div>
            <div className="h-28 bg-slate-900/80 border border-slate-800/80 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-20 h-20 overflow-visible">
                <path
                  d={pointsToSvgPath(pipeline.rotatedPoints, 100, 12)}
                  fill="none"
                  stroke="#818CF8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Rotated around centroid C(Cx, Cy)
            </div>
          </div>

          {/* Stage 3: 250x250 Scaling & Origin Translation */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-mono text-cyan-400">
                3. 250&times;250 Square &amp; (0,0)
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                S = 250.0 · Centroid = (0, 0)
              </p>
            </div>
            <div className="h-28 bg-slate-900/80 border border-slate-800/80 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-20 h-20 overflow-visible">
                <path
                  d={pointsToSvgPath(pipeline.normalizedPoints, 100, 12)}
                  fill="none"
                  stroke="#22D3EE"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Scale- &amp; position-invariant vector
            </div>
          </div>

          {/* Stage 4: Golden Section Search Match */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-mono text-cyan-400">
                4. Golden Section Search
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                &theta;* = {lastMatchResult.optimalAngleDeg}&deg; · d_min = {lastMatchResult.minDistance}
              </p>
            </div>
            <div className="h-28 bg-slate-900/80 border border-slate-800/80 rounded-lg flex flex-col items-center justify-center p-2 text-center">
              <div
                className={`text-2xl font-bold font-mono ${
                  lastMatchResult.passedConfidenceGate
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {(lastMatchResult.bestScore * 100).toFixed(1)}%
              </div>
              <div className="text-xs font-mono text-slate-300 mt-1">
                {lastMatchResult.matchedEntity
                  ? `Best: "${lastMatchResult.matchedEntity.symbolName}" (${lastMatchResult.matchedEntity.gestureLabel})`
                  : 'No Match'}
              </div>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Gate: &ge; {(minConfidence * 100).toFixed(0)}% similarity
            </div>
          </div>
        </div>

        {/* Mathematical Equations Reference Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1.5">
          <div className="text-cyan-400 font-semibold">
            Golden Section Search Scoring Equation (Section 08):
          </div>
          <div>
            Score(P, T) = 1 &minus; [ d_min(P, T) / (0.5 &times; &radic;(250&sup2; + 250&sup2;)) ] = 1 &minus; [ {lastMatchResult.minDistance} / 176.78 ] = {(lastMatchResult.bestScore * 100).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Sub-500ms End-to-End Execution Budget Breakdown (Section 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              Section 05 · Sub-500ms Execution Budget Breakdown
            </div>
            <h3 className="text-base font-bold text-white font-display mt-0.5">
              Touch-Up (ACTION_UP) to App Transition SLA
            </h3>
          </div>

          <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950 font-mono text-xs">
            <div className="p-3 flex items-center justify-between">
              <span className="text-slate-300">
                1. Path Resampling &amp; Normalization
              </span>
              <span className="text-emerald-400">
                {slaBreakdown.resamplingAndNormalizationMs} ms / 3.5 ms budget
              </span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-slate-300">
                2. Euclidean Matching ({allScores.length} templates)
              </span>
              <span className="text-emerald-400">
                {slaBreakdown.euclideanMatchingMs} ms / 4.5 ms budget
              </span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-slate-300">
                3. Overlay View Tear-down &amp; HW Release
              </span>
              <span className="text-emerald-400">
                {slaBreakdown.overlayTeardownMs} ms / 12.0 ms budget
              </span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-slate-300">
                4. PackageManager Intent Handshake
              </span>
              <span className="text-cyan-400">
                {slaBreakdown.packageManagerHandshakeMs} ms / 450 ms budget
              </span>
            </div>
            <div className="p-3 flex items-center justify-between bg-slate-900/90 font-semibold">
              <span className="text-white">Total End-to-End Pipeline</span>
              <span className="text-emerald-400">
                {slaBreakdown.totalEndToEndMs} ms (&le; 500 ms SLA)
              </span>
            </div>
          </div>
        </div>

        {/* All Stored Templates Distance Matrix */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              Candidate vs. Room Template Ranking
            </div>
            <h3 className="text-base font-bold text-white font-display mt-0.5">
              Euclidean Distance d(P, T) &amp; Confidence Scores
            </h3>
          </div>

          <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950 font-mono text-xs">
            {allScores.map((entry, idx) => {
              const pct = (entry.score * 100).toFixed(1);
              const passed = entry.score >= minConfidence;
              return (
                <div
                  key={entry.entity.id}
                  className="p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-slate-400">#{idx + 1}</span>
                    <span className="text-white font-semibold">
                      &quot;{entry.entity.symbolName}&quot;
                    </span>
                    <span className="text-slate-400 truncate">
                      {entry.entity.gestureLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-400">d={entry.distance}</span>
                    <span
                      className={`font-bold ${
                        passed ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
