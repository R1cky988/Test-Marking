package com.testmarking.app.data

import com.google.gson.annotations.SerializedName

data class TemplateItemDto(
    val uuid: String? = null,
    val name: String? = null,
    @SerializedName("total_questions") val totalQuestions: Int? = null,
)

data class DifficultyCountsDto(val easy: Int? = null, val medium: Int? = null, val hard: Int? = null)

data class BankDto(
    val id: String? = null,
    val name: String? = null,
    @SerializedName("items_count") val itemsCount: Int? = null,
    @SerializedName("difficulty_counts") val difficultyCounts: DifficultyCountsDto? = null,
)

/** POST exams. Times are ISO-8601 with the offset of the phone. null fields are left out. */
data class ExamCreateBody(
    val name: String,
    val subject: String?,
    @SerializedName("class_id") val classId: String,
    /** OFFLINE | ONLINE | SUBMIT */
    val format: String,
    @SerializedName("from_time") val fromTime: String,
    @SerializedName("to_time") val toTime: String,
    @SerializedName("duration_minutes") val durationMinutes: Int?,
    @SerializedName("template_id") val templateId: String?,
    @SerializedName("question_bank_id") val questionBankId: String?,
    @SerializedName("show_result_immediately") val showResultImmediately: Boolean?,
    @SerializedName("allow_reference") val allowReference: Boolean?,
    /** FLAG | LOCK, only for an ONLINE exam without open book */
    @SerializedName("leave_policy") val leavePolicy: String?,
)

data class GenerateBody(val count: Int, val easy: Int, val medium: Int, val hard: Int)
