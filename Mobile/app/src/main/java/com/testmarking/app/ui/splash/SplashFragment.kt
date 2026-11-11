package com.testmarking.app.ui.splash

import android.os.Bundle
import android.view.View
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.testmarking.app.R
import com.testmarking.app.data.SessionStore
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.koin.android.ext.android.inject

/** Decides where to start: tokens saved -> home, otherwise login. */
class SplashFragment : Fragment(R.layout.fragment_splash) {
    private val session: SessionStore by inject()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        viewLifecycleOwner.lifecycleScope.launch {
            delay(600)
            val action = if (session.hasSession) R.id.action_splash_to_home else R.id.action_splash_to_login
            findNavController().navigate(action)
        }
    }
}
