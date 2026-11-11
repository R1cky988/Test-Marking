package com.testmarking.app.ui.exam

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.testmarking.app.R
import com.testmarking.app.data.ParticipantDto
import com.testmarking.app.databinding.ItemParticipantBinding
import com.testmarking.app.util.TimeFormat
import com.testmarking.app.util.show
import java.util.Locale

class ParticipantAdapter(
    private val onUnlock: (ParticipantDto) -> Unit,
    private val onDecide: (ParticipantDto) -> Unit,
) : ListAdapter<ParticipantDto, ParticipantAdapter.Holder>(Diff) {

    /** the student being unlocked right now (his button is off) */
    var unlocking: String? = null
        set(value) {
            field = value
            notifyDataSetChanged()
        }

    class Holder(val binding: ItemParticipantBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        Holder(ItemParticipantBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val p = getItem(position)
        val b = holder.binding
        val ctx = b.root.context
        b.tvName.text = p.fullName.orEmpty()
        b.tvStatus.text = ctx.getString(
            when {
                p.hasResult == true && p.isViolation == true -> R.string.manage_status_violation
                p.attemptStatus == "LOCKED" -> R.string.manage_status_locked
                p.isFlagged == true && p.flagDecision == null -> R.string.manage_status_flagged
                p.attemptStatus == "IN_PROGRESS" -> R.string.manage_status_in_progress
                p.hasResult == true || p.attemptStatus == "SUBMITTED" -> R.string.manage_status_submitted
                p.attemptStatus == "NOT_STARTED" -> R.string.manage_status_not_started
                else -> R.string.manage_status_none
            },
        )
        val lines = ArrayList<String>()
        p.studentCode?.takeIf { it.isNotBlank() }?.let { lines.add(ctx.getString(R.string.manage_line_code, it)) }
        if (p.hasResult == true) {
            lines.add(ctx.getString(R.string.manage_line_score, p.totalScore?.let { String.format(Locale("vi", "VN"), "%.2f", it) } ?: "—"))
        }
        if (p.isFlagged == true) {
            lines.add(ctx.getString(R.string.manage_line_flag, p.flagReason.orEmpty()))
            lines.add(
                when (p.flagDecision) {
                    "ZERO" -> ctx.getString(R.string.manage_flag_zero)
                    "DEDUCT" -> ctx.getString(R.string.manage_flag_deduct, String.format(Locale("vi", "VN"), "%.2f", p.penaltyPoints ?: 0.0))
                    "DISMISS" -> ctx.getString(R.string.manage_flag_dismiss)
                    else -> ctx.getString(R.string.manage_flag_pending)
                },
            )
        }
        p.leftCount?.takeIf { it > 0 }?.let { lines.add(ctx.getString(R.string.manage_line_left, it)) }
        // when the system marked the paper, and (online) when the phone's copy reached it
        p.gradedAt?.let { lines.add(ctx.getString(R.string.manage_line_graded, TimeFormat.dateTime(it))) }
        p.syncedAt?.let { lines.add(ctx.getString(R.string.manage_line_synced, TimeFormat.dateTime(it))) }
        if (p.gradedAt == null && p.syncedAt == null) {
            p.submittedAt?.let { lines.add(ctx.getString(R.string.manage_line_submitted, TimeFormat.dateTime(it))) }
        }
        b.tvDetail.text = lines.joinToString("\n")
        b.tvDetail.show(lines.isNotEmpty())
        val locked = p.attemptStatus == "LOCKED"
        b.btnDecide.show(p.isFlagged == true)
        b.btnDecide.isEnabled = unlocking != p.studentId
        b.btnDecide.setOnClickListener { onDecide(p) }
        b.btnUnlock.show(locked)
        b.btnUnlock.isEnabled = unlocking != p.studentId
        b.btnUnlock.setOnClickListener { onUnlock(p) }
    }

    private object Diff : DiffUtil.ItemCallback<ParticipantDto>() {
        override fun areItemsTheSame(a: ParticipantDto, b: ParticipantDto) = a.studentId == b.studentId
        override fun areContentsTheSame(a: ParticipantDto, b: ParticipantDto) = a == b
    }
}
