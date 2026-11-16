package com.testmarking.app.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Rect
import android.graphics.RectF
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View
import kotlin.math.max
import kotlin.math.min

/**
 * A picture under a square crop window (the window is drawn as a circle: the avatar is shown round).
 * One finger moves the picture, two fingers zoom; the picture always covers the whole window.
 */
class CropImageView @JvmOverloads constructor(context: Context, attrs: AttributeSet? = null) : View(context, attrs) {
    private var bitmap: Bitmap? = null
    private val matrix = Matrix()
    private val window = RectF()
    private var minScale = 1f
    private val density = resources.displayMetrics.density

    private val bitmapPaint = Paint(Paint.FILTER_BITMAP_FLAG)
    private val veil = Paint().apply { color = 0xB3000000.toInt() }
    private val ring = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; color = Color.WHITE; strokeWidth = 2 * density }
    private val veilPath = Path()
    private val values = FloatArray(9)

    private var lastX = 0f
    private var lastY = 0f
    private var dragging = false
    private val scaler = ScaleGestureDetector(context, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
        override fun onScale(detector: ScaleGestureDetector): Boolean {
            zoom(detector.scaleFactor, detector.focusX, detector.focusY)
            return true
        }
    })

    fun setBitmap(value: Bitmap) {
        bitmap = value
        reset()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        val side = min(w, h) - 2 * 24 * density
        val cx = w / 2f
        val cy = h / 2f
        window.set(cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2)
        veilPath.reset()
        veilPath.fillType = Path.FillType.EVEN_ODD
        veilPath.addRect(0f, 0f, w.toFloat(), h.toFloat(), Path.Direction.CW)
        veilPath.addCircle(cx, cy, side / 2, Path.Direction.CW)
        reset()
    }

    /** The picture fills the window, centred. */
    private fun reset() {
        val b = bitmap ?: return
        if (window.isEmpty) return
        minScale = max(window.width() / b.width, window.height() / b.height)
        matrix.setScale(minScale, minScale)
        matrix.postTranslate(window.centerX() - b.width * minScale / 2, window.centerY() - b.height * minScale / 2)
        invalidate()
    }

    private fun currentScale(): Float {
        matrix.getValues(values)
        return values[Matrix.MSCALE_X]
    }

    private fun zoom(factor: Float, fx: Float, fy: Float) {
        val now = currentScale()
        val target = (now * factor).coerceIn(minScale, minScale * MAX_ZOOM)
        matrix.postScale(target / now, target / now, fx, fy)
        keepCovering()
        invalidate()
    }

    /** No gap between the picture and the window. */
    private fun keepCovering() {
        val b = bitmap ?: return
        val r = RectF(0f, 0f, b.width.toFloat(), b.height.toFloat())
        matrix.mapRect(r)
        var dx = 0f
        var dy = 0f
        if (r.left > window.left) dx = window.left - r.left
        if (r.right < window.right) dx = window.right - r.right
        if (r.top > window.top) dy = window.top - r.top
        if (r.bottom < window.bottom) dy = window.bottom - r.bottom
        if (dx != 0f || dy != 0f) matrix.postTranslate(dx, dy)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (bitmap == null) return false
        scaler.onTouchEvent(event)
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> { lastX = event.x; lastY = event.y; dragging = true }
            MotionEvent.ACTION_POINTER_DOWN -> dragging = false
            MotionEvent.ACTION_POINTER_UP -> {
                // the finger that stays continues the move from where it is
                val keep = if (event.actionIndex == 0) 1 else 0
                lastX = event.getX(keep); lastY = event.getY(keep); dragging = true
            }
            MotionEvent.ACTION_MOVE -> if (dragging && !scaler.isInProgress && event.pointerCount == 1) {
                matrix.postTranslate(event.x - lastX, event.y - lastY)
                lastX = event.x; lastY = event.y
                keepCovering()
                invalidate()
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> { dragging = false; performClick() }
        }
        return true
    }

    override fun performClick(): Boolean = super.performClick()

    override fun onDraw(canvas: Canvas) {
        val b = bitmap ?: return
        canvas.drawBitmap(b, matrix, bitmapPaint)
        canvas.drawPath(veilPath, veil)
        canvas.drawCircle(window.centerX(), window.centerY(), window.width() / 2, ring)
    }

    /** What is inside the window, [size] x [size] pixels, on white (so a transparent PNG does not turn black as a JPEG). */
    fun crop(size: Int): Bitmap? {
        val b = bitmap ?: return null
        val inverse = Matrix()
        if (!matrix.invert(inverse)) return null
        val r = RectF(window)
        inverse.mapRect(r)
        val src = Rect(
            r.left.toInt().coerceIn(0, b.width - 1), r.top.toInt().coerceIn(0, b.height - 1),
            r.right.toInt().coerceIn(1, b.width), r.bottom.toInt().coerceIn(1, b.height),
        )
        if (src.width() < 1 || src.height() < 1) return null
        val out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(out)
        canvas.drawColor(Color.WHITE)
        canvas.drawBitmap(b, src, Rect(0, 0, size, size), bitmapPaint)
        return out
    }

    private companion object {
        const val MAX_ZOOM = 6f
    }
}
