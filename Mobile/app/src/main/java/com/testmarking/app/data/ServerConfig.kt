package com.testmarking.app.data

import android.content.Context
import com.testmarking.app.BuildConfig
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

/**
 * Lets the user point the app at another backend (a LAN address on a real phone) without rebuilding.
 * Only scheme, host and port are replaced; the "/api/v1/..." path always comes from the build config.
 */
class ServerConfig(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences("server_config", Context.MODE_PRIVATE)

    @Volatile
    private var override: HttpUrl? = prefs.getString(KEY_URL, null)?.toHttpUrlOrNull()

    fun override(): HttpUrl? = override

    /** What the user currently talks to, e.g. http://10.0.2.2:8080 */
    fun displayUrl(): String {
        val url = override ?: BuildConfig.API_BASE_URL.toHttpUrlOrNull() ?: return BuildConfig.API_BASE_URL
        return origin(url)
    }

    /** Returns false when [raw] is not a usable http(s) address. */
    fun save(raw: String): Boolean {
        var text = raw.trim()
        if (text.isEmpty()) return false
        if (!text.startsWith("http://", true) && !text.startsWith("https://", true)) text = "http://$text"
        val url = text.toHttpUrlOrNull() ?: return false
        if (url.host.isBlank()) return false
        prefs.edit().putString(KEY_URL, origin(url)).apply()
        override = origin(url).toHttpUrlOrNull()
        return true
    }

    fun reset() {
        prefs.edit().remove(KEY_URL).apply()
        override = null
    }

    private fun origin(url: HttpUrl): String = "${url.scheme}://${url.host}:${url.port}"

    private companion object {
        const val KEY_URL = "base_url"
    }
}
