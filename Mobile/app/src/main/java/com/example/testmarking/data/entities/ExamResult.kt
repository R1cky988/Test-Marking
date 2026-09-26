package com.example.testmarking.data.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "exam_result")
data class ExamResult(
    @PrimaryKey(autoGenerate = true)
    val resultId: Long = 0,
    val examId: Long,
    val score: Double,
    val imagePath: String,
    val correctCount: Int,
    val totalQuestions: Int,
    val gradedAt: Long,

    // Thêm trường này để lưu danh sách đáp án (C, D, A, E...)
    val myAnswers: List<String>
)