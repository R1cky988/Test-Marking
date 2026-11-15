package com.testmarking.app.omr

import com.google.gson.JsonElement
import com.google.gson.JsonObject
import org.json.JSONArray
import org.json.JSONObject

/**
 * Turns the template of the server into what the C++ reader wants: { "gridConfig": { anchor_points, id_zones, answer_zones } }.
 * The server sends anchorPoints / gridConfig as JSON TEXT (a string), so they are parsed again first.
 */
object TemplateJson {
    // A4 at 827 x 1169, the 12 markers of the sheet (used when the template has none)
    private val DEFAULT_ANCHORS = listOf(
        Triple(1, 45.0, 45.0), Triple(2, 782.0, 45.0), Triple(3, 782.0, 1124.0), Triple(4, 45.0, 1124.0),
        Triple(5, 45.0, 403.0), Triple(6, 414.0, 403.0), Triple(7, 782.0, 403.0), Triple(8, 782.0, 763.0),
        Triple(9, 414.0, 763.0), Triple(10, 45.0, 763.0), Triple(11, 414.0, 1124.0), Triple(12, 414.0, 45.0),
    )

    fun toNative(anchorPoints: JsonElement?, gridConfig: JsonElement?): String {
        val grid = asObject(gridConfig) ?: JSONObject()
        val anchors = normalizeAnchors(asArray(anchorPoints) ?: grid.optJSONArray("anchor_points"))
        val out = JSONObject().put("anchor_points", anchors)
        (grid.optJSONObject("id_zones") ?: grid.optJSONObject("idZones"))?.let { out.put("id_zones", normalizeIdZones(it)) }
        out.put("answer_zones", normalizeAnswerZones(grid.optJSONArray("answer_zones") ?: grid.optJSONArray("answerZones")))
        return JSONObject().put("gridConfig", out).toString()
    }

    /** Number of questions the sheet has (rows of all answer zones together). */
    fun questionCount(gridConfig: JsonElement?): Int {
        val zones = asObject(gridConfig)?.optJSONArray("answer_zones") ?: return 0
        var total = 0
        for (i in 0 until zones.length()) total += zones.optJSONObject(i)?.optJSONObject("layout")?.optInt("rows", 0) ?: 0
        return total
    }

    private fun asObject(e: JsonElement?): JSONObject? = when {
        e == null || e.isJsonNull -> null
        e.isJsonPrimitive -> runCatching { JSONObject(e.asString) }.getOrNull()
        e is JsonObject -> JSONObject(e.toString())
        else -> null
    }

    private fun asArray(e: JsonElement?): JSONArray? = when {
        e == null || e.isJsonNull -> null
        e.isJsonPrimitive -> runCatching { JSONArray(e.asString) }.getOrNull()
        e.isJsonArray -> JSONArray(e.toString())
        else -> null
    }

    private fun num(o: JSONObject, vararg names: String): Double? =
        names.firstNotNullOfOrNull { n -> if (o.has(n) && !o.isNull(n)) o.optDouble(n) else null }

    private fun normalizeAnchors(raw: JSONArray?): JSONArray {
        if (raw == null || raw.length() < 4) return defaultAnchors()
        val out = JSONArray()
        var nonZero = false
        for (i in 0 until raw.length()) {
            val p = raw.optJSONObject(i) ?: continue
            val x = num(p, "abs_x", "absX") ?: 0.0
            val y = num(p, "abs_y", "absY") ?: 0.0
            if (x != 0.0 || y != 0.0) nonZero = true
            out.put(JSONObject().put("id", p.optInt("id", i + 1)).put("abs_x", x).put("abs_y", y).put("u", num(p, "u") ?: 0.0).put("v", num(p, "v") ?: 0.0))
        }
        return if (out.length() >= 4 && nonZero) out else defaultAnchors()
    }

    private fun defaultAnchors(): JSONArray {
        val out = JSONArray()
        for ((id, x, y) in DEFAULT_ANCHORS) out.put(JSONObject().put("id", id).put("abs_x", x).put("abs_y", y).put("u", x / 827.0).put("v", y / 1169.0))
        return out
    }

    private fun box(o: JSONObject?): JSONObject {
        val b = o ?: JSONObject()
        return JSONObject().put("x", num(b, "x") ?: 0.0).put("y", num(b, "y") ?: 0.0).put("width", num(b, "width") ?: 0.0).put("height", num(b, "height") ?: 0.0)
    }

    private fun normalizeIdZones(raw: JSONObject): JSONObject {
        val items = JSONArray()
        raw.optJSONArray("items")?.let { arr ->
            for (i in 0 until arr.length()) {
                val it = arr.optJSONObject(i) ?: continue
                items.put(
                    JSONObject().put("type", it.optString("type")).put("enabled", it.optBoolean("enabled", true))
                        .put("num_digits", it.optInt("num_digits", it.optInt("numDigits", 0))),
                )
            }
        }
        return JSONObject().put("bounding_box", box(raw.optJSONObject("bounding_box") ?: raw.optJSONObject("boundingBox"))).put("items", items)
    }

    private fun normalizeAnswerZones(raw: JSONArray?): JSONArray {
        val out = JSONArray()
        if (raw == null) return out
        for (i in 0 until raw.length()) {
            val z = raw.optJSONObject(i) ?: continue
            val layout = z.optJSONObject("layout")
            val start = z.optInt("start_number", z.optInt("startNumber", 1))
            val end = z.optInt("end_number", z.optInt("endNumber", start + 19))
            out.put(
                JSONObject()
                    .put("zone_id", z.optString("zone_id", z.optString("zoneId", "answer_zone_${i + 1}")))
                    .put("type", z.optString("type", "multiple_choice_grid"))
                    .put("bounding_box", box(z.optJSONObject("bounding_box") ?: z.optJSONObject("boundingBox")))
                    .put(
                        "layout",
                        JSONObject()
                            .put("rows", layout?.optInt("rows") ?: (end - start + 1).coerceAtLeast(1))
                            .put("options", layout?.optInt("options") ?: z.optInt("options_per_question", z.optInt("optionsPerQuestion", 4)))
                            .put("has_start_number", layout?.optBoolean("has_start_number", layout.optBoolean("hasStartNumber", true)) ?: true)
                            .put("has_end_number", layout?.optBoolean("has_end_number", layout.optBoolean("hasEndNumber", false)) ?: false)
                            .put("start_question_index", layout?.optInt("start_question_index", layout.optInt("startQuestionIndex", start)) ?: start)
                            .put("selectionMode", layout?.optString("selectionMode")?.takeIf { s -> s.isNotBlank() } ?: layout?.optString("selection_mode")?.takeIf { s -> s.isNotBlank() } ?: "single"),
                    ),
            )
        }
        return out
    }
}
