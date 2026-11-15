package com.testmarking.app.ui.paper

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.testmarking.app.R
import com.testmarking.app.databinding.FragmentPaperBinding
import com.testmarking.app.util.applyStatusBarInset
import com.testmarking.app.util.collectOnStarted
import com.testmarking.app.util.show
import org.koin.androidx.viewmodel.ext.android.viewModel
import org.koin.core.parameter.parametersOf
import java.util.Locale

/** Teacher: the paper of one student after marking, nothing else: green = right, red = wrong, yellow = the right option he missed. */
class PaperFragment : Fragment() {
    private var _binding: FragmentPaperBinding? = null
    private val binding get() = _binding!!
    private val viewModel: PaperViewModel by viewModel {
        parametersOf(requireArguments().getString("examId").orEmpty(), requireArguments().getString("resultId").orEmpty())
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentPaperBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        binding.header.applyStatusBarInset()
        binding.tvTitle.text = requireArguments().getString("title").takeUnless { it.isNullOrBlank() } ?: getString(R.string.paper_title)
        binding.btnBack.setOnClickListener { findNavController().popBackStack() }
        binding.list.layoutManager = LinearLayoutManager(requireContext())
        collectOnStarted(viewModel.state) { s ->
            val b = _binding ?: return@collectOnStarted
            b.progress.visibility = if (s.loading) View.VISIBLE else View.INVISIBLE
            b.tvError.show(s.error != null)
            b.tvError.text = s.error.orEmpty()
            val p = s.paper ?: return@collectOnStarted
            val r = p.result
            val vi = Locale("vi", "VN")
            val score = r?.totalScore?.let { String.format(vi, "%.2f", it) } ?: "—"
            val max = p.maxScore?.let { String.format(vi, "%.2f", it) } ?: "—"
            val lines = ArrayList<String>()
            lines.add(getString(R.string.paper_score, score, max, r?.totalCorrect ?: 0, r?.totalQuestions ?: p.answers.orEmpty().size))
            r?.testCode?.takeIf { it.isNotBlank() }?.let { lines.add(getString(R.string.paper_test_code, it)) }
            if (r?.isViolation == true) lines.add(getString(R.string.grade_saved_violation))
            b.tvSummary.text = lines.joinToString("\n")
            b.list.adapter = PaperAdapter(p.answers.orEmpty())
        }
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}
