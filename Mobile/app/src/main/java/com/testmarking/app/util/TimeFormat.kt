package com.testmarking.app.util

import android.content.Context
import com.testmarking.app.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** The server sends ISO-8601 with an offset ("2026-11-04T15:00:00+07:00" or "...Z"). minSdk 24 has no java.time. */
object TimeFormat {
    private val FRACTION = Regex("""\.\d+""")
    private val VN = Locale("vi", "VN")

    fun parse(iso: String?): Date? {
        if (iso.isNullOrBlank()) return null
        val clean = FRACTION.replace(iso.trim(), "")
        return try {
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US).parse(clean)
        } catch (ignored: Exception) {
            null
        }
    }

    /** A moment as the server reads it: 2026-11-06T09:31:00+07:00. */
    fun iso(millis: Long): String = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US).format(Date(millis))

    /** 04/11/2026 15:00, or an em dash when there is no time. */
    fun dateTime(iso: String?): String {
        val date = parse(iso) ?: return "—"
        return SimpleDateFormat("dd/MM/yyyy HH:mm", VN).format(date)
    }

    /** "Vừa xong", "5 phút trước", ... and a plain date after a week. */
    fun relative(context: Context, iso: String?): String {
        val date = parse(iso) ?: return ""
        val diff = System.currentTimeMillis() - date.time
        val minutes = diff / 60_000
        return when {
            minutes < 1 -> context.getString(R.string.time_just_now)
            minutes < 60 -> context.getString(R.string.time_minutes_ago, minutes.toInt())
            minutes < 60 * 24 -> context.getString(R.string.time_hours_ago, (minutes / 60).toInt())
            minutes < 60 * 24 * 7 -> context.getString(R.string.time_days_ago, (minutes / (60 * 24)).toInt())
            else -> SimpleDateFormat("dd/MM/yyyy", VN).format(date)
        }
    }
}
