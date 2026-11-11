package com.testmarking.app.network

import com.testmarking.app.data.ServerConfig
import com.testmarking.app.data.SessionStore
import okhttp3.Interceptor
import okhttp3.Response

/** Sends the user to the address chosen in "Địa chỉ máy chủ" (when one is set). */
class ServerOverrideInterceptor(private val config: ServerConfig) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val target = config.override() ?: return chain.proceed(request)
        val url = request.url.newBuilder()
            .scheme(target.scheme)
            .host(target.host)
            .port(target.port)
            .build()
        return chain.proceed(request.newBuilder().url(url).build())
    }
}

/** Adds "Authorization: Bearer ..." to every call except the public auth endpoints. */
class AuthInterceptor(private val session: SessionStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val path = request.url.encodedPath
        if (PUBLIC_PATHS.any { path.endsWith(it) }) return chain.proceed(request)
        val token = session.accessToken
        if (token.isNullOrBlank()) return chain.proceed(request)
        return chain.proceed(request.newBuilder().header("Authorization", "Bearer $token").build())
    }

    private companion object {
        val PUBLIC_PATHS = listOf("/user/login", "/user/register", "/user/verify-email", "/user/resend-code", "/user/refresh")
    }
}
