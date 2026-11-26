package com.testmarking.app.repository

import android.content.Context
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.testmarking.app.data.AnswerDto
import com.testmarking.app.data.ExamApi
import com.testmarking.app.data.RecordResultBody
import com.testmarking.app.data.PaperAnswerDto
import com.testmarking.app.data.PaperDetailDto
import com.testmarking.app.data.ResultDetailDto
import com.testmarking.app.data.TemplateDto
import com.testmarking.app.network.ApiException
import com.testmarking.app.network.apiCall
import com.testmarking.app.network.requireData
import com.testmarking.app.omr.TemplateJson
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.testmarking.app.omr.PaperPainter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File

/** What the reader needs for one exam: the sheet in the form of the C++ reader. No answer key: the server marks. */
class GradingKit(
    val examId: String,
    val templateJson: String,
    val questionCount: Int,
)

/** Who is photographing: the teacher (grades any student) or a student (hands in his own sheet). */
enum class GradeMode { TEACHER, STUDENT }

/**
 * Reading a paper sheet photographed on the phone. Only the sheet template is kept on the phone, so the sheet can be READ
 * without a network; the answers are SENT to the server, which marks them.
 */
class GradingRepository(
    context: Context,
    private val api: ExamApi,
    private val gson: Gson,
) {
    private val dir = File(context.applicationContext.filesDir, "grading").apply { mkdirs() }

    /** Fresh from the server when possible, otherwise the copy of the last time. */
    suspend fun kit(examId: String, templateId: String?, mode: GradeMode): Result<GradingKit> {
        val online = apiCall { download(examId, templateId, mode) }
        online.getOrNull()?.let { kit ->
            withContext(Dispatchers.IO) { runCatching { save(kit, mode) } }
            return Result.success(kit)
        }
        val saved = withContext(Dispatchers.IO) { runCatching { load(examId, mode) }.getOrNull() }
        if (saved != null) return Result.success(saved)
        return Result.failure(online.exceptionOrNull() ?: ApiException("Chưa tải được mẫu phiếu của kỳ thi"))
    }

    private suspend fun download(examId: String, templateId: String?, mode: GradeMode): GradingKit {
        val template: TemplateDto = if (mode == GradeMode.STUDENT) {
            api.myTemplate(examId).requireData()
        } else {
            val tid = templateId?.takeIf { it.isNotBlank() } ?: throw ApiException("Kỳ thi này chưa gắn mẫu phiếu")
            api.template(tid).requireData()
        }
        if (template.gridConfig == null || template.gridConfig.isJsonNull) throw ApiException("Mẫu phiếu chưa có cấu hình ô tô")
        // the sheet may have more rows than the exam has questions: only questions 1..N of the exam count
        val sheetRows = TemplateJson.questionCount(template.gridConfig)
        val perVersion = runCatching { api.detail(examId).requireData().questionsPerVersion }.getOrNull() ?: 0
        val questions = if (perVersion in 1 until sheetRows || (perVersion > 0 && sheetRows == 0)) perVersion else sheetRows
        return GradingKit(examId, TemplateJson.toNative(template.anchorPoints, template.gridConfig), questions)
    }

    private fun body(studentCode: String, testCode: String, answers: Map<Int, String>) =
        RecordResultBody(studentCode, testCode, answers.entries.sortedBy { it.key }.map { AnswerDto(it.key, it.value) })

    /** Teacher: the server marks the paper (right answers, score, violations); the answers are what the camera read. */
    suspend fun record(examId: String, studentCode: String, testCode: String, answers: Map<Int, String>): Result<ResultDetailDto> = apiCall {
        api.record(examId, body(studentCode, testCode, answers)).requireData()
    }

    /** Student: his own sheet. Returns the id of the paper only for the teacher; the student's own copy is found by the server. */
    suspend fun submitMine(examId: String, studentCode: String, testCode: String, answers: Map<Int, String>): Result<Unit> = apiCall {
        api.submitSheet(examId, body(studentCode, testCode, answers)).requireData()
        Unit
    }

    /** The straightened photo of the sheet goes to the paper as its "marked" picture. */
    suspend fun uploadImage(examId: String, resultId: String?, jpeg: ByteArray, mode: GradeMode): Result<Unit> = apiCall {
        val part = MultipartBody.Part.createFormData("file", "sheet.jpg", jpeg.toRequestBody("image/jpeg".toMediaType()))
        if (mode == GradeMode.STUDENT) api.uploadMySheet(examId, part) else api.uploadImage(examId, resultId.orEmpty(), part)
        Unit
    }

    suspend fun paper(examId: String, resultId: String): Result<PaperDetailDto> = apiCall { api.paper(examId, resultId).requireData() }

    /**
     * The straightened picture of a paper with the marking drawn on it. Fails with a plain message when the paper has no picture or
     * only the raw photo (old papers), because circles on a photo that is not straightened would miss the bubbles.
     */
    suspend fun markedPicture(examId: String, resultId: String, answers: List<PaperAnswerDto>): Result<Bitmap> = apiCall {
        val templateId = api.detail(examId).requireData().templateId?.takeIf { it.isNotBlank() } ?: throw ApiException("Kỳ thi này chưa gắn mẫu phiếu")
        val template = api.template(templateId).requireData()
        val bytes = withContext(Dispatchers.IO) { api.resultImage(examId, resultId).use { it.bytes() } }
        withContext(Dispatchers.Default) {
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: throw ApiException("Không mở được ảnh bài làm")
            PaperPainter.draw(bitmap, TemplateJson.gridObject(template.gridConfig), answers)
                ?: throw ApiException("Bài này chưa có ảnh đã nắn nên chưa thể vẽ kết quả. Hãy chụp lại bài để có ảnh.")
        }
    }

    // ---- the copy on the phone ----

    private fun file(examId: String, mode: GradeMode) =
        File(dir, "kit-${mode.name.lowercase()}-${examId.filter { it.isLetterOrDigit() || it == '-' }}.json")

    private fun save(kit: GradingKit, mode: GradeMode) {
        val root = JsonObject()
        root.addProperty("exam_id", kit.examId)
        root.addProperty("template", kit.templateJson)
        root.addProperty("questions", kit.questionCount)
        file(kit.examId, mode).writeText(gson.toJson(root))
    }

    private fun load(examId: String, mode: GradeMode): GradingKit? {
        val f = file(examId, mode)
        if (!f.exists()) return null
        val root = JSONObject(f.readText())
        return GradingKit(examId, root.getString("template"), root.optInt("questions", 0))
    }
}
