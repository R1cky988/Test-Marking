package com.testmarking.app.ui.exam

import android.content.Context
import androidx.annotation.IdRes
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.testmarking.app.R
import com.testmarking.app.data.ExamItemDto
import com.testmarking.app.ui.classes.ClassLabels
import com.testmarking.app.util.TimeFormat

/** What tapping an exam does, the same in the exams tab and in a class. */
object ExamOpener {
    /**
     * Teacher: the detail of the exam (who is where, grading, unlock). Student: an ONLINE exam is taken on the phone.
     * Anything else only shows the information. [manageAction] / [takeAction] are the navigation actions of the screen we are on.
     */
    fun open(fragment: Fragment, exam: ExamItemDto, teacher: Boolean, @IdRes manageAction: Int, @IdRes takeAction: Int) {
        val id = exam.id
        if (id.isNullOrBlank()) return showInfo(fragment.requireContext(), exam)
        val nav = fragment.findNavController()
        when {
            teacher && exam.status != "DRAFT" -> nav.navigate(manageAction, bundleOf("examId" to id, "examName" to exam.name.orEmpty()))
            !teacher && exam.format.equals("ONLINE", ignoreCase = true) && exam.status != "CANCELLED" && exam.status != "DRAFT" ->
                nav.navigate(takeAction, bundleOf("examId" to id))
            else -> showInfo(fragment.requireContext(), exam)
        }
    }

    fun showInfo(context: Context, exam: ExamItemDto) {
        val lines = ArrayList<String>()
        exam.className?.takeIf { it.isNotBlank() }?.let { lines.add(it) }
        exam.subject?.takeIf { it.isNotBlank() }?.let { lines.add(it) }
        lines.add(ClassLabels.format(context, exam.format))
        lines.add(ClassLabels.examStatus(context, exam.status))
        lines.add(context.getString(R.string.exams_from, TimeFormat.dateTime(exam.fromTime)))
        lines.add(context.getString(R.string.exams_to, TimeFormat.dateTime(exam.toTime)))
        exam.durationMinutes?.let { lines.add(context.getString(R.string.exams_duration, it)) }
        exam.isScorePublished?.let { lines.add(context.getString(if (it) R.string.exams_published else R.string.exams_not_published)) }
        MaterialAlertDialogBuilder(context)
            .setTitle(exam.name.orEmpty())
            .setMessage(lines.joinToString("\n"))
            .setPositiveButton(R.string.common_confirm, null)
            .show()
    }
}
