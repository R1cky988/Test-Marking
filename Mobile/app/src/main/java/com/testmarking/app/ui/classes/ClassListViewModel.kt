package com.testmarking.app.ui.classes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.testmarking.app.data.ClassItemDto
import com.testmarking.app.data.CreateClassBody
import com.testmarking.app.data.JoinResultDto
import com.testmarking.app.repository.ClassRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ClassListState(
    val loading: Boolean = false,
    val items: List<ClassItemDto> = emptyList(),
    val error: String? = null,
)

/** [scope] is "teacher" (classes I created) or "student" (classes I joined). */
class ClassListViewModel(
    val scope: String,
    private val repo: ClassRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ClassListState(loading = true))
    val state: StateFlow<ClassListState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            repo.list(scope)
                .onSuccess { _state.value = ClassListState(items = it) }
                .onFailure { _state.value = ClassListState(items = _state.value.items, error = it.message) }
        }
    }

    suspend fun create(name: String, subject: String, description: String, needsApproval: Boolean): Result<Unit> =
        repo.create(
            CreateClassBody(
                className = name.trim(),
                subject = subject.trim().ifEmpty { null },
                description = description.trim().ifEmpty { null },
                requireJoinApproval = needsApproval,
            ),
        ).map { }

    suspend fun join(code: String): Result<JoinResultDto> = repo.join(code.trim())
}
