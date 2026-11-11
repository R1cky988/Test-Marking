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
        adapter = ParticipantAdapter(onUnlock = { viewModel.unlock(it.studentId.orEmpty()) }, onDecide = { askDecision(it) })
        binding.list.layoutManager = LinearLayoutManager(requireContext())
        binding.list.adapter = adapter

        collectOnStarted(viewModel.state) { s ->
            val b = _binding ?: return@collectOnStarted
            b.progress.visibility = if (s.loading || s.unlocking != null) View.VISIBLE else View.INVISIBLE
            b.tvError.show(s.error != null)
            b.tvError.text = s.error.orEmpty()
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

    /** The teacher decides a paper reported for leaving the exam screen: 0 points, minus points, or nothing. */
    private fun askDecision(p: com.testmarking.app.data.ParticipantDto) {
        val id = p.studentId.orEmpty()
        val items = arrayOf(getString(R.string.manage_decide_zero), getString(R.string.manage_decide_deduct), getString(R.string.manage_decide_dismiss))
        com.google.android.material.dialog.MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.manage_decide_title, p.fullName.orEmpty()))
            .setMessage(getString(R.string.manage_line_flag, p.flagReason.orEmpty()))
            .setItems(items) { _, which ->
                when (which) {
                    0 -> viewModel.decide(id, "ZERO")
                    1 -> askPenalty(id)
                    else -> viewModel.decide(id, "DISMISS")
                }
            }
            .setNegativeButton(R.string.common_cancel, null)
            .show()
    }

    private fun askPenalty(studentId: String) {
        val input = android.widget.EditText(requireContext()).apply {
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL
            hint = getString(R.string.manage_penalty_hint)
        }
        com.google.android.material.dialog.MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.manage_decide_deduct)
            .setView(input)
            .setPositiveButton(R.string.common_confirm) { _, _ ->
                val points = input.text.toString().replace(',', '.').toDoubleOrNull()
                if (points == null || points <= 0) {
                    Toast.makeText(requireContext(), R.string.manage_penalty_invalid, Toast.LENGTH_LONG).show()
                } else {
                    viewModel.decide(studentId, "DEDUCT", points)
                }
            }
            .setNegativeButton(R.string.common_cancel, null)
            .show()
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
