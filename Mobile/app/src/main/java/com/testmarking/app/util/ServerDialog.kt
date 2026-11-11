package com.testmarking.app.util

import android.text.InputType
import android.widget.LinearLayout
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.testmarking.app.R
import com.testmarking.app.data.ServerConfig

/** "Địa chỉ máy chủ": lets the user type the backend address (needed on a real phone). */
fun Fragment.showServerDialog(config: ServerConfig, onChanged: () -> Unit = {}) {
    val ctx = requireContext()
    val input = TextInputEditText(ctx).apply {
        inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
        setSingleLine(true)
        setText(config.displayUrl())
        setSelection(text?.length ?: 0)
    }
    val field = TextInputLayout(ctx).apply {
        hint = getString(R.string.server_title)
        addView(input)
    }
    val container = LinearLayout(ctx).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(ctx.dp(24), ctx.dp(8), ctx.dp(24), 0)
        addView(field)
    }
    MaterialAlertDialogBuilder(ctx)
        .setTitle(R.string.server_title)
        .setView(container)
        .setNegativeButton(R.string.common_cancel, null)
        .setNeutralButton(R.string.server_reset) { _, _ ->
            config.reset()
            Toast.makeText(ctx, R.string.server_reset_done, Toast.LENGTH_SHORT).show()
            onChanged()
        }
        .setPositiveButton(R.string.common_save) { _, _ ->
            if (config.save(input.text?.toString().orEmpty())) {
                Toast.makeText(ctx, R.string.server_saved, Toast.LENGTH_SHORT).show()
                onChanged()
            } else {
                Toast.makeText(ctx, R.string.server_invalid, Toast.LENGTH_LONG).show()
            }
        }
        .show()
}
