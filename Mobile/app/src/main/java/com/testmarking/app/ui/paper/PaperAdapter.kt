package com.testmarking.app.ui.paper

import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.testmarking.app.R
import com.testmarking.app.data.PaperAnswerDto
import com.testmarking.app.databinding.ItemPaperRowBinding

/**
 * The marked sheet, one row per question. A ticked option that is right is green, a ticked option that is wrong is red,
 * and the right option the student missed is yellow. Options he did not touch stay empty circles.
 */
class PaperAdapter(private val answers: List<PaperAnswerDto>) : RecyclerView.Adapter<PaperAdapter.Holder>() {
    class Holder(val binding: ItemPaperRowBinding) : RecyclerView.ViewHolder(binding.root)

    /** A..D at least; E and beyond when the sheet has more options */
    private val letters: List<String> = run {
        var top = 'D'
        for (a in answers) for (c in split(a.choice) + split(a.correctAnswer)) if (c.isNotEmpty() && c[0] > top) top = c[0]
        ('A'..top).map { it.toString() }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = Holder(ItemPaperRowBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun getItemCount() = answers.size

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val a = answers[position]
        val b = holder.binding
        val ctx = b.root.context
        b.tvNo.text = ctx.getString(R.string.paper_question, a.order)
        val chosen = split(a.choice).toSet()
        val right = split(a.correctAnswer).toSet()
        b.tvNo.setTextColor(ContextCompat.getColor(ctx, if (a.isCorrect) R.color.success_fg else R.color.danger_fg))
        b.options.removeAllViews()
        val size = (34 * ctx.resources.displayMetrics.density).toInt()
        val gap = (10 * ctx.resources.displayMetrics.density).toInt()
        for (l in letters) {
            val isChosen = l in chosen
            val isRight = l in right
            val fill = when {
                isChosen && isRight -> R.color.paper_right
                isChosen -> R.color.paper_wrong
                isRight && !a.isCorrect -> R.color.paper_hint
                else -> null
            }
            val bubble = TextView(ctx).apply {
                text = l
                gravity = Gravity.CENTER
                textSize = 13f
                typeface = Typeface.DEFAULT_BOLD
                background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    if (fill != null) setColor(ContextCompat.getColor(ctx, fill)) else setColor(Color.TRANSPARENT)
                    setStroke((2 * ctx.resources.displayMetrics.density).toInt(), ContextCompat.getColor(ctx, if (fill != null) fill else R.color.border))
                }
                setTextColor(ContextCompat.getColor(ctx, if (fill == R.color.paper_wrong || fill == R.color.paper_right) R.color.on_primary else R.color.paper_ink))
            }
            b.options.addView(bubble, LinearLayout.LayoutParams(size, size).apply { marginEnd = gap })
        }
        b.tvBlank.visibility = if (chosen.isEmpty()) android.view.View.VISIBLE else android.view.View.GONE
    }

    private fun split(v: String?): List<String> = v.orEmpty().split(',').map { it.trim().uppercase() }.filter { it.isNotEmpty() }
}
