package com.testmarking.app.ui.profile

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.exifinterface.media.ExifInterface
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.testmarking.app.R
import com.testmarking.app.databinding.FragmentEditProfileBinding
import com.testmarking.app.util.applyStatusBarInset
import com.testmarking.app.util.clearErrorOnEdit
import com.testmarking.app.util.collectOnStarted
import com.testmarking.app.util.hideKeyboard
import com.testmarking.app.util.loadAvatar
import com.testmarking.app.util.show
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.koin.androidx.viewmodel.ext.android.viewModel
import java.io.ByteArrayOutputStream
import kotlin.math.min

/** Change the name and phone, the password and the picture of the logged in user. */
class EditProfileFragment : Fragment() {
    private var _binding: FragmentEditProfileBinding? = null
    private val binding get() = _binding!!
    private val viewModel: EditProfileViewModel by viewModel()
    private var filled = false

    private val pickImage = registerForActivityResult(ActivityResultContracts.GetContent()) { uri -> if (uri != null) prepareAvatar(uri) }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentEditProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        filled = false
        binding.header.applyStatusBarInset()
        binding.btnBack.setOnClickListener { findNavController().popBackStack() }
        listOf(binding.tilLast, binding.tilFirst, binding.tilPhone, binding.tilOld, binding.tilNew, binding.tilConfirm).forEach { it.clearErrorOnEdit() }

        binding.btnAvatar.setOnClickListener { pickImage.launch("image/*") }
        binding.btnSaveInfo.setOnClickListener { saveInfo() }
        binding.btnChangePassword.setOnClickListener { changePassword() }

        collectOnStarted(viewModel.state) { render(it) }
        collectOnStarted(viewModel.events) { event ->
            when (event) {
                EditEvent.INFO_SAVED -> toast(R.string.edit_info_done)
                EditEvent.AVATAR_SAVED -> toast(R.string.edit_avatar_done)
                EditEvent.PASSWORD_CHANGED -> {
                    toast(R.string.edit_password_done)
                    listOf(binding.etOld, binding.etNew, binding.etConfirm).forEach { it.setText("") }
                }
            }
        }
    }

    private fun toast(message: Int) = Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()

    private fun render(s: EditState) {
        val b = _binding ?: return
        b.progress.visibility = if (s.busy) View.VISIBLE else View.INVISIBLE
        listOf(b.btnSaveInfo, b.btnChangePassword, b.btnAvatar).forEach { it.isEnabled = !s.busy }
        val user = s.user
        if (user != null) {
            val name = listOfNotNull(user.lastName, user.firstName).joinToString(" ").trim().ifEmpty { user.email.orEmpty() }
            b.tvAvatar.text = name.firstOrNull { it.isLetter() }?.uppercaseChar()?.toString() ?: "?"
            b.ivAvatar.loadAvatar(user.avatarUrl)
            b.tvEmail.text = getString(R.string.edit_info_email, user.email.orEmpty())
            // fill the fields once: a redraw (after the picture) must not wipe what the user is typing
            if (!filled) {
                filled = true
                b.etLast.setText(user.lastName.orEmpty())
                b.etFirst.setText(user.firstName.orEmpty())
                b.etPhone.setText(user.phoneNumber.orEmpty())
            }
        }
        b.tvInfoError.show(s.infoError != null); b.tvInfoError.text = s.infoError.orEmpty()
        b.tvPasswordError.show(s.passwordError != null); b.tvPasswordError.text = s.passwordError.orEmpty()
        b.tvAvatarError.show(s.avatarError != null); b.tvAvatarError.text = s.avatarError.orEmpty()
    }

    private fun saveInfo() {
        hideKeyboard()
        val b = binding
        val last = b.etLast.text?.toString().orEmpty().trim()
        val first = b.etFirst.text?.toString().orEmpty().trim()
        val phone = b.etPhone.text?.toString().orEmpty().replace(" ", "").replace("-", "")
        val digits = phone.removePrefix("+")
        b.tilLast.error = if (last.isEmpty()) getString(R.string.err_required) else null
        b.tilFirst.error = if (first.isEmpty()) getString(R.string.err_required) else null
        b.tilPhone.error = when {
            phone.isEmpty() -> getString(R.string.err_required)
            digits.length !in 9..11 || !digits.all { it.isDigit() } -> getString(R.string.err_phone)
            else -> null
        }
        if (b.tilLast.error != null || b.tilFirst.error != null || b.tilPhone.error != null) return
        viewModel.saveInfo(first, last, phone)
    }

    private fun changePassword() {
        hideKeyboard()
        val b = binding
        val old = b.etOld.text?.toString().orEmpty()
        val new = b.etNew.text?.toString().orEmpty()
        val confirm = b.etConfirm.text?.toString().orEmpty()
        b.tilOld.error = if (old.isEmpty()) getString(R.string.err_required) else null
        // the same rule as the web: 8 characters or more, letters and digits
        b.tilNew.error = when {
            new.length < 8 || !new.any { it.isLetter() } || !new.any { it.isDigit() } -> getString(R.string.err_password_weak)
            new == old -> getString(R.string.err_password_same)
            else -> null
        }
        b.tilConfirm.error = if (confirm != new) getString(R.string.err_password_mismatch) else null
        if (b.tilOld.error != null || b.tilNew.error != null || b.tilConfirm.error != null) return
        viewModel.changePassword(old, new)
    }

    // ------------------------------------------------------------------ the picture

    /** The middle square of the picked picture, 512 px at most, as a JPEG (the server wants a square and at most 2 MB). */
    private fun prepareAvatar(uri: Uri) {
        viewLifecycleOwner.lifecycleScope.launch {
            val jpeg = withContext(Dispatchers.IO) { runCatching { squareJpeg(uri) }.getOrNull() }
            if (jpeg == null) viewModel.avatarFailed(getString(R.string.edit_avatar_failed)) else viewModel.uploadAvatar(jpeg)
        }
    }

    private fun squareJpeg(uri: Uri): ByteArray? {
        val resolver = requireContext().contentResolver
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
        var sample = 1
        while (min(bounds.outWidth, bounds.outHeight) / (sample * 2) >= SIZE) sample *= 2
        val raw = resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample }) } ?: return null
        val turn = resolver.openInputStream(uri)?.use {
            when (ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90
                ExifInterface.ORIENTATION_ROTATE_180 -> 180
                ExifInterface.ORIENTATION_ROTATE_270 -> 270
                else -> 0
            }
        } ?: 0
        val upright = if (turn == 0) raw else Bitmap.createBitmap(raw, 0, 0, raw.width, raw.height, android.graphics.Matrix().apply { postRotate(turn.toFloat()) }, true)
        val side = min(upright.width, upright.height)
        val square = Bitmap.createBitmap(upright, (upright.width - side) / 2, (upright.height - side) / 2, side, side)
        val out = if (side > SIZE) Bitmap.createScaledBitmap(square, SIZE, SIZE, true) else square
        // transparent pixels (PNG) would turn black in a JPEG: put the picture on white
        val flat = Bitmap.createBitmap(out.width, out.height, Bitmap.Config.ARGB_8888)
        android.graphics.Canvas(flat).apply { drawColor(android.graphics.Color.WHITE); drawBitmap(out, 0f, 0f, null) }
        val bytes = ByteArrayOutputStream().also { flat.compress(Bitmap.CompressFormat.JPEG, 90, it) }.toByteArray()
        return if (bytes.size > MAX_BYTES) null else bytes
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }

    private companion object {
        const val SIZE = 512
        const val MAX_BYTES = 2 * 1024 * 1024
    }
}
