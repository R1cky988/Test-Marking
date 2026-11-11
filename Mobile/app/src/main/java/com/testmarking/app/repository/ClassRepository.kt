package com.testmarking.app.repository

import com.testmarking.app.data.ClassApi
import com.testmarking.app.data.ClassExamsDto
import com.testmarking.app.data.CommentBody
import com.testmarking.app.data.CommentDto
import com.testmarking.app.data.CreatePostBody
import com.testmarking.app.data.JoinRequestDto
import com.testmarking.app.data.MembersDto
import com.testmarking.app.data.PostDto
import com.testmarking.app.data.ReactionBody
import com.testmarking.app.data.ReactionSummaryDto
import com.testmarking.app.data.RejectBody
import com.testmarking.app.data.ClassDetailDto
import com.testmarking.app.data.ClassItemDto
import com.testmarking.app.data.CreateClassBody
import com.testmarking.app.data.JoinBody
import com.testmarking.app.data.JoinResultDto
import com.testmarking.app.network.apiCall
import com.testmarking.app.network.ensureOk
import com.testmarking.app.network.requireData

/** Role in the app is decided by the class: classes I created = teaching, classes I joined = learning. */
class ClassRepository(private val api: ClassApi) {
    suspend fun list(scope: String): Result<List<ClassItemDto>> = apiCall {
        api.list(role = scope, limit = 100).data.orEmpty()
    }

    suspend fun detail(id: String): Result<ClassDetailDto> = apiCall {
        api.detail(id).requireData()
    }

    suspend fun create(body: CreateClassBody): Result<ClassItemDto> = apiCall {
        api.create(body).requireData()
    }

    suspend fun join(code: String): Result<JoinResultDto> = apiCall {
        api.join(JoinBody(code)).requireData()
    }

    // ---- members ----
    suspend fun members(classId: String): Result<MembersDto> = apiCall { api.members(classId).requireData() }

    suspend fun removeStudent(classId: String, studentId: String): Result<Unit> = apiCall {
        api.removeStudent(classId, studentId).ensureOk()
    }

    suspend fun joinRequests(classId: String): Result<List<JoinRequestDto>> = apiCall {
        api.joinRequests(classId).data.orEmpty()
    }

    suspend fun approve(classId: String, requestId: String): Result<Unit> = apiCall {
        api.approve(classId, requestId).ensureOk()
    }

    suspend fun reject(classId: String, requestId: String): Result<Unit> = apiCall {
        api.reject(classId, requestId, RejectBody()).ensureOk()
    }

    // ---- exams ----
    suspend fun exams(classId: String): Result<ClassExamsDto> = apiCall { api.exams(classId).requireData() }

    // ---- posts ----
    suspend fun posts(classId: String): Result<List<PostDto>> = apiCall { api.posts(classId).data.orEmpty() }

    suspend fun createPost(classId: String, title: String?, content: String, announcement: Boolean): Result<PostDto> = apiCall {
        api.createPost(classId, CreatePostBody(title, content, if (announcement) "ANNOUNCEMENT" else "POST")).requireData()
    }

    suspend fun deletePost(classId: String, postId: String): Result<Unit> = apiCall {
        api.deletePost(classId, postId).ensureOk()
    }

    suspend fun addComment(classId: String, postId: String, content: String, parentId: String?): Result<CommentDto> = apiCall {
        api.addComment(classId, postId, CommentBody(content, parentId)).requireData()
    }

    suspend fun deleteComment(classId: String, commentId: String): Result<Unit> = apiCall {
        api.deleteComment(classId, commentId).ensureOk()
    }

    /** reaction = "LIKE", or null to remove mine */
    suspend fun react(classId: String, postId: String, reaction: String?): Result<ReactionSummaryDto> = apiCall {
        api.reactToPost(classId, postId, ReactionBody(reaction)).requireData()
    }
}

const val SCOPE_TEACHER = "teacher"
const val SCOPE_STUDENT = "student"
