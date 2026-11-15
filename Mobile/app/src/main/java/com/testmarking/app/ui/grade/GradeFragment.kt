package com.testmarking.app.ui.grade

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.exifinterface.media.ExifInterface
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.testmarking.app.R
import com.testmarking.app.databinding.FragmentGradeBinding
import com.testmarking.app.omr.MarkerFrame
import com.testmarking.app.omr.MarkerScanner
import com.testmarking.app.repository.GradeMode
import com.testmarking.app.util.applyStatusBarInset
import com.testmarking.app.util.collectOnStarted
import com.testmarking.app.util.hideKeyboard
import com.testmarking.app.util.show
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.koin.androidx.viewmodel.ext.android.viewModel
import org.koin.core.parameter.parametersOf
import java.util.ArrayDeque
import java.util.Locale
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import kotlin.math.max

/**
 * Photograph (or pick) a paper sheet, check who it is, send. The server marks it.
 * The camera looks for the 12 markers of the sheet all the time and only lets the picture be taken when all of them are seen.
 * Teacher: any number of sheets, also many pictures from the gallery at once. Student: his own sheet.
 */
class GradeFragment : Fragment() {
    private var _binding: FragmentGradeBinding? = null
    private val binding get() = _binding!!
    private val viewModel: GradeViewModel by viewModel {
        parametersOf(
            requireArguments().getString("examId").orEmpty(), requireArguments().getString("templateId").orEmpty(),
            if (requireArguments().getString("mode") == "student") GradeMode.STUDENT else GradeMode.TEACHER,
        )
    }

    private val student get() = viewModel.mode == GradeMode.STUDENT
    private val scanner = MarkerScanner()
    private var analysisExecutor: ExecutorService? = null
    private var lastFrame: MarkerFrame? = null
    private var lastFrameAt = 0L

    // gallery batch
    private val queue = ArrayDeque<Uri>()
    private var batchActive = false
    private var batchTotal = 0
    private var batchSaved0 = 0
    private var failuresSeen = 0

    private var imageCapture: ImageCapture? = null
    private var cameraBound = false
    private var cameraDenied = false
    private var shownReview: Review? = null

    private val askCamera = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        cameraDenied = !granted
        if (granted) startCamera() else showNoCamera()
    }
    private val pickImage = registerForActivityResult(ActivityResultContracts.GetContent()) { uri -> if (uri != null) readFromUri(uri) }
    private val pickImages = registerForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris -> startBatch(uris) }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentGradeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        binding.header.applyStatusBarInset()
        binding.tvTitle.text = requireArguments().getString("examName").takeUnless { it.isNullOrBlank() } ?: getString(R.string.grade_title)
        binding.btnBack.setOnClickListener { findNavController().popBackStack() }
        binding.btnRetryPrepare.setOnClickListener { viewModel.prepare() }
        binding.btnCapture.setOnClickListener { capture() }
        binding.btnGallery.setOnClickListener { if (student) pickImage.launch("image/*") else pickImages.launch("image/*") }
        binding.btnRetake.setOnClickListener {
            viewModel.retake()
            // inside a batch the "retake" button skips the picture that needs a hand
            if (batchActive) processNext()
        }
        binding.btnNext.setOnClickListener { if (student) findNavController().popBackStack() else viewModel.next() }
        binding.btnSave.setOnClickListener {
            hideKeyboard()
            viewModel.save(binding.etStudent.text?.toString().orEmpty(), binding.etVersion.text?.toString().orEmpty())
        }
        binding.tilStudent.show(!student)
        binding.btnSave.setText(if (student) R.string.grade_mine_send else R.string.grade_save)
        binding.btnNext.setText(if (student) R.string.grade_mine_back else R.string.grade_next)
        renderMarkers(null)
        collectOnStarted(viewModel.state) { render(it) }
    }

    private fun render(s: GradeState) {
        val b = _binding ?: return
        b.progress.visibility = if (s.phase == GradePhase.READING || s.phase == GradePhase.SAVING || (s.phase == GradePhase.PREPARING && s.error == null)) View.VISIBLE else View.INVISIBLE
        b.tvError.show(s.error != null && s.phase != GradePhase.PREPARING)
        b.tvError.text = s.error.orEmpty()
        b.tvCount.text = if (s.savedCount > 0) getString(R.string.grade_count, s.savedCount) else ""

        b.groupPrepare.show(s.phase == GradePhase.PREPARING)
        b.tvPrepare.text = s.error ?: getString(R.string.grade_preparing)
        b.btnRetryPrepare.show(s.phase == GradePhase.PREPARING && s.error != null)
        // READING keeps the camera screen under the progress bar, so the photo that is being read does not flash away
        b.groupCamera.show(s.phase == GradePhase.CAMERA || s.phase == GradePhase.READING)
        b.btnGallery.isEnabled = s.phase == GradePhase.CAMERA && !batchActive
        refreshShutter()
        b.btnRetake.setText(if (batchActive) R.string.grade_skip else R.string.grade_retake)
        b.groupReview.show(s.phase == GradePhase.REVIEW || s.phase == GradePhase.SAVING)
        b.btnSave.isEnabled = s.phase == GradePhase.REVIEW
        b.btnRetake.isEnabled = s.phase == GradePhase.REVIEW
        b.groupSaved.show(s.phase == GradePhase.SAVED)

        if (s.phase == GradePhase.CAMERA && !cameraBound) ensureCamera()
        if (s.phase == GradePhase.REVIEW || s.phase == GradePhase.SAVING) s.review?.let { showReview(it) }
        if (s.phase == GradePhase.SAVED) showSaved(s)
        if (s.phase == GradePhase.CAMERA) shownReview = null
        followBatch(s)
    }

    // ------------------------------------------------------------------ batch from the gallery

    private fun startBatch(uris: List<Uri>) {
        if (uris.isEmpty()) return
        if (uris.size == 1) return readFromUri(uris[0])
        queue.clear()
        queue.addAll(uris)
        batchActive = true
        batchTotal = uris.size
        batchSaved0 = viewModel.state.value.savedCount
        failuresSeen = viewModel.state.value.readFailures
        processNext()
    }

    private fun processNext() {
        val uri = queue.poll()
        if (uri == null) {
            if (batchActive) {
                batchActive = false
                val saved = viewModel.state.value.savedCount - batchSaved0
                android.widget.Toast.makeText(requireContext(), getString(R.string.grade_batch_done, batchTotal, saved, batchTotal - saved), android.widget.Toast.LENGTH_LONG).show()
            }
            binding.tvQueue.text = ""
            return
        }
        binding.tvQueue.text = getString(R.string.grade_batch_left, queue.size)
        viewLifecycleOwner.lifecycleScope.launch {
            val bitmap = withContext(Dispatchers.IO) { decode(uri) }
            if (bitmap == null) { failuresSeen++; processNext() } else viewModel.read(bitmap, auto = true)
        }
    }

    /** What to do after each picture of a batch: saved -> next; could not be read -> next; ids missing -> the teacher decides. */
    private fun followBatch(s: GradeState) {
        if (!batchActive) return
        when {
            s.phase == GradePhase.SAVED -> { viewModel.next(); processNext() }
            s.phase == GradePhase.CAMERA && s.readFailures > failuresSeen -> { failuresSeen = s.readFailures; processNext() }
        }
    }

    // ------------------------------------------------------------------ live markers

    private fun onFrame(frame: MarkerFrame) {
        lastFrame = frame
        lastFrameAt = System.currentTimeMillis()
        renderMarkers(frame)
        refreshShutter()
    }

    private fun readyToShoot() = viewModel.state.value.phase == GradePhase.CAMERA && !batchActive &&
        lastFrame?.complete == true && System.currentTimeMillis() - lastFrameAt <= FRAME_FRESH_MS

    private fun refreshShutter() {
        val b = _binding ?: return
        val ok = readyToShoot()
        b.btnCapture.isEnabled = ok
        b.btnCapture.alpha = if (ok) 1f else 0.35f
    }

    private fun renderMarkers(f: MarkerFrame?) {
        val b = _binding ?: return
        val (text, color) = when {
            f == null || (f.found == 0 && !f.unavailable) -> getString(R.string.grade_scan_searching) to R.color.scan_wait
            f.unavailable -> getString(R.string.grade_scan_unavailable) to R.color.scan_bad
            f.tooMany -> getString(R.string.grade_scan_too_many, f.found, f.expected) to R.color.scan_bad
            f.duplicate -> getString(R.string.grade_scan_duplicate) to R.color.scan_bad
            f.complete -> getString(R.string.grade_scan_ready, f.found, f.expected) to R.color.scan_ok
            else -> getString(R.string.grade_scan_partial, f.found, f.expected) to R.color.scan_wait
        }
        b.tvMarkers.text = text
        b.dot.background.mutate().setTint(ContextCompat.getColor(requireContext(), color))
    }

    // ------------------------------------------------------------------ review

    /** Filled once per photo: a redraw while the teacher is typing must not wipe what he typed. */
    private fun showReview(r: Review) {
        val b = binding
        if (shownReview === r) return
        shownReview = r
        b.etStudent.setText(r.studentCode)
        b.etVersion.setText(r.testCode)
        r.image?.let { bytes -> BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.let { b.ivSheet.setImageBitmap(it) } }
        val lines = ArrayList<String>()
        lines.add(getString(R.string.grade_summary_read, r.answers.size, r.total))
        if (r.blank.isNotEmpty()) lines.add(getString(R.string.grade_summary_blank, r.blank.joinToString(", ")))
        if (r.doubtful.isNotEmpty()) lines.add(getString(R.string.grade_summary_doubtful, r.doubtful.joinToString(", ")))
        if (student) lines.add(getString(R.string.grade_mine_code, r.studentCode.ifBlank { "—" }))
        b.tvSummary.text = lines.joinToString("\n")
        b.tvWarnings.show(r.warnings.isNotEmpty())
        b.tvWarnings.text = r.warnings.joinToString("\n")
    }

    private fun showSaved(s: GradeState) {
        val b = binding
        val result = s.saved?.result
        if (student) {
            b.tvSavedTitle.text = getString(R.string.grade_mine_title)
            b.tvSavedBody.text = getString(R.string.grade_mine_wait) + if (s.imageNotSaved) "\n" + getString(R.string.grade_saved_no_image) else ""
            return
        }
        b.tvSavedTitle.text = getString(R.string.grade_saved_title, shownName())
        val score = result?.totalScore?.let { String.format(Locale("vi", "VN"), "%.2f", it).trimEnd('0').trimEnd(',') } ?: "—"
        val lines = ArrayList<String>()
        lines.add(getString(R.string.grade_saved_body, result?.totalCorrect ?: 0, result?.totalQuestions ?: 0, score))
        if (result?.isViolation == true) lines.add(getString(R.string.grade_saved_violation))
        if (s.imageNotSaved) lines.add(getString(R.string.grade_saved_no_image))
        b.tvSavedBody.text = lines.joinToString("\n")
    }

    private fun shownName(): String = binding.etStudent.text?.toString().orEmpty().trim().uppercase()

    // ------------------------------------------------------------------ camera

    private fun ensureCamera() {
        val granted = ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        when {
            granted -> startCamera()
            cameraDenied -> showNoCamera()
            else -> askCamera.launch(Manifest.permission.CAMERA)
        }
    }

    private fun showNoCamera() {
        binding.tvNoCamera.show(true)
        binding.btnCapture.isEnabled = false
    }

    private fun startCamera() {
        val future = ProcessCameraProvider.getInstance(requireContext())
        future.addListener({
            val view = _binding ?: return@addListener
            try {
                val provider = future.get()
                val preview = Preview.Builder().build().also { it.setSurfaceProvider(view.preview.surfaceProvider) }
                val capture = ImageCapture.Builder().setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY).build()
                val executor = analysisExecutor ?: Executors.newSingleThreadExecutor().also { analysisExecutor = it }
                val analysis = ImageAnalysis.Builder().setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build()
                analysis.setAnalyzer(executor) { image ->
                    try {
                        scanner.scan(image)?.let { f -> view.root.post { if (_binding != null) onFrame(f) } }
                    } finally {
                        image.close()
                    }
                }
                provider.unbindAll()
                provider.bindToLifecycle(viewLifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, capture, analysis)
                imageCapture = capture
                cameraBound = true
                view.tvNoCamera.show(false)
            } catch (e: Exception) {
                view.tvNoCamera.text = getString(R.string.grade_camera_error, e.message.orEmpty())
                view.tvNoCamera.show(true)
            }
        }, ContextCompat.getMainExecutor(requireContext()))
    }

    private fun capture() {
        val capture = imageCapture ?: return
        if (!readyToShoot()) {
            android.widget.Toast.makeText(requireContext(), R.string.grade_not_ready, android.widget.Toast.LENGTH_SHORT).show()
            return
        }
        capture.takePicture(
            ContextCompat.getMainExecutor(requireContext()),
            object : ImageCapture.OnImageCapturedCallback() {
                override fun onCaptureSuccess(image: ImageProxy) {
                    val degrees = image.imageInfo.rotationDegrees
                    viewLifecycleOwner.lifecycleScope.launch {
                        val bitmap = withContext(Dispatchers.Default) {
                            try {
                                val raw = image.toBitmap()
                                scaleDown(if (degrees != 0) rotate(raw, degrees) else raw)
                            } finally {
                                image.close()
                            }
                        }
                        viewModel.read(bitmap)
                    }
                }

                override fun onError(exception: ImageCaptureException) {
                    binding.tvNoCamera.text = getString(R.string.grade_camera_error, exception.message.orEmpty())
                    binding.tvNoCamera.show(true)
                }
            },
        )
    }

    // ------------------------------------------------------------------ gallery

    private fun readFromUri(uri: Uri) {
        viewLifecycleOwner.lifecycleScope.launch {
            val bitmap = withContext(Dispatchers.IO) { decode(uri) }
            if (bitmap != null) viewModel.read(bitmap)
        }
    }

    /** At most about 2800 px on the long side (a phone photo of 12 MP+ would only cost memory), turned upright by its EXIF. */
    private fun decode(uri: Uri): Bitmap? = try {
        val resolver = requireContext().contentResolver
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        var sample = 1
        while (max(bounds.outWidth, bounds.outHeight) / sample > MAX_SIDE * 2) sample *= 2
        val raw = resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample }) }
        val turn = resolver.openInputStream(uri)?.use {
            when (ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90
                ExifInterface.ORIENTATION_ROTATE_180 -> 180
                ExifInterface.ORIENTATION_ROTATE_270 -> 270
                else -> 0
            }
        } ?: 0
        raw?.let { scaleDown(if (turn != 0) rotate(it, turn) else it) }
    } catch (e: Exception) {
        null
    }

    private fun rotate(src: Bitmap, degrees: Int): Bitmap =
        Bitmap.createBitmap(src, 0, 0, src.width, src.height, Matrix().apply { postRotate(degrees.toFloat()) }, true)

    private fun scaleDown(src: Bitmap): Bitmap {
        val longSide = max(src.width, src.height)
        if (longSide <= MAX_SIDE) return src
        val k = MAX_SIDE.toFloat() / longSide
        return Bitmap.createScaledBitmap(src, (src.width * k).toInt(), (src.height * k).toInt(), true)
    }

    override fun onDestroyView() {
        cameraBound = false
        imageCapture = null
        analysisExecutor?.shutdown()
        analysisExecutor = null
        lastFrame = null
        batchActive = false
        queue.clear()
        shownReview = null
        _binding = null
        super.onDestroyView()
    }

    private companion object {
        const val MAX_SIDE = 2800
        const val FRAME_FRESH_MS = 900L
    }
}
