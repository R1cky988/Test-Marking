package com.testmarking.app.ui.register

import android.util.Patterns
import androidx.annotation.StringRes
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.testmarking.app.R
import com.testmarking.app.data.RegisterBody
import com.testmarking.app.repository.AuthRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/** What the user typed. dobMillis is the picked day at 00:00 UTC (what MaterialDatePicker returns). */
data class RegisterForm(
    val lastName: String,
    val firstName: String,
    val email: String,
    val phone: String,
    val dobMillis: Long?,
    val gender: String,
    val password: String,
    val confirm: String,
)

data class RegisterState(
    val loading: Boolean = false,
    @StringRes val lastNameError: Int? = null,
    @StringRes val firstNameError: Int? = null,
    @StringRes val emailError: Int? = null,
    @StringRes val phoneError: Int? = null,
    @StringRes val dobError: Int? = null,
    @StringRes val passwordError: Int? = null,
    @StringRes val confirmError: Int? = null,
    val error: String? = null,
)

sealed interface RegisterEvent {
    /** The server sent a 6-digit code to [email]. */
    data class Registered(val email: String) : RegisterEvent
}

class RegisterViewModel(private val repo: AuthRepository) : ViewModel() {
    private val _state = MutableStateFlow(RegisterState())
    val state: StateFlow<RegisterState> = _state.asStateFlow()

    private val _events = Channel<RegisterEvent>(Channel.BUFFERED)
    val events = _events.receiveAsFlow()

    /** Survives rotation: the date the user picked. */
    var dobMillis: Long? = null

    fun submit(form: RegisterForm) {
        if (_state.value.loading) return
        val email = form.email.trim()
        val phone = form.phone.replace(" ", "").replace("-", "")
        val phoneDigits = phone.removePrefix("+")

        val next = RegisterState(
            lastNameError = if (form.lastName.isBlank()) R.string.err_required else null,
            firstNameError = if (form.firstName.isBlank()) R.string.err_required else null,
            emailError = when {
                email.isEmpty() -> R.string.err_required
                !Patterns.EMAIL_ADDRESS.matcher(email).matches() -> R.string.err_email
                else -> null
            },
            phoneError = when {
                phone.isEmpty() -> R.string.err_required
                phoneDigits.length !in 9..11 || !phoneDigits.all { it.isDigit() } -> R.string.err_phone
                else -> null
            },
            dobError = when {
                form.dobMillis == null -> R.string.err_required
                form.dobMillis > System.currentTimeMillis() -> R.string.err_dob_future
                else -> null
            },
            passwordError = if (form.password.length < 8) R.string.err_password_short else null,
            confirmError = if (form.confirm != form.password) R.string.err_password_mismatch else null,
        )
        val hasError = listOf(
            next.lastNameError, next.firstNameError, next.emailError, next.phoneError,
            next.dobError, next.passwordError, next.confirmError,
        ).any { it != null }
        if (hasError) {
            _state.value = next
            return
        }

        _state.value = RegisterState(loading = true)
        val body = RegisterBody(
            email = email,
            phoneNumber = phone,
            password = form.password,
            firstName = form.firstName.trim(),
            lastName = form.lastName.trim(),
            dob = formatApiDate(form.dobMillis!!),
            gender = form.gender,
        )
        viewModelScope.launch {
            repo.register(body)
                .onSuccess {
                    _state.value = RegisterState()
                    _events.send(RegisterEvent.Registered(email))
                }
                .onFailure { e -> _state.value = RegisterState(error = e.message) }
        }
    }

    companion object {
        /** yyyy-MM-dd of the UTC day the date picker returned. */
        fun formatApiDate(millis: Long): String = utcFormat("yyyy-MM-dd").format(millis)

        /** dd/MM/yyyy for the text field. */
        fun formatDisplayDate(millis: Long): String = utcFormat("dd/MM/yyyy").format(millis)

        private fun utcFormat(pattern: String) = SimpleDateFormat(pattern, Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
    }
}
