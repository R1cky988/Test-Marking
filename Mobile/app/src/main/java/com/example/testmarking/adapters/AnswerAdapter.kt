package com.example.testmarking.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.RadioGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.testmarking.R
import kotlin.collections.toIntArray

class AnswerAdapter(private val answers: MutableList<Int>) : RecyclerView.Adapter<AnswerAdapter.AnswerViewHolder>() {


    inner class AnswerViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvQuestion: TextView = view.findViewById(R.id.tvQuestion)
        val radioGroup: RadioGroup = view.findViewById(R.id.rgAnswer)

    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): AnswerViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_answer_key, parent, false)
        return AnswerViewHolder(view)
    }

    override fun onBindViewHolder(holder: AnswerViewHolder, position: Int) {
        holder.tvQuestion.text = "Câu ${position + 1}"
        holder.radioGroup.setOnCheckedChangeListener(null)
        holder.radioGroup.clearCheck()

        if (answers[position] != -1) {
            val radioBtn = holder.radioGroup.getChildAt(answers[position]) as? android.widget.RadioButton
            radioBtn?.isChecked = true
        }

        holder.radioGroup.setOnCheckedChangeListener { _, checkedId ->
            val radioButton = holder.radioGroup.findViewById<View>(checkedId)
            val index = holder.radioGroup.indexOfChild(radioButton)
            if (index != -1) {
                answers[position] = index
            }
        }
    }

    fun updateQuestionCount(count: Int) {
        val currentSize = answers.size
        if (count > currentSize) {
            for (i in currentSize until count) {
                answers.add(-1)
            }
        } else if (count < currentSize && count >= 0) {
            for (i in currentSize - 1 downTo count) {
                answers.removeAt(i)
            }
        }
        notifyDataSetChanged()
    }

    override fun getItemCount() = answers.size

    fun getAnswers(): IntArray = answers.toIntArray()
}
