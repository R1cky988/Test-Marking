package com.example.testmarking

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.testmarking.adapters.AnswerAdapter
import com.example.testmarking.data.database.AppDatabase
import com.example.testmarking.data.entities.Exam
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class EditExamActivity : AppCompatActivity() {

    private lateinit var exam: Exam
    private lateinit var answerAdapter: AnswerAdapter
    private val gson = Gson()

    private var answerList = mutableListOf<Int>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_create_exam)

        val examId = intent.getLongExtra("EXAM_ID", -1L)
        if (examId == -1L) {
            finish()
            return
        }

        val edtName = findViewById<EditText>(R.id.edtExamName)
        val edtTotalQuestions = findViewById<EditText>(R.id.edtTotalQuestions)
        val rvAnswers = findViewById<RecyclerView>(R.id.rvAnswerKey)
        rvAnswers.layoutManager = LinearLayoutManager(this)

        answerAdapter = AnswerAdapter(answerList)
        rvAnswers.adapter = answerAdapter

        lifecycleScope.launch(Dispatchers.IO) {
            val db = AppDatabase.getInstance(this@EditExamActivity)
            val fetchedExam = db.examDao().getExamById(examId)

            withContext(Dispatchers.Main) {
                if (fetchedExam != null) {
                    exam = fetchedExam
                    edtName.setText(fetchedExam.examName)

                    edtTotalQuestions.setText(fetchedExam.totalQuestions.toString())

                    // 2. Chuyển JSON string thành IntArray để đưa vào Adapter
                    val type = object : TypeToken<List<Int>>() {}.type
                    val savedAnswers: List<Int> = gson.fromJson(fetchedExam.answerKeyJson, type)

                    answerList.clear()
                    answerList.addAll(savedAnswers)
                    answerAdapter.notifyDataSetChanged()
                } else {
                    finish()
                }
            }
        }

        edtTotalQuestions.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: android.text.Editable?) {
                val count = s.toString().toIntOrNull() ?: 0
                answerAdapter.updateQuestionCount(count)
            }
        })

        findViewById<Button>(R.id.btnSaveExam).setOnClickListener {
            val newName = edtName.text.toString().trim()
            if (newName.isEmpty()) return@setOnClickListener

            val updatedAnswersArray = answerAdapter.getAnswers()
            val updatedAnswersJson = gson.toJson(updatedAnswersArray)

            lifecycleScope.launch(Dispatchers.IO) {
                val db = AppDatabase.getInstance(this@EditExamActivity)

                // Tạo bản sao mới để update
                exam?.let {
                    val updatedExam = it.copy(
                        examName = newName,
                        answerKeyJson = updatedAnswersJson,
                        totalQuestions = updatedAnswersArray.size
                    )
                    db.examDao().updateExam(updatedExam) // Cần thêm hàm này vào Dao

                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@EditExamActivity, "Đã cập nhật", Toast.LENGTH_SHORT).show()
                        finish()
                    }
                }
            }
        }

        findViewById<Button>(R.id.btnReturn).setOnClickListener {
            finish()
        }
    }
}


