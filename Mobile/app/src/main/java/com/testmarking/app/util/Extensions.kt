package com.testmarking.app.util

import android.content.Context
import android.content.res.Configuration
import android.view.View
import android.view.inputmethod.InputMethodManager
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.google.android.material.textfield.TextInputLayout
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch

/** Collects [flow] while the fragment's view is at least STARTED. */
fun <T> Fragment.collectOnStarted(flow: Flow<T>, action: suspend (T) -> Unit) {
    viewLifecycleOwner.lifecycleScope.launch {
        viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
            flow.collect { action(it) }
        }
    }
}

/** The app draws edge to edge: push this view's content below the status bar. */
fun View.applyStatusBarInset() {
    val initialTop = paddingTop
    ViewCompat.setOnApplyWindowInsetsListener(this) { v, insets ->
        val bars = insets.getInsets(WindowInsetsCompat.Type.statusBars() or WindowInsetsCompat.Type.displayCutout())
        v.updatePadding(top = initialTop + bars.top)
        insets
    }
    ViewCompat.requestApplyInsets(this)
}

fun Fragment.hideKeyboard() {
    val target = activity?.currentFocus ?: this.view ?: return
    val imm = requireContext().getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
    imm?.hideSoftInputFromWindow(target.windowToken, 0)
}

/** Removes the red error text as soon as the user edits the field again. */
fun TextInputLayout.clearErrorOnEdit() {
    editText?.doAfterTextChanged { error = null }
}

fun View.show(visible: Boolean) {
    visibility = if (visible) View.VISIBLE else View.GONE
}

fun Context.isNightMode(): Boolean =
    (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

fun Context.dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
