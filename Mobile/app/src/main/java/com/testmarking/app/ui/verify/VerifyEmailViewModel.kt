package com.testmarking.app.ui.verify

import androidx.annotation.StringRes
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.testmarking.app.R
import com.testmarking.app.repository.AuthRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch

data class VerifyState(
    val email: String = "",
    val loading: Boolean = false,
    @StringRes val codeError: Int? = null,
    val error: String? = null,
    /** Seconds left before "Gửi lại" works again (0 = ready). */
    val cooldown: Int = 0,
)

sealed interface VerifyEvent {
    data object GoHome : VerifyEvent
    data class Info(@StringRes val message: Int) : VerifyEvent
}

class VerifyEmailViewModel(private val repo: AuthRepository) : ViewModel() {
    private val _state = MutableStateFlow(VerifyState())
    val state: StateFlow<VerifyState> = _state.asStateFlow()

    private val _events = Channel<VerifyEvent>(Channel.BUFFERED)
    val events = _events.receiveAsFlow()

    private var started = false
    private var cooldownJob: Job? = null

    /** Called once from the fragment. [autoResend] = true when we got here from a login that was refused. */
    fun start(email: String, autoResend: Boolean) {
        if (started) return
        started = true
        _state.value = _state.value.copy(email = email)
        if (autoResend) resend(silent = true) else startCooldown()
    }

    fun verify(rawCode: String) {
        val current = _state.value
        if (current.loading) return
        val code = rawCode.trim()
        if (code.length != 6 || !code.all { it.isDigit() }) {
            _state.value = current.copy(codeError = R.string.err_code, error = null)
            return
        }
        _state.value = current.copy(loading = true, codeError = null, error = null)
        viewModelScope.launch {
            repo.verifyEmail(current.email, code)
                .onSuccess {
                    _state.value = _state.value.copy(loading = false)
                    _events.send(VerifyEvent.GoHome)
                }
                .onFailure { e -> _state.value = _state.value.copy(loading = false, error = e.message) }
        }
    }

    fun resend(silent: Boolean = false) {
        val current = _state.value
        if (current.loading || current.cooldown > 0) return
        _state.value = current.copy(loading = true, error = null)
        viewModelScope.launch {
            repo.resendCode(current.email)
                .onSuccess {
                    _state.value = _state.value.copy(loading = false)
                    startCooldown()
                    if (!silent) _events.send(VerifyEvent.Info(R.string.verify_resent))
                }
                .onFailure { e -> _state.value = _state.value.copy(loading = false, error = e.message) }
        }
    }

    private fun startCooldown() {
        cooldownJob?.cancel()
        cooldownJob = viewModelScope.launch {
            for (left in COOLDOWN_SECONDS downTo 1) {
                _state.value = _state.value.copy(cooldown = left)
                delay(1000)
            }
            _state.value = _state.value.copy(cooldown = 0)
        }
    }

    private companion object {
        const val COOLDOWN_SECONDS = 60
    }
}
