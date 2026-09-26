package com.example.testmarking

import android.graphics.Color
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.testmarking.data.database.AppDatabase
import com.example.testmarking.data.entities.ExamResult
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.BarData
import com.github.mikephil.charting.data.BarDataSet
import com.github.mikephil.charting.data.BarEntry
import com.github.mikephil.charting.formatter.IndexAxisValueFormatter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class StatisticsActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_statistic)

        val examId = intent.getLongExtra("EXAM_ID", -1L)
        loadStatistics(examId)
        findViewById<Button>(R.id.btnBackFromStat).setOnClickListener {
            finish()
        }
    }

    private fun loadStatistics(examId: Long) {
        lifecycleScope.launch(Dispatchers.IO) {
            val db = AppDatabase.getInstance(this@StatisticsActivity)
            val dao = db.examResultDao()

            val exam = db.examDao().getExamById(examId)
            val avgScore = dao.getAverageScore(examId) ?: 0f
            val totalCount = dao.countAttempts(examId)
            val maxScore = dao.getHighestScore(examId) ?: 0.0
            val minScore = dao.getLowestScore(examId) ?: 0.0

            val results = dao.getAllResultsByExamId(examId)

            withContext(Dispatchers.Main) {
                if (exam != null) {
                    findViewById<TextView>(R.id.tvStName).text = "Bài thi: ${exam.examName}"
                    val sdf = java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale.getDefault())
                    findViewById<TextView>(R.id.tvStDate).text = "Ngày tạo: ${sdf.format(java.util.Date(exam.createdAt))}"
                    findViewById<TextView>(R.id.tvStTotalQ).text = "Tổng số câu hỏi: 50"
                }

                findViewById<TextView>(R.id.tvCount).text = totalCount.toString()
                findViewById<TextView>(R.id.tvAvg).text = "%.1f".format(avgScore)
                findViewById<TextView>(R.id.tvMax).text = "%.1f".format(maxScore)
                findViewById<TextView>(R.id.tvMin).text = "%.1f".format(minScore)

                if (results.isNotEmpty()) {
                    setupChart(results)
                }
            }
        }
    }

    private fun setupChart(results: List<ExamResult>) {
        val barChart = findViewById<com.github.mikephil.charting.charts.BarChart>(R.id.barChart)

        if (results.isEmpty()) return

        val isDarkMode = (resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) ==
                android.content.res.Configuration.UI_MODE_NIGHT_YES
        val textColor = if (isDarkMode) Color.WHITE else Color.BLACK

        val groups = FloatArray(5)
        for (res in results) {
            when {
                res.score < 2 -> groups[0]++
                res.score < 4 -> groups[1]++
                res.score < 6 -> groups[2]++
                res.score < 8 -> groups[3]++
                else -> groups[4]++
            }
        }

        val entries = ArrayList<BarEntry>()
        entries.add(BarEntry(0f, groups[0]))
        entries.add(BarEntry(1f, groups[1]))
        entries.add(BarEntry(2f, groups[2]))
        entries.add(BarEntry(3f, groups[3]))
        entries.add(BarEntry(4f, groups[4]))

        val dataSet = BarDataSet(entries, "Số lượng bài thi")
        dataSet.color = Color.parseColor("#2196F3")
        dataSet.valueTextSize = 12f
        dataSet.valueTextColor = textColor
        dataSet.valueFormatter = object : com.github.mikephil.charting.formatter.ValueFormatter() {
            override fun getFormattedValue(value: Float): String {
                return value.toInt().toString()
            }
        }

        val barData = BarData(dataSet)
        barChart.data = barData

        val leftAxis = barChart.axisLeft
        leftAxis.granularity = 1f
        leftAxis.textColor = textColor
        leftAxis.isGranularityEnabled = true
        leftAxis.axisMinimum = 0f
        leftAxis.valueFormatter = object : com.github.mikephil.charting.formatter.ValueFormatter() {
            override fun getFormattedValue(value: Float): String {
                return value.toInt().toString()
            }
        }

        barChart.axisRight.isEnabled = false

        val labels = arrayOf("0-2", "2-4", "4-6", "6-8", "8-10")
        barChart.xAxis.valueFormatter = IndexAxisValueFormatter(labels)
        barChart.xAxis.position = XAxis.XAxisPosition.BOTTOM
        barChart.xAxis.setDrawGridLines(false)
        barChart.xAxis.granularity = 1f
        barChart.xAxis.textColor = textColor
        barChart.xAxis.yOffset = 10f

        barChart.extraBottomOffset = 15f
        barChart.legend.textColor = textColor
        barChart.description.isEnabled = false
        barChart.animateY(1000)
        barChart.invalidate()
    }
}