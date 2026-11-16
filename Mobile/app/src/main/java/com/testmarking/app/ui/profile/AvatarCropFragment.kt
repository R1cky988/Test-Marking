package com.testmarking.app.ui.profile

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import androidx.core.os.bundleOf
import androidx.exifinterface.media.ExifInterface
import androidx.fragment.app.DialogFragment
import androidx.lifecycle.lifecycleScope
import com.testmarking.app.R
import com.testmarking.app.databinding.FragmentAvatarCropBinding
import com.testmarking.app.util.applyStatusBarInset
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import kotlin.math.min

/**
 * Full screen: the picked picture under a square window; the user moves and zooms it, then the window is cut out as a
 * 512 px JPEG and handed to the caller with [RESULT_KEY] (key [JPEG]).
 */
class AvatarCropFragment : DialogFragment() {
    private var _binding: FragmentAvatarCropBinding? = null
    private val binding get() = _binding!!

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setStyle(STYLE_NO_FRAME, R.style.Theme_TestMarking)
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAvatarCropBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onStart() {
        super.onStart()
        dialog?.window?.setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        binding.top.applyStatusBarInset()
        binding.btnCancel.setOnClickListener { dismiss() }
        binding.btnUse.setOnClickListener { cut() }
        val uri = Uri.parse(requireArguments().getString(ARG_URI).orEmpty())
        viewLifecycleOwner.lifecycleScope.launch {
            val bitmap = withContext(Dispatchers.IO) { runCatching { decode(uri) }.getOrNull() }
            val b = _binding ?: return@launch
            b.progress.visibility = View.GONE
            if (bitmap == null) {
                parentFragmentManager.setFragmentResult(RESULT_KEY, bundleOf(FAILED to true))
                dismissAllowingStateLoss()
            } else {
                b.cropView.setBitmap(bitmap)
                b.btnUse.isEnabled = true
            }
        }
    }

    private fun cut() {
        binding.btnUse.isEnabled = false
        val view = binding.cropView
        viewLifecycleOwner.lifecycleScope.launch {
            val jpeg = withContext(Dispatchers.Default) {
                view.crop(SIZE)?.let { out ->
                    ByteArrayOutputStream().also { out.compress(Bitmap.CompressFormat.JPEG, 90, it) }.toByteArray()
                }
            }
            if (jpeg == null || jpeg.size > MAX_BYTES) parentFragmentManager.setFragmentResult(RESULT_KEY, bundleOf(FAILED to true))
            else parentFragmentManager.setFragmentResult(RESULT_KEY, bundleOf(JPEG to jpeg))
            dismissAllowingStateLoss()
        }
    }

    /** The picture upright (camera pictures carry their turn in EXIF), at most about 2048 px on the long side. */
    private fun decode(uri: Uri): Bitmap? {
        val resolver = requireContext().contentResolver
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
        var sample = 1
        while (min(bounds.outWidth, bounds.outHeight) / (sample * 2) >= LOAD_SIDE) sample *= 2
        val raw = resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample }) } ?: return null
        val turn = resolver.openInputStream(uri)?.use {
            when (ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90
                ExifInterface.ORIENTATION_ROTATE_180 -> 180
                ExifInterface.ORIENTATION_ROTATE_270 -> 270
                else -> 0
            }
        } ?: 0
        return if (turn == 0) raw else Bitmap.createBitmap(raw, 0, 0, raw.width, raw.height, Matrix().apply { postRotate(turn.toFloat()) }, true)
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }

    companion object {
        const val RESULT_KEY = "avatar_crop"
        const val JPEG = "jpeg"
        const val FAILED = "failed"
        private const val ARG_URI = "uri"
        private const val SIZE = 512
        private const val LOAD_SIDE = 1024
        private const val MAX_BYTES = 2 * 1024 * 1024

        fun newInstance(uri: Uri) = AvatarCropFragment().apply { arguments = bundleOf(ARG_URI to uri.toString()) }
    }
}
