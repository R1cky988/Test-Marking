package com.testmarking.app.ui.paper

import android.graphics.Bitmap
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

/** [showPicture]: the teacher looks at the straightened picture instead of the list of answers. */
data class PaperState(
    val loading: Boolean = true,
    val error: String? = null,
    val paper: PaperDetailDto? = null,
    val showPicture: Boolean = false,
    val pictureLoading: Boolean = false,
    val picture: Bitmap? = null,
    val pictureError: String? = null,
)

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
                .onSuccess { p -> _state.update { it.copy(loading = false, paper = p, picture = null, pictureError = null) } }
                .onFailure { e -> _state.update { it.copy(loading = false, error = toApiException(e).message) } }
        }
    }

    /** Switch between the list of answers and the picture; the picture is made the first time it is asked for. */
    fun showPicture(on: Boolean) {
        _state.update { it.copy(showPicture = on) }
        if (on) loadPicture()
    }

    fun loadPicture() {
        val s = _state.value
        val paper = s.paper ?: return
        if (s.picture != null || s.pictureLoading) return
        _state.update { it.copy(pictureLoading = true, pictureError = null) }
        viewModelScope.launch {
            repo.markedPicture(examId, resultId, paper.answers.orEmpty())
                .onSuccess { bmp -> _state.update { it.copy(pictureLoading = false, picture = bmp) } }
                .onFailure { e -> _state.update { it.copy(pictureLoading = false, pictureError = toApiException(e).message) } }
        }
    }
}
