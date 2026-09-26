package com.example.testmarking.data.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.example.testmarking.data.entities.Exam

@Dao
interface ExamDao {

    @Insert
    suspend fun insertExam(exam: Exam)

    @Query("SELECT * FROM exam")
    suspend fun getAllExams(): List<Exam>

    @Query("SELECT * FROM exam WHERE examId = :id")
    suspend fun getExamById(id: Long): Exam

    @Update
    suspend fun updateExam(exam: Exam)
}