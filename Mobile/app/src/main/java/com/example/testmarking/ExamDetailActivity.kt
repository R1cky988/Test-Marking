package com.example.testmarking

import android.R.id.edit
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import com.example.testmarking.data.database.AppDatabase
import com.example.testmarking.data.entities.Exam
import com.example.testmarking.data.entities.ExamResult
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.opencv.android.Utils
import org.opencv.imgcodecs.Imgcodecs
import org.w3c.dom.Text
import java.io.File
import java.io.FileOutputStream
import kotlin.jvm.java

class ExamDetailActivity : AppCompatActivity() {

    private lateinit var exam: Exam

    private lateinit var photoUri: Uri
    private var photoFile: File? = null

    private val takePhotoLauncher = registerForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        if (success && photoFile != null) {
            processMarking(photoFile!!.absolutePath)
        } else {
            Toast.makeText(this, "Đã hủy chụp ảnh", Toast.LENGTH_SHORT).show()
        }
    }

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            openCamera()
        } else {
            Toast.makeText(this, "Bạn cần cấp quyền Camera để chụp ảnh bài thi", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_exam_detail)

        val examTitle = findViewById<TextView>(R.id.tvExamTitle)

        val examId = intent.getLongExtra("EXAM_ID", -1L)
        if (examId == -1L) {
            finish()
            return
        }

        lifecycleScope.launch(Dispatchers.IO) {
            val db = AppDatabase.getInstance(this@ExamDetailActivity)
            val fetchedExam = db.examDao().getExamById(examId)

            withContext(Dispatchers.Main) {
                if (fetchedExam != null) {
                    exam = fetchedExam
                    examTitle.text = fetchedExam.examName
                } else {
                    finish()
                }
            }
        }

        findViewById<Button>(R.id.btnScan).setOnClickListener {
            if (exam == null) {
                Toast.makeText(this, "Đang tải dữ liệu...", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            when {
                ContextCompat.checkSelfPermission(this, android.Manifest.permission.CAMERA)
                        == PackageManager.PERMISSION_GRANTED -> {
                    openCamera()
                }
                else -> {
                    requestPermissionLauncher.launch(android.Manifest.permission.CAMERA)
                }
            }
        }

        val btnEdit = findViewById<Button>(R.id.btnEditKey)
        btnEdit.setOnClickListener {
            val intent = Intent(this, EditExamActivity::class.java)
            intent.putExtra("EXAM_ID", exam.examId)
            Log.d("EDIT_EXAM", "examId = $exam.id")
            startActivity(intent)
        }

        findViewById<Button>(R.id.btnHistory).setOnClickListener {
            val intent = Intent(this, HistoryActivity::class.java)
            intent.putExtra("EXAM_ID", exam?.examId)
            startActivity(intent)
        }

        findViewById<Button>(R.id.btnStatistic).setOnClickListener {
            val intent = Intent(this, StatisticsActivity::class.java)
            intent.putExtra("EXAM_ID", exam?.examId)
            startActivity(intent)
        }

        findViewById<Button>(R.id.btnReturn).setOnClickListener {
            finish()
        }
    }

    private fun openCamera() {
        try {
            val storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
            val file = File.createTempFile("SCAN_${System.currentTimeMillis()}", ".png", storageDir)
            photoFile = file

            val photoUri: Uri = FileProvider.getUriForFile(
                this,
                "com.example.testmarking.fileprovider",
                file
            )
            takePhotoLauncher.launch(photoUri)
        } catch (e: Exception) {
            Toast.makeText(this, "Lỗi khởi tạo camera: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun processMarking(capturedImagePath: String) {
        val currentExam = exam ?: return

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val processor = MarkingProcessor(this@ExamDetailActivity)

                val capturedMat = Imgcodecs.imread(capturedImagePath)
                if (capturedMat.empty()) {
                    throw Exception("Không thể đọc file ảnh từ camera")
                }

                val template = processor.getTemplateFromAssets("Template_17.png")
                val coordsJson = processor.getJsonFromAssets("coord.json") ?: ""

                val type = object : TypeToken<IntArray>() {}.type
                val officialAnsArray: IntArray = Gson().fromJson(currentExam.answerKeyJson, type)

                val result = processor.processAndGrade(
                    capturedMat,
                    template,
                    coordsJson,
                    officialAnsArray.toList(),
                    currentExam.totalQuestions
                )

//                processor.debugThresholdMat?.let { debugMat ->
//                    val debugBitmap = Bitmap.createBitmap(debugMat.cols(), debugMat.rows(), Bitmap.Config.ARGB_8888)
//                    Utils.matToBitmap(debugMat, debugBitmap)
//
////                    saveBitmapToFile(debugBitmap, "debug_threshold_all.jpg")
//                }

                val roundedScore = "%.1f".format(result.score).replace(",", ".").toDouble()
                val bitmap = Bitmap.createBitmap(result.rectifiedImage.cols(), result.rectifiedImage.rows(), Bitmap.Config.ARGB_8888)
                Utils.matToBitmap(result.rectifiedImage, bitmap)
                val resultPath = saveBitmapToFile(bitmap, "result_${System.currentTimeMillis()}.jpg")

                val db = AppDatabase.getInstance(this@ExamDetailActivity)
                val examResult = ExamResult(
                    examId = currentExam.examId,
                    score = roundedScore,
                    correctCount = result.totalCorrect,
                    totalQuestions = currentExam.totalQuestions,
                    gradedAt = System.currentTimeMillis(),
                    myAnswers = result.myAnswers,
                    imagePath = resultPath
                )
                db.examResultDao().insertResult(examResult)
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@ExamDetailActivity, "Lưu bài làm thành công", Toast.LENGTH_SHORT).show()
                }

                capturedMat.release()
                template.release()
                result.rectifiedImage.release()

            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Log.e("MARKING_ERROR", e.stackTraceToString())
                    Toast.makeText(this@ExamDetailActivity, "Lỗi: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        val examId = intent.getLongExtra("EXAM_ID", -1L)
        if (examId != -1L) {
            loadExamData(examId)
        }
    }

    private fun loadExamData(examId: Long) {
        lifecycleScope.launch(Dispatchers.IO) {
            val db = AppDatabase.getInstance(this@ExamDetailActivity)
            val freshExam = db.examDao().getExamById(examId)

            withContext(Dispatchers.Main) {
                if (freshExam != null) {
                    exam = freshExam
                    findViewById<TextView>(R.id.tvExamTitle).text = freshExam.examName
                    Log.d("REFRESH", "Dữ liệu mới: ${freshExam.answerKeyJson}")
                }
            }
        }
    }

//    private fun saveBitmapToFile(bitmap: Bitmap, filename: String): String {
//        val file = File(getExternalFilesDir(Environment.DIRECTORY_PICTURES), filename)
//        FileOutputStream(file).use { out ->
//            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, out)
//        }
//        return file.absolutePath
//    }

    private fun saveBitmapToFile(bitmap: Bitmap, filename: String): String {
        val directory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
        val file = File(directory, filename)

        FileOutputStream(file).use { out ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, out)
        }
        MediaScannerConnection.scanFile(this, arrayOf(file.absolutePath), null, null)

        return file.absolutePath
    }
}
