package com.testmarking.app.data

import com.google.gson.annotations.SerializedName

/** GET exams/{id}: what the intro screen needs. */
data class ExamDetailDto(
    val id: String? = null,
    val name: String? = null,
    val subject: String? = null,
    val status: String? = null,
    val format: String? = null,
    @SerializedName("from_time") val fromTime: String? = null,
    @SerializedName("to_time") val toTime: String? = null,
    @SerializedName("duration_minutes") val durationMinutes: Int? = null,
    @SerializedName("allow_reference") val allowReference: Boolean? = null,
    @SerializedName("leave_policy") val leavePolicy: String? = null,
    @SerializedName("results_released") val resultsReleased: Boolean? = null,
)

data class PaperOptionDto(val label: String? = null, val content: String? = null)

data class PaperQuestionDto(
    val order: Int = 0,
    val content: String? = null,
    /** SINGLE | MULTIPLE */
    val type: String? = null,
    val difficulty: String? = null,
    /** closed book only: the time of this question */
    val seconds: Int? = null,
    val options: List<PaperOptionDto>? = null,
)

data class AnswerDto(val order: Int, val choice: String?)

data class AttemptStateDto(
    /** IN_PROGRESS | LOCKED | SUBMITTED */
    val status: String? = null,
    @SerializedName("started_at") val startedAt: String? = null,
    @SerializedName("deadline_at") val deadlineAt: String? = null,
    @SerializedName("server_now") val serverNow: String? = null,
    @SerializedName("left_count") val leftCount: Int? = null,
    @SerializedName("current_index") val currentIndex: Int? = null,
    @SerializedName("lock_reason") val lockReason: String? = null,
    val answers: List<AnswerDto>? = null,
)

data class OnlinePaperDto(
    @SerializedName("exam_id") val examId: String? = null,
    @SerializedName("exam_name") val examName: String? = null,
    val subject: String? = null,
    @SerializedName("duration_minutes") val durationMinutes: Int? = null,
    @SerializedName("allow_reference") val allowReference: Boolean? = null,
    @SerializedName("leave_policy") val leavePolicy: String? = null,
    @SerializedName("from_time") val fromTime: String? = null,
    @SerializedName("to_time") val toTime: String? = null,
    @SerializedName("results_released") val resultsReleased: Boolean? = null,
    @SerializedName("test_code") val testCode: String? = null,
    val attempt: AttemptStateDto? = null,
    val questions: List<PaperQuestionDto>? = null,
)

data class AttemptSyncBody(
    val answers: List<AnswerDto>,
    @SerializedName("current_index") val currentIndex: Int,
    @SerializedName("left_count") val leftCount: Int,
    val finished: Boolean,
    @SerializedName("client_finished_at") val clientFinishedAt: String?,
)

data class ResultRowDto(
    @SerializedName("total_correct") val totalCorrect: Int? = null,
    @SerializedName("total_questions") val totalQuestions: Int? = null,
    @SerializedName("total_score") val totalScore: Double? = null,
    @SerializedName("is_violation") val isViolation: Boolean? = null,
    @SerializedName("violation_reason") val violationReason: String? = null,
    @SerializedName("graded_at") val gradedAt: String? = null,
    @SerializedName("synced_at") val syncedAt: String? = null,
)

data class ResultDetailDto(
    val result: ResultRowDto? = null,
    @SerializedName("max_score") val maxScore: Double? = null,
)

data class MyResultDto(
    val released: Boolean? = null,
    val submitted: Boolean? = null,
    val detail: ResultDetailDto? = null,
    /** reported for leaving the exam screen and not decided yet: the score is held back */
    @SerializedName("pending_review") val pendingReview: Boolean? = null,
)

data class AttemptSyncDto(val attempt: AttemptStateDto? = null, val result: MyResultDto? = null)

/** Teacher: everybody of the class and where he is. */
data class ParticipantDto(
    @SerializedName("student_id") val studentId: String? = null,
    @SerializedName("student_code") val studentCode: String? = null,
    @SerializedName("full_name") val fullName: String? = null,
    @SerializedName("has_result") val hasResult: Boolean? = null,
    @SerializedName("total_score") val totalScore: Double? = null,
    @SerializedName("is_violation") val isViolation: Boolean? = null,
    @SerializedName("submitted_at") val submittedAt: String? = null,
    /** ONLINE only: NOT_STARTED | IN_PROGRESS | LOCKED | SUBMITTED */
    @SerializedName("attempt_status") val attemptStatus: String? = null,
    @SerializedName("left_count") val leftCount: Int? = null,
    @SerializedName("synced_at") val syncedAt: String? = null,
    @SerializedName("graded_at") val gradedAt: String? = null,
    /** reported for leaving the exam screen; flagDecision null = the teacher has not decided yet */
    @SerializedName("is_flagged") val isFlagged: Boolean? = null,
    @SerializedName("flag_reason") val flagReason: String? = null,
    /** ZERO | DEDUCT | DISMISS */
    @SerializedName("flag_decision") val flagDecision: String? = null,
    @SerializedName("penalty_points") val penaltyPoints: Double? = null,
)

data class FlagDecisionBody(
    @SerializedName("student_id") val studentId: String,
    val decision: String,
    @SerializedName("penalty_points") val penaltyPoints: Double? = null,
)
