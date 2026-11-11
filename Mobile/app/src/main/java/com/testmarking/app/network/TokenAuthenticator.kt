package com.testmarking.app.network

import com.testmarking.app.data.RefreshApi
import com.testmarking.app.data.RefreshBody
import com.testmarking.app.data.SessionStore
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import java.io.IOException

/**
 * On a 401 it asks the server for a new token pair once and repeats the call.
 * Parallel calls wait on the lock, then reuse the token the first one obtained.
 * If the refresh token is refused the session is expired and the app returns to the login screen.
 */
class TokenAuthenticator(
    private val session: SessionStore,
    private val refreshApi: RefreshApi,
) : Authenticator {
    private val lock = Any()

    override fun authenticate(route: Route?, response: Response): Request? {
        val sent = response.request.header("Authorization") ?: return null   // public endpoint: nothing to refresh
        if (responseCount(response) >= 3) return null

        synchronized(lock) {
            val current = session.accessToken
            if (!current.isNullOrBlank() && "Bearer $current" != sent) {
                // somebody else already refreshed while we waited
                return response.request.newBuilder().header("Authorization", "Bearer $current").build()
            }
            val refresh = session.refreshToken
            if (refresh.isNullOrBlank()) {
                session.expire()
                return null
            }
            val result = try {
                refreshApi.refresh(RefreshBody(refresh)).execute()
            } catch (e: IOException) {
                return null   // offline: keep the session, the call just fails
            }
            if (!result.isSuccessful) {
                if (result.code() in 400..403) session.expire()
                return null
            }
            val tokens = result.body()?.data
            val access = tokens?.accessToken
            val newRefresh = tokens?.refreshToken
            if (access.isNullOrBlank() || newRefresh.isNullOrBlank()) {
                session.expire()
                return null
            }
            session.saveTokens(access, newRefresh)
            return response.request.newBuilder().header("Authorization", "Bearer $access").build()
        }
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}
