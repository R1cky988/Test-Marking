package com.testmarking.app.repository

import android.content.Context
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.testmarking.app.data.AnswerDto
import com.testmarking.app.data.ExamApi
import com.testmarking.app.data.RecordResultBody
import com.testmarking.app.data.ResultDetailDto
import com.testmarking.app.data.TemplateDto
import com.testmarking.app.network.ApiException
import com.testmarking.app.network.apiCall
import com.testmarking.app.network.requireData
import com.testmarking.app.omr.TemplateJson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File

/** What the reader needs for one exam: the sheet in the form of the C++ reader and the right answers per version. */
class GradingKit(
    val examId: String,
    val templateJson: String,
    /** version code ("001") -> question number -> right options ("A,C") */
    val answerKey: Map<String, Map<Int, String>>,
    val questionCount: Int,
)

/**
 * Marking a paper sheet photographed by the teacher. The kit is saved on the phone, so the sheet can be READ without a network
 * (the paper is only SAVED to the server when there is one).
 */
class GradingRepository(
    context: Context,
    private val api: ExamApi,
    private val gson: Gson,
) {
    private val dir = File(context.applicationContext.filesDir, "grading").apply { mkdirs() }

    /** Fresh from the server when possible, otherwise the copy of the last time. */
    suspend fun kit(examId: String, templateId: String?): Result<GradingKit> {
        val online = apiCall { download(examId, templateId) }
        online.getOrNull()?.let { kit ->
            withContext(Dispatchers.IO) { runCatching { save(kit) } }
            return Result.success(kit)
        }
        val saved = withContext(Dispatchers.IO) { runCatching { load(examId) }.getOrNull() }
        if (saved != null) return Result.success(saved)
        return Result.failure(online.exceptionOrNull() ?: ApiException("Chưa tải được mẫu phiếu của kỳ thi"))
    }

    private suspend fun download(examId: String, templateId: String?): GradingKit {
        val tid = templateId?.takeIf { it.isNotBlank() } ?: throw ApiException("Kỳ thi này chưa gắn mẫu phiếu")
        val template: TemplateDto = api.template(tid).requireData()
        if (template.gridConfig == null || template.gridConfig.isJsonNull) throw ApiException("Mẫu phiếu chưa có cấu hình ô tô")
        val templateJson = TemplateJson.toNative(template.anchorPoints, template.gridConfig)

        val key = LinkedHashMap<String, Map<Int, String>>()
        for (v in api.versions(examId).requireData()) {
            val id = v.id ?: continue
            val detail = api.version(examId, id).requireData()
            val code = detail.code ?: v.code ?: continue
            key[code] = detail.questions.orEmpty().associate { it.order to it.correctAnswers.orEmpty().sorted().joinToString(",") }
        }
        if (key.isEmpty()) throw ApiException("Kỳ thi chưa có mã đề")
        return GradingKit(examId, templateJson, key, TemplateJson.questionCount(template.gridConfig))
    }

    /** The server marks the paper (right answers, score, violations); the answers are what the camera read. */
    suspend fun record(examId: String, studentCode: String, testCode: String, answers: Map<Int, String>): Result<ResultDetailDto> = apiCall {
        api.record(examId, RecordResultBody(studentCode, testCode, answers.entries.sortedBy { it.key }.map { AnswerDto(it.key, it.value) })).requireData()
    }

    /** The straightened photo of the sheet goes to the paper as its "marked" picture. */
    suspend fun uploadImage(examId: String, resultId: String, jpeg: ByteArray): Result<Unit> = apiCall {
        val part = MultipartBody.Part.createFormData("file", "sheet.jpg", jpeg.toRequestBody("image/jpeg".toMediaType()))
        api.uploadImage(examId, resultId, part)
        Unit
    }

    // ---- the copy on the phone ----

    private fun file(examId: String) = File(dir, "kit-${examId.filter { it.isLetterOrDigit() || it == '-' }}.json")

    private fun save(kit: GradingKit) {
        val root = JsonObject()
        root.addProperty("exam_id", kit.examId)
        root.addProperty("template", kit.templateJson)
        root.addProperty("questions", kit.questionCount)
        val keys = JSONObject()
        for ((code, answers) in kit.answerKey) keys.put(code, JSONObject().also { o -> answers.forEach { (n, a) -> o.put(n.toString(), a) } })
        root.addProperty("answers", keys.toString())
        file(kit.examId).writeText(gson.toJson(root))
    }

    private fun load(examId: String): GradingKit? {
        val f = file(examId)
        if (!f.exists()) return null
        val root = JSONObject(f.readText())
        val keys = JSONObject(root.getString("answers"))
        val answerKey = keys.keys().asSequence().associateWith { code ->
            val o = keys.getJSONObject(code)
            o.keys().asSequence().associate { it.toInt() to o.getString(it) }
        }
        return GradingKit(examId, root.getString("template"), answerKey, root.optInt("questions", 0))
    }
}
