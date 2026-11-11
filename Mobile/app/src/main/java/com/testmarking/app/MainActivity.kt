package com.testmarking.app

import android.os.Bundle
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.testmarking.app.data.SessionStore
import com.testmarking.app.databinding.ActivityMainBinding
import com.testmarking.app.util.isNightMode
import kotlinx.coroutines.launch
import org.koin.android.ext.android.inject
import kotlin.math.max

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private val session: SessionStore by inject()

    /** Screens that show the bottom bar. Everything else (login, detail, ...) hides it. */
    private val topLevel = setOf(R.id.classesTeachingFragment, R.id.classesLearningFragment, R.id.profileFragment)

    /** Screens that start with the blue header: the status bar icons must be white there. */
    private val darkHeader = setOf(R.id.loginFragment, R.id.registerFragment, R.id.verifyEmailFragment, R.id.splashFragment)

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Side and bottom insets here; each screen handles its own top inset (see applyStatusBarInset).
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            v.updatePadding(left = bars.left, right = bars.right, bottom = max(bars.bottom, ime.bottom))
            insets
        }

        val navHost = supportFragmentManager.findFragmentById(R.id.navHost) as NavHostFragment
        val nav = navHost.navController
        binding.bottomNav.setupWithNavController(nav)
        nav.addOnDestinationChangedListener { _, destination, _ ->
            binding.bottomNav.visibility = if (destination.id in topLevel) android.view.View.VISIBLE else android.view.View.GONE
            val lightIcons = destination.id in darkHeader || isNightMode()
            WindowCompat.getInsetsController(window, binding.root).isAppearanceLightStatusBars = !lightIcons
        }

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                session.sessionExpired.collect {
                    Toast.makeText(this@MainActivity, R.string.session_expired, Toast.LENGTH_LONG).show()
                    nav.navigate(R.id.action_global_login)
                }
            }
        }
    }
}
