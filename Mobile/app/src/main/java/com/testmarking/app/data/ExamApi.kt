package com.testmarking.app.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
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

    @PUT("exams/{id}/flags")
    suspend fun decideFlag(@Path("id") id: String, @Body body: FlagDecisionBody): ApiEnvelope<ParticipantDto>

    @POST("exams/{id}/attempts/{studentId}/unlock")
    suspend fun unlock(@Path("id") id: String, @Path("studentId") studentId: String): ApiEnvelope<ParticipantDto>
}
