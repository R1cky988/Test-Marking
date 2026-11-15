package com.testmarking.app.data

import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.Multipart
import retrofit2.http.Part
import retrofit2.http.Query
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface ExamApi {
    @GET("exams/{id}")
    suspend fun detail(@Path("id") id: String): ApiEnvelope<ExamDetailDto>

    @POST("exams/{id}/attempt/start")
    suspend fun start(@Path("id") id: String): ApiEnvelope<OnlinePaperDto>

    @GET("exams/{id}/attempt")
    suspend fun state(@Path("id") id: String): ApiEnvelope<AttemptStateDto>

    @POST("exams/{id}/attempt/sync")
    suspend fun sync(@Path("id") id: String, @Body body: AttemptSyncBody): ApiEnvelope<AttemptSyncDto>

    @GET("exams/{id}/participants")
    suspend fun participants(@Path("id") id: String): ApiEnvelope<List<ParticipantDto>>

    // ---- the exams tab and creating an exam (teacher) ----
    /** role = student: the exams of the classes I joined; without it: the exams I created */
    @GET("exams")
    suspend fun list(@Query("role") role: String?, @Query("limit") limit: Int = 100): ListEnvelope<ExamItemDto>

    @POST("exams")
    suspend fun create(@Body body: ExamCreateBody): ApiEnvelope<ExamItemDto>

    @POST("exams/{id}/versions/generate")
    suspend fun generate(@Path("id") id: String, @Body body: GenerateBody): ApiEnvelope<List<VersionSummaryDto>>

    @POST("exams/{id}/publish")
    suspend fun publish(@Path("id") id: String): ApiEnvelope<ExamItemDto>

    @GET("templates")
    suspend fun templates(): ApiEnvelope<List<TemplateItemDto>>

    @GET("question-banks")
    suspend fun banks(): ApiEnvelope<List<BankDto>>

    // ---- grading a paper sheet with the camera (teacher) ----
    @GET("templates/{id}")
    suspend fun template(@Path("id") id: String): ApiEnvelope<TemplateDto>

    @GET("exams/{id}/versions")
    suspend fun versions(@Path("id") id: String): ApiEnvelope<List<VersionSummaryDto>>

    @GET("exams/{id}/versions/{codeId}")
    suspend fun version(@Path("id") id: String, @Path("codeId") codeId: String): ApiEnvelope<VersionDetailDto>

    @POST("exams/{id}/results")
    suspend fun record(@Path("id") id: String, @Body body: RecordResultBody): ApiEnvelope<ResultDetailDto>

    @Multipart
    @POST("exams/{id}/results/{rid}/image")
    suspend fun uploadImage(
        @Path("id") id: String,
        @Path("rid") resultId: String,
        @Part file: MultipartBody.Part,
        @Query("kind") kind: String = "marked",
    ): ApiEnvelope<Any>

    @POST("exams/{id}/attempts/{studentId}/unlock")
    suspend fun unlock(@Path("id") id: String, @Path("studentId") studentId: String): ApiEnvelope<ParticipantDto>
}
