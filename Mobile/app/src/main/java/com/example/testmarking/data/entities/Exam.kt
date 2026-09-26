package com.example.testmarking.data.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "exam")
data class Exam(
    @PrimaryKey(autoGenerate = true)
    val examId: Long = 0,

    val examName: String,

    // JSON: ["A","B","C","D"]
    val answerKeyJson: String,

    val totalQuestions: Int = 50,

    val createdAt: Long = System.currentTimeMillis()
)