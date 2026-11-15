package com.testmarking.app.ui.exam

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.testmarking.app.R
import com.testmarking.app.data.local.AttemptStatus
import com.testmarking.app.databinding.FragmentTakeExamBinding
import com.testmarking.app.util.TimeFormat
import com.testmarking.app.util.applyStatusBarInset
import com.testmarking.app.util.collectOnStarted
import com.testmarking.app.util.isNightMode
import com.testmarking.app.util.show
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.koin.androidx.viewmodel.ext.android.viewModel
import org.koin.core.parameter.parametersOf
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

/** The student's side of an online exam. All the rules are in [TakeExamViewModel]; this screen only draws them. */
class TakeExamFragment : Fragment() {
    private var _binding: FragmentTakeExamBinding? = null
    private val binding get() = _binding!!
    private val viewModel: TakeExamViewModel by viewModel { parametersOf(requireArguments().getString("examId").orEmpty()) }

    /** the question the page was drawn for, so a tick (every second) does not redraw it */
    private var drawnKey: String? = null
    private var pageReady = false
    private var pendingPayload: String? = null
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
            when {
                a.currentIndex >= s.questions.size - 1 -> confirmSubmit()      // the last question: this button hands the paper in
                s.allowReference -> viewModel.goTo(a.currentIndex + 1)
                else -> viewModel.next()
            }
        }
        setupWebView()
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
        _binding?.webQuestion?.let { web ->
            web.removeJavascriptInterface("Android")
            web.destroy()
        }
        drawnKey = null
        pageReady = false
        pendingPayload = null
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
        b.tvQuestionNo.text = getString(R.string.take_question_no, a.currentIndex + 1, qs.size) +
            (if (!s.allowReference && a.leftCount > 0) getString(R.string.take_left_count, a.leftCount) else "")
        val hint = getString(if (multiple) R.string.take_hint_multiple else R.string.take_hint_single) +
            (if (!s.allowReference) "\n" + getString(R.string.take_hint_forward_only) else "")

        val chosen = a.answers[q.order].orEmpty().split(",").filter { it.isNotBlank() }
        // drawn again only for another question (the page keeps the ticks itself); the answers are saved by choose() below
        if (drawnKey != "${q.order}") {
            drawnKey = "${q.order}"
            val payload = JSONObject()
                .put("order", q.order).put("content", q.content.orEmpty()).put("multiple", multiple).put("hint", hint)
                .put("dark", requireContext().isNightMode()).put("chosen", JSONArray(chosen))
                .put("options", JSONArray(q.options.orEmpty().map { JSONObject().put("label", it.label.orEmpty()).put("content", it.content.orEmpty()) }))
                .toString()
            showQuestion(payload)
        }

        val last = a.currentIndex >= qs.size - 1
        // On the last question the main button is "Nộp bài" (an open-book exam can also hand in from any question)
        b.btnNext.setText(if (last) R.string.take_submit else R.string.take_next)
        b.btnNext.isEnabled = true
        if (s.allowReference) {
            b.btnPrev.show(true)
            b.btnPrev.isEnabled = a.currentIndex > 0
            b.btnSubmit.show(!last)
        } else {
            b.btnPrev.show(false)           // forward only
            b.btnSubmit.show(false)
        }
    }

    // ------------------------------------------------------------------ the question page (LaTeX)

    private inner class Bridge {
        /** called from the page when the student taps an option */
        @JavascriptInterface
        fun choose(label: String) {
            val web = _binding?.webQuestion ?: return
            web.post {
                val s = viewModel.state.value
                val a = s.attempt ?: return@post
                val q = s.questions.getOrNull(a.currentIndex) ?: return@post
                viewModel.choose(q.order, label, q.type.equals("MULTIPLE", ignoreCase = true))
            }
        }

        @JavascriptInterface
        fun ready() {
            _binding?.webQuestion?.post {
                pageReady = true
                pendingPayload?.let { runScript(it) }
                pendingPayload = null
            }
        }
    }

    @android.annotation.SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val web = binding.webQuestion
        pageReady = false
        pendingPayload = null
        web.settings.javaScriptEnabled = true
        web.settings.allowFileAccess = false          // the page comes from file:///android_asset, which does not need it
        web.settings.allowContentAccess = false
        web.settings.setSupportZoom(false)
        web.settings.blockNetworkLoads = true
        web.isLongClickable = false
        web.setBackgroundColor(android.graphics.Color.TRANSPARENT)
        web.addJavascriptInterface(Bridge(), "Android")
        web.webViewClient = object : WebViewClient() {
            // nothing outside of the page may be opened
            override fun shouldOverrideUrlLoading(view: WebView, request: android.webkit.WebResourceRequest) = true
        }
        web.loadUrl("file:///android_asset/latex/question.html")
    }

    private fun showQuestion(payloadJson: String) {
        val script = "renderQuestion($payloadJson)"
        if (pageReady) runScript(script) else pendingPayload = script
    }

    private fun runScript(script: String) {
        _binding?.webQuestion?.evaluateJavascript(script, null)
    }

    private fun renderDone(s: TakeState) {
        val a = s.attempt ?: return
        val result = viewModel.result()
        val row = result?.detail?.result
        val syncedText = getString(R.string.take_done_synced, TimeFormat.dateTime(row?.syncedAt ?: TimeFormat.iso(a.syncedAtMs)))
        val body = when {
            row == null -> syncedText + "\n" + getString(R.string.take_done_not_released)
            row.isViolation == true -> syncedText + "\n" + getString(R.string.take_done_violation, row.violationReason?.takeIf { it.isNotBlank() }?.let { " ($it)" } ?: "")
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
