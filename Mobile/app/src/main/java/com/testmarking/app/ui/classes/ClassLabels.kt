package com.testmarking.app.ui.classes

import android.content.Context
import com.testmarking.app.R

/** Words for the codes the server sends. */
object ClassLabels {
    fun format(context: Context, format: String?): String = context.getString(
        when (format?.uppercase()) {
            "ONLINE" -> R.string.format_online
            "SUBMIT" -> R.string.format_submit
            "OFFLINE" -> R.string.format_offline
            else -> R.string.format_unknown
        },
    )

    fun examStatus(context: Context, status: String?): String = context.getString(
        when (status?.uppercase()) {
            "DRAFT" -> R.string.status_draft
            "UPCOMING" -> R.string.status_upcoming
            "ONGOING" -> R.string.status_ongoing
            "COMPLETED" -> R.string.status_completed
            "CANCELLED" -> R.string.status_cancelled
            else -> R.string.format_unknown
        },
    )
}
