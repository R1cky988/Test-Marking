package com.testmarking.app.ui.exam

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.testmarking.app.R
import com.testmarking.app.databinding.FragmentExamManageBinding
import com.testmarking.app.ui.classes.ClassLabels
import com.testmarking.app.util.TimeFormat
import com.testmarking.app.util.applyStatusBarInset
import com.testmarking.app.util.collectOnStarted
import com.testmarking.app.util.show
import org.koin.androidx.viewmodel.ext.android.viewModel
import org.koin.core.parameter.parametersOf

/** Teacher: the exam, who is where, when each paper was marked or synced, and the unlock button of a locked exam. */
class ExamManageFragment : Fragment() {
    private var _binding: FragmentExamManageBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ExamManageViewModel by viewModel { parametersOf(requireArguments().getString("examId").orEmpty()) }
    private lateinit var adapter: ParticipantAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentExamManageBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        binding.header.applyStatusBarInset()
        binding.tvTitle.text = requireArguments().getString("examName").takeUnless { it.isNullOrBlank() } ?: getString(R.string.manage_title)
        binding.btnBack.setOnClickListener { findNavController().popBackStack() }
        adapter = ParticipantAdapter { viewModel.unlock(it.studentId.orEmpty()) }
        binding.list.layoutManager = LinearLayoutManager(requireContext())
        binding.list.adapter = adapter

        collectOnStarted(viewModel.state) { s ->
            val b = _binding ?: return@collectOnStarted
            b.progress.visibility = if (s.loading || s.unlocking != null) View.VISIBLE else View.INVISIBLE
            b.tvError.show(s.error != null)
            b.tvError.text = s.error.orEmpty()
            // Papers (OFFLINE and SUBMIT exams) are marked from a photo of the sheet; an ONLINE exam is marked by the server alone.
            val grading = s.detail?.takeIf { !it.format.equals("ONLINE", ignoreCase = true) }
            b.btnGrade.show(grading != null)
            b.btnGrade.setOnClickListener {
                val d = grading ?: return@setOnClickListener
                if (d.templateId.isNullOrBlank()) {
                    Toast.makeText(requireContext(), R.string.grade_no_template, Toast.LENGTH_LONG).show()
                } else {
                    findNavController().navigate(
                        R.id.action_exam_manage_to_grade,
                        androidx.core.os.bundleOf("examId" to d.id.orEmpty().ifBlank { requireArguments().getString("examId").orEmpty() }, "templateId" to d.templateId, "examName" to d.name.orEmpty()),
                    )
                }
            }
            s.detail?.let { d ->
                b.tvInfo.text = getString(R.string.manage_info, ClassLabels.format(requireContext(), d.format), TimeFormat.dateTime(d.fromTime), TimeFormat.dateTime(d.toTime))
            }
            adapter.unlocking = s.unlocking
            adapter.submitList(s.participants)
            s.message?.let {
                Toast.makeText(requireContext(), it, Toast.LENGTH_LONG).show()
                viewModel.messageShown()
            }
        }
    }

    /** A student may have locked or synced meanwhile: refresh when the teacher comes back to the screen. */
    override fun onResume() {
        super.onResume()
        if (!viewModel.state.value.loading) viewModel.load()
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}
