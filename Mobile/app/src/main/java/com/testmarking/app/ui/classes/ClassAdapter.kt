package com.testmarking.app.ui.classes

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.testmarking.app.R
import com.testmarking.app.data.ClassItemDto
import com.testmarking.app.databinding.ItemClassBinding
import com.testmarking.app.util.show

class ClassAdapter(
    private val showTeacher: Boolean,
    private val onClick: (ClassItemDto) -> Unit,
) : ListAdapter<ClassItemDto, ClassAdapter.Holder>(Diff) {

    class Holder(val binding: ItemClassBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder =
        Holder(ItemClassBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val item = getItem(position)
        val b = holder.binding
        val ctx = b.root.context
        b.ivIcon.setImageResource(if (showTeacher) R.drawable.ic_school else R.drawable.ic_teach)
        b.tvName.text = item.className.orEmpty()
        b.tvSubject.text = item.subject?.takeIf { it.isNotBlank() } ?: ctx.getString(R.string.class_code_label, item.classCode.orEmpty())
        b.tvArchived.show(item.status.equals("archived", ignoreCase = true))

        val teacherName = item.teacher?.name?.takeIf { it.isNotBlank() }
        b.tvTeacher.show(showTeacher && teacherName != null)
        b.tvTeacher.text = teacherName?.let { ctx.getString(R.string.class_teacher_label, it) }

        b.tvStudents.text = ctx.getString(R.string.class_students_count, (item.studentCount ?: 0L).toInt())
        b.tvCode.text = ctx.getString(R.string.class_code_label, item.classCode.orEmpty())
        b.root.setOnClickListener { onClick(item) }
    }

    private object Diff : DiffUtil.ItemCallback<ClassItemDto>() {
        override fun areItemsTheSame(a: ClassItemDto, b: ClassItemDto) = a.id == b.id
        override fun areContentsTheSame(a: ClassItemDto, b: ClassItemDto) = a == b
    }
}
