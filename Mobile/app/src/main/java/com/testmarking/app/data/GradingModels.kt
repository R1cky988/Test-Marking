package com.testmarking.app.data

import com.google.gson.JsonElement
import com.google.gson.annotations.SerializedName

/**
 * GET templates/{id}: only what the reader needs. The server writes the layout in snake_case and anchor_points / grid_config as
 * real JSON (an array / an object); TemplateJson also accepts them as JSON text.
 */
data class TemplateDto(
    val uuid: String? = null,
    val name: String? = null,
    @SerializedName("total_questions") val totalQuestions: Int? = null,
    @SerializedName("anchor_points") val anchorPoints: JsonElement? = null,
    @SerializedName("grid_config") val gridConfig: JsonElement? = null,
)

data class VersionSummaryDto(val id: String? = null, val code: String? = null)

data class VersionQuestionDto(
    val order: Int = 0,
    @SerializedName("correct_answers") val correctAnswers: List<String>? = null,
)

data class VersionDetailDto(
    val id: String? = null,
    val code: String? = null,
    val questions: List<VersionQuestionDto>? = null,
)

/** The paper to mark: who (student_code "HS" + 8 digits), which version, what was chosen. The server marks it. */
data class RecordResultBody(
    @SerializedName("student_code") val studentCode: String,
    @SerializedName("test_code") val testCode: String,
    val answers: List<AnswerDto>,
)
