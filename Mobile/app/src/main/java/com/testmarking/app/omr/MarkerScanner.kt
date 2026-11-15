package com.testmarking.app.omr

import android.graphics.ImageFormat
import android.util.Log
import androidx.camera.core.ImageProxy
import org.opencv.android.OpenCVLoader
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.objdetect.ArucoDetector
import org.opencv.objdetect.DetectorParameters
import org.opencv.objdetect.Objdetect

/** What one preview frame shows of the 12 black-and-white markers around the sheet. */
data class MarkerFrame(
    /** different markers seen */
    val found: Int,
    val expected: Int,
    /** more markers than the sheet has: another sheet or something printed with markers is in the picture */
    val tooMany: Boolean,
    /** the same marker twice */
    val duplicate: Boolean,
    /** the detector could not run (OpenCV is not in the build yet) */
    val unavailable: Boolean = false,
) {
    /** All of them, none twice: the sheet may be photographed. */
    val complete: Boolean get() = !unavailable && !tooMany && !duplicate && found >= expected
}

/**
 * Looks for the sheet's markers in the live preview (AprilTag 16h5, as printed by the sheet generator).
 * Call [scan] from the analysis thread only; one instance per camera session.
 */
class MarkerScanner(private val expected: Int = EXPECTED_MARKERS) {
    private var detector: ArucoDetector? = null
    private var failed = false
    private var lastAt = 0L

    /** Null when the frame is skipped (too soon after the last one). */
    fun scan(image: ImageProxy): MarkerFrame? {
        val now = System.currentTimeMillis()
        if (now - lastAt < THROTTLE_MS) return null
        lastAt = now
        val det = detector() ?: return MarkerFrame(0, expected, tooMany = false, duplicate = false, unavailable = true)
        val gray = gray(image) ?: return null
        val corners = ArrayList<Mat>()
        val ids = Mat()
        val rejected = ArrayList<Mat>()
        return try {
            det.detectMarkers(gray, corners, ids, rejected)
            val seen = HashSet<Int>()
            var total = 0
            for (r in 0 until ids.rows()) for (c in 0 until ids.cols()) {
                ids.get(r, c)?.firstOrNull()?.let { seen.add(it.toInt()); total++ }
            }
            MarkerFrame(seen.size, expected, tooMany = total > expected, duplicate = total > seen.size)
        } catch (e: Exception) {
            Log.w(TAG, "marker scan failed", e)
            null
        } finally {
            gray.release()
            ids.release()
            corners.forEach { it.release() }
            rejected.forEach { it.release() }
        }
    }

    private fun detector(): ArucoDetector? {
        detector?.let { return it }
        if (failed) return null
        if (!loaded) loaded = runCatching { OpenCVLoader.initLocal() }.getOrDefault(false)
        if (!loaded) {
            failed = true
            Log.w(TAG, "OpenCV is not loaded: no live marker check")
            return null
        }
        return runCatching {
            val p = DetectorParameters().apply {
                set_adaptiveThreshWinSizeMin(3)
                set_adaptiveThreshWinSizeMax(53)
                set_adaptiveThreshWinSizeStep(8)
                set_adaptiveThreshConstant(5.0)
                set_minMarkerPerimeterRate(0.015)
                set_maxMarkerPerimeterRate(4.0)
                set_minCornerDistanceRate(0.03)
                set_minOtsuStdDev(3.0)
                set_errorCorrectionRate(0.8)
                set_cornerRefinementMethod(Objdetect.CORNER_REFINE_SUBPIX)
                set_cornerRefinementWinSize(5)
                set_cornerRefinementMaxIterations(30)
                set_cornerRefinementMinAccuracy(0.01)
            }
            ArucoDetector(Objdetect.getPredefinedDictionary(Objdetect.DICT_APRILTAG_16h5), p)
        }.onSuccess { detector = it }.onFailure { failed = true; Log.w(TAG, "ArUco detector failed", it) }.getOrNull()
    }

    /** The luminance plane of the frame as a gray picture (row stride aware). */
    private fun gray(image: ImageProxy): Mat? {
        if (image.format != ImageFormat.YUV_420_888) return null
        val plane = image.planes.firstOrNull() ?: return null
        val buffer = plane.buffer
        buffer.rewind()
        val w = image.width
        val h = image.height
        val stride = plane.rowStride
        val mat = Mat(h, w, CvType.CV_8UC1)
        return try {
            val row = ByteArray(w)
            for (y in 0 until h) {
                val start = y * stride
                if (start >= buffer.limit()) break
                buffer.position(start)
                buffer.get(row, 0, minOf(w, buffer.remaining()))
                mat.put(y, 0, row)
            }
            mat
        } catch (e: Exception) {
            mat.release()
            null
        }
    }

    companion object {
        const val EXPECTED_MARKERS = 12
        private const val THROTTLE_MS = 120L
        private const val TAG = "MarkerScanner"
        @Volatile private var loaded = false
    }
}
