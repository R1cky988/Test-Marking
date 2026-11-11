package com.testmarking.app.ui.classes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.testmarking.app.data.ClassDetailDto
import com.testmarking.app.data.ClassExamsDto
import com.testmarking.app.data.CommentDto
import com.testmarking.app.data.JoinRequestDto
import com.testmarking.app.data.MembersDto
import com.testmarking.app.data.PostDto
import com.testmarking.app.repository.ClassRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** One part of the screen (info, posts, exams, members) with its own loading and error. */
data class Section<T>(val loading: Boolean = false, val data: T? = null, val error: String? = null)

data class ClassDetailState(
    val info: Section<ClassDetailDto> = Section(loading = true),
    val posts: Section<List<PostDto>> = Section(loading = true),
    val exams: Section<ClassExamsDto> = Section(loading = true),
    val members: Section<MembersDto> = Section(loading = true),
    /** pending join requests, teacher only */
    val requests: List<JoinRequestDto> = emptyList(),
) {
    /** Role comes from the class: I created it = teacher, I joined it = student. */
    val isTeacher: Boolean
        get() = info.data?.let { it.isTeacher == true || it.myRole.equals("TEACHER", ignoreCase = true) } == true
}

class ClassDetailViewModel(
    private val classId: String,
    private val repo: ClassRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ClassDetailState())
    val state: StateFlow<ClassDetailState> = _state.asStateFlow()
    val isTeacher: Boolean get() = state.value.isTeacher
    /** One-off messages (a failed delete, "Đã xóa bài", ...). */
    private val _events = Channel<String>(Channel.BUFFERED)
    val events: Flow<String> = _events.receiveAsFlow()

    /** The tab that is open (0 posts, 1 exams, 2 members, 3 info); kept here so a rotation does not reset it. */
    var tab: Int = 0

    init {
        refreshAll()
    }

    fun refreshAll() {
        loadInfo()
        loadPosts()
        loadExams()
        loadMembers()
    }

    private fun say(message: String?) {
        _events.trySend(message ?: "")
    }

    // ---------------------------------------------------------------- loading

    fun loadInfo() {
        _state.update { it.copy(info = it.info.copy(loading = true, error = null)) }
        viewModelScope.launch {
            repo.detail(classId)
                .onSuccess { dto ->
                    _state.update { it.copy(info = Section(false, dto)) }
                    val teacher = dto.isTeacher == true || dto.myRole.equals("TEACHER", ignoreCase = true)
                    if (teacher) loadRequests()
                }
                .onFailure { e -> _state.update { it.copy(info = it.info.copy(loading = false, error = e.message)) } }
        }
    }

    /** silent = no spinner (after a comment, so the list does not flicker). */
    fun loadPosts(silent: Boolean = false) {
        if (!silent) _state.update { it.copy(posts = it.posts.copy(loading = true, error = null)) }
        viewModelScope.launch {
            repo.posts(classId)
                .onSuccess { list -> _state.update { it.copy(posts = Section(false, list)) } }
                .onFailure { e -> _state.update { it.copy(posts = it.posts.copy(loading = false, error = e.message)) } }
        }
    }

    fun loadExams() {
        _state.update { it.copy(exams = it.exams.copy(loading = true, error = null)) }
        viewModelScope.launch {
            repo.exams(classId)
                .onSuccess { dto -> _state.update { it.copy(exams = Section(false, dto)) } }
                .onFailure { e -> _state.update { it.copy(exams = it.exams.copy(loading = false, error = e.message)) } }
        }
    }

    fun loadMembers() {
        _state.update { it.copy(members = it.members.copy(loading = true, error = null)) }
        viewModelScope.launch {
            repo.members(classId)
                .onSuccess { dto -> _state.update { it.copy(members = Section(false, dto)) } }
                .onFailure { e -> _state.update { it.copy(members = it.members.copy(loading = false, error = e.message)) } }
            if (_state.value.isTeacher) loadRequests()
        }
    }

    private fun loadRequests() {
        viewModelScope.launch {
            repo.joinRequests(classId).onSuccess { list -> _state.update { it.copy(requests = list) } }
        }
    }

    // ---------------------------------------------------------------- posts

    suspend fun createPost(title: String, content: String, announcement: Boolean): Result<PostDto> {
        val result = repo.createPost(classId, title.trim().ifBlank { null }, content.trim(), announcement)
        if (result.isSuccess) loadPosts(silent = true)
        return result
    }

    fun deletePost(post: PostDto) {
        val id = post.id ?: return
        viewModelScope.launch {
            repo.deletePost(classId, id)
                .onSuccess {
                    _state.update { s -> s.copy(posts = s.posts.copy(data = s.posts.data?.filter { it.id != id })) }
                }
                .onFailure { e -> say(e.message) }
        }
    }

    /** Like or take the like back; the server answers with the new totals. */
    fun toggleLike(post: PostDto) {
        val id = post.id ?: return
        val liked = post.reactions?.viewerReaction != null
        viewModelScope.launch {
            repo.react(classId, id, if (liked) null else "LIKE")
                .onSuccess { summary ->
                    _state.update { s ->
                        s.copy(posts = s.posts.copy(data = s.posts.data?.map { p -> if (p.id == id) p.copy(reactions = summary) else p }))
                    }
                }
                .onFailure { e -> say(e.message) }
        }
    }

    suspend fun addComment(postId: String, content: String, parentId: String?): Result<CommentDto> {
        val result = repo.addComment(classId, postId, content.trim(), parentId)
        if (result.isSuccess) loadPosts(silent = true)
        return result
    }

    fun deleteComment(commentId: String) {
        viewModelScope.launch {
            repo.deleteComment(classId, commentId)
                .onSuccess { loadPosts(silent = true) }
                .onFailure { e -> say(e.message) }
        }
    }

    // ---------------------------------------------------------------- members (teacher)

    fun removeStudent(studentId: String) {
        viewModelScope.launch {
            repo.removeStudent(classId, studentId)
                .onSuccess {
                    loadMembers()
                    loadInfo()
                }
                .onFailure { e -> say(e.message) }
        }
    }

    fun approve(requestId: String) {
        viewModelScope.launch {
            repo.approve(classId, requestId)
                .onSuccess {
                    loadMembers()
                    loadInfo()
                }
                .onFailure { e -> say(e.message) }
        }
    }

    fun reject(requestId: String) {
        viewModelScope.launch {
            repo.reject(classId, requestId)
                .onSuccess { _state.update { s -> s.copy(requests = s.requests.filter { it.id != requestId }) } }
                .onFailure { e -> say(e.message) }
        }
    }
}
