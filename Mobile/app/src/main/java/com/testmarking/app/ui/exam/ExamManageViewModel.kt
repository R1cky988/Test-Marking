package com.testmarking.app.ui.exam

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.testmarking.app.data.ExamDetailDto
import com.testmarking.app.data.ParticipantDto
import com.testmarking.app.network.toApiException
import com.testmarking.app.repository.OnlineExamRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ManageState(
    val loading: Boolean = true,
    val error: String? = null,
    val detail: ExamDetailDto? = null,
    val participants: List<ParticipantDto> = emptyList(),
    val unlocking: String? = null,
    val message: String? = null,
)

/** Teacher: who is where in the exam, when each paper was marked or synced, and the unlock of a locked exam. */
class ExamManageViewModel(private val examId: String, private val repo: OnlineExamRepository) : ViewModel() {
    private val _state = MutableStateFlow(ManageState())
    val state: StateFlow<ManageState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val detail = repo.detail(examId).getOrNull()
            repo.participants(examId)
                .onSuccess { list -> _state.update { it.copy(loading = false, detail = detail ?: it.detail, participants = list) } }
                .onFailure { e -> _state.update { it.copy(loading = false, error = toApiException(e).message) } }
        }
    }

    fun unlock(studentId: String) {
        _state.update { it.copy(unlocking = studentId, message = null) }
        viewModelScope.launch {
            repo.unlock(examId, studentId)
                .onSuccess { p ->
                    _state.update { s ->
                        s.copy(unlocking = null, message = "Đã mở khóa cho ${p.fullName.orEmpty()}",
                            participants = s.participants.map { if (it.studentId == p.studentId) p else it })
                    }
                }
                .onFailure { e -> _state.update { it.copy(unlocking = null, message = toApiException(e).message) } }
        }
    }

    /** decision: ZERO (0 points), DEDUCT (minus points) or DISMISS */
    fun decide(studentId: String, decision: String, points: Double? = null) {
        _state.update { it.copy(unlocking = studentId, message = null) }
        viewModelScope.launch {
            repo.decideFlag(examId, studentId, decision, points)
                .onSuccess { p ->
                    _state.update { s ->
                        s.copy(unlocking = null, message = "Đã lưu quyết định",
                            participants = s.participants.map { if (it.studentId == p.studentId) p else it })
                    }
                }
                .onFailure { e -> _state.update { it.copy(unlocking = null, message = toApiException(e).message) } }
        }
    }

    fun messageShown() = _state.update { it.copy(message = null) }
}
