import {
  EdgeConfigPreferences,
  GestureEntity,
  normalizeStroke,
  Point2D,
} from './dollarOneEngine';

export interface InstalledAppPackage {
  packageName: string;
  activityName: string;
  appName: string;
  category: string;
  accentColor: string;
}

export const INSTALLED_ANDROID_PACKAGES: InstalledAppPackage[] = [
  {
    packageName: 'com.whatsapp',
    activityName: 'com.whatsapp.HomeActivity',
    appName: 'WhatsApp',
    category: 'Messaging',
    accentColor: '#10B981',
  },
  {
    packageName: 'com.android.camera',
    activityName: 'com.android.camera.CameraLauncher',
    appName: 'Pro Camera',
    category: 'Photography',
    accentColor: '#06B6D4',
  },
  {
    packageName: 'com.spotify.music',
    activityName: 'com.spotify.music.MainActivity',
    appName: 'Spotify',
    category: 'Media & Audio',
    accentColor: '#22C55E',
  },
  {
    packageName: 'com.android.systemui.torch',
    activityName: 'com.android.systemui.TorchQuickAction',
    appName: 'System Torch',
    category: 'System Hardware',
    accentColor: '#F59E0B',
  },
  {
    packageName: 'org.thoughtcrime.securesms',
    activityName: 'org.thoughtcrime.securesms.RoutingActivity',
    appName: 'Signal Messenger',
    category: 'Encrypted Comms',
    accentColor: '#3B82F6',
  },
  {
    packageName: 'com.google.android.apps.maps',
    activityName: 'com.google.android.maps.MapsActivity',
    appName: 'Navigation Maps',
    category: 'Navigation',
    accentColor: '#14B8A6',
  },
  {
    packageName: 'com.obsidian.md',
    activityName: 'md.obsidian.MainActivity',
    appName: 'Obsidian Vault',
    category: 'Knowledge Base',
    accentColor: '#8B5CF6',
  },
  {
    packageName: 'com.android.dialer',
    activityName: 'com.android.dialer.main.impl.MainActivity',
    appName: 'Phone Dialer',
    category: 'System Utility',
    accentColor: '#0EA5E9',
  },
  {
    packageName: 'com.protonvpn.android',
    activityName: 'com.protonvpn.android.ui.home.HomeActivity',
    appName: 'ProtonVPN Tunnel',
    category: 'Security',
    accentColor: '#6366F1',
  },
];

export const DEFAULT_EDGE_PREFERENCES: EdgeConfigPreferences = {
  edgeSide: 'RIGHT',
  widthDp: 20,
  heightDp: 160,
  verticalBiasPercent: 50,
  minConfidence: 0.8,
  excludeBackGesture: true,
  pauseInLandscape: true,
};

function interpolatePolyline(
  waypoints: Point2D[],
  stepsPerSegment: number = 18,
  jitterAmount: number = 0,
  seedOffset: number = 0
): Point2D[] {
  const result: Point2D[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    for (let s = 0; s < stepsPerSegment; s++) {
      const t = s / stepsPerSegment;
      const idx = i * stepsPerSegment + s + seedOffset;
      const jx = jitterAmount * Math.sin(idx * 1.7 + 0.5);
      const jy = jitterAmount * Math.cos(idx * 2.3 + 1.1);
      result.push({
        x: start.x + (end.x - start.x) * t + jx,
        y: start.y + (end.y - start.y) * t + jy,
      });
    }
  }
  const last = waypoints[waypoints.length - 1];
  result.push({ x: last.x, y: last.y });
  return result;
}

/**
 * Generates realistic unistroke coordinates in a 300x300 canvas box
 */
export function generateSyntheticSymbolStroke(
  symbol: 'W' | 'C' | 'S' | 'V' | 'Z' | 'O' | 'L' | 'M' | 'Δ',
  variantIndex: number = 0
): Point2D[] {
  const jitter = variantIndex === 0 ? 0 : 2.2 * variantIndex;
  const rotDeg = variantIndex === 0 ? 0 : variantIndex === 1 ? 4 : -4;
  const scale = variantIndex === 0 ? 1 : variantIndex === 1 ? 0.94 : 1.05;

  let raw: Point2D[] = [];

  switch (symbol) {
    case 'W': {
      raw = interpolatePolyline(
        [
          { x: 55, y: 75 },
          { x: 98, y: 230 },
          { x: 150, y: 120 },
          { x: 202, y: 230 },
          { x: 245, y: 75 },
        ],
        16,
        jitter,
        variantIndex * 13
      );
      break;
    }
    case 'C': {
      const pts: Point2D[] = [];
      const cx = 160;
      const cy = 150;
      const rx = 85;
      const ry = 92;
      const startAngle = -0.68 * Math.PI;
      const endAngle = 0.68 * Math.PI;
      const steps = 64;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Counter-clockwise arc from top-right through left to bottom-right
        const angle = -0.28 * Math.PI - t * (1.44 * Math.PI);
        pts.push({
          x: cx + rx * Math.cos(angle) + jitter * Math.sin(i + variantIndex),
          y: cy + ry * Math.sin(angle) + jitter * Math.cos(i + variantIndex),
        });
      }
      void startAngle;
      void endAngle;
      raw = pts;
      break;
    }
    case 'S': {
      const pts: Point2D[] = [];
      const steps = 68;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Smooth S curve from top-right to bottom-left
        const y = 60 + t * 185;
        const x = 150 - 75 * Math.sin(t * 2 * Math.PI - 0.35 * Math.PI);
        pts.push({
          x: x + jitter * Math.sin(i * 1.3 + variantIndex),
          y: y + jitter * Math.cos(i * 1.7 + variantIndex),
        });
      }
      raw = pts;
      break;
    }
    case 'V': {
      raw = interpolatePolyline(
        [
          { x: 70, y: 70 },
          { x: 150, y: 235 },
          { x: 230, y: 70 },
        ],
        28,
        jitter,
        variantIndex * 19
      );
      break;
    }
    case 'Z': {
      raw = interpolatePolyline(
        [
          { x: 65, y: 75 },
          { x: 235, y: 75 },
          { x: 65, y: 225 },
          { x: 235, y: 225 },
        ],
        22,
        jitter,
        variantIndex * 23
      );
      break;
    }
    case 'O': {
      const pts: Point2D[] = [];
      const steps = 64;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = -0.5 * Math.PI - t * 1.95 * Math.PI;
        pts.push({
          x: 150 + 85 * Math.cos(angle) + jitter * Math.sin(i),
          y: 150 + 85 * Math.sin(angle) + jitter * Math.cos(i),
        });
      }
      raw = pts;
      break;
    }
    case 'L': {
      raw = interpolatePolyline(
        [
          { x: 85, y: 65 },
          { x: 85, y: 230 },
          { x: 225, y: 230 },
        ],
        28,
        jitter,
        variantIndex * 17
      );
      break;
    }
    case 'M': {
      raw = interpolatePolyline(
        [
          { x: 55, y: 230 },
          { x: 85, y: 70 },
          { x: 150, y: 180 },
          { x: 215, y: 70 },
          { x: 245, y: 230 },
        ],
        16,
        jitter,
        variantIndex * 29
      );
      break;
    }
    case 'Δ': {
      raw = interpolatePolyline(
        [
          { x: 150, y: 65 },
          { x: 65, y: 225 },
          { x: 235, y: 225 },
          { x: 150, y: 65 },
        ],
        20,
        jitter,
        variantIndex * 31
      );
      break;
    }
  }

  if (rotDeg === 0 && scale === 1) return raw;

  const rad = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return raw.map((p) => {
    const dx = (p.x - 150) * scale;
    const dy = (p.y - 150) * scale;
    return {
      x: 150 + dx * cos - dy * sin,
      y: 150 + dx * sin + dy * cos,
    };
  });
}

export const INITIAL_GESTURE_ENTITIES: GestureEntity[] = [
  {
    id: 1,
    gestureLabel: 'Launch WhatsApp',
    symbolName: 'W',
    targetPackage: 'com.whatsapp',
    targetActivity: 'com.whatsapp.HomeActivity',
    appCategory: 'Messaging',
    accentColor: '#10B981',
    normalizedPoints: normalizeStroke(generateSyntheticSymbolStroke('W', 0))
      .normalizedPoints,
    createdAt: 1761280000000,
  },
  {
    id: 2,
    gestureLabel: 'Open Pro Camera',
    symbolName: 'C',
    targetPackage: 'com.android.camera',
    targetActivity: 'com.android.camera.CameraLauncher',
    appCategory: 'Photography',
    accentColor: '#06B6D4',
    normalizedPoints: normalizeStroke(generateSyntheticSymbolStroke('C', 0))
      .normalizedPoints,
    createdAt: 1761283600000,
  },
  {
    id: 3,
    gestureLabel: 'Launch Spotify',
    symbolName: 'S',
    targetPackage: 'com.spotify.music',
    targetActivity: 'com.spotify.music.MainActivity',
    appCategory: 'Media & Audio',
    accentColor: '#22C55E',
    normalizedPoints: normalizeStroke(generateSyntheticSymbolStroke('S', 0))
      .normalizedPoints,
    createdAt: 1761287200000,
  },
  {
    id: 4,
    gestureLabel: 'Toggle System Torch',
    symbolName: 'V',
    targetPackage: 'com.android.systemui.torch',
    targetActivity: 'com.android.systemui.TorchQuickAction',
    appCategory: 'System Hardware',
    accentColor: '#F59E0B',
    normalizedPoints: normalizeStroke(generateSyntheticSymbolStroke('V', 0))
      .normalizedPoints,
    createdAt: 1761290800000,
  },
  {
    id: 5,
    gestureLabel: 'Signal Messenger',
    symbolName: 'Z',
    targetPackage: 'org.thoughtcrime.securesms',
    targetActivity: 'org.thoughtcrime.securesms.RoutingActivity',
    appCategory: 'Encrypted Comms',
    accentColor: '#3B82F6',
    normalizedPoints: normalizeStroke(generateSyntheticSymbolStroke('Z', 0))
      .normalizedPoints,
    createdAt: 1761294400000,
  },
];

const STORAGE_KEYS = {
  GESTURES: 'shadowgestures_room_entities_v1',
  EDGE_PREFS: 'shadowgestures_edge_prefs_v1',
};

export function loadStoredGestures(): GestureEntity[] {
  if (typeof window === 'undefined') return INITIAL_GESTURE_ENTITIES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.GESTURES);
    if (!raw) return INITIAL_GESTURE_ENTITIES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return INITIAL_GESTURE_ENTITIES;
}

export function saveStoredGestures(entities: GestureEntity[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.GESTURES, JSON.stringify(entities));
  } catch {
    // ignore storage errors
  }
}

export function loadStoredEdgePrefs(): EdgeConfigPreferences {
  if (typeof window === 'undefined') return DEFAULT_EDGE_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.EDGE_PREFS);
    if (!raw) return DEFAULT_EDGE_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_EDGE_PREFERENCES,
      ...parsed,
    };
  } catch {
    return DEFAULT_EDGE_PREFERENCES;
  }
}

export function saveStoredEdgePrefs(prefs: EdgeConfigPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.EDGE_PREFS, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}
