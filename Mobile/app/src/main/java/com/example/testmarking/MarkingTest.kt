package com.example.testmarking

import android.content.Context
import android.util.Log
import org.opencv.android.Utils
import org.opencv.core.*
import org.opencv.calib3d.Calib3d
import org.opencv.imgproc.Imgproc
import org.opencv.objdetect.ArucoDetector
import org.opencv.objdetect.DetectorParameters
import org.opencv.objdetect.Objdetect
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import org.opencv.core.CvType.channels
import kotlin.collections.map

class MarkingProcessor(val context: Context) {

//    private val MIN_SHADE_PIXELS = 110 chuyển sang theo tỉ lệ bao nhiêu % là trắng
    // giảm thử xuống p.r-2
    private val MIN_FILL_RATIO = 0.25
    private val THRESHOLD_RATIO = 0.8
//    private val QUESTION_COUNT = 50
    private val PADDING = 3
    var debugThresholdMat: Mat? = null
    private val arucoDict by lazy { Objdetect.getPredefinedDictionary(Objdetect.DICT_5X5_250) }
    private val detectorParams by lazy { DetectorParameters() }
    private val detector by lazy { ArucoDetector(arucoDict, detectorParams) }


    fun detectMarkers(img: Mat): Map<Int, Point> {
        val gray = Mat()
        Imgproc.cvtColor(img, gray, Imgproc.COLOR_BGR2GRAY)
        val corners = mutableListOf<Mat>()
        val ids = Mat()
        detector.detectMarkers(gray, corners, ids)

        val detected = mutableMapOf<Int, Point>()
        if (!ids.empty()) {
            for (i in 0 until ids.rows()) {
                val markerId = ids.get(i, 0)[0].toInt()
                val cornerMat = corners[i]
                var sumX = 0.0
                var sumY = 0.0
                for (j in 0 until 4) {
                    sumX += cornerMat.get(0, j)[0]
                    sumY += cornerMat.get(0, j)[1]
                }
                detected[markerId] = Point(sumX / 4.0, sumY / 4.0)
            }
        }
        gray.release()
        ids.release()
        return detected
    }


    fun processAndGrade(photo: Mat, template: Mat, coordsJson: String, officialAns: List<Int>, questionCount: Int): GradeResult {
        val tplMarkers = detectMarkers(template)
        val photoMarkers = detectMarkers(photo)

        val idsToUse = listOf(1, 2, 3, 4, 5, 7, 9, 11, 12, 13, 14)
        val tplPoints = mutableListOf<Point>()
        val photoPoints = mutableListOf<Point>()

        for (id in idsToUse) {
            if (tplMarkers.containsKey(id) && photoMarkers.containsKey(id)) {
                tplPoints.add(tplMarkers[id]!!)
                photoPoints.add(photoMarkers[id]!!)
            }
        }

        if (photoPoints.size < 4) throw Exception("Không đủ marker để căn chỉnh!")

        val srcMat = MatOfPoint2f(*photoPoints.toTypedArray())
        val dstMat = MatOfPoint2f(*tplPoints.toTypedArray())
        val H = Calib3d.findHomography(srcMat, dstMat, Calib3d.USAC_ACCURATE, 3.0)

        val rectified = Mat()
        Imgproc.warpPerspective(photo, rectified, H, template.size())


        val labImg = Mat()
        Imgproc.cvtColor(rectified, labImg, Imgproc.COLOR_BGR2Lab)

        val channels = mutableListOf<Mat>()
        Core.split(labImg, channels)

        val clahe = Imgproc.createCLAHE(2.0, Size(8.0, 8.0))
        clahe.apply(channels[0], channels[0])

        Core.merge(channels, labImg)
        Imgproc.cvtColor(labImg, rectified, Imgproc.COLOR_Lab2BGR)


        val grayRect = Mat()
        Imgproc.cvtColor(rectified, grayRect, Imgproc.COLOR_BGR2GRAY)


        val coordsMap = parseCoords(coordsJson)
        var correctCount = 0
        val myAnswers = mutableListOf<String>()

        val debugRows = mutableListOf<Mat>()

        for (q in 1..questionCount) {
            val points = coordsMap[q.toString()] ?: continue

            val xs = points.map { it.x }
            val ys = points.map { it.y }
            val rs = points.map { it.r }

            val xMin = xs.minOrNull()!! - rs.maxOrNull()!! - PADDING
            val xMax = xs.maxOrNull()!! + rs.maxOrNull()!! + PADDING
            val yMin = ys.minOrNull()!! - rs.maxOrNull()!! - PADDING
            val yMax = ys.maxOrNull()!! + rs.maxOrNull()!! + PADDING

            val cropRect = Rect(xMin, yMin, xMax - xMin, yMax - yMin)
            val rowCrop = Mat(grayRect, cropRect)


            val rowThresh = Mat()
           Imgproc.threshold(rowCrop, rowThresh, 0.0, 255.0, Imgproc.THRESH_BINARY_INV + Imgproc.THRESH_OTSU)

//            val visualRow = Mat()
//            Imgproc.cvtColor(rowThresh, visualRow, Imgproc.COLOR_GRAY2BGR)

            val rowCounts = mutableListOf<Double>()
            for (p in points) {
                val relX = p.x - xMin
                val relY = p.y - yMin
//                Imgproc.circle(visualRow, Point(relX.toDouble(), relY.toDouble()), p.r - 3, Scalar(255.0, 0.0, 0.0), 1)

                val mask = Mat.zeros(rowThresh.size(), CvType.CV_8U)
                Imgproc.circle(mask, Point(relX.toDouble(), relY.toDouble()), p.r-3, Scalar(255.0), -1)

                val masked = Mat()
                Core.bitwise_and(rowThresh, rowThresh, masked, mask)
                val pixelCount = Core.countNonZero(masked).toDouble()
                val maskArea = Core.countNonZero(mask).toDouble()
                val fillRatio = pixelCount / maskArea
                rowCounts.add(fillRatio)

                Log.d("SCAN_PIXELS", "Câu $q - Ô ${rowCounts.size - 1}: ${String.format("%.2f", fillRatio * 100)}% lấp đầy")
                mask.release()
                masked.release()
            }

//            val finalDebugRow = Mat()
//            Imgproc.resize(visualRow, finalDebugRow, Size(250.0, 30.0))
//            debugRows.add(finalDebugRow)
//            visualRow.release()

            val maxRatio = rowCounts.maxOrNull() ?: 0.0
            val selected = mutableListOf<Int>()

            if (maxRatio > MIN_FILL_RATIO) {
                rowCounts.forEachIndexed { index, value ->
                    if (value >= (maxRatio * THRESHOLD_RATIO)) selected.add(index)
                }
            }

            val ansText = if (selected.isEmpty()) "WRONG" else selected.joinToString(",") { toLetter(it) }
            myAnswers.add(ansText)

            val isCorrect = selected.size == 1 && selected[0] == officialAns[q - 1]
            if (isCorrect) {
                correctCount++
            }

            val correctIdx = officialAns[q - 1]
            val COLOR_GREEN = Scalar(0.0, 255.0, 0.0) // Đúng (BGR)
            val COLOR_BLUE = Scalar(0.0, 0.0, 255.0)   // Sai
            val COLOR_RED = Scalar(255.0, 0.0, 0.0)  // Đáp án gốc

            if (isCorrect) {
                val p = points[correctIdx]
                Imgproc.circle(rectified, Point(p.x.toDouble(), p.y.toDouble()), p.r - 1, COLOR_GREEN, 2)
            } else {
                if (correctIdx in points.indices) {
                    val pCorrect = points[correctIdx]
                    Imgproc.circle(rectified, Point(pCorrect.x.toDouble(), pCorrect.y.toDouble()), pCorrect.r - 1, COLOR_BLUE, 2)
                }
                for (sIdx in selected) {
                    if (sIdx in points.indices) {
                        val pSelected = points[sIdx]
                        Imgproc.circle(rectified, Point(pSelected.x.toDouble(), pSelected.y.toDouble()), pSelected.r - 1, COLOR_RED, 2)
                    }
                }
            }

            rowCrop.release()
            rowThresh.release()

        }

        if (debugRows.isNotEmpty()) {
            val mid = debugRows.size / 2
            val col1 = Mat(); val col2 = Mat()
            Core.vconcat(debugRows.subList(0, mid), col1)
            Core.vconcat(debugRows.subList(mid, debugRows.size), col2)

            val fullDebug = Mat()
            Core.hconcat(listOf(col1, col2), fullDebug)
            this.debugThresholdMat = fullDebug

            debugRows.forEach { it.release() }; col1.release(); col2.release()
        }

        grayRect.release()
        H.release()

        return GradeResult(
            score = (correctCount.toDouble() * 10) / questionCount,
            totalCorrect = correctCount,
            myAnswers = myAnswers,
            rectifiedImage = rectified
        )
    }

    private fun toLetter(num: Int): String {
        return when (num) {
            0 -> "A"
            1 -> "B"
            2 -> "C"
            3 -> "D"
            4 -> "E"
            else -> "WRONG"
        }
    }

    private fun parseCoords(json: String): Map<String, List<Bubble>> {
        val gson = Gson()
        val resultMap = mutableMapOf<String, List<Bubble>>()

        try {
            val type = object : TypeToken<Map<String, List<List<Int>>>>() {}.type
            val rawData: Map<String, List<List<Int>>> = gson.fromJson(json, type)

            rawData.forEach { (questionNum, bubblesData) ->
                val bubbleList = bubblesData.map { data ->
                    Bubble(x = data[0], y = data[1], r = data[2])
                }
                resultMap[questionNum] = bubbleList
            }
        } catch (e: Exception) {
            Log.e("JSON_ERROR", "Lỗi định dạng JSON: ${e.message}")
        }

        return resultMap
    }
    fun getJsonFromAssets(fileName: String): String? {
        return try {
            context.assets.open(fileName).bufferedReader().use { it.readText() }
        } catch (ioException: java.io.IOException) {
            ioException.printStackTrace()
            null
        }
    }

    fun getTemplateFromAssets(fileName: String): Mat {
        val inputStream = context.assets.open(fileName)
        val bitmap = android.graphics.BitmapFactory.decodeStream(inputStream)
        val templateMat = Mat()
        Utils.bitmapToMat(bitmap, templateMat)
        Imgproc.cvtColor(templateMat, templateMat, Imgproc.COLOR_RGBA2BGR)
        inputStream.close()
        return templateMat
    }
}


data class GradeResult(
    val score: Double,
    val totalCorrect: Int,
    val myAnswers: List<String>,
    val rectifiedImage: Mat
)

data class Bubble(val x: Int, val y: Int, val r: Int)