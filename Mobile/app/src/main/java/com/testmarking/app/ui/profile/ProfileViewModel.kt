package com.testmarking.app.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.testmarking.app.data.UserDto
import com.testmarking.app.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ProfileViewModel(private val repo: AuthRepository) : ViewModel() {
    // The cached profile shows at once; the server copy replaces it when it arrives.
    private val _user = MutableStateFlow(repo.cachedUser())
    val user: StateFlow<UserDto?> = _user.asStateFlow()

    init {
        viewModelScope.launch {
            repo.loadProfile().onSuccess { _user.value = it }
        }
    }

    fun logout() = repo.logout()
}

/** "Họ Tên" (Vietnamese order). Falls back to the email when the name is empty. */
fun UserDto.displayName(): String {
    val name = listOfNotNull(lastName, firstName).map { it.trim() }.filter { it.isNotEmpty() }.joinToString(" ")
    return name.ifEmpty { email.orEmpty() }
}
