package com.example.testmarking.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.testmarking.R
import com.example.testmarking.data.entities.Exam

class ExamListAdapter(
    private var exams: List<Exam>,
    private val onClick: (Exam) -> Unit
) : RecyclerView.Adapter<ExamListAdapter.ExamViewHolder>() {

    inner class ExamViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvName: TextView = view.findViewById(R.id.tvExamName)
        val tvInfo: TextView = view.findViewById(R.id.tvExamInfo)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ExamViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_exam, parent, false)
        return ExamViewHolder(view)
    }

    override fun onBindViewHolder(holder: ExamViewHolder, position: Int) {
        val exam = exams[position]

        holder.tvName.text = exam.examName
        holder.tvInfo.text = "50 câu"
        holder.itemView.setOnClickListener {
            onClick(exam)
        }
    }

    override fun getItemCount() = exams.size
    fun updateData(newExams: List<Exam>) {
        this.exams = newExams
        notifyDataSetChanged()
    }
}
