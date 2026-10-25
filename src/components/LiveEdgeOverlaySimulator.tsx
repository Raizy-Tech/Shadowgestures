import React from 'react';
import {
  EdgeConfigPreferences,
  evaluateInwardSwipeFilter,
  GestureEntity,
  OverlayUIState,
  Point2D,
  RecognitionMatchResult,
  recognizeGesture,
} from '../utils/dollarOneEngine';
import { generateSyntheticSymbolStroke } from '../utils/gestureStore';

interface LiveEdgeOverlaySimulatorProps {
  edgePrefs: EdgeConfigPreferences;
  gestures: GestureEntity[];
  lastMatchResult: RecognitionMatchResult | null;
  onRecognitionComplete: (result: RecognitionMatchResult, rawStroke: Point2D[]) => void;
  onOpenRecorder: () => void;
}

export const LiveEdgeOverlaySimulator: React.FC<LiveEdgeOverlaySimulatorProps> = ({
  edgePrefs,
  gestures,
  lastMatchResult,
  onRecognitionComplete,
  onOpenRecorder,
}) => {
  const [isScreenUnlocked, setIsScreenUnlocked] = React.useState<boolean>(true);
  const [isLandscape, setIsLandscape] = React.useState<boolean>(false);
  const [showEdgeOutline, setShowEdgeOutline] = React.useState<boolean>(true);
  const [uiState, setUiState] = React.useState<OverlayUIState>('ARMED_INVISIBLE');
  const [hapticBadge, setHapticBadge] = React.useState<string>('None (0% CPU Idle)');
  const [swipeFilterDiag, setSwipeFilterDiag] = React.useState<string>(
    'Swipe inward (|dx| > 24dp, |dx| > 1.5·|dy|) or sketch directly on canvas'
  );
  const [launchedApp, setLaunchedApp] = React.useState<GestureEntity | null>(null);
  const [rawPoints, setRawPoints] = React.useState<Point2D[]>([]);
  const [isRejectFlashing, setIsRejectFlashing] = React.useState<boolean>(false);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const isPointerDownRef = React.useRef<boolean>(false);
  const currentStrokeRef = React.useRef<Point2D[]>([]);
  const inactivityTimerRef = React.useRef<number | null>(null);

  // Sync UI state when lock or landscape changes
  React.useEffect(() => {
    if (!isScreenUnlocked) {
      setUiState('DORMANT');
      setHapticBadge('None — Edge view detached (ACTION_SCREEN_OFF)');
      setLaunchedApp(null);
      setRawPoints([]);
      return;
    }
    if (edgePrefs.pauseInLandscape && isLandscape) {
      setUiState('DORMANT');
      setHapticBadge('Suspended — Landscape Auto-Pause (FR-09)');
      setRawPoints([]);
      return;
    }
    setUiState('ARMED_INVISIBLE');
    setHapticBadge('None — Armed @ alpha=0.0f (ACTION_USER_PRESENT)');
  }, [isScreenUnlocked, isLandscape, edgePrefs.pauseInLandscape]);

  const clearInactivityWatchdog = () => {
    if (inactivityTimerRef.current !== null) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  const resetInactivityWatchdog = () => {
    clearInactivityWatchdog();
    inactivityTimerRef.current = window.setTimeout(() => {
      if (isPointerDownRef.current) return;
      setUiState((prev) => (prev === 'CANVAS_DRAWING' ? 'ARMED_INVISIBLE' : prev));
      setRawPoints([]);
      setSwipeFilterDiag('Auto-dismissed after 1,500 ms inactivity (NFR-SEC-02)');
    }, 1500);
  };

  React.useEffect(() => {
    return () => clearInactivityWatchdog();
  }, []);

  // Render stroke path onto the hardware-accelerated canvas
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw subtle 250x250 reference guide when actively drawing or showing match
    if (uiState === 'CANVAS_DRAWING' || rawPoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(45, 95, 250, 250);
      ctx.restore();
    }

    if (rawPoints.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = isRejectFlashing ? '#F43F5E' : '#06B6D4';
    ctx.shadowColor = isRejectFlashing
      ? 'rgba(244, 63, 94, 0.45)'
      : 'rgba(6, 182, 212, 0.45)';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(rawPoints[0].x, rawPoints[0].y);
    for (let i = 1; i < rawPoints.length - 1; i++) {
      const midX = (rawPoints[i].x + rawPoints[i + 1].x) / 2;
      const midY = (rawPoints[i].y + rawPoints[i + 1].y) / 2;
      ctx.quadraticCurveTo(rawPoints[i].x, rawPoints[i].y, midX, midY);
    }
    const last = rawPoints[rawPoints.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();

    // Draw start & end nodes
    ctx.fillStyle = isRejectFlashing ? '#F43F5E' : '#22D3EE';
    ctx.beginPath();
    ctx.arc(rawPoints[0].x, rawPoints[0].y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [rawPoints, uiState, isRejectFlashing]);

  const finishAndClassifyStroke = (pointsToClassify: Point2D[]) => {
    clearInactivityWatchdog();
    if (pointsToClassify.length < 4) {
      setUiState('ARMED_INVISIBLE');
      setRawPoints([]);
      return;
    }

    const result = recognizeGesture(
      pointsToClassify,
      gestures,
      edgePrefs.minConfidence
    );
    onRecognitionComplete(result, pointsToClassify);

    if (result.passedConfidenceGate && result.matchedEntity) {
      setUiState('MATCH_LAUNCH');
      setHapticBadge('CONFIRM — Target Intent Dispatched (FLAG_ACTIVITY_NEW_TASK)');
      setLaunchedApp(result.matchedEntity);
      setSwipeFilterDiag(
        `Matched "${result.matchedEntity.symbolName}" (${(result.bestScore * 100).toFixed(1)}%) in ${result.totalEngineDurationMs} ms`
      );
    } else {
      setUiState('REJECT_DISMISS');
      setIsRejectFlashing(true);
      setHapticBadge('REJECT (Double pulse) — Coral Red Flash (#F43F5E, 120 ms)');
      setSwipeFilterDiag(
        pointsToClassify.length < 8
          ? `Rejected: Stroke too short (${pointsToClassify.length} pts < 8 pts minimum)`
          : `Rejected: Best score ${(result.bestScore * 100).toFixed(1)}% < ${(edgePrefs.minConfidence * 100).toFixed(0)}% Confidence Gate`
      );
      window.setTimeout(() => {
        setIsRejectFlashing(false);
        setUiState('ARMED_INVISIBLE');
        setRawPoints([]);
      }, 650);
    }
  };

  const getCanvasCoords = (
    e: React.PointerEvent<HTMLCanvasElement>
  ): Point2D => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isScreenUnlocked || (edgePrefs.pauseInLandscape && isLandscape)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getCanvasCoords(e);
    isPointerDownRef.current = true;
    setLaunchedApp(null);
    setIsRejectFlashing(false);
    currentStrokeRef.current = [pt];
    setRawPoints([pt]);
    setUiState('CANVAS_DRAWING');
    setHapticBadge('CLOCK_TICK (Crisp) — 120Hz Hardware Canvas Active');
    setSwipeFilterDiag('Capturing 120Hz MotionEvent coordinates...');
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) return;
    const pt = getCanvasCoords(e);
    currentStrokeRef.current.push(pt);

    if (currentStrokeRef.current.length === 8) {
      const start = currentStrokeRef.current[0];
      const filterCheck = evaluateInwardSwipeFilter({
        startX: start.x,
        startY: start.y,
        currentX: pt.x,
        currentY: pt.y,
        edgeSide: edgePrefs.edgeSide,
        density: 1,
      });
      if (filterCheck.triggered) {
        setSwipeFilterDiag(filterCheck.reason);
      }
    }

    setRawPoints([...currentStrokeRef.current]);
  };

  const handlePointerUp = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    const captured = [...currentStrokeRef.current];
    finishAndClassifyStroke(captured);
  };

  const handleTriggerEdgeSwipeOnly = () => {
    if (!isScreenUnlocked || (edgePrefs.pauseInLandscape && isLandscape)) return;
    setLaunchedApp(null);
    setRawPoints([]);
    setUiState('CANVAS_DRAWING');
    setHapticBadge('CLOCK_TICK (Crisp) — Edge Swipe Crossed -24dp');
    setSwipeFilterDiag(
      `Phase 2 Edge Swipe triggered (${edgePrefs.edgeSide === 'RIGHT' ? 'dx = -28.4dp' : 'dx = +28.4dp'}, |dx| > 1.5·|dy|). Sketch a symbol now.`
    );
    resetInactivityWatchdog();
  };

  const handleSimulatePresetGesture = (
    symbol: 'W' | 'C' | 'S' | 'V' | 'Z' | 'O' | 'L'
  ) => {
    if (!isScreenUnlocked) {
      setIsScreenUnlocked(true);
    }
    if (isLandscape && edgePrefs.pauseInLandscape) {
      setIsLandscape(false);
    }
    setLaunchedApp(null);
    setIsRejectFlashing(false);
    const stroke = generateSyntheticSymbolStroke(symbol, 1).map((p) => ({
      x: p.x + 20,
      y: p.y + 70,
    }));
    setUiState('CANVAS_DRAWING');
    setHapticBadge('CLOCK_TICK (Crisp) — 120Hz Stroke Capture');
    setRawPoints(stroke);
    finishAndClassifyStroke(stroke);
  };

  const handleSimulateRejectStroke = () => {
    if (!isScreenUnlocked) setIsScreenUnlocked(true);
    if (isLandscape && edgePrefs.pauseInLandscape) setIsLandscape(false);
    setLaunchedApp(null);
    // Horizontal squiggle that does not match any bound template
    const rejectPts: Point2D[] = Array.from({ length: 24 }, (_, idx) => ({
      x: 70 + idx * 8,
      y: 210 + Math.sin(idx * 1.9) * 6,
    }));
    setUiState('CANVAS_DRAWING');
    setRawPoints(rejectPts);
    finishAndClassifyStroke(rejectPts);
  };

  // Compute Edge Trigger Zone visual geometry inside the 340x440 viewport
  const edgeWidthPx = Math.round(edgePrefs.widthDp * 1.15);
  const edgeHeightPx = Math.round(edgePrefs.heightDp * 1.25);
  const maxTop = Math.max(24, 440 - edgeHeightPx - 24);
  const edgeTopPx = Math.round(
    24 + ((edgePrefs.verticalBiasPercent / 100) * (maxTop - 24))
  );

  return (
    <section
      aria-label="Live Android Overlay Simulator"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4"
    >
      {/* Simulator Top Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono text-cyan-400">
            Screen 3 · Live Transparent Overlay &amp; State Machine
          </span>
          <h2 className="text-base font-bold text-white tracking-tight font-display">
            Interactive Android WindowManager Viewport
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsScreenUnlocked((v) => !v)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isScreenUnlocked
                ? 'bg-emerald-950/70 border-emerald-700/70 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            {isScreenUnlocked ? 'Unlocked (USER_PRESENT)' : 'Locked (SCREEN_OFF)'}
          </button>
          <button
            type="button"
            onClick={() => setIsLandscape((v) => !v)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isLandscape
                ? 'bg-amber-950/70 border-amber-700/70 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            {isLandscape ? 'Landscape (Game Mode)' : 'Portrait Mode'}
          </button>
        </div>
      </div>

      {/* State Machine Status Strip (Section 10) */}
      <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-950/90 border border-slate-800/90 rounded-xl p-3">
        <div>
          <span className="text-slate-400 block">Overlay UI State (Sec 10)</span>
          <span
            data-testid="overlay-ui-state"
            className={`font-mono font-semibold mt-0.5 block ${
              uiState === 'MATCH_LAUNCH'
                ? 'text-emerald-400'
                : uiState === 'REJECT_DISMISS'
                ? 'text-rose-400'
                : uiState === 'CANVAS_DRAWING'
                ? 'text-cyan-400'
                : uiState === 'ARMED_INVISIBLE'
                ? 'text-slate-200'
                : 'text-amber-400'
            }`}
          >
            {uiState}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Haptic Feedback Pulse</span>
          <span className="font-mono text-slate-200 mt-0.5 block truncate" title={hapticBadge}>
            {hapticBadge}
          </span>
        </div>
      </div>

      {/* Simulated Android Phone Display Frame */}
      <div className="relative mx-auto w-full max-w-[340px] h-[440px] rounded-[28px] border-[3px] border-slate-700 bg-slate-950 overflow-hidden shadow-inner select-none">
        {/* Android Status Bar */}
        <div className="flex items-center justify-between px-5 py-2 text-[11px] font-mono text-slate-400 bg-slate-900/80 border-b border-slate-800/80 z-20 relative">
          <span>09:52</span>
          <span>0% Network · Offline</span>
          <span>100% · &lt;1.2%/24h</span>
        </div>

        {/* Underlying Android Home Screen or Launched Target App */}
        <div className="absolute inset-0 top-8 flex flex-col justify-between py-4 px-7 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
          {launchedApp && uiState === 'MATCH_LAUNCH' ? (
            <div
              data-testid="launched-app-surface"
              className="my-auto bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2.5 z-20"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] text-emerald-400 font-mono">
                <span className="truncate">FLAG_ACTIVITY_NEW_TASK</span>
                <span className="whitespace-nowrap shrink-0">
                  Symbol &quot;{launchedApp.symbolName}&quot;
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  {launchedApp.gestureLabel}
                </h3>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                  {launchedApp.targetPackage}
                </p>
              </div>
              {lastMatchResult && (
                <div className="text-[11px] font-mono bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1 text-slate-300">
                  <div className="flex items-center justify-between gap-2">
                    <span className="whitespace-nowrap">64-pt Match:</span>
                    <span className="text-cyan-400 font-semibold whitespace-nowrap">
                      {(lastMatchResult.bestScore * 100).toFixed(1)}% ({lastMatchResult.totalEngineDurationMs} ms)
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="whitespace-nowrap">Launch SLA:</span>
                    <span className="text-emerald-400 font-semibold whitespace-nowrap">
                      {lastMatchResult.slaBreakdown.totalEndToEndMs} ms (&lt; 500 ms)
                    </span>
                  </div>
                </div>
              )}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setLaunchedApp(null);
                    setRawPoints([]);
                    setUiState('ARMED_INVISIBLE');
                  }}
                  className="w-full py-2 px-3 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  Return to Armed Edge Overlay
                </button>
              </div>
            </div>
          ) : (
            <div className="my-auto text-center px-3 space-y-2 pointer-events-none">
              <div className="text-xs font-mono text-slate-400">
                {!isScreenUnlocked
                  ? 'DEVICE LOCKED · KEYGUARD ACTIVE'
                  : edgePrefs.pauseInLandscape && isLandscape
                  ? 'LANDSCAPE GAMING · EDGE PAUSED (FR-09)'
                  : uiState === 'CANVAS_DRAWING'
                  ? 'FULL-SCREEN SCRIM (#33000000) MOUNTED'
                  : 'DRAW ANY UNISTROKE SYMBOL HERE'}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {!isScreenUnlocked
                  ? 'Unlock the device above to fire ACTION_USER_PRESENT and attach the 20×160 dp edge overlay.'
                  : edgePrefs.pauseInLandscape && isLandscape
                  ? 'Edge trigger suspended in landscape orientation to prevent accidental full-screen gaming triggers.'
                  : 'Drag with mouse or finger across this screen to sketch "W", "C", "S", "V", or "Z", or use the quick-sketch test bar below.'}
              </p>
            </div>
          )}

          {/* Live Match / Reject Banner matching Figure 9.1 Screen 3 */}
          {lastMatchResult && (
            <div
              data-testid="live-overlay-telemetry-banner"
              className={`rounded-xl p-2.5 text-center font-mono text-xs border transition-colors z-20 ${
                lastMatchResult.passedConfidenceGate
                  ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                  : 'bg-rose-950/90 border-rose-500/60 text-rose-200'
              }`}
            >
              <div>
                64 pts normalized · Match:{' '}
                <span className="font-bold">
                  {(lastMatchResult.bestScore * 100).toFixed(1)}%
                </span>{' '}
                ({lastMatchResult.totalEngineDurationMs} ms)
              </div>
              <div className="mt-0.5 text-[11px]">
                {lastMatchResult.passedConfidenceGate && lastMatchResult.matchedEntity
                  ? `Launching ${lastMatchResult.matchedEntity.gestureLabel} (${lastMatchResult.slaBreakdown.totalEndToEndMs} ms total)`
                  : `Below ${(edgePrefs.minConfidence * 100).toFixed(0)}% Confidence Gate — Dismissed Cleanly`}
              </div>
            </div>
          )}
        </div>

        {/* Configurable Edge Trigger Zone (FR-02 & FR-03) */}
        {isScreenUnlocked && !(edgePrefs.pauseInLandscape && isLandscape) && (
          <button
            type="button"
            aria-label="Trigger Inward Edge Swipe"
            onClick={handleTriggerEdgeSwipeOnly}
            style={{
              width: `${edgeWidthPx}px`,
              height: `${edgeHeightPx}px`,
              top: `${edgeTopPx}px`,
              [edgePrefs.edgeSide === 'RIGHT' ? 'right' : 'left']: '0px',
            }}
            className={`absolute z-30 transition-all cursor-pointer flex items-center justify-center ${
              showEdgeOutline
                ? 'bg-cyan-500/25 border-2 border-cyan-400'
                : 'bg-transparent border border-transparent hover:border-cyan-500/40'
            }`}
            title={`Edge Zone: ${edgePrefs.widthDp}×${edgePrefs.heightDp} dp (${edgePrefs.edgeSide}). Click or swipe inward.`}
          >
            {showEdgeOutline && (
              <span className="text-[9px] font-mono text-cyan-200 -rotate-90 whitespace-nowrap select-none">
                {edgePrefs.widthDp}×{edgePrefs.heightDp}dp
              </span>
            )}
          </button>
        )}

        {/* Full-Screen Hardware-Accelerated Drawing Canvas (FR-05) */}
        <canvas
          ref={canvasRef}
          data-testid="gesture-overlay-canvas"
          width={340}
          height={408}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`absolute inset-x-0 top-8 bottom-0 z-10 touch-none ${
            uiState === 'CANVAS_DRAWING' ? 'bg-black/25' : 'bg-transparent'
          } ${
            !isScreenUnlocked || (edgePrefs.pauseInLandscape && isLandscape)
              ? 'pointer-events-none'
              : 'cursor-crosshair'
          }`}
        />
      </div>

      {/* Edge Filter Diagnostic & Calibration Outline Toggle */}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-400 px-1">
        <span className="font-mono truncate" title={swipeFilterDiag}>
          {swipeFilterDiag}
        </span>
        <button
          type="button"
          onClick={() => setShowEdgeOutline((v) => !v)}
          className="text-cyan-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer font-medium"
        >
          {showEdgeOutline ? 'Hide Edge Bounds (alpha=0f)' : 'Show 20×160dp Bounds'}
        </button>
      </div>

      {/* 1-Tap Unistroke Test Bar for Deterministic Testing */}
      <div className="pt-2 border-t border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Quick-Sketch $1 Engine Test (64-pt Resampling):</span>
          <button
            type="button"
            onClick={onOpenRecorder}
            className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer whitespace-nowrap shrink-0"
          >
            + Record Custom Symbol
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['W', 'C', 'S', 'V', 'Z'] as const).map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => handleSimulatePresetGesture(sym)}
              className="px-2.5 py-1.5 text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Sketch &quot;{sym}&quot;
            </button>
          ))}
          <button
            type="button"
            onClick={handleSimulateRejectStroke}
            className="px-2.5 py-1.5 text-xs font-mono font-semibold bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-800/70 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Test &lt;0.80 Reject
          </button>
        </div>
      </div>
    </section>
  );
};
