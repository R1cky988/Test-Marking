package com.testmarking.app.ui.exams

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.testmarking.app.data.ExamItemDto
import com.testmarking.app.repository.ExamsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ExamsState(
    val scope: String,
    val loading: Boolean = true,
    val items: List<ExamItemDto> = emptyList(),
    val error: String? = null,
)

/** The exams tab. scope = "teacher" (the exams I created, in my classes) or "student" (the exams of the classes I joined). */
class ExamsViewModel(initialScope: String, private val repo: ExamsRepository) : ViewModel() {
    private val _state = MutableStateFlow(ExamsState(initialScope))
    val state: StateFlow<ExamsState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun setScope(scope: String) {
        if (scope == _state.value.scope) return
        _state.value = ExamsState(scope)
        refresh()
    }

    fun refresh() {
        val scope = _state.value.scope
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            repo.list(scope)
                .onSuccess { list -> _state.update { if (it.scope == scope) it.copy(loading = false, items = list) else it } }
                .onFailure { e -> _state.update { if (it.scope == scope) it.copy(loading = false, error = e.message) else it } }
        }
    }
}
