package com.testmarking.app.ui.classes

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Toast
import androidx.annotation.StringRes
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.tabs.TabLayout
import com.testmarking.app.R
import com.testmarking.app.data.CommentDto
import com.testmarking.app.data.ExamItemDto
import com.testmarking.app.data.JoinRequestDto
import com.testmarking.app.data.MemberStudentDto
import com.testmarking.app.data.PostDto
import com.testmarking.app.databinding.DialogPostBinding
import com.testmarking.app.databinding.FragmentClassDetailBinding
import com.testmarking.app.databinding.SheetCommentsBinding
import com.testmarking.app.util.TimeFormat
import com.testmarking.app.util.applyStatusBarInset
import com.testmarking.app.util.collectOnStarted
import com.testmarking.app.util.hideKeyboard
import com.testmarking.app.util.show
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import org.koin.androidx.viewmodel.ext.android.viewModel
import org.koin.core.parameter.parametersOf

/**
 * A class as its members see it. Tabs: posts, exams, members, info.
 * What a person can do comes from the class (I created it = teacher, I joined it = student) and from the can_* flags of the server.
 */
class ClassDetailFragment : Fragment() {
    private var _binding: FragmentClassDetailBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ClassDetailViewModel by viewModel { parametersOf(requireArguments().getString("classId").orEmpty()) }

    private lateinit var postAdapter: PostAdapter
    private lateinit var examAdapter: ExamAdapter
    private lateinit var memberAdapter: MemberAdapter

    private var commentsDialog: BottomSheetDialog? = null
    private var commentsJob: Job? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentClassDetailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.header.applyStatusBarInset()
        binding.btnBack.setOnClickListener { findNavController().popBackStack() }

        postAdapter = PostAdapter(
            onLike = { viewModel.toggleLike(it) },
            onComments = { showComments(it) },
            onDelete = { confirmDeletePost(it) },
        )
        examAdapter = ExamAdapter { openExam(it) }
        memberAdapter = MemberAdapter(
            onRemove = { confirmRemove(it) },
            onApprove = { request -> request.id?.let { viewModel.approve(it) } },
            onReject = { confirmReject(it) },
        )
        binding.list.layoutManager = LinearLayoutManager(requireContext())

        val titles = intArrayOf(R.string.tab_posts, R.string.tab_exams, R.string.tab_members, R.string.tab_info)
        for (title in titles) binding.tabs.addTab(binding.tabs.newTab().setText(title))
        binding.tabs.getTabAt(viewModel.tab)?.select()
        binding.tabs.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab) {
                viewModel.tab = tab.position
                render(viewModel.state.value)
            }

            override fun onTabUnselected(tab: TabLayout.Tab) {}
            override fun onTabReselected(tab: TabLayout.Tab) {}
        })

        binding.swipe.setOnRefreshListener { viewModel.refreshAll() }
        binding.btnRetry.setOnClickListener { viewModel.refreshAll() }
        binding.fab.setOnClickListener { showPostDialog() }

        collectOnStarted(viewModel.state) { render(it) }
        collectOnStarted(viewModel.events) { message ->
            if (message.isNotBlank()) Snackbar.make(binding.root, message, Snackbar.LENGTH_LONG).show()
        }
    }

    // ------------------------------------------------------------------ rendering

    private fun render(state: ClassDetailState) {
        val b = _binding ?: return
        val tab = viewModel.tab
        val info = state.info.data
        b.tvTitle.text = info?.className?.takeIf { it.isNotBlank() } ?: getString(R.string.detail_title)

        val onInfo = tab == TAB_INFO
        b.scrollInfo.show(onInfo)
        b.swipe.show(!onInfo)
        b.fab.visibility = if (tab == TAB_POSTS && info != null) View.VISIBLE else View.GONE
        bindInfo(state)

        var loading = state.info.loading
        var error: String? = null
        var empty = false
        @StringRes var emptyTitle = R.string.post_empty
        @StringRes var emptyHint = 0

        when (tab) {
            TAB_POSTS -> {
                setAdapter(postAdapter)
                val list = state.posts.data.orEmpty()
                postAdapter.submitList(list)
                loading = state.posts.loading
                error = state.posts.error
                empty = list.isEmpty()
                emptyTitle = R.string.post_empty
                emptyHint = R.string.post_empty_hint
            }
            TAB_EXAMS -> {
                setAdapter(examAdapter)
                val rows = examRows(state)
                examAdapter.submitList(rows)
                loading = state.exams.loading
                error = state.exams.error
                empty = rows.isEmpty()
                emptyTitle = R.string.exams_empty
            }
            TAB_MEMBERS -> {
                setAdapter(memberAdapter)
                val rows = memberRows(state)
                memberAdapter.submitList(rows)
                loading = state.members.loading
                error = state.members.error
                empty = rows.isEmpty()
                emptyTitle = R.string.members_empty
            }
        }

        b.progress.visibility = if (loading && !b.swipe.isRefreshing) View.VISIBLE else View.INVISIBLE
        if (!loading) b.swipe.isRefreshing = false

        val showEmpty = !onInfo && !loading && empty
        b.emptyState.show(showEmpty)
        if (showEmpty) {
            if (error != null) {
                b.tvEmptyTitle.text = error
                b.tvEmptyHint.show(false)
                b.btnRetry.show(true)
            } else {
                b.tvEmptyTitle.setText(emptyTitle)
                b.tvEmptyHint.show(emptyHint != 0)
                if (emptyHint != 0) b.tvEmptyHint.setText(emptyHint)
                b.btnRetry.show(false)
            }
        } else if (error != null && !onInfo) {
            Snackbar.make(b.root, error, Snackbar.LENGTH_LONG).show()
        }
    }

    private fun setAdapter(adapter: RecyclerView.Adapter<*>) {
        if (binding.list.adapter !== adapter) binding.list.adapter = adapter
    }

    private fun examRows(state: ClassDetailState): List<ExamRow> {
        val exams = state.exams.data ?: return emptyList()
        val rows = ArrayList<ExamRow>()
        fun section(@StringRes title: Int, list: List<ExamItemDto>?) {
            if (list.isNullOrEmpty()) return
            rows.add(ExamRow.Header(title, list.size))
            list.forEach { rows.add(ExamRow.Item(it)) }
        }
        section(R.string.exams_section_ongoing, exams.ongoing)
        section(R.string.exams_section_upcoming, exams.upcoming)
        section(R.string.exams_section_ended, exams.ended)
        if (state.isTeacher) section(R.string.exams_section_draft, exams.draft)
        return rows
    }

    private fun memberRows(state: ClassDetailState): List<MemberRow> {
        val rows = ArrayList<MemberRow>()
        val teacher = state.isTeacher
        if (teacher && state.requests.isNotEmpty()) {
            rows.add(MemberRow.Header(R.string.members_requests, state.requests.size))
            state.requests.forEach { rows.add(MemberRow.Request(it)) }
        }
        val members = state.members.data
        val teachers = members?.teachers.orEmpty()
        if (teachers.isNotEmpty()) {
            rows.add(MemberRow.Header(R.string.members_teachers, teachers.size))
            teachers.forEach { rows.add(MemberRow.Teacher(it)) }
        }
        val students = members?.students.orEmpty()
        if (students.isNotEmpty()) {
            rows.add(MemberRow.Header(R.string.members_students, students.size))
            students.forEach { rows.add(MemberRow.Student(it, canRemove = teacher)) }
        }
        return rows
    }

    private fun bindInfo(state: ClassDetailState) {
        val b = _binding ?: return
        val data = state.info.data
        b.card.show(data != null)
        if (data == null) return

        b.tvName.text = data.className.orEmpty()
        b.tvRole.setText(if (state.isTeacher) R.string.class_role_teacher else R.string.class_role_student)
        b.tvSubject.text = data.subject?.takeIf { it.isNotBlank() } ?: "—"
        b.tvTeacher.text = data.teacher?.name?.takeIf { it.isNotBlank() } ?: "—"
        b.tvStudents.text = (data.studentCount ?: 0L).toString()
        b.tvClassCode.text = data.classCode.orEmpty()

        val joinCode = data.joinCode
        b.groupJoinCode.show(state.isTeacher && !joinCode.isNullOrBlank())
        b.tvJoinCode.text = joinCode.orEmpty()
        b.btnCopy.setOnClickListener {
            val clipboard = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.setPrimaryClip(ClipData.newPlainText("join_code", joinCode.orEmpty()))
            Toast.makeText(requireContext(), R.string.detail_copied, Toast.LENGTH_SHORT).show()
        }

        val description = data.description
        b.groupDescription.show(!description.isNullOrBlank())
        b.tvDescription.text = description.orEmpty()
    }

    // ------------------------------------------------------------------ posts

    private fun showPostDialog() {
        val teacher = viewModel.state.value.isTeacher
        val form = DialogPostBinding.inflate(layoutInflater)
        form.switchAnnouncement.show(teacher)
        val dialog = MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.post_new_title)
            .setView(form.root)
            .setNegativeButton(R.string.common_cancel, null)
            .setPositiveButton(R.string.post_publish, null)   // set below so an empty post keeps the dialog open
            .create()
        dialog.setOnShowListener {
            val positive = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
            positive.setOnClickListener {
                val content = form.etContent.text?.toString().orEmpty()
                if (content.isBlank()) {
                    form.tilContent.error = getString(R.string.err_required)
                    return@setOnClickListener
                }
                form.tilContent.error = null
                form.tvError.show(false)
                positive.isEnabled = false
                viewLifecycleOwner.lifecycleScope.launch {
                    val result = viewModel.createPost(
                        title = form.etTitle.text?.toString().orEmpty(),
                        content = content,
                        announcement = teacher && form.switchAnnouncement.isChecked,
                    )
                    result.onSuccess {
                        dialog.dismiss()
                        binding.list.scrollToPosition(0)
                    }.onFailure { e ->
                        positive.isEnabled = true
                        form.tvError.text = e.message
                        form.tvError.show(true)
                    }
                }
            }
        }
        dialog.show()
    }

    private fun confirmDeletePost(post: PostDto) {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.post_delete_title)
            .setMessage(R.string.post_delete_message)
            .setNegativeButton(R.string.common_cancel, null)
            .setPositiveButton(R.string.post_delete) { _, _ -> viewModel.deletePost(post) }
            .show()
    }

    // ------------------------------------------------------------------ comments

    private fun showComments(post: PostDto) {
        val postId = post.id ?: return
        val sheet = SheetCommentsBinding.inflate(layoutInflater)
        // a fixed height so the list can take the rest and the keyboard only shrinks it
        sheet.root.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            (resources.displayMetrics.heightPixels * 0.75).toInt(),
        )

        val canComment = post.allowComments != false
        sheet.inputRow.show(canComment)
        sheet.tvClosed.show(!canComment)

        var replyTo: CommentDto? = null
        fun setReply(target: CommentDto?) {
            replyTo = target
            sheet.replyBar.show(target != null)
            if (target != null) sheet.tvReplying.text = getString(R.string.comments_replying, target.author?.name.orEmpty())
        }

        val adapter = CommentAdapter(
            canReply = canComment,
            onReply = { setReply(it) },
            onDelete = { comment ->
                MaterialAlertDialogBuilder(requireContext())
                    .setTitle(R.string.comments_delete_title)
                    .setNegativeButton(R.string.common_cancel, null)
                    .setPositiveButton(R.string.post_delete) { _, _ -> comment.id?.let { viewModel.deleteComment(it) } }
                    .show()
            },
        )
        sheet.list.layoutManager = LinearLayoutManager(requireContext())
        sheet.list.adapter = adapter
        sheet.btnCancelReply.setOnClickListener { setReply(null) }
        sheet.btnSend.setOnClickListener {
            val text = sheet.etComment.text?.toString().orEmpty()
            if (text.isBlank()) return@setOnClickListener
            sheet.btnSend.isEnabled = false
            viewLifecycleOwner.lifecycleScope.launch {
                viewModel.addComment(postId, text, replyTo?.id)
                    .onSuccess {
                        sheet.etComment.setText("")
                        setReply(null)
                    }
                    .onFailure { e -> Toast.makeText(requireContext(), e.message, Toast.LENGTH_LONG).show() }
                sheet.btnSend.isEnabled = true
            }
        }

        val dialog = BottomSheetDialog(requireContext())
        dialog.setContentView(sheet.root)
        dialog.behavior.state = BottomSheetBehavior.STATE_EXPANDED
        dialog.behavior.skipCollapsed = true
        dialog.window?.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)

        // the sheet follows the feed, so a new comment (or a deleted one) shows up at once
        commentsJob?.cancel()
        commentsJob = viewLifecycleOwner.lifecycleScope.launch {
            viewModel.state.collect { state ->
                val current = state.posts.data?.firstOrNull { it.id == postId } ?: return@collect
                val comments = current.comments.orEmpty()
                adapter.submitList(flattenComments(comments))
                sheet.tvEmpty.show(comments.isEmpty())
                sheet.tvTitle.text = getString(R.string.comments_title, comments.size)
            }
        }
        dialog.setOnDismissListener {
            commentsJob?.cancel()
            commentsJob = null
            commentsDialog = null
        }
        commentsDialog = dialog
        dialog.show()
    }

    // ------------------------------------------------------------------ exams

    /**
     * The teacher opens the detail of the exam (who is where, marked / synced times, unlock). A student opens an ONLINE exam
     * to take it; other formats only show the information.
     */
    private fun openExam(exam: ExamItemDto) {
        val id = exam.id
        if (id.isNullOrBlank()) return showExamInfo(exam)
        val nav = findNavController()
        when {
            viewModel.isTeacher && exam.status != "DRAFT" -> nav.navigate(
                R.id.action_class_detail_to_exam_manage,
                androidx.core.os.bundleOf("examId" to id, "examName" to exam.name.orEmpty()),
            )
            !viewModel.isTeacher && exam.format.equals("ONLINE", ignoreCase = true) && exam.status != "CANCELLED" ->
                nav.navigate(R.id.action_class_detail_to_take_exam, androidx.core.os.bundleOf("examId" to id))
            else -> showExamInfo(exam)
        }
    }

    private fun showExamInfo(exam: ExamItemDto) {
        val lines = ArrayList<String>()
        exam.subject?.takeIf { it.isNotBlank() }?.let { lines.add(it) }
        lines.add(ClassLabels.format(requireContext(), exam.format))
        lines.add(ClassLabels.examStatus(requireContext(), exam.status))
        lines.add(getString(R.string.exams_from, TimeFormat.dateTime(exam.fromTime)))
        lines.add(getString(R.string.exams_to, TimeFormat.dateTime(exam.toTime)))
        exam.durationMinutes?.let { lines.add(getString(R.string.exams_duration, it)) }
        exam.isScorePublished?.let {
            lines.add(getString(if (it) R.string.exams_published else R.string.exams_not_published))
        }
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(exam.name.orEmpty())
            .setMessage(lines.joinToString("\n"))
            .setPositiveButton(R.string.common_confirm, null)
            .show()
    }

    // ------------------------------------------------------------------ members

    private fun confirmRemove(student: MemberStudentDto) {
        val id = student.id ?: return
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.members_remove_title, student.name.orEmpty()))
            .setMessage(R.string.members_remove_message)
            .setNegativeButton(R.string.common_cancel, null)
            .setPositiveButton(R.string.members_remove) { _, _ -> viewModel.removeStudent(id) }
            .show()
    }

    private fun confirmReject(request: JoinRequestDto) {
        val id = request.id ?: return
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.members_reject_title, request.student?.name.orEmpty()))
            .setNegativeButton(R.string.common_cancel, null)
            .setPositiveButton(R.string.members_reject) { _, _ -> viewModel.reject(id) }
            .show()
    }

    override fun onDestroyView() {
        hideKeyboard()
        commentsJob?.cancel()
        commentsJob = null
        commentsDialog?.dismiss()
        commentsDialog = null
        super.onDestroyView()
        _binding = null
    }

    private companion object {
        const val TAB_POSTS = 0
        const val TAB_EXAMS = 1
        const val TAB_MEMBERS = 2
        const val TAB_INFO = 3
    }
}
