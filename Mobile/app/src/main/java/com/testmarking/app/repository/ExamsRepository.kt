package com.testmarking.app.repository

import com.testmarking.app.data.BankDto
import com.testmarking.app.data.ClassApi
import com.testmarking.app.data.ClassItemDto
import com.testmarking.app.data.ExamApi
import com.testmarking.app.data.ExamCreateBody
import com.testmarking.app.data.ExamItemDto
import com.testmarking.app.data.GenerateBody
import com.testmarking.app.data.TemplateItemDto
import com.testmarking.app.network.ApiException
import com.testmarking.app.network.apiCall
import com.testmarking.app.network.requireData

/** What the teacher needs to fill the "new exam" form. */
class ExamFormOptions(val classes: List<ClassItemDto>, val templates: List<TemplateItemDto>, val banks: List<BankDto>)

/** The exams tab (the exams I created / of the classes I joined) and creating an exam. */
class ExamsRepository(
    private val api: ExamApi,
    private val classApi: ClassApi,
) {
    /** scope = "teacher" (the exams I created) or "student" (the exams of the classes I joined) */
    suspend fun list(scope: String): Result<List<ExamItemDto>> = apiCall {
        api.list(if (scope == SCOPE_STUDENT) "student" else null).data.orEmpty()
    }

    /** Only the classes that are still active: an archived class cannot get a new exam. */
    suspend fun formOptions(): Result<ExamFormOptions> = apiCall {
        val classes = classApi.list(role = SCOPE_TEACHER, limit = 100).data.orEmpty().filter { !it.status.equals("archived", ignoreCase = true) }
        ExamFormOptions(classes, api.templates().data.orEmpty(), api.banks().data.orEmpty())
    }

    /**
     * Creates the exam, then (when the teacher asked for versions) draws them from the bank, then publishes if asked.
     * A step that fails after the exam was created leaves the exam as a draft and says which step failed.
     */
    suspend fun create(body: ExamCreateBody, versions: GenerateBody?, publish: Boolean): Result<ExamItemDto> {
        val created = apiCall { api.create(body).requireData() }
        val exam = created.getOrNull() ?: return created
        val id = exam.id ?: return Result.failure(ApiException("Máy chủ không trả mã kỳ thi"))
        if (versions != null) {
            val made = apiCall { api.generate(id, versions).requireData() }
            made.exceptionOrNull()?.let { return Result.failure(ApiException("Đã lưu nháp kỳ thi nhưng chưa tạo được mã đề: ${it.message}")) }
        }
        if (publish) {
            val done = apiCall { api.publish(id).requireData() }
            done.exceptionOrNull()?.let { return Result.failure(ApiException("Đã lưu nháp kỳ thi nhưng chưa công bố được: ${it.message}")) }
        }
        return Result.success(exam)
    }
}
