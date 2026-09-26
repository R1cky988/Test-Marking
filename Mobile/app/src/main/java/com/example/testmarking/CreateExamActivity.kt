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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class CreateExamActivity : AppCompatActivity() {

    private lateinit var adapter: AnswerAdapter
    private var answerList = mutableListOf<Int>()

//    val defaultAnswers = IntArray(50) { -1 }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_create_exam)

        val edtName = findViewById<EditText>(R.id.edtExamName)
        val edtTotalQuestions = findViewById<EditText>(R.id.edtTotalQuestions)
        val recyclerView = findViewById<RecyclerView>(R.id.rvAnswerKey)
        val btnSave = findViewById<Button>(R.id.btnSaveExam)
        val btnReturn = findViewById<Button>(R.id.btnReturn)

        adapter = AnswerAdapter(answerList)

        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter

        edtTotalQuestions.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: android.text.Editable?) {
                val input = s.toString()
                if (input.isNotEmpty()) {
                    val count = input.toIntOrNull() ?: 0
                    if (count <= 100) { // Giới hạn nếu cần
                        adapter.updateQuestionCount(count)
                    }
                } else {
                    adapter.updateQuestionCount(0)
                }
            }
        })

        btnSave.setOnClickListener {
            val name = edtName.text.toString().trim()
            val answers = adapter.getAnswers()

            if (name.isBlank()) {
                Toast.makeText(this, "Vui lòng nhập tên bài thi", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (name.isBlank() || answers.isEmpty()) {
                Toast.makeText(this, "Vui lòng nhập số câu hỏi", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val gson = Gson()
            val answersJson = gson.toJson(answers)

            val newExam = Exam(
                examName = name,
                answerKeyJson = answersJson,
                totalQuestions = answers.size
            )

            lifecycleScope.launch(Dispatchers.IO) {
                val db = AppDatabase.getInstance(this@CreateExamActivity)
                db.examDao().insertExam(newExam)

                withContext(Dispatchers.Main) {
                    Toast.makeText(this@CreateExamActivity, "Đã lưu: $name", Toast.LENGTH_SHORT).show()
                    finish()
                }
            }
        }

        btnReturn.setOnClickListener {
            finish()
        }
    }
}
