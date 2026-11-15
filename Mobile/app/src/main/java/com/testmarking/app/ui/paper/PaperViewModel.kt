package com.testmarking.app.ui.paper

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.testmarking.app.data.PaperDetailDto
import com.testmarking.app.network.toApiException
import com.testmarking.app.repository.GradingRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class PaperState(val loading: Boolean = true, val error: String? = null, val paper: PaperDetailDto? = null)

/** Teacher: one marked paper, to be drawn with green / red / yellow. */
class PaperViewModel(private val examId: String, private val resultId: String, private val repo: GradingRepository) : ViewModel() {
    private val _state = MutableStateFlow(PaperState())
    val state: StateFlow<PaperState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            repo.paper(examId, resultId)
                .onSuccess { p -> _state.update { PaperState(loading = false, paper = p) } }
                .onFailure { e -> _state.update { it.copy(loading = false, error = toApiException(e).message) } }
        }
    }
}
