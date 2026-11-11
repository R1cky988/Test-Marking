package com.testmarking.app.ui.verify

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.testmarking.app.R
import com.testmarking.app.databinding.FragmentVerifyEmailBinding
import com.testmarking.app.util.applyStatusBarInset
import com.testmarking.app.util.clearErrorOnEdit
import com.testmarking.app.util.collectOnStarted
import com.testmarking.app.util.hideKeyboard
import com.testmarking.app.util.show
import org.koin.androidx.viewmodel.ext.android.viewModel

class VerifyEmailFragment : Fragment() {
    private var _binding: FragmentVerifyEmailBinding? = null
    private val binding get() = _binding!!
    private val viewModel: VerifyEmailViewModel by viewModel()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentVerifyEmailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.hero.applyStatusBarInset()
        binding.tilCode.clearErrorOnEdit()

        val args = requireArguments()
        viewModel.start(args.getString("email").orEmpty(), args.getBoolean("autoResend", false))

        binding.btnBack.setOnClickListener { findNavController().popBackStack() }
        binding.btnVerify.setOnClickListener { submit() }
        binding.btnResend.setOnClickListener { viewModel.resend() }
        binding.etCode.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                submit()
                true
            } else {
                false
            }
        }

        collectOnStarted(viewModel.state) { render(it) }
        collectOnStarted(viewModel.events) { event ->
            when (event) {
                VerifyEvent.GoHome -> findNavController().navigate(R.id.action_verify_to_home)
                is VerifyEvent.Info -> Toast.makeText(requireContext(), event.message, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun submit() {
        hideKeyboard()
        viewModel.verify(binding.etCode.text?.toString().orEmpty())
    }

    private fun render(state: VerifyState) {
        binding.tvEmail.text = state.email
        binding.progress.visibility = if (state.loading) View.VISIBLE else View.INVISIBLE
        binding.btnVerify.isEnabled = !state.loading
        binding.btnResend.isEnabled = !state.loading && state.cooldown == 0
        binding.btnResend.text = if (state.cooldown > 0) {
            getString(R.string.verify_resend_wait, state.cooldown)
        } else {
            getString(R.string.verify_resend)
        }
        binding.tilCode.error = state.codeError?.let { getString(it) }
        binding.tvError.show(state.error != null)
        binding.tvError.text = state.error
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
