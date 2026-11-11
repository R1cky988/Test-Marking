package com.testmarking.app.ui.register

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.datepicker.CalendarConstraints
import com.google.android.material.datepicker.DateValidatorPointBackward
import com.google.android.material.datepicker.MaterialDatePicker
import com.testmarking.app.R
import com.testmarking.app.databinding.FragmentRegisterBinding
import com.testmarking.app.util.applyStatusBarInset
import com.testmarking.app.util.clearErrorOnEdit
import com.testmarking.app.util.collectOnStarted
import com.testmarking.app.util.hideKeyboard
import com.testmarking.app.util.show
import org.koin.androidx.viewmodel.ext.android.viewModel

class RegisterFragment : Fragment() {
    private var _binding: FragmentRegisterBinding? = null
    private val binding get() = _binding!!
    private val viewModel: RegisterViewModel by viewModel()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentRegisterBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.hero.applyStatusBarInset()
        listOf(
            binding.tilLastName, binding.tilFirstName, binding.tilEmail, binding.tilPhone,
            binding.tilDob, binding.tilPassword, binding.tilConfirm,
        ).forEach { it.clearErrorOnEdit() }

        binding.toggleGender.check(R.id.btnMale)
        viewModel.dobMillis?.let { binding.etDob.setText(RegisterViewModel.formatDisplayDate(it)) }

        binding.btnBack.setOnClickListener { findNavController().popBackStack() }
        binding.btnLogin.setOnClickListener { findNavController().popBackStack() }
        binding.etDob.setOnClickListener { pickDate() }
        binding.btnRegister.setOnClickListener { submit() }
        binding.etConfirm.setOnEditorActionListener { _, actionId, _ ->
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
                is RegisterEvent.Registered -> findNavController().navigate(
                    R.id.action_register_to_verify,
                    bundleOf("email" to event.email, "autoResend" to false),
                )
            }
        }
    }

    private fun pickDate() {
        hideKeyboard()
        val constraints = CalendarConstraints.Builder()
            .setValidator(DateValidatorPointBackward.now())
            .build()
        val builder = MaterialDatePicker.Builder.datePicker()
            .setTitleText(R.string.register_dob_picker_title)
            .setCalendarConstraints(constraints)
        viewModel.dobMillis?.let { builder.setSelection(it) }
        val picker = builder.build()
        picker.addOnPositiveButtonClickListener { millis ->
            viewModel.dobMillis = millis
            binding.etDob.setText(RegisterViewModel.formatDisplayDate(millis))
        }
        picker.show(childFragmentManager, "dob")
    }

    private fun submit() {
        hideKeyboard()
        val gender = when (binding.toggleGender.checkedButtonId) {
            R.id.btnFemale -> "FEMALE"
            R.id.btnOther -> "OTHER"
            else -> "MALE"
        }
        viewModel.submit(
            RegisterForm(
                lastName = binding.etLastName.text?.toString().orEmpty(),
                firstName = binding.etFirstName.text?.toString().orEmpty(),
                email = binding.etEmail.text?.toString().orEmpty(),
                phone = binding.etPhone.text?.toString().orEmpty(),
                dobMillis = viewModel.dobMillis,
                gender = gender,
                password = binding.etPassword.text?.toString().orEmpty(),
                confirm = binding.etConfirm.text?.toString().orEmpty(),
            ),
        )
    }

    private fun render(state: RegisterState) {
        binding.progress.visibility = if (state.loading) View.VISIBLE else View.INVISIBLE
        binding.btnRegister.isEnabled = !state.loading
        binding.tilLastName.error = state.lastNameError?.let { getString(it) }
        binding.tilFirstName.error = state.firstNameError?.let { getString(it) }
        binding.tilEmail.error = state.emailError?.let { getString(it) }
        binding.tilPhone.error = state.phoneError?.let { getString(it) }
        binding.tilDob.error = state.dobError?.let { getString(it) }
        binding.tilPassword.error = state.passwordError?.let { getString(it) }
        binding.tilConfirm.error = state.confirmError?.let { getString(it) }
        binding.tvError.show(state.error != null)
        binding.tvError.text = state.error
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
