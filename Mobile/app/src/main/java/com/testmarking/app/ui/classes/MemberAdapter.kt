package com.testmarking.app.ui.classes

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.annotation.StringRes
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.testmarking.app.R
import com.testmarking.app.data.JoinRequestDto
import com.testmarking.app.data.MemberStudentDto
import com.testmarking.app.data.MemberTeacherDto
import com.testmarking.app.databinding.ItemJoinRequestBinding
import com.testmarking.app.databinding.ItemMemberBinding
import com.testmarking.app.databinding.ItemSectionHeaderBinding
import com.testmarking.app.util.initialOf
import com.testmarking.app.util.show

sealed class MemberRow {
    data class Header(@StringRes val titleRes: Int, val count: Int) : MemberRow()
    data class Teacher(val dto: MemberTeacherDto) : MemberRow()
    data class Student(val dto: MemberStudentDto, val canRemove: Boolean) : MemberRow()
    data class Request(val dto: JoinRequestDto) : MemberRow()
}

class MemberAdapter(
    private val onRemove: (MemberStudentDto) -> Unit,
    private val onApprove: (JoinRequestDto) -> Unit,
    private val onReject: (JoinRequestDto) -> Unit,
) : ListAdapter<MemberRow, RecyclerView.ViewHolder>(Diff) {

    private class HeaderHolder(val binding: ItemSectionHeaderBinding) : RecyclerView.ViewHolder(binding.root)
    private class MemberHolder(val binding: ItemMemberBinding) : RecyclerView.ViewHolder(binding.root)
    private class RequestHolder(val binding: ItemJoinRequestBinding) : RecyclerView.ViewHolder(binding.root)

    override fun getItemViewType(position: Int): Int = when (getItem(position)) {
        is MemberRow.Header -> TYPE_HEADER
        is MemberRow.Teacher, is MemberRow.Student -> TYPE_MEMBER
        is MemberRow.Request -> TYPE_REQUEST
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return when (viewType) {
            TYPE_HEADER -> HeaderHolder(ItemSectionHeaderBinding.inflate(inflater, parent, false))
            TYPE_REQUEST -> RequestHolder(ItemJoinRequestBinding.inflate(inflater, parent, false))
            else -> MemberHolder(ItemMemberBinding.inflate(inflater, parent, false))
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (val row = getItem(position)) {
            is MemberRow.Header -> {
                val b = (holder as HeaderHolder).binding
                b.tvTitle.setText(row.titleRes)
                b.tvCount.text = row.count.toString()
            }
            is MemberRow.Teacher -> {
                val b = (holder as MemberHolder).binding
                b.tvAvatar.text = initialOf(row.dto.name)
                b.tvName.text = row.dto.name.orEmpty()
                b.tvSub.text = row.dto.email.orEmpty()
                b.tvSub.show(!row.dto.email.isNullOrBlank())
                b.btnRemove.show(false)
            }
            is MemberRow.Student -> {
                val b = (holder as MemberHolder).binding
                val ctx = b.root.context
                val dto = row.dto
                b.tvAvatar.text = initialOf(dto.name)
                b.tvName.text = dto.name.orEmpty()
                val parts = listOfNotNull(
                    dto.studentCode?.takeIf { it.isNotBlank() }?.let { ctx.getString(R.string.members_student_code, it) },
                    dto.email?.takeIf { it.isNotBlank() },
                )
                b.tvSub.text = parts.joinToString(" · ")
                b.tvSub.show(parts.isNotEmpty())
                b.btnRemove.show(row.canRemove)
                b.btnRemove.setOnClickListener { onRemove(dto) }
            }
            is MemberRow.Request -> {
                val b = (holder as RequestHolder).binding
                val dto = row.dto
                val student = dto.student
                b.tvAvatar.text = initialOf(student?.name)
                b.tvName.text = student?.name.orEmpty()
                b.tvSub.text = listOfNotNull(student?.studentCode, student?.email).filter { it.isNotBlank() }.joinToString(" · ")
                b.tvMessage.show(!dto.message.isNullOrBlank())
                b.tvMessage.text = dto.message.orEmpty()
                b.btnApprove.setOnClickListener { onApprove(dto) }
                b.btnReject.setOnClickListener { onReject(dto) }
            }
        }
    }

    private object Diff : DiffUtil.ItemCallback<MemberRow>() {
        private fun key(r: MemberRow): String = when (r) {
            is MemberRow.Header -> "h${r.titleRes}"
            is MemberRow.Teacher -> "t${r.dto.id}"
            is MemberRow.Student -> "s${r.dto.id}"
            is MemberRow.Request -> "r${r.dto.id}"
        }

        override fun areItemsTheSame(a: MemberRow, b: MemberRow) = key(a) == key(b)
        override fun areContentsTheSame(a: MemberRow, b: MemberRow) = a == b
    }

    private companion object {
        const val TYPE_HEADER = 0
        const val TYPE_MEMBER = 1
        const val TYPE_REQUEST = 2
    }
}
