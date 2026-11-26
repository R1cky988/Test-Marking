package com.testmarking.app.ui.exam

import android.content.Context
import androidx.annotation.IdRes
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.testmarking.app.R
import androidx.lifecycle.lifecycleScope
import com.testmarking.app.data.ExamApi
import com.testmarking.app.data.ExamItemDto
import com.testmarking.app.network.apiCall
import com.testmarking.app.network.requireData
import kotlinx.coroutines.launch
import org.koin.android.ext.android.get
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
            !teacher && exam.format.equals("SUBMIT", ignoreCase = true) && exam.status != "CANCELLED" && exam.status != "DRAFT" ->
                openSubmit(fragment, exam, id)
            else -> showInfo(fragment.requireContext(), exam)
        }
    }

    /**
     * Student, SUBMIT exam: the exam with what he can do now. He may photograph his sheet only while the exam is running and the
     * teacher has not published the results; the state comes from the server (my_submitted, results_released).
     */
    private fun openSubmit(fragment: Fragment, exam: ExamItemDto, id: String) {
        val ctx = fragment.requireContext()
        fragment.viewLifecycleOwner.lifecycleScope.launch {
            val api: ExamApi = fragment.get()
            val detail = apiCall { api.detail(id).requireData() }.getOrNull()
            val released = detail?.resultsReleased == true || exam.isScorePublished == true
            val sent = detail?.mySubmitted == true
            val open = (detail?.status ?: exam.status) == "ONGOING" && !released
            val goGrade = {
                fragment.findNavController().navigate(
                    R.id.gradeFragment,
                    bundleOf("examId" to id, "examName" to exam.name.orEmpty(), "mode" to "student"),
                )
            }
            // already handed in: say how many retakes are left; no more retakes -> wait for the teacher
            if (sent && !released) {
                val left = if (open) (detail?.retakesLeft ?: 0) else 0
                val builder = MaterialAlertDialogBuilder(ctx).setTitle(exam.name.orEmpty())
                if (left > 0) {
                    builder.setMessage(ctx.getString(R.string.submit_sent_retake, left))
                        .setPositiveButton(R.string.submit_action_again) { _, _ -> goGrade() }
                        .setNegativeButton(R.string.common_back, null)
                } else {
                    builder.setMessage(R.string.submit_sent_done).setNegativeButton(R.string.common_back, null)
                }
                builder.show()
                return@launch
            }
            val lines = ArrayList<String>()
            exam.subject?.takeIf { it.isNotBlank() }?.let { lines.add(it) }
            lines.add(ClassLabels.examStatus(ctx, detail?.status ?: exam.status))
            lines.add(ctx.getString(R.string.exams_from, TimeFormat.dateTime(exam.fromTime)))
            lines.add(ctx.getString(R.string.exams_to, TimeFormat.dateTime(exam.toTime)))
            lines.add(ctx.getString(R.string.submit_not_sent))
            if (released) lines.add(ctx.getString(R.string.submit_released)) else if (!open) lines.add(ctx.getString(R.string.submit_closed))
            val dialog = MaterialAlertDialogBuilder(ctx).setTitle(exam.name.orEmpty()).setMessage(lines.joinToString("\n"))
                .setNegativeButton(R.string.common_back, null)
            if (open) {
                dialog.setPositiveButton(R.string.submit_action) { _, _ -> goGrade() }
            }
            dialog.show()
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
