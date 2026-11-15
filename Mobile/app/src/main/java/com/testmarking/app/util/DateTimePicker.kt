package com.testmarking.app.util

import androidx.fragment.app.Fragment
import com.google.android.material.datepicker.MaterialDatePicker
import com.google.android.material.timepicker.MaterialTimePicker
import java.util.Calendar
import java.util.TimeZone
import com.google.android.material.timepicker.TimeFormat as ClockFormat

/** Picks a day, then a time (24 h), in the time zone of the phone. [onPicked] gets the moment in milliseconds. */
fun Fragment.pickDateTime(initialMs: Long?, onPicked: (Long) -> Unit) {
    val start = Calendar.getInstance().apply { timeInMillis = initialMs ?: System.currentTimeMillis() }
    // MaterialDatePicker works in UTC: hand it the UTC midnight of the local day
    val utcDay = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
        clear()
        set(start.get(Calendar.YEAR), start.get(Calendar.MONTH), start.get(Calendar.DAY_OF_MONTH))
    }
    val datePicker = MaterialDatePicker.Builder.datePicker().setSelection(utcDay.timeInMillis).build()
    datePicker.addOnPositiveButtonClickListener { picked ->
        val day = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply { timeInMillis = picked }
        val timePicker = MaterialTimePicker.Builder()
            .setTimeFormat(ClockFormat.CLOCK_24H)
            .setHour(start.get(Calendar.HOUR_OF_DAY))
            .setMinute(start.get(Calendar.MINUTE))
            .build()
        timePicker.addOnPositiveButtonClickListener {
            val result = Calendar.getInstance().apply {
                clear()
                set(day.get(Calendar.YEAR), day.get(Calendar.MONTH), day.get(Calendar.DAY_OF_MONTH), timePicker.hour, timePicker.minute, 0)
            }
            onPicked(result.timeInMillis)
        }
        timePicker.show(childFragmentManager, "time")
    }
    datePicker.show(childFragmentManager, "date")
}
