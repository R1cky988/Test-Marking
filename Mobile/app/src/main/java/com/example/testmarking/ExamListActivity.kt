package com.example.testmarking

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat.startActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.DividerItemDecoration
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.testmarking.adapters.ExamListAdapter
import com.example.testmarking.data.database.AppDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class ExamListActivity : AppCompatActivity() {

    private lateinit var adapter : ExamListAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_exam_list)

        val rv = findViewById<RecyclerView>(R.id.rvExamList)
        rv.layoutManager = LinearLayoutManager(this)

        adapter = ExamListAdapter(emptyList()) { exam ->
            val intent = Intent(this, ExamDetailActivity::class.java)
            intent.putExtra("EXAM_ID", exam.examId)
            startActivity(intent)
        }

        rv.adapter = adapter

        loadExams()

        val btnReturn = findViewById<Button>(R.id.btnReturn)
        btnReturn.setOnClickListener {
            finish()
        }
    }
    private fun loadExams() {
        lifecycleScope.launch(Dispatchers.IO) {
            val db = AppDatabase.getInstance(this@ExamListActivity)
            val examList = db.examDao().getAllExams()


            withContext(Dispatchers.Main) {
                adapter.updateData(examList)
            }
        }
    }
}
