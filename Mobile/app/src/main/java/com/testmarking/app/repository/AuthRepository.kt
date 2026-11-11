package com.testmarking.app.repository

import com.testmarking.app.data.AuthApi
import com.testmarking.app.data.EmailBody
import com.testmarking.app.data.LoginBody
import com.testmarking.app.data.RegisterBody
import com.testmarking.app.data.SessionStore
import com.testmarking.app.data.TokenPair
import com.testmarking.app.data.UserDto
import com.testmarking.app.data.VerifyBody
import com.testmarking.app.network.ApiException
import com.testmarking.app.network.MSG_BAD_RESPONSE
import com.testmarking.app.network.apiCall
import com.testmarking.app.network.ensureOk
import com.testmarking.app.network.requireData
import kotlinx.coroutines.CancellationException

class AuthRepository(
    private val api: AuthApi,
    private val session: SessionStore,
) {
    val hasSession: Boolean get() = session.hasSession

    suspend fun login(email: String, password: String): Result<Unit> = apiCall {
        saveTokens(api.login(LoginBody(email, password)).requireData())
        refreshProfileQuietly()
    }

    /** The server sends a 6-digit code to the email; the account stays PENDING until it is verified. */
    suspend fun register(body: RegisterBody): Result<Unit> = apiCall {
        api.register(body).ensureOk()
    }

    suspend fun verifyEmail(email: String, code: String): Result<Unit> = apiCall {
        saveTokens(api.verifyEmail(VerifyBody(email, code)).requireData())
        refreshProfileQuietly()
    }

    suspend fun resendCode(email: String): Result<Unit> = apiCall {
        api.resendCode(EmailBody(email)).ensureOk()
    }

    /** Cached profile first (cachedUser), then call this to refresh it. */
    suspend fun loadProfile(): Result<UserDto> = apiCall {
        api.me().requireData().also { session.saveUser(it) }
    }

    fun cachedUser(): UserDto? = session.cachedUser()

    fun logout() = session.clear()

    private fun saveTokens(tokens: TokenPair) {
        val access = tokens.accessToken
        val refresh = tokens.refreshToken
        if (access.isNullOrBlank() || refresh.isNullOrBlank()) throw ApiException(MSG_BAD_RESPONSE)
        session.saveTokens(access, refresh)
    }

    /** Failing to read the profile must not undo a successful login. */
    private suspend fun refreshProfileQuietly() {
        try {
            api.me().data?.let { session.saveUser(it) }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // the profile screen loads it again
        }
    }
}
