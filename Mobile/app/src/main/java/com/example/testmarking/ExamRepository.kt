package com.example.testmarking

import android.content.Context
import android.util.Log
import com.example.testmarking.models.Exam
import com.google.gson.Gson

object ExamRepository {

    private const val FILE_NAME = "exams.json"
    private val gson = Gson()

    fun saveExam(context: Context, exam: Exam) {
        val exams = getAll(context).toMutableList()
        exams.add(exam)
        saveAll(context, exams)

        Log.d("FILE_PATH", context.filesDir.absolutePath)
    }

    fun getAll(context: Context): List<Exam> {
        return try {
            val json = context.openFileInput(FILE_NAME)
                .bufferedReader()
                .readText()

            gson.fromJson(json, Array<Exam>::class.java).toList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun getById(context: Context, id: Long): Exam? {
        return getAll(context).find { it.id == id }
    }

    fun update(context: Context, updatedExam: Exam) {
        val exams = getAll(context).toMutableList()
        val index = exams.indexOfFirst { it.id == updatedExam.id }

        if (index != -1) {
            exams[index] = updatedExam
            saveAll(context, exams)
        }
    }

    private fun saveAll(context: Context, exams: List<Exam>) {
        val json = gson.toJson(exams)
        context.openFileOutput(FILE_NAME, Context.MODE_PRIVATE).use {
            it.write(json.toByteArray())
        }
    }
}
