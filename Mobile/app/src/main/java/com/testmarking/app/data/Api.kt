package com.testmarking.app.data

import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface AuthApi {
    @POST("user/login")
    suspend fun login(@Body body: LoginBody): ApiEnvelope<TokenPair>

    @POST("user/register")
    suspend fun register(@Body body: RegisterBody): ApiEnvelope<Any>

    @POST("user/verify-email")
    suspend fun verifyEmail(@Body body: VerifyBody): ApiEnvelope<TokenPair>

    @POST("user/resend-code")
    suspend fun resendCode(@Body body: EmailBody): ApiEnvelope<Any>

    @GET("user/me")
    suspend fun me(): ApiEnvelope<UserDto>
}

/** Used only by TokenAuthenticator (blocking call, its own client without the authenticator). */
interface RefreshApi {
    @POST("user/refresh")
    fun refresh(@Body body: RefreshBody): Call<ApiEnvelope<TokenPair>>
}

interface ClassApi {
    /** role = teacher (classes I created) | student (classes I joined) */
    @GET("classes")
    suspend fun list(
        @Query("role") role: String?,
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
    ): ListEnvelope<ClassItemDto>

    @GET("classes/{id}")
    suspend fun detail(@Path("id") id: String): ApiEnvelope<ClassDetailDto>

    @POST("classes")
    suspend fun create(@Body body: CreateClassBody): ApiEnvelope<ClassItemDto>

    @POST("classes/join")
    suspend fun join(@Body body: JoinBody): ApiEnvelope<JoinResultDto>

    // ---- members ----
    @GET("classes/{id}/members")
    suspend fun members(@Path("id") id: String): ApiEnvelope<MembersDto>

    @DELETE("classes/{id}/members/{studentId}")
    suspend fun removeStudent(@Path("id") id: String, @Path("studentId") studentId: String): ApiEnvelope<Any>

    /** teacher only; default status = PENDING */
    @GET("classes/{id}/join-requests")
    suspend fun joinRequests(@Path("id") id: String): ApiEnvelope<List<JoinRequestDto>>

    @POST("classes/{id}/join-requests/{requestId}/approve")
    suspend fun approve(@Path("id") id: String, @Path("requestId") requestId: String): ApiEnvelope<JoinDecisionDto>

    @POST("classes/{id}/join-requests/{requestId}/reject")
    suspend fun reject(
        @Path("id") id: String,
        @Path("requestId") requestId: String,
        @Body body: RejectBody,
    ): ApiEnvelope<JoinDecisionDto>

    // ---- exams of the class ----
    @GET("classes/{id}/exams")
    suspend fun exams(@Path("id") id: String): ApiEnvelope<ClassExamsDto>

    // ---- posts ----
    @GET("classes/{id}/posts")
    suspend fun posts(@Path("id") id: String): ApiEnvelope<List<PostDto>>

    @POST("classes/{id}/posts")
    suspend fun createPost(@Path("id") id: String, @Body body: CreatePostBody): ApiEnvelope<PostDto>

    @DELETE("classes/{id}/posts/{postId}")
    suspend fun deletePost(@Path("id") id: String, @Path("postId") postId: String): ApiEnvelope<Any>

    @POST("classes/{id}/posts/{postId}/comments")
    suspend fun addComment(
        @Path("id") id: String,
        @Path("postId") postId: String,
        @Body body: CommentBody,
    ): ApiEnvelope<CommentDto>

    @DELETE("classes/{id}/comments/{commentId}")
    suspend fun deleteComment(@Path("id") id: String, @Path("commentId") commentId: String): ApiEnvelope<Any>

    @PUT("classes/{id}/posts/{postId}/reaction")
    suspend fun reactToPost(
        @Path("id") id: String,
        @Path("postId") postId: String,
        @Body body: ReactionBody,
    ): ApiEnvelope<ReactionSummaryDto>
}
