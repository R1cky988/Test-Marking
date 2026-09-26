package com.example.testmarking

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.testmarking.data.database.AppDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.opencv.android.OpenCVLoader


class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        findViewById<Button>(R.id.btnCreateExam).setOnClickListener {
            startActivity(Intent(this, CreateExamActivity::class.java))
        }

        findViewById<Button>(R.id.btnExamList).setOnClickListener {
            startActivity(Intent(this, ExamListActivity::class.java))
        }
        if (OpenCVLoader.initDebug()) {
            Log.d("OPENCV", "OpenCV loaded successfully")
        } else {
            Log.e("OPENCV", "OpenCV initialization failed")
        }

//        lifecycleScope.launch(Dispatchers.IO) {
//            val db = AppDatabase.getInstance(this@MainActivity)
//            // Thực hiện một lệnh dummy để kích hoạt DB
//            db.examDao().getAllExams()
//            Log.d("Database", "Database has been initialized")
//        }
    }

//    override fun onResume() {
//        super.onResume()
//        if (!OpenCVLoader.initDebug()) {
//            Log.e("OpenCV", "Internal OpenCV library not found.")
//        } else {
//            Log.d("OpenCV", "OpenCV library found inside package. Using it!")
//        }
//    }
}
