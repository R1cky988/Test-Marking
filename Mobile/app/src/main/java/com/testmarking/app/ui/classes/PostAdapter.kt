package com.testmarking.app.ui.classes

import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.testmarking.app.R
import com.testmarking.app.data.PostDto
import com.testmarking.app.databinding.ItemPostBinding
import com.testmarking.app.util.TimeFormat
import com.testmarking.app.util.initialOf
import com.testmarking.app.util.show

class PostAdapter(
    private val onLike: (PostDto) -> Unit,
    private val onComments: (PostDto) -> Unit,
    private val onDelete: (PostDto) -> Unit,
) : ListAdapter<PostDto, PostAdapter.Holder>(Diff) {

    class Holder(val binding: ItemPostBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder =
        Holder(ItemPostBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val post = getItem(position)
        val b = holder.binding
        val ctx = b.root.context

        b.tvAvatar.text = initialOf(post.author?.name)
        b.tvAuthor.text = post.author?.name.orEmpty()
        b.tvTime.text = TimeFormat.relative(ctx, post.publishedAt ?: post.createdAt)

        val announcement = post.type.equals("ANNOUNCEMENT", ignoreCase = true)
        val pinned = post.isPinned == true
        val statusRes = when (post.status?.uppercase()) {
            "DRAFT" -> R.string.post_badge_draft
            "CLOSED" -> R.string.post_badge_closed
            else -> null
        }
        b.tvAnnouncement.show(announcement)
        b.tvPinned.show(pinned)
        b.tvStatus.show(statusRes != null)
        if (statusRes != null) b.tvStatus.setText(statusRes)
        b.badges.show(announcement || pinned || statusRes != null)

        val title = post.title?.trim().orEmpty()
        b.tvTitle.show(title.isNotEmpty())
        b.tvTitle.text = title
        b.tvContent.text = post.content.orEmpty()

        val files = post.attachments?.size ?: 0
        b.tvAttach.show(files > 0)
        b.tvAttach.text = ctx.getString(R.string.post_attachments, files)

        val liked = post.reactions?.viewerReaction != null
        val color = ContextCompat.getColor(ctx, if (liked) R.color.primary else R.color.text_secondary)
        b.btnLike.text = (post.reactions?.totalCount ?: 0L).toString()
        b.btnLike.setTextColor(color)
        b.btnLike.iconTint = ColorStateList.valueOf(color)
        b.btnLike.setOnClickListener { onLike(post) }

        b.btnComment.text = (post.commentCount ?: (post.comments?.size ?: 0).toLong()).toString()
        b.btnComment.setOnClickListener { onComments(post) }

        b.btnDelete.show(post.canDelete == true)
        b.btnDelete.setOnClickListener { onDelete(post) }
    }

    private object Diff : DiffUtil.ItemCallback<PostDto>() {
        override fun areItemsTheSame(a: PostDto, b: PostDto) = a.id == b.id
        override fun areContentsTheSame(a: PostDto, b: PostDto) = a == b
    }
}
