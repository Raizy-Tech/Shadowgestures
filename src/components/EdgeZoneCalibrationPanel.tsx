import React from 'react';
import {
  EdgeConfigPreferences,
  EdgeSide,
  evaluateInwardSwipeFilter,
} from '../utils/dollarOneEngine';
import { DEFAULT_EDGE_PREFERENCES } from '../utils/gestureStore';

interface EdgeZoneCalibrationPanelProps {
  edgePrefs: EdgeConfigPreferences;
  onChangePrefs: (next: EdgeConfigPreferences) => void;
}

export const EdgeZoneCalibrationPanel: React.FC<EdgeZoneCalibrationPanelProps> = ({
  edgePrefs,
  onChangePrefs,
}) => {
  const [testDxDp, setTestDxDp] = React.useState<number>(
    edgePrefs.edgeSide === 'RIGHT' ? -30 : 30
  );
  const [testDyDp, setTestDyDp] = React.useState<number>(8);

  React.useEffect(() => {
    setTestDxDp((prev) =>
      edgePrefs.edgeSide === 'RIGHT' ? -Math.abs(prev) : Math.abs(prev)
    );
  }, [edgePrefs.edgeSide]);

  const swipeDiagnostic = React.useMemo(
    () =>
      evaluateInwardSwipeFilter({
        startX: 200,
        startY: 200,
        currentX: 200 + testDxDp,
        currentY: 200 + testDyDp,
        edgeSide: edgePrefs.edgeSide,
        density: 1,
      }),
    [testDxDp, testDyDp, edgePrefs.edgeSide]
  );

  const handleSideChange = (side: EdgeSide) => {
    onChangePrefs({ ...edgePrefs, edgeSide: side });
  };

  return (
    <div className="space-y-6">
      {/* Main Calibration Card (Screen 1 Wireframe) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              Screen 1 · Edge Zone Calibration &amp; WindowManager Flags
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight font-display mt-0.5">
              Transparent Trigger Geometry &amp; OS Gesture Exclusion
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onChangePrefs(DEFAULT_EDGE_PREFERENCES)}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            Reset to SRS Defaults (20×160 dp)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Sliders & Edge Position */}
          <div className="space-y-5">
            {/* Edge Position */}
            <div>
              <label
                htmlFor="edge-position-select"
                className="block text-xs font-medium text-slate-300 mb-2"
              >
                Edge Position (FR-02 Gravity)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSideChange('RIGHT')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    edgePrefs.edgeSide === 'RIGHT'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Right Edge (Gravity.END)
                </button>
                <button
                  type="button"
                  onClick={() => handleSideChange('LEFT')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    edgePrefs.edgeSide === 'LEFT'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Left Edge (Gravity.START)
                </button>
              </div>
            </div>

            {/* Width Slider (10 - 40 dp) */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="edge-width-slider" className="font-medium text-slate-300">
                  Trigger Width (10–40 dp)
                </label>
                <span className="font-mono font-semibold text-cyan-400">
                  {edgePrefs.widthDp} dp
                </span>
              </div>
              <input
                id="edge-width-slider"
                type="range"
                min={10}
                max={40}
                step={1}
                value={edgePrefs.widthDp}
                onChange={(e) =>
                  onChangePrefs({ ...edgePrefs, widthDp: Number(e.target.value) })
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1">
                <span>10 dp (Ultra-Thin)</span>
                <span>20 dp (SRS Default)</span>
                <span>40 dp (Wide)</span>
              </div>
            </div>

            {/* Height Slider (80 - 200 dp) */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="edge-height-slider" className="font-medium text-slate-300">
                  Trigger Height (80–200 dp · FR-03 OS Quota)
                </label>
                <span className="font-mono font-semibold text-cyan-400">
                  {edgePrefs.heightDp} dp
                </span>
              </div>
              <input
                id="edge-height-slider"
                type="range"
                min={80}
                max={200}
                step={4}
                value={edgePrefs.heightDp}
                onChange={(e) =>
                  onChangePrefs({ ...edgePrefs, heightDp: Number(e.target.value) })
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1">
                <span>80 dp</span>
                <span>160 dp (Default)</span>
                <span>200 dp (Android Max Limit)</span>
              </div>
            </div>

            {/* Vertical Offset Slider (0 - 100%) */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="edge-offset-slider" className="font-medium text-slate-300">
                  Vertical Offset Bias
                </label>
                <span className="font-mono font-semibold text-cyan-400">
                  {edgePrefs.verticalBiasPercent === 50
                    ? 'Center (50%)'
                    : `${edgePrefs.verticalBiasPercent}%`}
                </span>
              </div>
              <input
                id="edge-offset-slider"
                type="range"
                min={10}
                max={90}
                step={5}
                value={edgePrefs.verticalBiasPercent}
                onChange={(e) =>
                  onChangePrefs({
                    ...edgePrefs,
                    verticalBiasPercent: Number(e.target.value),
                  })
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1">
                <span>10% (Upper Reach)</span>
                <span>50% (Centered)</span>
                <span>90% (Lower Thumb)</span>
              </div>
            </div>
          </div>

          {/* Right Column: Confidence Gate, System Toggles & Protobuf State */}
          <div className="space-y-5">
            {/* Minimum Confidence Gate Slider (FR-07) */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="confidence-gate-slider" className="font-medium text-slate-300">
                  $1 Confidence Gate Threshold (FR-07)
                </label>
                <span className="font-mono font-semibold text-emerald-400">
                  {(edgePrefs.minConfidence * 100).toFixed(0)}% ({edgePrefs.minConfidence.toFixed(2)}f)
                </span>
              </div>
              <input
                id="confidence-gate-slider"
                type="range"
                min={0.65}
                max={0.95}
                step={0.01}
                value={edgePrefs.minConfidence}
                onChange={(e) =>
                  onChangePrefs({
                    ...edgePrefs,
                    minConfidence: Number(e.target.value),
                  })
                }
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1">
                <span>65% (Permissive)</span>
                <span>80% (SRS Default)</span>
                <span>95% (Strict)</span>
              </div>
            </div>

            {/* Checkboxes from Screen 1 Wireframe */}
            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={edgePrefs.excludeBackGesture}
                  onChange={(e) =>
                    onChangePrefs({
                      ...edgePrefs,
                      excludeBackGesture: e.target.checked,
                    })
                  }
                  className="mt-0.5 h-4 w-4 rounded accent-cyan-400 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-white block">
                    Exclude OS Back Gesture (FR-03)
                  </span>
                  <span className="text-slate-400 mt-0.5 block">
                    Invokes <code className="text-cyan-300">ViewCompat.setSystemGestureExclusionRects()</code> bounded to {edgePrefs.heightDp} dp (&le; 200 dp Android 10+ limit).
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={edgePrefs.pauseInLandscape}
                  onChange={(e) =>
                    onChangePrefs({
                      ...edgePrefs,
                      pauseInLandscape: e.target.checked,
                    })
                  }
                  className="mt-0.5 h-4 w-4 rounded accent-cyan-400 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-white block">
                    Auto-Pause in Landscape (FR-09)
                  </span>
                  <span className="text-slate-400 mt-0.5 block">
                    Suspends the edge overlay when <code className="text-cyan-300">ORIENTATION_LANDSCAPE</code> is active to prevent accidental triggers in full-screen games.
                  </span>
                </div>
              </label>
            </div>

            {/* Serialized Jetpack DataStore Preview (Section 8.1) */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span>Jetpack DataStore: edge_config.preferences_pb</span>
                <span className="text-emerald-400">Synced</span>
              </div>
              <pre className="text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
{`edgeSide: Enum(RIGHT, LEFT) = ${edgePrefs.edgeSide}
widthDp: Int = ${edgePrefs.widthDp} | heightDp: Int = ${edgePrefs.heightDp}
verticalBiasPercent: Int = ${edgePrefs.verticalBiasPercent}
minConfidence: Float = ${edgePrefs.minConfidence.toFixed(2)}f
excludeBackGesture: Boolean = ${edgePrefs.excludeBackGesture}
pauseInLandscape: Boolean = ${edgePrefs.pauseInLandscape}`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive FR-04 Inward Swipe Vector Filter Verifier */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-mono text-cyan-400">
              FR-04 · Inward Swipe Vector Filter Verification
            </span>
            <h3 className="text-base font-bold text-white font-display mt-0.5">
              Scroll Collision vs. Canvas Trigger Gate (|dx| &gt; 24 dp &amp; |dx| &gt; 1.5 · |dy|)
            </h3>
          </div>
          <span
            className={`text-xs font-mono font-semibold px-3 py-1 rounded-lg border ${
              swipeDiagnostic.triggered
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                : 'bg-rose-950/80 border-rose-800 text-rose-300'
            }`}
          >
            {swipeDiagnostic.triggered ? 'TRIGGERED (< 16 ms)' : 'IGNORED (PASS-THROUGH)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="swipe-dx-slider" className="text-slate-300">
                Horizontal Delta (dx)
              </label>
              <span className="font-mono text-cyan-400">{testDxDp} dp</span>
            </div>
            <input
              id="swipe-dx-slider"
              type="range"
              min={-60}
              max={60}
              step={2}
              value={testDxDp}
              onChange={(e) => setTestDxDp(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="swipe-dy-slider" className="text-slate-300">
                Vertical Scroll Delta (dy)
              </label>
              <span className="font-mono text-cyan-400">{testDyDp} dp</span>
            </div>
            <input
              id="swipe-dy-slider"
              type="range"
              min={-50}
              max={50}
              step={2}
              value={testDyDp}
              onChange={(e) => setTestDyDp(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 space-y-1">
            <div>
              |dx| = {Math.abs(testDxDp)} dp · 1.5×|dy| = {(1.5 * Math.abs(testDyDp)).toFixed(1)} dp
            </div>
            <div className="text-slate-400 truncate" title={swipeDiagnostic.reason}>
              {swipeDiagnostic.reason}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
