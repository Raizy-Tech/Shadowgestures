export interface KotlinSourceModule {
  id: string;
  filename: string;
  packagePath: string;
  layer: string;
  requirementsCovered: string[];
  summary: string;
  code: string;
}

export interface FunctionalRequirementItem {
  reqId: string;
  module: string;
  specification: string;
  priority: 'P0-Crit' | 'P1-High';
  slaTarget: string;
}

export const SRS_FUNCTIONAL_REQUIREMENTS: FunctionalRequirementItem[] = [
  {
    reqId: 'FR-01',
    module: 'Unlock Lifecycle',
    specification:
      'System shall register a dynamic receiver for ACTION_USER_PRESENT and ACTION_SCREEN_OFF to mount and unmount the edge overlay dynamically.',
    priority: 'P0-Crit',
    slaTarget: '< 30 ms attach / 0% sleep CPU',
  },
  {
    reqId: 'FR-02',
    module: 'Edge Trigger Zone',
    specification:
      'System shall render a transparent view defaulting to Right Edge, 20 dp width, 160 dp height, centered vertically using FLAG_NOT_FOCUSABLE.',
    priority: 'P0-Crit',
    slaTarget: '20 × 160 dp @ alpha = 0.0f',
  },
  {
    reqId: 'FR-03',
    module: 'Nav Conflict Guard',
    specification:
      'System shall invoke ViewCompat.setSystemGestureExclusionRects() bounded to the 160 dp edge height (under Android 200 dp limit) to prevent Back-swipe collisions.',
    priority: 'P0-Crit',
    slaTarget: '< 200 dp OS exclusion quota',
  },
  {
    reqId: 'FR-04',
    module: 'Inward Swipe Filter',
    specification:
      'Edge zone shall ignore vertical scroll touches and trigger the drawing overlay strictly when horizontal inward displacement exceeds 24 dp with |dx| > 1.5 * |dy|.',
    priority: 'P0-Crit',
    slaTarget: '< 16 ms (1 frame @ 60Hz)',
  },
  {
    reqId: 'FR-05',
    module: 'Drawing Overlay',
    specification:
      'Upon trigger, a MATCH_PARENT canvas overlay shall capture MotionEvent coordinates and render a smooth anti-aliased stroke trail at 60/120 Hz.',
    priority: 'P0-Crit',
    slaTarget: '8.3 ms frame time (120Hz)',
  },
  {
    reqId: 'FR-06',
    module: '$1 Pattern Engine',
    specification:
      'Upon ACTION_UP, captured points shall be resampled to N = 64 equidistant points, rotated to indicative angle 0°, scaled to a 250×250 square, and scored.',
    priority: 'P0-Crit',
    slaTarget: '3.5 ms normalize + 4.5 ms match',
  },
  {
    reqId: 'FR-07',
    module: 'Confidence Gate',
    specification:
      'Matches scoring >= 0.80 (80% similarity) shall immediately launch the bound package; scores < 0.80 shall trigger a reject haptic pulse and dismiss cleanly.',
    priority: 'P0-Crit',
    slaTarget: '< 500 ms end-to-end launch',
  },
  {
    reqId: 'FR-08',
    module: 'Custom CRUD Store',
    specification:
      'Users shall record, test, rebind, and delete custom gesture symbols mapped to any launchable application via an offline Room database.',
    priority: 'P1-High',
    slaTarget: '3-sample >= 85% consistency',
  },
  {
    reqId: 'FR-09',
    module: 'Landscape Auto-Pause',
    specification:
      'System shall optionally suspend the edge trigger when ORIENTATION_LANDSCAPE is detected to prevent accidental triggers during full-screen gaming.',
    priority: 'P1-High',
    slaTarget: 'Zero fullscreen touch intercept',
  },
];

export const KOTLIN_SOURCE_MODULES: KotlinSourceModule[] = [
  {
    id: 'shadow-edge-service',
    filename: 'ShadowEdgeService.kt',
    packagePath: 'com.shadowgestures.core.overlay',
    layer: '1. OS Overlay & Lifecycle Layer (AccessibilityService)',
    requirementsCovered: ['FR-01', 'FR-02', 'FR-03', 'FR-04', 'FR-09', 'NFR-SEC-02'],
    summary:
      'Event-driven AccessibilityService managing dynamic unlock/sleep BroadcastReceiver, 20x160dp transparent edge trigger, Android 10+ gesture exclusion rects, and inward swipe filter.',
    code: `package com.shadowgestures.core.overlay

import android.accessibilityservice.AccessibilityService
import android.content.*
import android.content.res.Configuration
import android.graphics.*
import android.os.Build
import android.view.*
import android.view.accessibility.AccessibilityEvent
import androidx.core.view.ViewCompat
import com.shadowgestures.core.engine.DollarOneRecognizer
import com.shadowgestures.core.storage.EdgePrefsRepository
import com.shadowgestures.core.storage.GestureRepository
import kotlinx.coroutines.*
import kotlin.math.abs

class ShadowEdgeService : AccessibilityService() {

    private lateinit var windowManager: WindowManager
    private var edgeTriggerView: View? = null
    private var drawingCanvasView: GestureOverlayCanvas? = null
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private val unlockReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
            when (intent.action) {
                Intent.ACTION_USER_PRESENT -> attachInvisibleEdgeZone()
                Intent.ACTION_SCREEN_OFF -> detachAllOverlays() // 0% idle battery while sleeping
            }
        }
    }

    override fun onServiceConnected() {
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        registerReceiver(unlockReceiver, IntentFilter().apply {
            addAction(Intent.ACTION_USER_PRESENT)
            addAction(Intent.ACTION_SCREEN_OFF)
        })
        attachInvisibleEdgeZone()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        val pauseInLandscape = EdgePrefsRepository.currentPrefs.pauseInLandscape
        if (pauseInLandscape && newConfig.orientation == Configuration.ORIENTATION_LANDSCAPE) {
            detachAllOverlays()
        } else if (newConfig.orientation == Configuration.ORIENTATION_PORTRAIT) {
            attachInvisibleEdgeZone()
        }
    }

    private fun attachInvisibleEdgeZone() {
        if (edgeTriggerView != null) return
        val prefs = EdgePrefsRepository.currentPrefs
        if (prefs.pauseInLandscape &&
            resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
        ) return

        val density = resources.displayMetrics.density
        val widthPx = (prefs.widthDp * density).toInt()     // Default: 20 dp width
        val heightPx = (prefs.heightDp * density).toInt()   // Default: 160 dp height (< 200dp OS limit)
        val swipeSlopPx = 24f * density

        val edgeGravity = if (prefs.edgeSide == EdgePrefsRepository.EdgeSide.RIGHT) {
            Gravity.END
        } else {
            Gravity.START
        }

        val params = WindowManager.LayoutParams(
            widthPx,
            heightPx,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = edgeGravity or Gravity.CENTER_VERTICAL
            y = (((prefs.verticalBiasPercent - 50) / 100f) * resources.displayMetrics.heightPixels).toInt()
        }

        edgeTriggerView = object : View(this) {
            private var startX = 0f
            private var startY = 0f
            private var triggeredInStroke = false

            override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
                super.onLayout(changed, l, t, r, b)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && prefs.excludeBackGesture) {
                    ViewCompat.setSystemGestureExclusionRects(
                        this,
                        listOf(Rect(0, 0, width, height))
                    )
                }
            }

            override fun onTouchEvent(event: MotionEvent): Boolean {
                when (event.actionMasked) {
                    MotionEvent.ACTION_DOWN -> {
                        startX = event.rawX
                        startY = event.rawY
                        triggeredInStroke = false
                        return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val dx = event.rawX - startX
                        val dy = event.rawY - startY
                        val isInward = if (prefs.edgeSide == EdgePrefsRepository.EdgeSide.RIGHT) {
                            dx < -swipeSlopPx
                        } else {
                            dx > swipeSlopPx
                        }
                        // FR-04: Strictly trigger when inward |dx| > 24dp and |dx| > 1.5 * |dy|
                        if (!triggeredInStroke && isInward && abs(dx) > 1.5f * abs(dy)) {
                            triggeredInStroke = true
                            performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                            mountFullScreenDrawingCanvas(event)
                        } else if (triggeredInStroke) {
                            drawingCanvasView?.forwardMotionEvent(event)
                        }
                        return true
                    }
                    MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                        if (triggeredInStroke) {
                            drawingCanvasView?.forwardMotionEvent(event)
                        }
                        triggeredInStroke = false
                        return true
                    }
                }
                return super.onTouchEvent(event)
            }
        }

        windowManager.addView(edgeTriggerView, params)
    }

    private fun mountFullScreenDrawingCanvas(initialEvent: MotionEvent) {
        if (drawingCanvasView != null) return
        val canvasParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        )

        drawingCanvasView = GestureOverlayCanvas(
            context = this,
            onStrokeCompleted = { capturedPoints ->
                handleStrokeClassification(capturedPoints)
            },
            onTimeoutDismiss = {
                unmountDrawingCanvas()
            }
        ).also { canvas ->
            windowManager.addView(canvas, canvasParams)
            canvas.forwardMotionEvent(initialEvent)
        }
    }

    private fun handleStrokeClassification(points: List<PointF>) {
        serviceScope.launch {
            val templates = withContext(Dispatchers.Default) {
                GestureRepository.getCachedTemplates()
            }
            val result = withContext(Dispatchers.Default) {
                DollarOneRecognizer.recognize(points, templates)
            }
            val minConfidence = EdgePrefsRepository.currentPrefs.minConfidence
            if (result != null && result.score >= minConfidence && points.size >= 8) {
                drawingCanvasView?.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
                unmountDrawingCanvas()
                launchTargetPackage(result.template.targetPackage)
            } else {
                drawingCanvasView?.flashRejectAndDissolve {
                    unmountDrawingCanvas()
                }
            }
        }
    }

    private fun launchTargetPackage(packageName: String) {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        }
        if (launchIntent != null) {
            startActivity(launchIntent)
        }
    }

    private fun unmountDrawingCanvas() {
        drawingCanvasView?.let {
            if (it.isAttachedToWindow) windowManager.removeViewImmediate(it)
        }
        drawingCanvasView = null
    }

    private fun detachAllOverlays() {
        unmountDrawingCanvas()
        edgeTriggerView?.let {
            if (it.isAttachedToWindow) windowManager.removeViewImmediate(it)
        }
        edgeTriggerView = null
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit
    override fun onInterrupt() = detachAllOverlays()

    override fun onDestroy() {
        unregisterReceiver(unlockReceiver)
        detachAllOverlays()
        serviceScope.cancel()
        super.onDestroy()
    }
}`,
  },
  {
    id: 'dollar-one-recognizer',
    filename: 'DollarOneRecognizer.kt',
    packagePath: 'com.shadowgestures.core.engine',
    layer: '2. Domain Recognition & Dispatch Engine',
    requirementsCovered: ['FR-06', 'FR-07', 'Section 08', 'Section 11'],
    summary:
      'Pure Kotlin $1 Unistroke Recognizer implementing N=64 equidistant resampling, indicative angle alignment, 250x250 non-uniform scaling, and Golden Section Search.',
    code: `package com.shadowgestures.core.engine

import android.graphics.PointF
import com.shadowgestures.core.storage.GestureTemplate
import kotlin.math.*

object DollarOneRecognizer {

    private const val NUM_POINTS = 64
    private const val SQUARE_SIZE = 250.0f
    private val HALF_DIAGONAL = 0.5f * sqrt(SQUARE_SIZE * SQUARE_SIZE + SQUARE_SIZE * SQUARE_SIZE)
    private val ANGLE_RANGE = Math.toRadians(45.0).toFloat()
    private val ANGLE_PRECISION = Math.toRadians(2.0).toFloat()
    private val PHI = 0.5f * (-1.0f + sqrt(5.0f)) // Golden Ratio ~0.618034

    data class RecognitionResult(
        val template: GestureTemplate,
        val score: Float,
        val distance: Float
    )

    fun recognize(rawPoints: List<PointF>, templates: List<GestureTemplate>): RecognitionResult? {
        if (rawPoints.size < 8 || templates.isEmpty()) return null
        val candidate = normalize(rawPoints)

        var bestDistance = Float.MAX_VALUE
        var bestTemplate: GestureTemplate? = null

        for (template in templates) {
            val d = distanceAtBestAngle(candidate, template.normalizedPoints)
            if (d < bestDistance) {
                bestDistance = d
                bestTemplate = template
            }
        }

        val matched = bestTemplate ?: return null
        val score = (1.0f - (bestDistance / HALF_DIAGONAL)).coerceIn(0.0f, 1.0f)
        return RecognitionResult(matched, score, bestDistance)
    }

    fun normalize(points: List<PointF>): List<PointF> {
        val resampled = resample(points, NUM_POINTS)
        val angle = indicativeAngle(resampled)
        val rotated = rotateBy(resampled, -angle)
        val scaled = scaleToSquare(rotated, SQUARE_SIZE)
        return translateToOrigin(scaled)
    }

    /**
     * Step 1: Equidistant Resampling into N = 64 points spaced at I = PathLength(P) / (N - 1)
     */
    private fun resample(points: List<PointF>, n: Int): List<PointF> {
        val interval = pathLength(points) / (n - 1)
        var accDist = 0.0f
        val src = points.map { PointF(it.x, it.y) }.toMutableList()
        val out = ArrayList<PointF>(n).apply { add(PointF(src[0].x, src[0].y)) }

        var i = 1
        while (i < src.size) {
            val d = hypot(src[i].x - src[i - 1].x, src[i].y - src[i - 1].y)
            if (accDist + d >= interval && d > 1e-5f) {
                val t = (interval - accDist) / d
                val qx = src[i - 1].x + t * (src[i].x - src[i - 1].x)
                val qy = src[i - 1].y + t * (src[i].y - src[i - 1].y)
                val q = PointF(qx, qy)
                out.add(q)
                src.add(i, q)
                accDist = 0.0f
                i++
            } else {
                accDist += d
                i++
            }
        }
        while (out.size < n) {
            out.add(PointF(src.last().x, src.last().y))
        }
        return out
    }

    /**
     * Step 2: Indicative Angle Alignment around centroid C
     */
    private fun indicativeAngle(points: List<PointF>): Float {
        val c = centroid(points)
        return atan2(c.y - points[0].y, c.x - points[0].x)
    }

    private fun rotateBy(points: List<PointF>, radians: Float): List<PointF> {
        val c = centroid(points)
        val cos = cos(radians)
        val sin = sin(radians)
        return points.map { p ->
            val dx = p.x - c.x
            val dy = p.y - c.y
            PointF(dx * cos - dy * sin + c.x, dx * sin + dy * cos + c.y)
        }
    }

    /**
     * Step 3: Non-Uniform Scaling & Translation to reference square S = 250.0 at origin (0, 0)
     */
    private fun scaleToSquare(points: List<PointF>, size: Float): List<PointF> {
        var minX = Float.MAX_VALUE; var maxX = -Float.MAX_VALUE
        var minY = Float.MAX_VALUE; var maxY = -Float.MAX_VALUE
        for (p in points) {
            if (p.x < minX) minX = p.x
            if (p.x > maxX) maxX = p.x
            if (p.y < minY) minY = p.y
            if (p.y > maxY) maxY = p.y
        }
        val width = (maxX - minX).coerceAtLeast(1e-3f)
        val height = (maxY - minY).coerceAtLeast(1e-3f)
        return points.map { p ->
            PointF((p.x - minX) * (size / width), (p.y - minY) * (size / height))
        }
    }

    private fun translateToOrigin(points: List<PointF>): List<PointF> {
        val c = centroid(points)
        return points.map { p -> PointF(p.x - c.x, p.y - c.y) }
    }

    /**
     * Step 4: Golden Section Search for minimum Euclidean path distance
     */
    private fun distanceAtBestAngle(points: List<PointF>, template: List<PointF>): Float {
        var a = -ANGLE_RANGE
        var b = ANGLE_RANGE
        var x1 = PHI * a + (1.0f - PHI) * b
        var f1 = distanceAtAngle(points, template, x1)
        var x2 = (1.0f - PHI) * a + PHI * b
        var f2 = distanceAtAngle(points, template, x2)

        while (abs(b - a) > ANGLE_PRECISION) {
            if (f1 < f2) {
                b = x2
                x2 = x1
                f2 = f1
                x1 = PHI * a + (1.0f - PHI) * b
                f1 = distanceAtAngle(points, template, x1)
            } else {
                a = x1
                x1 = x2
                f1 = f2
                x2 = (1.0f - PHI) * a + PHI * b
                f2 = distanceAtAngle(points, template, x2)
            }
        }
        return min(f1, f2)
    }

    private fun distanceAtAngle(points: List<PointF>, template: List<PointF>, radians: Float): Float {
        val rotated = rotateBy(points, radians)
        var sum = 0.0f
        for (i in rotated.indices) {
            sum += hypot(rotated[i].x - template[i].x, rotated[i].y - template[i].y)
        }
        return sum / rotated.size
    }

    private fun centroid(points: List<PointF>): PointF {
        var sx = 0.0f; var sy = 0.0f
        for (p in points) { sx += p.x; sy += p.y }
        return PointF(sx / points.size, sy / points.size)
    }

    private fun pathLength(points: List<PointF>): Float {
        var d = 0.0f
        for (i in 1 until points.size) {
            d += hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
        }
        return d
    }
}`,
  },
  {
    id: 'gesture-overlay-canvas',
    filename: 'GestureOverlayCanvas.kt',
    packagePath: 'com.shadowgestures.core.overlay',
    layer: '1. OS Overlay & Lifecycle Layer (Hardware Canvas)',
    requirementsCovered: ['FR-05', 'FR-07', 'NFR-SEC-02', 'Section 10'],
    summary:
      'Hardware-accelerated full-screen overlay view rendering 120Hz cyan unistroke trails, 1,500ms inactivity watchdog auto-dismiss, and coral-red reject flash.',
    code: `package com.shadowgestures.core.overlay

import android.content.Context
import android.graphics.*
import android.os.Build
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View

class GestureOverlayCanvas(
    context: Context,
    private val onStrokeCompleted: (List<PointF>) -> Unit,
    private val onTimeoutDismiss: () -> Unit
) : View(context) {

    private val capturedPoints = ArrayList<PointF>(256)
    private val strokePath = Path()
    private val scrimColor = Color.parseColor("#33000000")

    private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#06B6D4") // Cyan 120Hz stroke trail
        style = Paint.Style.STROKE
        strokeWidth = 6f * resources.displayMetrics.density
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }

    private val inactivityWatchdog = Runnable {
        onTimeoutDismiss() // NFR-SEC-02: Auto-dismiss after 1,500ms of inactivity
    }

    init {
        setLayerType(LAYER_TYPE_HARDWARE, null)
        resetWatchdog()
    }

    fun forwardMotionEvent(event: MotionEvent) {
        resetWatchdog()
        val x = event.rawX
        val y = event.rawY

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_MOVE -> {
                if (capturedPoints.isEmpty()) {
                    strokePath.moveTo(x, y)
                } else {
                    val prev = capturedPoints.last()
                    strokePath.quadTo(prev.x, prev.y, (prev.x + x) / 2f, (prev.y + y) / 2f)
                }
                capturedPoints.add(PointF(x, y))
                postInvalidateOnAnimation()
            }
            MotionEvent.ACTION_UP -> {
                removeCallbacks(inactivityWatchdog)
                onStrokeCompleted(capturedPoints.toList())
            }
            MotionEvent.ACTION_CANCEL -> {
                removeCallbacks(inactivityWatchdog)
                onTimeoutDismiss()
            }
        }
    }

    fun flashRejectAndDissolve(onComplete: () -> Unit) {
        strokePaint.color = Color.parseColor("#F43F5E") // Coral red (#F43F5E)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            performHapticFeedback(HapticFeedbackConstants.REJECT)
        } else {
            performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
        }
        invalidate()
        postDelayed({ onComplete() }, 120L)
    }

    private fun resetWatchdog() {
        removeCallbacks(inactivityWatchdog)
        postDelayed(inactivityWatchdog, 1500L)
    }

    override fun onDraw(canvas: Canvas) {
        canvas.drawColor(scrimColor)
        canvas.drawPath(strokePath, strokePaint)
    }
}`,
  },
  {
    id: 'room-persistence-schema',
    filename: 'GestureDatabase.kt',
    packagePath: 'com.shadowgestures.core.storage',
    layer: '3. Local Persistence Layer (Room SQLite & DataStore)',
    requirementsCovered: ['FR-08', 'Section 8.1', 'Section 11'],
    summary:
      'Room SQLite GestureEntity schema with indexed targetPackage, 64-point JSON array serialization, and Jetpack DataStore edge_config.preferences_pb.',
    code: `package com.shadowgestures.core.storage

import androidx.room.*

@Entity(
    tableName = "gesture_mappings",
    indices = [Index(value = ["targetPackage"])]
)
data class GestureEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val gestureLabel: String,          // e.g., "W - WhatsApp"
    val targetPackage: String,         // e.g., "com.whatsapp"
    val targetActivity: String?,       // Optional specific component
    val normalizedPointsJson: String,  // Serialized array of 64 normalized (x,y) floats
    val createdAt: Long = System.currentTimeMillis()
)

@Dao
interface GestureDao {
    @Query("SELECT * FROM gesture_mappings ORDER BY createdAt DESC")
    suspend fun getAllMappings(): List<GestureEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertMapping(entity: GestureEntity): Long

    @Query("DELETE FROM gesture_mappings WHERE id = :id")
    suspend fun deleteById(id: Long)
}

@Database(entities = [GestureEntity::class], version = 1, exportSchema = false)
abstract class ShadowGestureDatabase : RoomDatabase() {
    abstract fun gestureDao(): GestureDao
}`,
  },
  {
    id: 'android-manifest-sec',
    filename: 'AndroidManifest.xml',
    packagePath: 'app/src/main/AndroidManifest.xml',
    layer: '6. Security & Offline Privacy Manifest',
    requirementsCovered: ['NFR-SEC-01', 'NFR-SEC-02', 'NFR-PERF-01'],
    summary:
      'Zero-network attack surface manifest omitting INTERNET and ACCESS_NETWORK_STATE permissions to guarantee 100% offline gesture privacy.',
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.shadowgestures">

    <!-- NFR-SEC-01: Zero-Network Attack Surface.
         Explicitly omits android.permission.INTERNET and ACCESS_NETWORK_STATE.
         It is physically impossible for gesture coordinates or app habits to leave the device. -->

    <queries>
        <intent>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent>
    </queries>

    <application
        android:allowBackup="false"
        android:label="ShadowGestures"
        android:supportsRtl="true"
        android:theme="@style/Theme.Material3.DynamicColors.DayNight">

        <activity
            android:name=".ui.ConsoleActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".core.overlay.ShadowEdgeService"
            android:exported="true"
            android:label="ShadowGestures Edge Launcher"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>
    </application>
</manifest>`,
  },
];
