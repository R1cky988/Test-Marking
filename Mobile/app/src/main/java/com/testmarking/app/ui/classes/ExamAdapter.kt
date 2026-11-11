package com.testmarking.app.ui.classes

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.annotation.StringRes
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.testmarking.app.data.ExamItemDto
import com.testmarking.app.databinding.ItemExamBinding
import com.testmarking.app.databinding.ItemSectionHeaderBinding
import com.testmarking.app.util.TimeFormat

sealed class ExamRow {
    data class Header(@StringRes val titleRes: Int, val count: Int) : ExamRow()
    data class Item(val exam: ExamItemDto) : ExamRow()
}

class ExamAdapter(
    private val onClick: (ExamItemDto) -> Unit,
) : ListAdapter<ExamRow, RecyclerView.ViewHolder>(Diff) {

    private class HeaderHolder(val binding: ItemSectionHeaderBinding) : RecyclerView.ViewHolder(binding.root)
    private class ItemHolder(val binding: ItemExamBinding) : RecyclerView.ViewHolder(binding.root)

    override fun getItemViewType(position: Int): Int = if (getItem(position) is ExamRow.Header) TYPE_HEADER else TYPE_ITEM

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return if (viewType == TYPE_HEADER) {
            HeaderHolder(ItemSectionHeaderBinding.inflate(inflater, parent, false))
        } else {
            ItemHolder(ItemExamBinding.inflate(inflater, parent, false))
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (val row = getItem(position)) {
            is ExamRow.Header -> {
                val b = (holder as HeaderHolder).binding
                b.tvTitle.setText(row.titleRes)
                b.tvCount.text = row.count.toString()
            }
            is ExamRow.Item -> {
                val b = (holder as ItemHolder).binding
                val ctx = b.root.context
                val e = row.exam
                b.tvName.text = e.name.orEmpty()
                b.tvStatus.text = ClassLabels.examStatus(ctx, e.status)
                val subject = e.subject?.takeIf { it.isNotBlank() }
                val format = ClassLabels.format(ctx, e.format)
                b.tvMeta.text = if (subject != null) "$subject · $format" else format
                b.tvTime.text = "${TimeFormat.dateTime(e.fromTime)} – ${TimeFormat.dateTime(e.toTime)}"
                b.root.setOnClickListener { onClick(e) }
            }
        }
    }

    private object Diff : DiffUtil.ItemCallback<ExamRow>() {
        override fun areItemsTheSame(a: ExamRow, b: ExamRow): Boolean = when {
            a is ExamRow.Header && b is ExamRow.Header -> a.titleRes == b.titleRes
            a is ExamRow.Item && b is ExamRow.Item -> a.exam.id == b.exam.id
            else -> false
        }

        override fun areContentsTheSame(a: ExamRow, b: ExamRow) = a == b
    }

    private companion object {
        const val TYPE_HEADER = 0
        const val TYPE_ITEM = 1
    }
}
