package com.testmarking.app.ui.classes

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AlertDialog
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.testmarking.app.R
import com.testmarking.app.databinding.DialogCreateClassBinding
import com.testmarking.app.databinding.DialogJoinClassBinding
import com.testmarking.app.databinding.FragmentClassListBinding
import com.testmarking.app.repository.SCOPE_TEACHER
import com.testmarking.app.util.applyStatusBarInset
import com.testmarking.app.util.collectOnStarted
import com.testmarking.app.util.show
import kotlinx.coroutines.launch
import org.koin.androidx.viewmodel.ext.android.viewModel
import org.koin.core.parameter.parametersOf

/**
 * One screen, two roles. Which one is decided by the "scope" argument of the destination:
 * teacher = classes I created, student = classes I joined.
 */
class ClassListFragment : Fragment() {
    private var _binding: FragmentClassListBinding? = null
    private val binding get() = _binding!!

    private val scope: String get() = requireArguments().getString("scope") ?: SCOPE_TEACHER
    private val isTeacher: Boolean get() = scope == SCOPE_TEACHER
    private val viewModel: ClassListViewModel by viewModel { parametersOf(scope) }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentClassListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.header.applyStatusBarInset()

        binding.tvTitle.setText(if (isTeacher) R.string.teaching_title else R.string.learning_title)
        binding.tvSubtitle.setText(if (isTeacher) R.string.teaching_subtitle else R.string.learning_subtitle)
        binding.ivEmpty.setImageResource(if (isTeacher) R.drawable.ic_teach else R.drawable.ic_school)
        binding.fab.setText(if (isTeacher) R.string.class_create else R.string.class_join)
        binding.fab.setOnClickListener { if (isTeacher) showCreateDialog() else showJoinDialog() }

        val adapter = ClassAdapter(showTeacher = !isTeacher) { item ->
            val id = item.id ?: return@ClassAdapter
            val action = if (isTeacher) R.id.action_teaching_to_detail else R.id.action_learning_to_detail
            findNavController().navigate(action, bundleOf("classId" to id))
        }
        binding.list.layoutManager = LinearLayoutManager(requireContext())
        binding.list.adapter = adapter
        binding.swipe.setOnRefreshListener { viewModel.refresh() }
        binding.btnRetry.setOnClickListener { viewModel.refresh() }

        collectOnStarted(viewModel.state) { state ->
            adapter.submitList(state.items)
            binding.swipe.isRefreshing = state.loading
            val empty = !state.loading && state.items.isEmpty()
            binding.emptyState.show(empty)
            if (empty) {
                if (state.error != null) {
                    binding.tvEmptyTitle.text = state.error
                    binding.tvEmptyHint.text = ""
                    binding.tvEmptyHint.show(false)
                    binding.btnRetry.show(true)
                } else {
                    binding.tvEmptyTitle.setText(if (isTeacher) R.string.class_empty_teaching else R.string.class_empty_learning)
                    binding.tvEmptyHint.setText(if (isTeacher) R.string.class_empty_teaching_hint else R.string.class_empty_learning_hint)
                    binding.tvEmptyHint.show(true)
                    binding.btnRetry.show(false)
                }
            } else if (state.error != null) {
                Snackbar.make(binding.root, state.error, Snackbar.LENGTH_LONG).show()
            }
        }
    }

    private fun showCreateDialog() {
        val form = DialogCreateClassBinding.inflate(layoutInflater)
        val dialog = MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.class_create_title)
            .setView(form.root)
            .setNegativeButton(R.string.common_cancel, null)
            .setPositiveButton(R.string.class_create, null)   // listener set below so a bad input keeps the dialog open
            .create()
        dialog.setOnShowListener {
            val positive = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
            positive.setOnClickListener {
                val name = form.etName.text?.toString().orEmpty()
                if (name.isBlank()) {
                    form.tilName.error = getString(R.string.err_required)
                    return@setOnClickListener
                }
                form.tilName.error = null
                form.tvError.show(false)
                positive.isEnabled = false
                viewLifecycleOwner.lifecycleScope.launch {
                    val result = viewModel.create(
                        name = name,
                        subject = form.etSubject.text?.toString().orEmpty(),
                        description = form.etDescription.text?.toString().orEmpty(),
                        needsApproval = form.switchApproval.isChecked,
                    )
                    result.onSuccess {
                        dialog.dismiss()
                        viewModel.refresh()
                        Snackbar.make(binding.root, R.string.class_create_done, Snackbar.LENGTH_SHORT).show()
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

    private fun showJoinDialog() {
        val form = DialogJoinClassBinding.inflate(layoutInflater)
        val dialog = MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.class_join_title)
            .setView(form.root)
            .setNegativeButton(R.string.common_cancel, null)
            .setPositiveButton(R.string.class_join, null)
            .create()
        dialog.setOnShowListener {
            val positive = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
            positive.setOnClickListener {
                val code = form.etCode.text?.toString().orEmpty()
                if (code.isBlank()) {
                    form.tilCode.error = getString(R.string.err_required)
                    return@setOnClickListener
                }
                form.tilCode.error = null
                form.tvError.show(false)
                positive.isEnabled = false
                viewLifecycleOwner.lifecycleScope.launch {
                    val result = viewModel.join(code)
                    result.onSuccess { joined ->
                        dialog.dismiss()
                        viewModel.refresh()
                        val message = if (joined.status.equals("PENDING", ignoreCase = true)) {
                            getString(R.string.class_join_pending)
                        } else {
                            getString(R.string.class_join_joined, joined.className.orEmpty())
                        }
                        Snackbar.make(binding.root, message, Snackbar.LENGTH_LONG).show()
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

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
