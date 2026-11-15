package com.testmarking.app.ui.exams

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.textfield.MaterialAutoCompleteTextView
import com.testmarking.app.R
import com.testmarking.app.data.ExamCreateBody
import com.testmarking.app.data.GenerateBody
import com.testmarking.app.databinding.FragmentCreateExamBinding
import com.testmarking.app.util.TimeFormat
import com.testmarking.app.util.applyStatusBarInset
import com.testmarking.app.util.collectOnStarted
import com.testmarking.app.util.hideKeyboard
import com.testmarking.app.util.pickDateTime
import com.testmarking.app.util.show
import org.koin.androidx.viewmodel.ext.android.viewModel

/** A new exam in one screen: details, times, how it is taken, sheet + bank, and the versions to draw from the bank. */
class CreateExamFragment : Fragment() {
    private var _binding: FragmentCreateExamBinding? = null
    private val binding get() = _binding!!
    private val viewModel: CreateExamViewModel by viewModel()
    private var optionsShown = false

    private val format: String
        get() = when (binding.toggleFormat.checkedButtonId) {
            R.id.btnFormatSubmit -> "SUBMIT"
            R.id.btnFormatOnline -> "ONLINE"
            else -> "OFFLINE"
        }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentCreateExamBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        optionsShown = false
        binding.header.applyStatusBarInset()
        binding.btnBack.setOnClickListener { findNavController().popBackStack() }

        if (binding.toggleFormat.checkedButtonId == View.NO_ID) binding.toggleFormat.check(R.id.btnFormatOffline)
        if (binding.toggleLeave.checkedButtonId == View.NO_ID) binding.toggleLeave.check(R.id.btnLeaveFlag)
        binding.toggleFormat.addOnButtonCheckedListener { _, _, isChecked -> if (isChecked) onFormatChanged() }
        onFormatChanged()

        // open book: the leave of the screen is no violation and the result is shown at once; closed book: the other way round
        binding.switchReference.setOnCheckedChangeListener { _, checked ->
            binding.switchShowResult.isChecked = checked
            binding.groupLeave.show(!checked)
        }
        binding.groupLeave.show(!binding.switchReference.isChecked)

        showTimes()
        binding.etFrom.setOnClickListener { pickDateTime(viewModel.fromMs) { viewModel.fromMs = it; showTimes() } }
        binding.etTo.setOnClickListener { pickDateTime(viewModel.toMs ?: viewModel.fromMs) { viewModel.toMs = it; showTimes() } }
        binding.btnSaveDraft.setOnClickListener { submit(publish = false) }
        binding.btnPublish.setOnClickListener { submit(publish = true) }

        collectOnStarted(viewModel.state) { render(it) }
        collectOnStarted(viewModel.done) { published ->
            Toast.makeText(requireContext(), if (published) R.string.create_done_published else R.string.create_done_draft, Toast.LENGTH_LONG).show()
            findNavController().popBackStack()
        }
    }

    private fun showTimes() {
        viewModel.fromMs?.let { binding.etFrom.setText(TimeFormat.dateTime(TimeFormat.iso(it))) }
        viewModel.toMs?.let { binding.etTo.setText(TimeFormat.dateTime(TimeFormat.iso(it))) }
    }

    private fun onFormatChanged() {
        val b = binding
        val online = format == "ONLINE"
        b.groupOnline.show(online)
        b.tilTemplate.show(!online)
        b.tilDuration.hint = getString(if (online) R.string.create_duration_online else R.string.create_duration)
        b.tvFormatHint.setText(
            when (format) {
                "ONLINE" -> R.string.create_format_hint_online
                "SUBMIT" -> R.string.create_format_hint_submit
                else -> R.string.create_format_hint_offline
            },
        )
    }

    private fun render(s: CreateState) {
        val b = _binding ?: return
        b.progress.visibility = if (s.loading || s.saving) View.VISIBLE else View.INVISIBLE
        b.btnSaveDraft.isEnabled = !s.loading && !s.saving && s.options != null
        b.btnPublish.isEnabled = b.btnSaveDraft.isEnabled
        showError(s.error)
        val options = s.options ?: return
        if (optionsShown) return
        optionsShown = true

        val classes = options.classes
        fill(b.acClass, classes.map { it.className.orEmpty() }, classes.indexOfFirst { it.id == viewModel.classId }) { viewModel.classId = classes[it].id }
        if (classes.isEmpty()) showError(getString(R.string.create_class_none))
        val templates = options.templates
        fill(b.acTemplate, templates.map { t -> t.name.orEmpty() + (t.totalQuestions?.let { " ($it câu)" } ?: "") }, templates.indexOfFirst { it.uuid == viewModel.templateId }) { viewModel.templateId = templates[it].uuid }
        val banks = options.banks
        fill(b.acBank, banks.map { it.name.orEmpty() + (it.itemsCount?.let { n -> " ($n câu)" } ?: "") }, banks.indexOfFirst { it.id == viewModel.bankId }) {
            viewModel.bankId = banks[it].id
            showBankHint()
        }
        showBankHint()
    }

    private fun fill(view: MaterialAutoCompleteTextView, names: List<String>, selected: Int, onPick: (Int) -> Unit) {
        view.setAdapter(ArrayAdapter(requireContext(), android.R.layout.simple_list_item_1, names))
        if (selected >= 0) view.setText(names[selected], false)
        view.setOnItemClickListener { _, _, position, _ -> onPick(position) }
    }

    private fun showBankHint() {
        val bank = viewModel.state.value.options?.banks?.firstOrNull { it.id == viewModel.bankId }
        val c = bank?.difficultyCounts
        binding.tvBankHint.text = if (c == null) "" else getString(R.string.create_bank_available, c.easy ?: 0, c.medium ?: 0, c.hard ?: 0)
    }

    private fun showError(message: String?) {
        binding.tvError.show(!message.isNullOrBlank())
        binding.tvError.text = message.orEmpty()
    }

    private fun intOf(text: CharSequence?): Int = text?.toString()?.trim()?.toIntOrNull() ?: 0

    private fun submit(publish: Boolean) {
        hideKeyboard()
        val b = binding
        val state = viewModel.state.value
        val online = format == "ONLINE"
        val name = b.etName.text?.toString().orEmpty().trim()
        val from = viewModel.fromMs
        val to = viewModel.toMs
        val duration = b.etDuration.text?.toString()?.trim()?.toIntOrNull()
        val count = intOf(b.etCount.text)
        val easy = intOf(b.etEasy.text)
        val medium = intOf(b.etMedium.text)
        val hard = intOf(b.etHard.text)
        val bank = state.options?.banks?.firstOrNull { it.id == viewModel.bankId }
        val template = state.options?.templates?.firstOrNull { it.uuid == viewModel.templateId }

        val error: String? = when {
            name.isEmpty() -> getString(R.string.create_err_name)
            viewModel.classId == null -> getString(R.string.create_err_class)
            from == null -> getString(R.string.create_err_from)
            to == null -> getString(R.string.create_err_to)
            to <= from -> getString(R.string.create_err_order)
            online && (duration == null || duration < 1) -> getString(R.string.create_err_duration)
            online && duration != null && duration > (to - from) / 60_000 -> getString(R.string.create_err_duration_long)
            !online && viewModel.templateId == null -> getString(R.string.create_err_template)
            publish && count < 1 -> getString(R.string.create_err_publish_versions)
            count > 0 && bank == null -> getString(R.string.create_err_bank)
            count > 0 && easy + medium + hard < 1 -> getString(R.string.create_err_counts)
            count > 0 && bank?.difficultyCounts != null && (easy > (bank.difficultyCounts.easy ?: 0) || medium > (bank.difficultyCounts.medium ?: 0) || hard > (bank.difficultyCounts.hard ?: 0)) ->
                getString(R.string.create_err_counts_bank, bank.difficultyCounts.easy ?: 0, bank.difficultyCounts.medium ?: 0, bank.difficultyCounts.hard ?: 0)
            count > 0 && !online && template?.totalQuestions != null && easy + medium + hard > template.totalQuestions ->
                getString(R.string.create_err_counts_template, easy + medium + hard, template.totalQuestions)
            else -> null
        }
        if (error != null) return showError(error)
        showError(null)

        val reference = online && b.switchReference.isChecked
        val body = ExamCreateBody(
            name = name,
            subject = b.etSubject.text?.toString()?.trim()?.ifEmpty { null },
            classId = viewModel.classId.orEmpty(),
            format = format,
            fromTime = TimeFormat.iso(from!!),
            toTime = TimeFormat.iso(to!!),
            durationMinutes = duration?.takeIf { it > 0 },
            templateId = if (online) null else viewModel.templateId,
            questionBankId = viewModel.bankId,
            showResultImmediately = if (online) b.switchShowResult.isChecked else null,
            allowReference = if (online) reference else null,
            leavePolicy = if (online && !reference) (if (b.toggleLeave.checkedButtonId == R.id.btnLeaveLock) "LOCK" else "FLAG") else null,
        )
        viewModel.submit(body, if (count > 0) GenerateBody(count, easy, medium, hard) else null, publish)
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}
