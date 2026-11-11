package com.testmarking.app.ui.exam

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.CompoundButton
import androidx.activity.OnBackPressedCallback
import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import com.google.android.material.checkbox.MaterialCheckBox
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.radiobutton.MaterialRadioButton
import com.testmarking.app.R
import com.testmarking.app.data.local.AttemptStatus
import com.testmarking.app.databinding.FragmentTakeExamBinding
import com.testmarking.app.util.TimeFormat
import com.testmarking.app.util.applyStatusBarInset
import com.testmarking.app.util.collectOnStarted
import com.testmarking.app.util.show
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.koin.androidx.viewmodel.ext.android.viewModel
import org.koin.core.parameter.parametersOf
import java.util.Locale

/** The student's side of an online exam. All the rules are in [TakeExamViewModel]; this screen only draws them. */
class TakeExamFragment : Fragment() {
    private var _binding: FragmentTakeExamBinding? = null
    private val binding get() = _binding!!
    private val viewModel: TakeExamViewModel by viewModel { parametersOf(requireArguments().getString("examId").orEmpty()) }

    /** the question the options were drawn for, so a tick does not redraw them */
    private var drawnKey: String? = null
    private var ticks = 0

    private val backCallback = object : OnBackPressedCallback(false) {
        override fun handleOnBackPressed() = confirmLeave()
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentTakeExamBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        binding.header.applyStatusBarInset()
        // no screenshots of the questions, and the screen stays on while the student works
        requireActivity().window.addFlags(WindowManager.LayoutParams.FLAG_SECURE or WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        requireActivity().onBackPressedDispatcher.addCallback(viewLifecycleOwner, backCallback)

        binding.btnBack.setOnClickListener { if (backCallback.isEnabled) confirmLeave() else findNavController().popBackStack() }
        binding.btnStart.setOnClickListener { viewModel.start() }
        binding.btnPrev.setOnClickListener { viewModel.state.value.attempt?.let { viewModel.goTo(it.currentIndex - 1) } }
        binding.btnNext.setOnClickListener {
            val s = viewModel.state.value
            val a = s.attempt ?: return@setOnClickListener
            if (s.allowReference) viewModel.goTo(a.currentIndex + 1) else viewModel.next()
        }
        binding.btnSubmit.setOnClickListener { confirmSubmit() }
        binding.btnMessage.setOnClickListener { viewModel.syncQuietly() }

        collectOnStarted(viewModel.state) { render(it) }
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                while (true) {
                    onTick()
                    delay(1000)
                }
            }
        }
    }

    /** The student left the exam screen (home button, another app, screen off). A rotation is not leaving. */
    override fun onStop() {
        super.onStop()
        if (!requireActivity().isChangingConfigurations) viewModel.onLeftScreen()
    }

    override fun onDestroyView() {
        requireActivity().window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE or WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        _binding = null
        super.onDestroyView()
    }

    // ------------------------------------------------------------------ clock

    private fun onTick() {
        val b = _binding ?: return
        viewModel.tick()
        ticks++
        val s = viewModel.state.value
        val a = s.attempt ?: return
        val now = System.currentTimeMillis()
        when (a.status) {
            AttemptStatus.IN_PROGRESS -> {
                val ms = if (!s.allowReference && a.questionDeadlineMs > 0) a.questionDeadlineMs - now else a.deadlineMs - now
                b.tvClock.text = clock(ms)
                b.tvClock.show(true)
                if (ticks % 15 == 0) viewModel.syncQuietly()      // heartbeat: progress and leaves reach the server
            }
            AttemptStatus.LOCKED -> if (ticks % 5 == 0) viewModel.syncQuietly()   // waits for the teacher's unlock
            AttemptStatus.FINISHED -> if (ticks % 10 == 0) viewModel.syncQuietly()
        }
        val offline = !isOnline()
        b.tvNotice.show(offline && (a.status == AttemptStatus.IN_PROGRESS || a.status == AttemptStatus.FINISHED))
        b.tvNotice.setText(R.string.take_offline_notice)
    }

    private fun clock(ms: Long): String {
        val total = (ms.coerceAtLeast(0) + 999) / 1000
        return String.format(Locale.US, "%02d:%02d", total / 60, total % 60)
    }

    @Suppress("DEPRECATION")
    private fun isOnline(): Boolean {
        val cm = requireContext().getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return true
        val caps = cm.getNetworkCapabilities(cm.activeNetwork ?: return false) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    // ------------------------------------------------------------------ drawing

    private fun render(s: TakeState) {
        val b = _binding ?: return
        b.tvTitle.text = s.paper?.examName ?: s.detail?.name ?: getString(R.string.take_title)
        b.progress.visibility = if (s.loading || s.starting) View.VISIBLE else View.INVISIBLE
        val a = s.attempt
        val status = a?.status
        backCallback.isEnabled = status == AttemptStatus.IN_PROGRESS && !s.allowReference
        b.tvClock.show(status == AttemptStatus.IN_PROGRESS)
        b.groupIntro.show(!s.loading && a == null)
        b.groupTaking.show(status == AttemptStatus.IN_PROGRESS)
        b.groupMessage.show(status == AttemptStatus.LOCKED || status == AttemptStatus.FINISHED || status == AttemptStatus.SYNCED)
        if (a == null) {
            renderIntro(s)
            return
        }
        when (status) {
            AttemptStatus.IN_PROGRESS -> renderQuestion(s)
            AttemptStatus.LOCKED -> message(
                R.drawable.ic_lock, getString(R.string.take_locked_title),
                getString(R.string.take_locked_body, a.lockReason ?: ""), null,
            )
            AttemptStatus.FINISHED -> message(
                R.drawable.ic_check, getString(R.string.take_waiting_title),
                getString(R.string.take_waiting_body) + (if (a.lockReason != null) "\n\n" + getString(R.string.take_waiting_locked) else "") +
                    (a.lastError?.let { "\n\n" + getString(R.string.take_sync_error, it) } ?: ""),
                getString(R.string.take_sync_now),
            )
            AttemptStatus.SYNCED -> renderDone(s)
        }
    }

    private fun renderIntro(s: TakeState) {
        val b = binding
        val d = s.detail
        val dur = d?.durationMinutes ?: 0
        b.tvIntroMeta.text = buildString {
            append(getString(R.string.take_meta, d?.subject.orEmpty(), dur))
            append("\n").append(getString(R.string.exams_from, TimeFormat.dateTime(d?.fromTime)))
            append("\n").append(getString(R.string.exams_to, TimeFormat.dateTime(d?.toTime)))
        }
        b.tvIntroRules.text = buildString {
            if (d?.allowReference == true) {
                append(getString(R.string.take_rules_reference))
            } else {
                append(getString(R.string.take_rules_closed)).append("\n")
                append(getString(if (d?.leavePolicy == "LOCK") R.string.take_rules_lock else R.string.take_rules_flag))
            }
            append("\n").append(getString(R.string.take_rules_offline))
        }
        b.tvIntroError.show(s.error != null)
        b.tvIntroError.text = s.error.orEmpty()
        b.btnStart.isEnabled = !s.starting && d != null
        b.btnStart.setText(R.string.take_start)
    }

    private fun renderQuestion(s: TakeState) {
        val b = binding
        val a = s.attempt ?: return
        val qs = s.questions
        val q = qs.getOrNull(a.currentIndex) ?: return
        val multiple = q.type.equals("MULTIPLE", ignoreCase = true)
        b.tvQuestionNo.text = getString(R.string.take_question_no, a.currentIndex + 1, qs.size)
        b.tvQuestion.text = q.content.orEmpty()
        b.tvHint.text = getString(if (multiple) R.string.take_hint_multiple else R.string.take_hint_single) +
            (if (!s.allowReference) "\n" + getString(R.string.take_hint_forward_only) else "")

        val chosen = a.answers[q.order].orEmpty().split(",").filter { it.isNotBlank() }.toSet()
        val key = "${q.order}|${chosen.sorted()}"
        if (key != drawnKey) {
            drawnKey = key
            b.optionsBox.removeAllViews()
            for (o in q.options.orEmpty()) {
                val label = o.label.orEmpty()
                val v: CompoundButton = if (multiple) MaterialCheckBox(requireContext()) else MaterialRadioButton(requireContext())
                v.text = "$label. ${o.content.orEmpty()}"
                v.textSize = 16f
                v.isChecked = label in chosen
                v.setPadding(8, 16, 8, 16)
                v.setOnClickListener { viewModel.choose(q.order, label, multiple) }
                b.optionsBox.addView(v, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
            }
        }

        val last = a.currentIndex >= qs.size - 1
        if (s.allowReference) {
            b.btnPrev.show(true)
            b.btnPrev.isEnabled = a.currentIndex > 0
            b.btnNext.show(true)
            b.btnNext.isEnabled = !last
            b.btnSubmit.show(true)
        } else {
            b.btnPrev.show(false)           // forward only
            b.btnNext.show(!last)
            b.btnSubmit.show(last)
        }
    }

    private fun renderDone(s: TakeState) {
        val a = s.attempt ?: return
        val result = viewModel.result()
        val row = result?.detail?.result
        val syncedText = getString(R.string.take_done_synced, TimeFormat.dateTime(row?.syncedAt ?: TimeFormat.iso(a.syncedAtMs)))
        val body = when {
            result?.pendingReview == true -> syncedText + "\n" + getString(R.string.take_done_pending_review)
            row == null -> syncedText + "\n" + getString(R.string.take_done_not_released)
            row.isViolation == true -> syncedText + "\n" + getString(R.string.take_done_violation, row.violationReason.orEmpty())
            else -> syncedText + "\n" + getString(
                R.string.take_done_score, scoreText(row.totalScore), scoreText(result?.detail?.maxScore),
                row.totalCorrect ?: 0, row.totalQuestions ?: 0,
            )
        }
        message(R.drawable.ic_check, getString(R.string.take_done_title), body, null)
    }

    private fun scoreText(v: Double?): String = if (v == null) "—" else String.format(Locale("vi", "VN"), "%.2f", v).trimEnd('0').trimEnd(',')

    private fun message(icon: Int, title: String, body: String, button: String?) {
        val b = binding
        b.imgMessage.setImageResource(icon)
        b.tvMessageTitle.text = title
        b.tvMessageBody.text = body
        b.btnMessage.show(button != null)
        if (button != null) b.btnMessage.text = button
    }

    // ------------------------------------------------------------------ dialogs

    private fun confirmSubmit() {
        val s = viewModel.state.value
        val a = s.attempt ?: return
        val blank = s.questions.count { a.answers[it.order].isNullOrBlank() }
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.take_confirm_submit_title)
            .setMessage(if (blank > 0) getString(R.string.take_confirm_submit_body, blank) else getString(R.string.take_confirm_submit_all))
            .setPositiveButton(R.string.take_submit) { _, _ -> viewModel.finish() }
            .setNegativeButton(R.string.take_keep_going, null)
            .show()
    }

    /** Closed book: the way out is handing the paper in. */
    private fun confirmLeave() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.take_back_title)
            .setMessage(R.string.take_back_body)
            .setPositiveButton(R.string.take_submit) { _, _ -> viewModel.finish() }
            .setNegativeButton(R.string.take_keep_going, null)
            .show()
    }
}
