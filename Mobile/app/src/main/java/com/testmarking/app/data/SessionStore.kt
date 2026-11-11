package com.testmarking.app.data

import android.content.Context
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/** Tokens and the small profile cache. The backup is switched off in the manifest (allowBackup=false). */
class SessionStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences("session", Context.MODE_PRIVATE)

    private val _expired = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

    /** Emits when the refresh token no longer works: the UI must go back to the login screen. */
    val sessionExpired: SharedFlow<Unit> = _expired.asSharedFlow()

    val accessToken: String? get() = prefs.getString(KEY_ACCESS, null)
    val refreshToken: String? get() = prefs.getString(KEY_REFRESH, null)
    val hasSession: Boolean get() = !refreshToken.isNullOrBlank()

    fun saveTokens(access: String, refresh: String) {
        prefs.edit().putString(KEY_ACCESS, access).putString(KEY_REFRESH, refresh).apply()
    }

    fun saveUser(user: UserDto) {
        prefs.edit()
            .putString(KEY_EMAIL, user.email)
            .putString(KEY_PHONE, user.phoneNumber)
            .putString(KEY_FIRST, user.firstName)
            .putString(KEY_LAST, user.lastName)
            .apply()
    }

    fun cachedUser(): UserDto? {
        val email = prefs.getString(KEY_EMAIL, null) ?: return null
        return UserDto(
            email = email,
            phoneNumber = prefs.getString(KEY_PHONE, null),
            firstName = prefs.getString(KEY_FIRST, null),
            lastName = prefs.getString(KEY_LAST, null),
        )
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    /** Called when the server refuses the refresh token. */
    fun expire() {
        clear()
        _expired.tryEmit(Unit)
    }

    private companion object {
        const val KEY_ACCESS = "access_token"
        const val KEY_REFRESH = "refresh_token"
        const val KEY_EMAIL = "email"
        const val KEY_PHONE = "phone"
        const val KEY_FIRST = "first_name"
        const val KEY_LAST = "last_name"
    }
}
