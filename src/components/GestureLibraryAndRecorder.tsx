import React from 'react';
import {
  checkTemplateCollision,
  computeThreeSampleTemplate,
  GestureEntity,
  Point2D,
  pointsToSvgPath,
} from '../utils/dollarOneEngine';
import {
  generateSyntheticSymbolStroke,
  INSTALLED_ANDROID_PACKAGES,
} from '../utils/gestureStore';

interface GestureLibraryAndRecorderProps {
  gestures: GestureEntity[];
  isRecorderOpen: boolean;
  onSetRecorderOpen: (open: boolean) => void;
  onSaveGesture: (entity: GestureEntity, overwriteId?: number) => void;
  onDeleteGesture: (id: number) => void;
  onRebindPackage: (id: number, targetPackage: string) => void;
  onTestGestureInOverlay: (entity: GestureEntity) => void;
}

export const GestureLibraryAndRecorder: React.FC<GestureLibraryAndRecorderProps> = ({
  gestures,
  isRecorderOpen,
  onSetRecorderOpen,
  onSaveGesture,
  onDeleteGesture,
  onRebindPackage,
  onTestGestureInOverlay,
}) => {
  const [searchFilter, setSearchFilter] = React.useState<string>('');
  const [selectedPkg, setSelectedPkg] = React.useState<string>(
    INSTALLED_ANDROID_PACKAGES[5].packageName
  );
  const [symbolName, setSymbolName] = React.useState<string>('L');
  const [customLabel, setCustomLabel] = React.useState<string>('Launch Navigation Maps');
  const [samples, setSamples] = React.useState<Point2D[][]>([]);
  const [activeStroke, setActiveStroke] = React.useState<Point2D[]>([]);
  const [formError, setFormError] = React.useState<string>('');

  const recCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = React.useRef<boolean>(false);
  const currentPtsRef = React.useRef<Point2D[]>([]);

  // Update default label when package selection changes
  const handleSelectPackage = (pkgName: string) => {
    setSelectedPkg(pkgName);
    const found = INSTALLED_ANDROID_PACKAGES.find((p) => p.packageName === pkgName);
    if (found) {
      setCustomLabel(`Launch ${found.appName}`);
    }
  };

  // Render active stroke and previous samples on the 3-Sample Recorder canvas
  React.useEffect(() => {
    const canvas = recCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ghost traces of already captured samples
    samples.forEach((samplePts, idx) => {
      if (samplePts.length < 2) return;
      ctx.save();
      ctx.strokeStyle =
        idx === 0
          ? 'rgba(34, 211, 238, 0.25)'
          : idx === 1
          ? 'rgba(16, 185, 129, 0.28)'
          : 'rgba(168, 85, 247, 0.30)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(samplePts[0].x, samplePts[0].y);
      for (let i = 1; i < samplePts.length; i++) {
        ctx.lineTo(samplePts[i].x, samplePts[i].y);
      }
      ctx.stroke();
      ctx.restore();
    });

    // Current live stroke
    if (activeStroke.length >= 2) {
      ctx.save();
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(activeStroke[0].x, activeStroke[0].y);
      for (let i = 1; i < activeStroke.length; i++) {
        ctx.lineTo(activeStroke[i].x, activeStroke[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [samples, activeStroke, isRecorderOpen]);

  const getRecCanvasCoords = (
    e: React.PointerEvent<HTMLCanvasElement>
  ): Point2D => {
    const canvas = recCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleRecPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (samples.length >= 3) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getRecCanvasCoords(e);
    isDrawingRef.current = true;
    currentPtsRef.current = [pt];
    setActiveStroke([pt]);
    setFormError('');
  };

  const handleRecPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const pt = getRecCanvasCoords(e);
    currentPtsRef.current.push(pt);
    setActiveStroke([...currentPtsRef.current]);
  };

  const handleRecPointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const finished = [...currentPtsRef.current];
    setActiveStroke([]);
    if (finished.length < 8) {
      setFormError('Stroke too short (< 8 points). Sketch a complete unistroke symbol.');
      return;
    }
    setSamples((prev) => (prev.length < 3 ? [...prev, finished] : prev));
  };

  const handleFillThreeSamplesPreset = (
    presetSymbol: 'L' | 'M' | 'O' | 'Δ' | 'W'
  ) => {
    setSymbolName(presetSymbol);
    setFormError('');
    const s1 = generateSyntheticSymbolStroke(presetSymbol, 0);
    const s2 = generateSyntheticSymbolStroke(presetSymbol, 1);
    const s3 = generateSyntheticSymbolStroke(presetSymbol, 2);
    setSamples([s1, s2, s3]);
  };

  const handleFillInconsistentDemo = () => {
    setFormError('');
    setSamples([
      generateSyntheticSymbolStroke('L', 0),
      generateSyntheticSymbolStroke('O', 0),
      generateSyntheticSymbolStroke('W', 0),
    ]);
  };

  const threeSampleValidation = React.useMemo(() => {
    if (samples.length < 3) return null;
    return computeThreeSampleTemplate([samples[0], samples[1], samples[2]]);
  }, [samples]);

  const collisionResult = React.useMemo(() => {
    if (!threeSampleValidation) return null;
    return checkTemplateCollision(
      threeSampleValidation.averagedNormalizedPoints,
      gestures
    );
  }, [threeSampleValidation, gestures]);

  const handleCommitGesture = (overwriteExistingId?: number) => {
    if (!symbolName.trim() || !customLabel.trim()) {
      setFormError('Symbol name and gesture label are required.');
      return;
    }
    if (!threeSampleValidation || !threeSampleValidation.isValid) {
      setFormError(
        '3-Sample consistency must be >= 85% before saving to Room SQLite.'
      );
      return;
    }

    const pkgMeta =
      INSTALLED_ANDROID_PACKAGES.find((p) => p.packageName === selectedPkg) ??
      INSTALLED_ANDROID_PACKAGES[0];

    const newEntity: GestureEntity = {
      id: overwriteExistingId ?? Date.now(),
      gestureLabel: customLabel.trim(),
      symbolName: symbolName.trim().slice(0, 3).toUpperCase(),
      targetPackage: pkgMeta.packageName,
      targetActivity: pkgMeta.activityName,
      appCategory: pkgMeta.category,
      accentColor: pkgMeta.accentColor,
      normalizedPoints: threeSampleValidation.averagedNormalizedPoints,
      createdAt: Date.now(),
    };

    onSaveGesture(newEntity, overwriteExistingId);
    setSamples([]);
    setFormError('');
    onSetRecorderOpen(false);
  };

  const filteredGestures = React.useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return gestures;
    return gestures.filter(
      (g) =>
        g.gestureLabel.toLowerCase().includes(q) ||
        g.targetPackage.toLowerCase().includes(q) ||
        g.symbolName.toLowerCase().includes(q)
    );
  }, [gestures, searchFilter]);

  return (
    <div className="space-y-6">
      {/* Header & Search / New Binding Bar (Screen 2 Wireframe) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              Screen 2 · Custom Gesture Library (Room SQLite: gesture_mappings)
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight font-display mt-0.5">
              Offline 64-Point Symbol Templates ({gestures.length} Bound)
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <input
              type="search"
              aria-label="Filter gesture bindings"
              placeholder="Filter package or symbol..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={() => onSetRecorderOpen(!isRecorderOpen)}
              className="px-3.5 py-2 text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {isRecorderOpen ? 'Close 3-Sample Recorder' : '+ Record New Gesture'}
            </button>
          </div>
        </div>

        {/* Section 11: 3-Sample Averaging Recorder & Anti-Collision Guard Drawer */}
        {isRecorderOpen && (
          <div
            data-testid="three-sample-recorder-panel"
            className="bg-slate-950 border border-cyan-500/40 rounded-2xl p-5 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-cyan-400">
                  Section 11 · 3-Sample Averaging Recorder &amp; Ambiguity Guard
                </span>
                <h3 className="text-base font-bold text-white font-display">
                  Record 3 Unistroke Samples (&ge; 85% Mutual Consistency Required)
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(['L', 'M', 'O', 'Δ'] as const).map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => handleFillThreeSamplesPreset(sym)}
                    className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-md cursor-pointer"
                  >
                    Auto-3x &quot;{sym}&quot;
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleFillThreeSamplesPreset('W')}
                  className="px-2.5 py-1 text-xs font-mono bg-amber-950/70 hover:bg-amber-900/70 text-amber-300 border border-amber-700/60 rounded-md cursor-pointer"
                >
                  Test &quot;W&quot; Collision (&ge;0.82)
                </button>
                <button
                  type="button"
                  onClick={handleFillInconsistentDemo}
                  className="px-2.5 py-1 text-xs font-mono bg-rose-950/70 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 rounded-md cursor-pointer"
                >
                  Test &lt;85% Mismatch
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left: Interactive 300x300 Recording Canvas */}
              <div className="lg:col-span-5 flex flex-col items-center gap-2">
                <div className="w-full flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Sample Progress: {samples.length} / 3</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSamples([]);
                      setFormError('');
                    }}
                    className="text-rose-400 hover:underline cursor-pointer"
                  >
                    Clear Samples
                  </button>
                </div>

                <canvas
                  ref={recCanvasRef}
                  width={300}
                  height={240}
                  onPointerDown={handleRecPointerDown}
                  onPointerMove={handleRecPointerMove}
                  onPointerUp={handleRecPointerUp}
                  className="w-full max-w-[300px] h-[240px] bg-slate-900 border border-slate-700 rounded-xl cursor-crosshair touch-none"
                />
                <p className="text-[11px] text-slate-400 text-center">
                  Sketch the symbol 3 times above, or click an Auto-3x preset to test centroid averaging.
                </p>
              </div>

              {/* Right: Metadata Inputs, Consistency Score, & Collision Guard */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="recorder-symbol-input"
                      className="block text-xs font-medium text-slate-300 mb-1"
                    >
                      Symbol Key
                    </label>
                    <input
                      id="recorder-symbol-input"
                      type="text"
                      maxLength={3}
                      value={symbolName}
                      onChange={(e) => setSymbolName(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="recorder-package-select"
                      className="block text-xs font-medium text-slate-300 mb-1"
                    >
                      Target Application Package (Indexed)
                    </label>
                    <select
                      id="recorder-package-select"
                      value={selectedPkg}
                      onChange={(e) => handleSelectPackage(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white cursor-pointer"
                    >
                      {INSTALLED_ANDROID_PACKAGES.map((pkg) => (
                        <option key={pkg.packageName} value={pkg.packageName}>
                          {pkg.appName} ({pkg.packageName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="recorder-label-input"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Gesture Action Label
                  </label>
                  <input
                    id="recorder-label-input"
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                {/* 3-Sample Validation Metrics */}
                {threeSampleValidation ? (
                  <div className="space-y-3">
                    <div
                      data-testid="three-sample-consistency-box"
                      className={`p-3.5 rounded-xl border font-mono text-xs space-y-1.5 ${
                        threeSampleValidation.isValid
                          ? 'bg-emerald-950/60 border-emerald-700/70 text-emerald-200'
                          : 'bg-rose-950/60 border-rose-700/70 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">
                          3-Sample Mutual Consistency:
                        </span>
                        <span className="text-sm font-bold">
                          {(threeSampleValidation.mutualSimilarity * 100).toFixed(1)}%{' '}
                          {threeSampleValidation.isValid
                            ? '(PASSED >= 85%)'
                            : '(FAILED < 85%)'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Pairwise S(1,2)={(threeSampleValidation.pairwiseScores[0] * 100).toFixed(1)}% · S(2,3)={(threeSampleValidation.pairwiseScores[1] * 100).toFixed(1)}% · S(1,3)={(threeSampleValidation.pairwiseScores[2] * 100).toFixed(1)}%
                      </div>
                    </div>

                    {/* Ambiguity & Collision Guard (Section 11) */}
                    {collisionResult?.hasCollision && collisionResult.collidingEntity && (
                      <div
                        data-testid="collision-guard-warning"
                        className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-600/80 text-amber-200 text-xs space-y-2"
                      >
                        <div className="font-mono font-semibold text-amber-300">
                          Ambiguity &amp; Collision Guard Triggered (&ge; 0.82 Similarity)
                        </div>
                        <p className="leading-relaxed">
                          This averaged template scores{' '}
                          <span className="font-mono font-bold">
                            {(collisionResult.collisionScore * 100).toFixed(1)}%
                          </span>{' '}
                          against existing binding{' '}
                          <span className="font-semibold">
                            &quot;{collisionResult.collidingEntity.gestureLabel}&quot; (Symbol &quot;{collisionResult.collidingEntity.symbolName}&quot;)
                          </span>
                          . Choose a distinct shape or overwrite the existing binding.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleCommitGesture(collisionResult.collidingEntity!.id)
                            }
                            className="px-3 py-1.5 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg cursor-pointer"
                          >
                            Overwrite &quot;{collisionResult.collidingEntity.symbolName}&quot; Binding
                          </button>
                          <button
                            type="button"
                            onClick={() => setSamples([])}
                            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
                          >
                            Sketch Distinct Shape
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">
                    Waiting for {3 - samples.length} more sample stroke(s) to compute 64-point centroid average...
                  </div>
                )}

                {formError && (
                  <p className="text-xs text-rose-400 font-medium">{formError}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onSetRecorderOpen(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={
                      !threeSampleValidation?.isValid ||
                      Boolean(collisionResult?.hasCollision)
                    }
                    onClick={() => handleCommitGesture()}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                      threeSampleValidation?.isValid && !collisionResult?.hasCollision
                        ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Save 64-Point Template to Room
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Saved Gesture Library Rows (Screen 2 Wireframe) */}
        {filteredGestures.length === 0 ? (
          <div className="text-center py-10 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <p className="text-sm text-slate-300 font-medium">
              No gesture templates match your filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchFilter('');
                onSetRecorderOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-semibold bg-cyan-400 text-slate-950 rounded-lg cursor-pointer"
            >
              Record Custom Gesture
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950 overflow-hidden">
            {filteredGestures.map((entity) => (
              <div
                key={entity.id}
                data-testid={`gesture-row-${entity.symbolName}`}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/60 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* 64-point Normalized Vector Thumbnail */}
                  <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-11 h-11 overflow-visible"
                      aria-label={`Normalized 64-point symbol ${entity.symbolName}`}
                    >
                      <path
                        d={pointsToSvgPath(entity.normalizedPoints, 100, 14)}
                        fill="none"
                        stroke={entity.accentColor || '#06B6D4'}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white font-display">
                        {entity.gestureLabel}
                      </h3>
                      <span className="text-xs font-mono text-cyan-400">
                        · Symbol: &quot;{entity.symbolName}&quot;
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                      <span>{entity.targetPackage}</span>
                      <span aria-hidden="true"> · </span>
                      <span>64 pts JSON</span>
                      <span aria-hidden="true"> · </span>
                      <span>{entity.appCategory}</span>
                    </div>
                  </div>
                </div>

                {/* Row Actions: Test, Rebind Package, Delete */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onTestGestureInOverlay(entity)}
                    className="px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-800/70 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Test in Overlay
                  </button>

                  <select
                    aria-label={`Rebind target package for ${entity.gestureLabel}`}
                    value={entity.targetPackage}
                    onChange={(e) => onRebindPackage(entity.id, e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-200 cursor-pointer"
                  >
                    {INSTALLED_ANDROID_PACKAGES.map((pkg) => (
                      <option key={pkg.packageName} value={pkg.packageName}>
                        {pkg.packageName}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    aria-label={`Delete gesture ${entity.gestureLabel}`}
                    onClick={() => onDeleteGesture(entity.id)}
                    className="px-2.5 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
