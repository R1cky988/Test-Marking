package com.testmarking.app.ui.exams

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.annotation.StringRes
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.snackbar.Snackbar
import com.testmarking.app.R
import com.testmarking.app.data.ExamItemDto
import com.testmarking.app.databinding.FragmentExamsBinding
import com.testmarking.app.repository.SCOPE_STUDENT
import com.testmarking.app.repository.SCOPE_TEACHER
import com.testmarking.app.ui.classes.ExamAdapter
import com.testmarking.app.ui.classes.ExamRow
import com.testmarking.app.ui.exam.ExamOpener
import com.testmarking.app.util.applyStatusBarInset
import com.testmarking.app.util.collectOnStarted
import com.testmarking.app.util.show
import org.koin.androidx.viewmodel.ext.android.viewModel
import org.koin.core.parameter.parametersOf

/** Exams of every class in one place: the ones I created (I am the teacher) and the ones of the classes I joined (I am a student). */
class ExamsFragment : Fragment() {
    private var _binding: FragmentExamsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ExamsViewModel by viewModel { parametersOf(SCOPE_TEACHER) }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentExamsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        binding.header.applyStatusBarInset()
        val adapter = ExamAdapter { exam -> ExamOpener.open(this, exam, viewModel.state.value.scope == SCOPE_TEACHER, R.id.action_exams_to_exam_manage, R.id.action_exams_to_take_exam) }
        binding.list.layoutManager = LinearLayoutManager(requireContext())
        binding.list.adapter = adapter
        binding.swipe.setOnRefreshListener { viewModel.refresh() }
        binding.btnRetry.setOnClickListener { viewModel.refresh() }
        binding.fab.setOnClickListener { findNavController().navigate(R.id.action_exams_to_create_exam) }

        binding.toggleScope.check(if (viewModel.state.value.scope == SCOPE_STUDENT) R.id.btnScopeStudent else R.id.btnScopeTeacher)
        binding.toggleScope.addOnButtonCheckedListener { _, checkedId, isChecked ->
            if (isChecked) viewModel.setScope(if (checkedId == R.id.btnScopeStudent) SCOPE_STUDENT else SCOPE_TEACHER)
        }

        collectOnStarted(viewModel.state) { s ->
            val b = _binding ?: return@collectOnStarted
            val teacher = s.scope == SCOPE_TEACHER
            val rows = rowsOf(s.items, teacher)
            adapter.submitList(rows)
            b.swipe.isRefreshing = s.loading
            b.fab.show(teacher)
            val empty = !s.loading && rows.isEmpty()
            b.emptyState.show(empty)
            if (empty) {
                if (s.error != null) {
                    b.tvEmptyTitle.text = s.error
                    b.tvEmptyHint.show(false)
                    b.btnRetry.show(true)
                } else {
                    b.tvEmptyTitle.setText(if (teacher) R.string.exams_tab_empty_teacher else R.string.exams_tab_empty_student)
                    b.tvEmptyHint.setText(if (teacher) R.string.exams_tab_empty_teacher_hint else R.string.exams_tab_empty_student_hint)
                    b.tvEmptyHint.show(true)
                    b.btnRetry.show(false)
                }
            } else if (s.error != null) {
                Snackbar.make(b.root, s.error, Snackbar.LENGTH_LONG).show()
            }
        }
    }

    /** Running first, then the coming ones, then the finished (and cancelled) ones; drafts last, only for the teacher. */
    private fun rowsOf(items: List<ExamItemDto>, teacher: Boolean): List<ExamRow> {
        val rows = ArrayList<ExamRow>()
        fun section(@StringRes title: Int, list: List<ExamItemDto>) {
            if (list.isEmpty()) return
            rows.add(ExamRow.Header(title, list.size))
            list.forEach { rows.add(ExamRow.Item(it)) }
        }
        section(R.string.exams_section_ongoing, items.filter { it.status == "ONGOING" }.sortedBy { it.toTime })
        section(R.string.exams_section_upcoming, items.filter { it.status == "UPCOMING" }.sortedBy { it.fromTime })
        section(R.string.exams_section_ended, items.filter { it.status == "COMPLETED" || it.status == "CANCELLED" }.sortedByDescending { it.toTime })
        if (teacher) section(R.string.exams_section_draft, items.filter { it.status == "DRAFT" })
        return rows
    }

    /** A new exam was created on the next screen: show it when we come back. */
    override fun onResume() {
        super.onResume()
        if (!viewModel.state.value.loading) viewModel.refresh()
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}
