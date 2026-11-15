package com.testmarking.app.omr

import android.graphics.Bitmap
import android.util.Log
import com.testmarking.app.omr.model.AnswerResult
import com.testmarking.app.omr.model.IdResult
import com.testmarking.app.omr.model.OmrOptions
import com.testmarking.app.omr.model.OmrOutput
import com.testmarking.app.omr.nativebridge.NativeLib
import org.json.JSONObject

/** Reads a photographed sheet. The answers are only READ here; the server decides right or wrong. */
object OmrEngine {
    private const val TAG = "OmrEngine"

    fun process(bitmap: Bitmap, templateJson: String, options: OmrOptions = OmrOptions()): OmrOutput {
        val started = System.currentTimeMillis()
        val json = NativeLib.processOmr(
            bitmap, templateJson, null,
            options.densityThreshold, options.diffThreshold,
            false,                      // no scoring on the phone
            false,                      // no debug picture
            options.useAdaptiveThreshold, options.adaptiveBlockSize, options.adaptiveC,
            options.preprocessMarkers, options.preprocessPostWarp, options.morphCleanup,
            options.autoAdaptive, options.requiredMarkers,
        )
        Log.d(TAG, "read the sheet in ${System.currentTimeMillis() - started} ms")
        return parse(json)
    }

    fun clearCache() = NativeLib.clearOmrCache()

    fun parse(text: String): OmrOutput = try {
        val json = JSONObject(text)
        val warnings = json.optJSONArray("warnings")?.let { arr -> (0 until arr.length()).map { arr.getString(it) } }.orEmpty()
        val id = json.optJSONObject("id_result")?.let {
            IdResult(
                studentId = it.optString("student_id", ""), classCode = it.optString("class_code", ""),
                examCode = it.optString("exam_code", ""), ok = it.optBoolean("id_ok", false), error = it.optString("id_error", ""),
            )
        } ?: IdResult()
        val answers = json.optJSONArray("student_answers")?.let { arr ->
            (0 until arr.length()).map {
                val o = arr.getJSONObject(it)
                AnswerResult(o.getInt("question_number"), o.optString("answer", ""), o.optInt("flag", 0))
            }
        }.orEmpty()
        OmrOutput(
            success = json.optBoolean("success", false),
            errorCode = json.optString("error_code", ""), errorMessage = json.optString("error_message", ""),
            warnings = warnings, idResult = id, answers = answers,
            laplacianVariance = json.optDouble("laplacian_variance", 0.0).toFloat(),
            meanBrightness = json.optDouble("mean_brightness", 0.0).toFloat(),
            dewarpedImageBase64 = json.optString("dewarped_image_base64", ""),
        )
    } catch (e: Exception) {
        Log.e(TAG, "unreadable result of the reader", e)
        OmrOutput(success = false, errorCode = "PARSE_ERROR", errorMessage = "Không đọc được kết quả của bộ đọc phiếu: ${e.message}")
    }
}
