package com.testmarking.app.ui.grade

import android.graphics.Bitmap
import android.util.Base64
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.testmarking.app.data.ResultDetailDto
import com.testmarking.app.repository.GradeMode
import com.testmarking.app.network.toApiException
import com.testmarking.app.omr.OmrEngine
import com.testmarking.app.omr.model.OmrOutput
import com.testmarking.app.repository.GradingKit
import com.testmarking.app.repository.GradingRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream

enum class GradePhase { PREPARING, CAMERA, READING, REVIEW, SAVING, SAVED }

/** HS + 8 digits: what the 8 digit columns of the sheet give. */
private val STUDENT_CODE = Regex("^HS[0-9]{8}$")

/** What the camera read, before it is saved. studentCode / testCode can still be corrected by hand. */
data class Review(
    val studentCode: String,
    val testCode: String,
    val answers: Map<Int, String>,
    val total: Int,
    val blank: List<Int>,
    /** several marks in a single-answer question */
    val doubtful: List<Int>,
    val warnings: List<String>,
    val image: ByteArray?,
)

data class GradeState(
    val phase: GradePhase = GradePhase.PREPARING,
    val error: String? = null,
    val kit: GradingKit? = null,
    val review: Review? = null,
    val saved: ResultDetailDto? = null,
    /** the photo was marked but the picture of the sheet could not be attached */
    val imageNotSaved: Boolean = false,
    val savedCount: Int = 0,
    /** the picture that could not be read (kept so the screen can say which one of a batch failed) */
    val readFailures: Int = 0,
)

/**
 * Photograph -> read by the C++ reader -> the id and the version are checked -> sent; the server marks it.
 * TEACHER: any student of the class. STUDENT: the sheet of the signed-in student, kept until the teacher publishes.
 */
class GradeViewModel(
    private val examId: String,
    private val templateId: String,
    val mode: GradeMode,
    private val repo: GradingRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(GradeState())
    val state: StateFlow<GradeState> = _state.asStateFlow()

    init {
        prepare()
    }

    fun prepare() {
        _state.update { it.copy(phase = GradePhase.PREPARING, error = null) }
        viewModelScope.launch {
            repo.kit(examId, templateId, mode)
                .onSuccess { kit -> _state.update { it.copy(phase = GradePhase.CAMERA, kit = kit) } }
                .onFailure { e -> _state.update { it.copy(phase = GradePhase.PREPARING, error = toApiException(e).message) } }
        }
    }

    /** [auto]: a batch from the gallery: a sheet whose ids were all read is sent without asking. */
    fun read(bitmap: Bitmap, auto: Boolean = false) {
        val kit = _state.value.kit ?: return
        if (_state.value.phase != GradePhase.CAMERA) return
        _state.update { it.copy(phase = GradePhase.READING, error = null) }
        viewModelScope.launch {
            val out = withContext(Dispatchers.Default) {
                try {
                    OmrEngine.process(bitmap, kit.templateJson) to jpegOf(bitmap)
                } catch (e: Throwable) {
                    // e.g. libomr_native is missing because OpenCV was not added to the build
                    OmrOutput(success = false, errorCode = "ENGINE", errorMessage = "Không chạy được bộ đọc phiếu: ${e.message}") to null
                }
            }
            val (output, original) = out
            if (!output.success) {
                _state.update { it.copy(phase = GradePhase.CAMERA, error = explain(output), readFailures = it.readFailures + 1) }
                return@launch
            }
            val review = reviewOf(output, kit, original)
            _state.update { it.copy(phase = GradePhase.REVIEW, review = review) }
            if (auto && idsComplete(review)) save(review.studentCode, review.testCode)
        }
    }

    private fun reviewOf(o: OmrOutput, kit: GradingKit, original: ByteArray?): Review {
        val answers = o.answers.filter { it.answer.isNotBlank() }.associate { it.questionNumber to it.answer }
        val total = if (kit.questionCount > 0) kit.questionCount else (o.answers.maxOfOrNull { it.questionNumber } ?: 0)
        val digits = o.idResult.studentId.trim()
        return Review(
            studentCode = if (digits.isEmpty()) "" else "HS$digits",
            testCode = o.idResult.examCode.trim(),
            answers = answers,
            total = total,
            blank = (1..total).filter { it !in answers },
            doubtful = o.answers.filter { it.flag != 0 && it.answer.isNotBlank() }.map { it.questionNumber },
            warnings = o.warnings,
            // the straightened sheet when the reader sent one, otherwise the photo itself
            image = o.dewarpedImageBase64.takeIf { it.isNotBlank() }?.let { runCatching { Base64.decode(it, Base64.DEFAULT) }.getOrNull() } ?: original,
        )
    }

    private fun idsComplete(r: Review) =
        r.studentCode.isNotEmpty() && !r.studentCode.contains('?') && r.testCode.isNotEmpty() && !r.testCode.contains('?')

    fun save(studentCode: String, testCode: String) {
        val s = _state.value
        val review = s.review ?: return
        if (s.phase == GradePhase.SAVING) return
        val code = studentCode.trim().uppercase()
        val version = testCode.trim()
        when {
            mode == GradeMode.TEACHER && !STUDENT_CODE.matches(code) ->
                return fail("Mã học sinh chưa đọc được, hãy nhập lại (HS + 8 chữ số, ví dụ HS00000001)")
            version.isEmpty() || version.contains('?') -> return fail("Mã đề chưa đọc được, hãy nhập lại (3 chữ số)")
        }
        _state.update { it.copy(phase = GradePhase.SAVING, error = null) }
        viewModelScope.launch {
            val image = review.image
            if (mode == GradeMode.STUDENT) {
                // an unreadable student code is left to the server: it knows who is signed in
                repo.submitMine(examId, if (code.contains('?')) "" else code, version, review.answers)
                    .onSuccess {
                        val saved = image == null || repo.uploadImage(examId, null, image, mode).isSuccess
                        _state.update { it.copy(phase = GradePhase.SAVED, imageNotSaved = !saved, savedCount = it.savedCount + 1) }
                    }
                    .onFailure { e -> _state.update { it.copy(phase = GradePhase.REVIEW, error = toApiException(e).message) } }
            } else {
                repo.record(examId, code, version, review.answers)
                    .onSuccess { detail ->
                        val rid = detail.result?.id
                        var imageSaved = true
                        if (rid != null && image != null) imageSaved = repo.uploadImage(examId, rid, image, mode).isSuccess
                        _state.update { it.copy(phase = GradePhase.SAVED, saved = detail, imageNotSaved = !imageSaved, savedCount = it.savedCount + 1) }
                    }
                    .onFailure { e -> _state.update { it.copy(phase = GradePhase.REVIEW, error = toApiException(e).message) } }
            }
        }
    }

    /** Next paper. */
    fun next() = _state.update { it.copy(phase = GradePhase.CAMERA, review = null, saved = null, error = null, imageNotSaved = false) }

    /** Retake the photo of the same paper. */
    fun retake() = _state.update { it.copy(phase = GradePhase.CAMERA, review = null, error = null) }

    fun clearError() = _state.update { it.copy(error = null) }

    private fun fail(message: String) = _state.update { it.copy(error = message) }

    private fun jpegOf(bitmap: Bitmap): ByteArray? = runCatching {
        ByteArrayOutputStream().also { bitmap.compress(Bitmap.CompressFormat.JPEG, 85, it) }.toByteArray()
    }.getOrNull()

    private fun explain(o: OmrOutput): String {
        val message = o.errorMessage.ifBlank { o.errorCode }
        return when {
            o.errorCode == "MULTIPLE_SHEETS_DETECTED" -> "Trong ảnh có nhiều hơn một tờ phiếu, hãy chụp từng tờ."
            o.errorCode == "MARKER_NOT_FOUND" || message.contains("markers", ignoreCase = true) ->
                "Không thấy đủ 12 ô vuông đen ở mép phiếu. Chụp lại: đủ sáng, thấy cả tờ phiếu, không bị cắt hoặc che mép. ($message)"
            else -> "Không đọc được phiếu: $message"
        }
    }
}
