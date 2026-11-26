package com.testmarking.app.omr

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import com.testmarking.app.data.PaperAnswerDto
import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/**
 * Draws the marking on the straightened picture of a sheet (the same picture and colours as the web): green = chosen and right,
 * red = chosen and wrong, yellow = the right option that was not chosen. The bubble positions come from the template with the same
 * formulas the web template designer uses, in sheet units (827 x 1169) scaled to the picture.
 * A picture that does not have the proportions of the sheet is not a straightened one: nothing can be drawn on it ([usable] is false).
 */
object PaperPainter {
    private const val PAGE_W = 827.0
    private const val PAGE_H = 1169.0
    private const val GRID_PADDING = 5.0
    private const val NUMBER_COLUMN_RATIO = 0.12
    private const val NUMBER_COLUMN_MIN = 14.0
    private const val NUMBER_COLUMN_MAX = 30.0
    private const val NUMBER_COLUMN_MAX_TOTAL_RATIO = 0.32
    private const val BUBBLE_RATIO = 0.8
    private const val BUBBLE_MAX = 25.0
    private const val RING_FIT = 0.95

    private const val RIGHT = 0xFF00B050.toInt()
    private const val WRONG = 0xFFFF1F3D.toInt()
    private const val MISSED = 0xFFFFC000.toInt()

    fun usable(width: Int, height: Int): Boolean = width > 0 && height > 0 && abs(width.toDouble() / height - PAGE_W / PAGE_H) <= 0.03

    private fun clamp(v: Double, lo: Double, hi: Double) = min(hi, max(lo, v))

    private fun split(v: String?): Set<String> = (v ?: "").split(",").map { it.trim().uppercase() }.filter { it.isNotEmpty() }.toSet()

    /** A copy of [src] with the rings drawn on it, or null when the picture is not a straightened sheet or the template has no answer zones. */
    fun draw(src: Bitmap, grid: JSONObject?, answers: List<PaperAnswerDto>): Bitmap? {
        if (grid == null || !usable(src.width, src.height)) return null
        val zones = grid.optJSONArray("answer_zones") ?: return null
        val out = src.copy(Bitmap.Config.ARGB_8888, true) ?: return null
        val canvas = Canvas(out)
        val sx = out.width / PAGE_W
        val sy = out.height / PAGE_H
        val sr = min(sx, sy)
        val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = max(1.5, 1.6 * sr).toFloat() }
        val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
        val byOrder = answers.associateBy { it.order }
        var running = 1
        for (z in 0 until zones.length()) {
            val zone = zones.optJSONObject(z) ?: continue
            val box = zone.optJSONObject("bounding_box") ?: continue
            val layout = zone.optJSONObject("layout")
            val rows = layout?.optInt("rows", 0) ?: 0
            val options = layout?.optInt("options", 0) ?: 0
            val start = if (layout != null && layout.has("start_question_index") && !layout.isNull("start_question_index")) layout.optInt("start_question_index", running) else running
            running += rows
            if (rows <= 0 || options <= 0) continue
            val hasStart = layout?.optBoolean("has_start_number", false) ?: false
            val hasEnd = layout?.optBoolean("has_end_number", false) ?: false

            val bx = box.optDouble("x"); val by = box.optDouble("y")
            val bw = box.optDouble("width"); val bh = box.optDouble("height")
            val pad = min(GRID_PADDING, min(bw / 8, bh / 8))
            val innerX = bx + pad
            val innerY = by + pad
            val innerW = max(1.0, bw - pad * 2)
            val innerH = max(1.0, bh - pad * 2)
            val numberCols = (if (hasStart) 1 else 0) + (if (hasEnd) 1 else 0)
            val preferred = clamp(innerW * NUMBER_COLUMN_RATIO, NUMBER_COLUMN_MIN, NUMBER_COLUMN_MAX)
            val totalNumber = if (numberCols > 0) min(preferred * numberCols, innerW * NUMBER_COLUMN_MAX_TOTAL_RATIO) else 0.0
            val numberW = if (numberCols > 0) totalNumber / numberCols else 0.0
            val startW = if (hasStart) numberW else 0.0
            val endW = if (hasEnd) numberW else 0.0
            val choiceW = max(1.0, innerW - startW - endW)
            val rowStep = innerH / rows
            val bubble = clamp(min(choiceW / options, rowStep) * BUBBLE_RATIO, 4.0, BUBBLE_MAX)
            val choiceX = innerX + startW
            val choiceStep = choiceW / options
            val radius = ((bubble / 2) * sr * RING_FIT).toFloat()

            for (row in 0 until rows) {
                val a = byOrder[start + row] ?: continue
                val chosen = split(a.choice)
                val right = split(a.correctAnswer)
                val y = ((innerY + (row + 0.5) * rowStep) * sy).toFloat()
                for (o in 0 until options) {
                    val letter = ('A' + o).toString()
                    val picked = letter in chosen
                    val isRight = letter in right
                    val color = when {
                        picked && isRight -> RIGHT
                        picked -> WRONG
                        isRight -> MISSED
                        else -> continue
                    }
                    val x = ((choiceX + (o + 0.5) * choiceStep) * sx).toFloat()
                    if (picked) {
                        fill.color = color
                        fill.alpha = 71   // 0.28
                        canvas.drawCircle(x, y, radius, fill)
                    }
                    stroke.color = color
                    canvas.drawCircle(x, y, radius, stroke)
                }
            }
        }
        return out
    }
}
