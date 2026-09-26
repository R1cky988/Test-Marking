package com.example.testmarking.data.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import com.example.testmarking.data.Converters
import com.example.testmarking.data.dao.ExamDao
import com.example.testmarking.data.dao.ExamResultDao
import com.example.testmarking.data.entities.Exam
import com.example.testmarking.data.entities.ExamResult

@Database(
    entities = [Exam::class, ExamResult::class],
    version = 2
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {

    abstract fun examDao(): ExamDao
    abstract fun examResultDao(): ExamResultDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "exam_database"
                )
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
