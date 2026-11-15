package com.testmarking.app.util

import android.widget.ImageView
import coil.load
import com.testmarking.app.BuildConfig
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

/** The picture of a user as an address the phone can load, or null when he has none ("base_avatar" is the placeholder of the server). */
fun avatarAddress(raw: String?): String? {
    val value = raw?.trim().orEmpty()
    if (value.isEmpty() || value == "base_avatar") return null
    if (value.startsWith("http://") || value.startsWith("https://")) return value
    val base = BuildConfig.API_BASE_URL.toHttpUrlOrNull() ?: return null
    return "${base.scheme}://${base.host}:${base.port}${if (value.startsWith("/")) value else "/$value"}"
}

/** Shows the picture in [this]; the letter view behind it stays visible while there is none (or it cannot be loaded). */
fun ImageView.loadAvatar(raw: String?) {
    val address = avatarAddress(raw)
    if (address == null) {
        setImageDrawable(null)
        visibility = android.view.View.GONE
        return
    }
    visibility = android.view.View.VISIBLE
    load(address) {
        crossfade(true)
        listener(onError = { _, _ -> visibility = android.view.View.GONE })
    }
}
