package com.testmarking.app.ui.exam

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.gson.Gson
import com.testmarking.app.data.ExamDetailDto
import com.testmarking.app.data.MyResultDto
import com.testmarking.app.data.OnlinePaperDto
import com.testmarking.app.data.PaperQuestionDto
import com.testmarking.app.data.local.AttemptStatus
import com.testmarking.app.data.local.LocalAttempt
import com.testmarking.app.network.toApiException
import com.testmarking.app.repository.OnlineExamRepository
import com.testmarking.app.util.TimeFormat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class TakeState(
    val loading: Boolean = true,
    val error: String? = null,
    val detail: ExamDetailDto? = null,
    val paper: OnlinePaperDto? = null,
    val attempt: LocalAttempt? = null,
    val starting: Boolean = false,
    val syncing: Boolean = false,
) {
    val questions: List<PaperQuestionDto> get() = paper?.questions.orEmpty()
    val allowReference: Boolean get() = paper?.allowReference ?: detail?.allowReference ?: false
    val locks: Boolean get() = (paper?.leavePolicy ?: detail?.leavePolicy) == "LOCK"
}

/**
 * Closed book: forward only, every question has its own time, leaving the screen is counted (and locks the exam when the
 * teacher chose LOCK). Open book: free order, free time, leaving is ignored. Everything is written to the phone first.
 */
class TakeExamViewModel(private val examId: String, private val repo: OnlineExamRepository) : ViewModel() {
    private val gson = Gson()
    private val _state = MutableStateFlow(TakeState())
    val state: StateFlow<TakeState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val a = repo.local(examId)
            if (a != null) {
                _state.update { it.copy(loading = false, paper = repo.paperOf(a), attempt = a) }
                if (a.status == AttemptStatus.FINISHED || a.status == AttemptStatus.LOCKED) syncQuietly()
                return@launch
            }
            repo.detail(examId)
                .onSuccess { d -> _state.update { it.copy(loading = false, detail = d) } }
                .onFailure { e -> _state.update { it.copy(loading = false, error = toApiException(e).message) } }
        }
    }

    fun start() {
        if (_state.value.starting) return
        _state.update { it.copy(starting = true, error = null) }
        viewModelScope.launch {
            repo.start(examId)
                .onSuccess { a -> _state.update { it.copy(starting = false, paper = repo.paperOf(a), attempt = a) } }
                .onFailure { e -> _state.update { it.copy(starting = false, error = toApiException(e).message) } }
        }
    }

    // ---- answers ----

    fun choose(order: Int, label: String, multiple: Boolean) {
        val a = taking() ?: return
        val now = a.answers[order].orEmpty().split(",").filter { it.isNotBlank() }.toMutableSet()
        if (multiple) {
            if (!now.add(label)) now.remove(label)
        } else {
            now.clear(); now.add(label)
        }
        val next = a.answers.toMutableMap()
        if (now.isEmpty()) next.remove(order) else next[order] = now.sorted().joinToString(",")
        put(a.copy(answers = next))
    }

    /** Open book: any question. */
    fun goTo(index: Int) {
        val a = taking() ?: return
        if (!_state.value.allowReference) return
        put(a.copy(currentIndex = index.coerceIn(0, (_state.value.questions.size - 1).coerceAtLeast(0))))
    }

    /** Closed book: only forward. The next question gets its own time. */
    fun next() {
        val a = taking() ?: return
        val qs = _state.value.questions
        if (a.currentIndex >= qs.size - 1) return
        val idx = a.currentIndex + 1
        val seconds = qs[idx].seconds
        put(a.copy(currentIndex = idx, questionDeadlineMs = if (seconds != null) System.currentTimeMillis() + seconds * 1000L else 0L))
    }

    // ---- the clock (called every second by the screen) ----

    /** Time over for the exam, or for a question of a closed-book exam: finish / move on. */
    fun tick() {
        val a = taking() ?: return
        val now = System.currentTimeMillis()
        if (now >= a.deadlineMs) {
            finish(auto = true)
            return
        }
        if (!_state.value.allowReference && a.questionDeadlineMs in 1..now) {
            if (a.currentIndex >= _state.value.questions.size - 1) finish(auto = true) else next()
        }
    }

    // ---- leaving, finishing, syncing ----

    /** The student left the exam screen on his own. Open book: nothing. */
    fun onLeftScreen() {
        val a = taking() ?: return
        if (_state.value.allowReference) return
        val n = a.leftCount + 1
        val locked = _state.value.locks
        put(
            a.copy(
                leftCount = n,
                status = if (locked) AttemptStatus.LOCKED else a.status,
                lockReason = if (locked) "Thoát khỏi màn hình làm bài $n lần" else a.lockReason,
            ),
        )
        syncQuietly()
    }

    /** Handing in only writes "finished" on the phone; the server marks it when the sync gets through. */
    fun finish(auto: Boolean = false) {
        val a = _state.value.attempt ?: return
        if (a.status != AttemptStatus.IN_PROGRESS) return
        val at = minOf(System.currentTimeMillis(), a.deadlineMs)
        put(a.copy(status = AttemptStatus.FINISHED, finishedAt = TimeFormat.iso(at), questionDeadlineMs = 0L))
        syncQuietly()
    }

    /** The heartbeat while taking, the poll while locked, and the retry button. */
    fun syncQuietly() {
        if (_state.value.syncing) return
        _state.update { it.copy(syncing = true) }
        viewModelScope.launch {
            repo.sync(examId).onSuccess { a -> _state.update { it.copy(attempt = a) } }
            // a failure leaves the phone's copy as it is; the retry comes with the next heartbeat or the network callback
            _state.update { it.copy(syncing = false, attempt = repo.local(examId) ?: it.attempt) }
        }
    }

    fun result(): MyResultDto? = _state.value.attempt?.resultJson?.let { gson.fromJson(it, MyResultDto::class.java) }

    private fun taking(): LocalAttempt? = _state.value.attempt?.takeIf { it.status == AttemptStatus.IN_PROGRESS }

    private fun put(a: LocalAttempt) {
        repo.save(a)
        _state.update { it.copy(attempt = a) }
    }
}
