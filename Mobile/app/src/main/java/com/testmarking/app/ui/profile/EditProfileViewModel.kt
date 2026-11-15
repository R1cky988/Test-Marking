package com.testmarking.app.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.testmarking.app.data.UserDto
import com.testmarking.app.repository.AuthRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class EditState(
    val user: UserDto? = null,
    val busy: Boolean = false,
    val infoError: String? = null,
    val passwordError: String? = null,
    val avatarError: String? = null,
)

/** What happened, said once (a Toast), after the call came back. */
enum class EditEvent { INFO_SAVED, PASSWORD_CHANGED, AVATAR_SAVED }

class EditProfileViewModel(private val repo: AuthRepository) : ViewModel() {
    private val _state = MutableStateFlow(EditState(user = repo.cachedUser()))
    val state: StateFlow<EditState> = _state.asStateFlow()

    private val _events = Channel<EditEvent>(Channel.BUFFERED)
    val events = _events.receiveAsFlow()

    init {
        viewModelScope.launch { repo.loadProfile().onSuccess { u -> _state.update { it.copy(user = u) } } }
    }

    fun saveInfo(firstName: String, lastName: String, phone: String) {
        if (_state.value.busy) return
        _state.update { it.copy(busy = true, infoError = null) }
        viewModelScope.launch {
            repo.updateProfile(firstName.trim(), lastName.trim(), phone.replace(" ", "").replace("-", ""))
                .onSuccess { u ->
                    _state.update { it.copy(busy = false, user = u) }
                    _events.send(EditEvent.INFO_SAVED)
                }
                .onFailure { e -> _state.update { it.copy(busy = false, infoError = e.message) } }
        }
    }

    fun changePassword(old: String, new: String) {
        if (_state.value.busy) return
        _state.update { it.copy(busy = true, passwordError = null) }
        viewModelScope.launch {
            repo.changePassword(old, new)
                .onSuccess {
                    _state.update { it.copy(busy = false) }
                    _events.send(EditEvent.PASSWORD_CHANGED)
                }
                .onFailure { e ->
                    // the server answers "Wrong password" for a wrong current password
                    val text = if (e.message.orEmpty().contains("wrong password", ignoreCase = true)) "Mật khẩu hiện tại không đúng" else e.message
                    _state.update { it.copy(busy = false, passwordError = text) }
                }
        }
    }

    fun uploadAvatar(jpeg: ByteArray) {
        if (_state.value.busy) return
        _state.update { it.copy(busy = true, avatarError = null) }
        viewModelScope.launch {
            repo.uploadAvatar(jpeg)
                .onSuccess { u ->
                    _state.update { it.copy(busy = false, user = u) }
                    _events.send(EditEvent.AVATAR_SAVED)
                }
                .onFailure { e -> _state.update { it.copy(busy = false, avatarError = e.message) } }
        }
    }

    fun avatarFailed(message: String) = _state.update { it.copy(avatarError = message) }
}
