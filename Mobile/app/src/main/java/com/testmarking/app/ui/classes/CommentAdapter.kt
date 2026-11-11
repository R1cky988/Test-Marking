package com.testmarking.app.ui.classes

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.testmarking.app.data.CommentDto
import com.testmarking.app.databinding.ItemCommentBinding
import com.testmarking.app.util.TimeFormat
import com.testmarking.app.util.dp
import com.testmarking.app.util.initialOf
import com.testmarking.app.util.show

/** A comment and how deep it sits (0 = answer to the post, 1 = reply, ...). */
data class CommentRow(val comment: CommentDto, val depth: Int)

/** Puts every reply right under its parent. */
fun flattenComments(all: List<CommentDto>): List<CommentRow> {
    val byParent = all.groupBy { it.parentId }
    val out = ArrayList<CommentRow>()
    fun walk(parent: String?, depth: Int) {
        for (c in byParent[parent].orEmpty()) {
            out.add(CommentRow(c, depth))
            walk(c.id, depth + 1)
        }
    }
    walk(null, 0)
    return out
}

class CommentAdapter(
    private val canReply: Boolean,
    private val onReply: (CommentDto) -> Unit,
    private val onDelete: (CommentDto) -> Unit,
) : ListAdapter<CommentRow, CommentAdapter.Holder>(Diff) {

    class Holder(val binding: ItemCommentBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder =
        Holder(ItemCommentBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val row = getItem(position)
        val c = row.comment
        val b = holder.binding
        val ctx = b.root.context

        b.root.setPadding(ctx.dp(minOf(row.depth, 3) * 20), b.root.paddingTop, b.root.paddingRight, b.root.paddingBottom)
        b.tvAvatar.text = initialOf(c.author?.name)
        b.tvAuthor.text = c.author?.name.orEmpty()
        b.tvContent.text = c.content.orEmpty()
        b.tvTime.text = TimeFormat.relative(ctx, c.createdAt)
        b.btnReply.show(canReply)
        b.btnReply.setOnClickListener { onReply(c) }
        b.btnDelete.show(c.canDelete == true)
        b.btnDelete.setOnClickListener { onDelete(c) }
    }

    private object Diff : DiffUtil.ItemCallback<CommentRow>() {
        override fun areItemsTheSame(a: CommentRow, b: CommentRow) = a.comment.id == b.comment.id
        override fun areContentsTheSame(a: CommentRow, b: CommentRow) = a == b
    }
}
