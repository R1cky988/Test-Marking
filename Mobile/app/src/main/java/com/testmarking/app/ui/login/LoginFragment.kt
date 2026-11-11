package com.testmarking.app.ui.login

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.widget.Toast
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.testmarking.app.R
import com.testmarking.app.data.ServerConfig
import com.testmarking.app.databinding.FragmentLoginBinding
import com.testmarking.app.util.applyStatusBarInset
import com.testmarking.app.util.clearErrorOnEdit
import com.testmarking.app.util.collectOnStarted
import com.testmarking.app.util.hideKeyboard
import com.testmarking.app.util.show
import com.testmarking.app.util.showServerDialog
import org.koin.android.ext.android.inject
import org.koin.androidx.viewmodel.ext.android.viewModel

class LoginFragment : Fragment() {
    private var _binding: FragmentLoginBinding? = null
    private val binding get() = _binding!!
    private val viewModel: LoginViewModel by viewModel()
    private val serverConfig: ServerConfig by inject()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentLoginBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.hero.applyStatusBarInset()
        binding.tilEmail.clearErrorOnEdit()
        binding.tilPassword.clearErrorOnEdit()

        binding.btnLogin.setOnClickListener { submit() }
        binding.etPassword.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                submit()
                true
            } else {
                false
            }
        }
        binding.btnRegister.setOnClickListener { findNavController().navigate(R.id.action_login_to_register) }
        binding.btnServer.setOnClickListener { showServerDialog(serverConfig) }

        collectOnStarted(viewModel.state) { render(it) }
        collectOnStarted(viewModel.events) { handle(it) }
    }

    private fun submit() {
        hideKeyboard()
        viewModel.login(binding.etEmail.text?.toString().orEmpty(), binding.etPassword.text?.toString().orEmpty())
    }

    private fun render(state: LoginState) {
        binding.progress.visibility = if (state.loading) View.VISIBLE else View.INVISIBLE
        binding.btnLogin.isEnabled = !state.loading
        binding.tilEmail.error = state.emailError?.let { getString(it) }
        binding.tilPassword.error = state.passwordError?.let { getString(it) }
        binding.tvError.show(state.error != null)
        binding.tvError.text = state.error
    }

    private fun handle(event: LoginEvent) {
        when (event) {
            LoginEvent.GoHome -> findNavController().navigate(R.id.action_login_to_home)
            is LoginEvent.NeedVerify -> {
                Toast.makeText(requireContext(), R.string.login_unverified, Toast.LENGTH_LONG).show()
                findNavController().navigate(
                    R.id.action_login_to_verify,
                    bundleOf("email" to event.email, "autoResend" to true),
                )
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
