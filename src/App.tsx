/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EdgeConfigPreferences,
  GestureEntity,
  Point2D,
  RecognitionMatchResult,
  recognizeGesture,
} from './utils/dollarOneEngine';
import {
  generateSyntheticSymbolStroke,
  INSTALLED_ANDROID_PACKAGES,
  loadStoredEdgePrefs,
  loadStoredGestures,
  saveStoredEdgePrefs,
  saveStoredGestures,
} from './utils/gestureStore';
import { KOTLIN_SOURCE_MODULES } from './utils/kotlinScaffolding';
import { LiveEdgeOverlaySimulator } from './components/LiveEdgeOverlaySimulator';
import { EdgeZoneCalibrationPanel } from './components/EdgeZoneCalibrationPanel';
import { GestureLibraryAndRecorder } from './components/GestureLibraryAndRecorder';
import { MathPipelineAndSlaPanel } from './components/MathPipelineAndSlaPanel';
import { KotlinSourceAndSrsViewer } from './components/KotlinSourceAndSrsViewer';

type ConsoleTab = 'calibration' | 'library' | 'pipeline' | 'kotlin';

export default function App() {
  const [activeTab, setActiveTab] = React.useState<ConsoleTab>('calibration');
  const [edgePrefs, setEdgePrefs] = React.useState<EdgeConfigPreferences>(() =>
    loadStoredEdgePrefs()
  );
  const [gestures, setGestures] = React.useState<GestureEntity[]>(() =>
    loadStoredGestures()
  );
  const [isRecorderOpen, setIsRecorderOpen] = React.useState<boolean>(false);
  const [selectedKotlinModuleId, setSelectedKotlinModuleId] = React.useState<string>(
    KOTLIN_SOURCE_MODULES[0].id
  );

  // Initialize with a pre-computed 'W' recognition telemetry so the Math Pipeline tab is immediately rich
  const initialStroke = React.useMemo(
    () => generateSyntheticSymbolStroke('W', 1),
    []
  );
  const [lastRawStroke, setLastRawStroke] = React.useState<Point2D[]>(initialStroke);
  const [lastMatchResult, setLastMatchResult] =
    React.useState<RecognitionMatchResult | null>(() =>
      recognizeGesture(initialStroke, loadStoredGestures(), loadStoredEdgePrefs().minConfidence)
    );

  const handleUpdateEdgePrefs = (next: EdgeConfigPreferences) => {
    setEdgePrefs(next);
    saveStoredEdgePrefs(next);
  };

  const handleSaveGesture = (newEntity: GestureEntity, overwriteId?: number) => {
    setGestures((prev) => {
      const next =
        overwriteId !== undefined
          ? prev.map((g) => (g.id === overwriteId ? newEntity : g))
          : [newEntity, ...prev];
      saveStoredGestures(next);
      return next;
    });
  };

  const handleDeleteGesture = (id: number) => {
    setGestures((prev) => {
      const next = prev.filter((g) => g.id !== id);
      saveStoredGestures(next);
      return next;
    });
  };

  const handleRebindPackage = (id: number, targetPackage: string) => {
    const pkgMeta = INSTALLED_ANDROID_PACKAGES.find(
      (p) => p.packageName === targetPackage
    );
    setGestures((prev) => {
      const next = prev.map((g) =>
        g.id === id
          ? {
              ...g,
              targetPackage,
              targetActivity: pkgMeta?.activityName ?? g.targetActivity,
              appCategory: pkgMeta?.category ?? g.appCategory,
              accentColor: pkgMeta?.accentColor ?? g.accentColor,
              gestureLabel: pkgMeta ? `Launch ${pkgMeta.appName}` : g.gestureLabel,
            }
          : g
      );
      saveStoredGestures(next);
      return next;
    });
  };

  const handleTestGestureInOverlay = (entity: GestureEntity) => {
    const res = recognizeGesture(
      entity.normalizedPoints,
      gestures,
      edgePrefs.minConfidence
    );
    setLastRawStroke(entity.normalizedPoints);
    setLastMatchResult(res);
  };

  const handleRecognitionComplete = (
    result: RecognitionMatchResult,
    rawStroke: Point2D[]
  ) => {
    setLastMatchResult(result);
    setLastRawStroke(rawStroke);
  };

  const handleOpenRecorderFromOverlay = () => {
    setActiveTab('library');
    setIsRecorderOpen(true);
  };

  const handleExportKotlinBundle = () => {
    const bundleContent = KOTLIN_SOURCE_MODULES.map(
      (mod) =>
        `// ============================================================================\n// FILE: ${mod.filename} (${mod.packagePath})\n// LAYER: ${mod.layer}\n// REQUIREMENTS: ${mod.requirementsCovered.join(', ')}\n// ============================================================================\n\n${mod.code}\n\n`
    ).join('\n');
    const blob = new Blob([bundleContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ShadowGestures-SG-SRS-2026-V1.0-Kotlin-Core.txt';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-slate-950/95 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('calibration');
          }}
          className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 font-display"
        >
          ShadowGestures
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400"
        >
          <a
            href="#calibration"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('calibration');
            }}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'calibration' ? 'text-white font-semibold underline' : ''
            }`}
          >
            Edge Calibration
          </a>
          <a
            href="#library"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('library');
            }}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'library' ? 'text-white font-semibold underline' : ''
            }`}
          >
            Gesture Library
          </a>
          <a
            href="#pipeline"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('pipeline');
            }}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'pipeline' ? 'text-white font-semibold underline' : ''
            }`}
          >
            $1 Math &amp; SLA
          </a>
          <a
            href="#kotlin"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('kotlin');
            }}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'kotlin' ? 'text-white font-semibold underline' : ''
            }`}
          >
            Kotlin &amp; SRS
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportKotlinBundle}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Export Kotlin Bundle
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main
        id="top"
        className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-7 space-y-6"
      >
        {/* Document Header & 4-Metric SRS SLA Strip (Page 1 of PDF) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-mono text-cyan-400">
                  IEEE 830 / ISO-IEC-IEEE 29148 STANDARD · DOCUMENT ID: SG-SRS-2026-V1.0
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display">
                  ShadowGestures: Invisible Edge Gesture Launcher
                </h1>
              </div>

              {/* Interactive Console View Switcher */}
              <div
                role="tablist"
                aria-label="Configuration console modules"
                className="flex flex-wrap sm:flex-nowrap items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl self-start lg:self-auto shrink-0"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'calibration'}
                  onClick={() => setActiveTab('calibration')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'calibration'
                      ? 'bg-cyan-400 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Screen 1: Edge Calibration
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'library'}
                  onClick={() => setActiveTab('library')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'library'
                      ? 'bg-cyan-400 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Screen 2: Gesture Library ({gestures.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'pipeline'}
                  onClick={() => setActiveTab('pipeline')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'pipeline'
                      ? 'bg-cyan-400 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  $1 Math Pipeline &amp; SLA
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'kotlin'}
                  onClick={() => setActiveTab('kotlin')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'kotlin'
                      ? 'bg-cyan-400 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Kotlin Code &amp; SRS
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-400 max-w-4xl">
              Interactive Material 3 Configuration Console, Live 120Hz Transparent Edge Overlay, Offline $1 Unistroke Recognizer (N=64), 3-Sample Centroid Recorder, and Android Kotlin Scaffolding.
            </p>
          </div>

          {/* 4-Column SLA Benchmark Strip from PDF Page 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
            <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5">
              <div className="text-lg sm:text-xl font-bold font-mono text-white">
                &lt; 500 ms
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                End-to-End Launch SLA ({lastMatchResult ? `${lastMatchResult.slaBreakdown.totalEndToEndMs} ms last` : '<15 ms math'})
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5">
              <div className="text-lg sm:text-xl font-bold font-mono text-cyan-400">
                {edgePrefs.widthDp} &times; {edgePrefs.heightDp} dp
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Active {edgePrefs.edgeSide === 'RIGHT' ? 'Right' : 'Left'} Edge Trigger Zone
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5">
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
                0% Network
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                100% Offline Privacy (Zero Telemetry)
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5">
              <div className="text-lg sm:text-xl font-bold font-mono text-white">
                &lt; 1.2% / 24h
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Idle Battery Ceiling (&lt; 18 MB PSS)
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Split Workspace: Live Android Overlay Simulator (Left) + Active Console Panel (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <LiveEdgeOverlaySimulator
              edgePrefs={edgePrefs}
              gestures={gestures}
              lastMatchResult={lastMatchResult}
              onRecognitionComplete={handleRecognitionComplete}
              onOpenRecorder={handleOpenRecorderFromOverlay}
            />
          </div>

          <div className="lg:col-span-7">
            {activeTab === 'calibration' && (
              <EdgeZoneCalibrationPanel
                edgePrefs={edgePrefs}
                onChangePrefs={handleUpdateEdgePrefs}
              />
            )}

            {activeTab === 'library' && (
              <GestureLibraryAndRecorder
                gestures={gestures}
                isRecorderOpen={isRecorderOpen}
                onSetRecorderOpen={setIsRecorderOpen}
                onSaveGesture={handleSaveGesture}
                onDeleteGesture={handleDeleteGesture}
                onRebindPackage={handleRebindPackage}
                onTestGestureInOverlay={handleTestGestureInOverlay}
              />
            )}

            {activeTab === 'pipeline' && (
              <MathPipelineAndSlaPanel
                lastMatchResult={lastMatchResult}
                lastRawStroke={lastRawStroke}
                minConfidence={edgePrefs.minConfidence}
              />
            )}

            {activeTab === 'kotlin' && (
              <KotlinSourceAndSrsViewer
                selectedModuleId={selectedKotlinModuleId}
                onSelectModuleId={setSelectedKotlinModuleId}
                onExportKotlinBundle={handleExportKotlinBundle}
              />
            )}
          </div>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-4 mt-10">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            ShadowGestures · Invisible Edge Gesture Launcher · Document ID: SG-SRS-2026-V1.0
          </span>
          <span>
            Offline $1 Unistroke Recognizer (N=64) · Room SQLite &amp; Jetpack DataStore Architecture
          </span>
        </div>
      </footer>
    </div>
  );
}
