package com.testmarking.app.ui.login

import android.util.Patterns
import androidx.annotation.StringRes
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.testmarking.app.R
import com.testmarking.app.repository.AuthRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch

data class LoginState(
    val loading: Boolean = false,
    @StringRes val emailError: Int? = null,
    @StringRes val passwordError: Int? = null,
    val error: String? = null,
)

sealed interface LoginEvent {
    data object GoHome : LoginEvent

    /** The account exists but the email was never verified: go to the code screen. */
    data class NeedVerify(val email: String) : LoginEvent
}

class LoginViewModel(private val repo: AuthRepository) : ViewModel() {
    private val _state = MutableStateFlow(LoginState())
    val state: StateFlow<LoginState> = _state.asStateFlow()

    private val _events = Channel<LoginEvent>(Channel.BUFFERED)
    val events = _events.receiveAsFlow()

    fun login(rawEmail: String, password: String) {
        if (_state.value.loading) return
        val email = rawEmail.trim()
        val emailError = when {
            email.isEmpty() -> R.string.err_required
            !Patterns.EMAIL_ADDRESS.matcher(email).matches() -> R.string.err_email
            else -> null
        }
        val passwordError = if (password.isEmpty()) R.string.err_required else null
        if (emailError != null || passwordError != null) {
            _state.value = LoginState(emailError = emailError, passwordError = passwordError)
            return
        }

        _state.value = LoginState(loading = true)
        viewModelScope.launch {
            repo.login(email, password)
                .onSuccess {
                    _state.value = LoginState()
                    _events.send(LoginEvent.GoHome)
                }
                .onFailure { e ->
                    val message = e.message.orEmpty()
                    if (message.contains("chưa được xác nhận", ignoreCase = true)) {
                        _state.value = LoginState()
                        _events.send(LoginEvent.NeedVerify(email))
                    } else {
                        _state.value = LoginState(error = message)
                    }
                }
        }
    }
}
