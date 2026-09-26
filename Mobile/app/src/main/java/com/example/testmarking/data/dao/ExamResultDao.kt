package com.example.testmarking.data.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.example.testmarking.data.entities.ExamResult

@Dao
interface ExamResultDao {

    @Insert
    suspend fun insertResult(result: ExamResult)

    @Query("""
        SELECT AVG(score) 
        FROM exam_result 
        WHERE examId = :examId
    """)
    suspend fun getAverageScore(examId: Long): Float?

    @Query("""
        SELECT COUNT(*) 
        FROM exam_result 
        WHERE examId = :examId
    """)
    suspend fun countAttempts(examId: Long) : Int

    @Query("SELECT MAX(score) FROM exam_result WHERE examId = :examId")
    suspend fun getHighestScore(examId: Long): Double?

    @Query("SELECT MIN(score) FROM exam_result WHERE examId = :examId")
    suspend fun getLowestScore(examId: Long): Double?

    @Query("SELECT * FROM exam_result WHERE examId = :examId ORDER BY gradedAt DESC")
    suspend fun getAllResultsByExamId(examId: Long): List<ExamResult>

    @Query("SELECT * FROM exam_result WHERE resultId = :resultId")
    suspend fun getResultById(resultId: Long): ExamResult
}