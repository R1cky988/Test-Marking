package com.example.testmarking.adapters

import android.content.Intent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.testmarking.R
import com.example.testmarking.ViewImageActivity
import com.example.testmarking.data.entities.ExamResult

class HistoryAdapter(private val results: List<ExamResult>) :
    RecyclerView.Adapter<HistoryAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvScore: TextView = view.findViewById(R.id.tvHistoryScore)
        val tvDate: TextView = view.findViewById(R.id.tvHistoryDate)
        val tvDetail: TextView = view.findViewById(R.id.tvHistoryDetail)

        val tvId: TextView = view.findViewById(R.id.tvHistoryId)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_history, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = results[position]

        holder.tvId.text = "ID #${item.resultId}"
        holder.tvScore.text = String.format("%.1f", item.score)

        val date = java.util.Date(item.gradedAt)
        val format = java.text.SimpleDateFormat("dd/MM/yyyy HH:mm", java.util.Locale.getDefault())
        holder.tvDate.text = format.format(date)
        holder.tvDetail.text = "Đúng ${item.correctCount}/${item.totalQuestions} câu"
        holder.itemView.setOnClickListener {
            val context = holder.itemView.context
            val intent = Intent(context, ViewImageActivity::class.java)
            intent.putExtra("IMAGE_PATH", item.imagePath)
            context.startActivity(intent)
        }
    }

    override fun getItemCount() = results.size
}