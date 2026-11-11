package com.testmarking.app.ui.profile

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.testmarking.app.BuildConfig
import com.testmarking.app.R
import com.testmarking.app.data.ServerConfig
import com.testmarking.app.databinding.FragmentProfileBinding
import com.testmarking.app.util.applyStatusBarInset
import com.testmarking.app.util.collectOnStarted
import com.testmarking.app.util.showServerDialog
import org.koin.android.ext.android.inject
import org.koin.androidx.viewmodel.ext.android.viewModel

class ProfileFragment : Fragment() {
    private var _binding: FragmentProfileBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ProfileViewModel by viewModel()
    private val serverConfig: ServerConfig by inject()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.header.applyStatusBarInset()
        binding.tvVersion.text = getString(R.string.profile_version, BuildConfig.VERSION_NAME)
        binding.tvServer.text = serverConfig.displayUrl()

        binding.rowServer.setOnClickListener {
            showServerDialog(serverConfig) { binding.tvServer.text = serverConfig.displayUrl() }
        }
        binding.btnLogout.setOnClickListener {
            MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.profile_logout)
                .setMessage(R.string.profile_logout_confirm)
                .setNegativeButton(R.string.common_cancel, null)
                .setPositiveButton(R.string.profile_logout) { _, _ ->
                    viewModel.logout()
                    findNavController().navigate(R.id.action_global_login)
                }
                .show()
        }

        collectOnStarted(viewModel.user) { user ->
            val name = user?.displayName().orEmpty()
            binding.tvName.text = name
            binding.tvEmail.text = user?.email.orEmpty()
            binding.tvPhone.text = user?.phoneNumber?.takeIf { it.isNotBlank() } ?: "—"
            binding.tvAvatar.text = name.firstOrNull { it.isLetter() }?.uppercaseChar()?.toString() ?: "?"
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
