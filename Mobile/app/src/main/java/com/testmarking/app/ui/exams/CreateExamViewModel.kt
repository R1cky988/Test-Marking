package com.testmarking.app.ui.exams

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.testmarking.app.data.ExamCreateBody
import com.testmarking.app.data.GenerateBody
import com.testmarking.app.repository.ExamFormOptions
import com.testmarking.app.repository.ExamsRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch

data class CreateState(
    val loading: Boolean = true,
    val options: ExamFormOptions? = null,
    val saving: Boolean = false,
    /** a failure of loading the options, or of saving */
    val error: String? = null,
)

class CreateExamViewModel(private val repo: ExamsRepository) : ViewModel() {
    private val _state = MutableStateFlow(CreateState())
    val state: StateFlow<CreateState> = _state.asStateFlow()

    /** true = the exam was also published */
    private val _done = Channel<Boolean>(Channel.BUFFERED)
    val done = _done.receiveAsFlow()

    // what was picked in the form: kept here so a rotation does not lose it
    var fromMs: Long? = null
    var toMs: Long? = null
    var classId: String? = null
    var templateId: String? = null
    var bankId: String? = null

    init {
        load()
    }

    fun load() {
        _state.value = CreateState(loading = true)
        viewModelScope.launch {
            repo.formOptions()
                .onSuccess { _state.value = CreateState(loading = false, options = it) }
                .onFailure { _state.value = CreateState(loading = false, error = it.message) }
        }
    }

    fun submit(body: ExamCreateBody, versions: GenerateBody?, publish: Boolean) {
        if (_state.value.saving) return
        _state.value = _state.value.copy(saving = true, error = null)
        viewModelScope.launch {
            repo.create(body, versions, publish)
                .onSuccess {
                    _state.value = _state.value.copy(saving = false)
                    _done.send(publish)
                }
                .onFailure { _state.value = _state.value.copy(saving = false, error = it.message) }
        }
    }
}
