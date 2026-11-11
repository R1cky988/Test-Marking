package com.testmarking.app.data.local

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

/** Where the student is in an online exam. Kept on the phone, so a lost connection never loses an answer. */
object AttemptStatus {
    const val IN_PROGRESS = "IN_PROGRESS"
    const val LOCKED = "LOCKED"

    /** handed in on the phone, waiting for the network: the server marks it only when the sync arrives */
    const val FINISHED = "FINISHED"

    /** the server has marked it */
    const val SYNCED = "SYNCED"
}

data class LocalAttempt(
    val examId: String,
    /** the account the paper belongs to (two students may use one phone) */
    val userKey: String,
    val paperJson: String,
    /** question number -> chosen labels ("B", "A,C") */
    val answers: Map<Int, String>,
    val currentIndex: Int,
    val leftCount: Int,
    val status: String,
    /** the end of the exam on THIS phone's clock (server deadline minus the server/phone clock difference) */
    val deadlineMs: Long,
    /** closed book: the end of the current question, 0 = not running */
    val questionDeadlineMs: Long,
    val finishedAt: String?,
    /** set while the exam is locked (also on a finished paper that the server locked) */
    val lockReason: String?,
    val resultJson: String?,
    /** when the server received the paper, phone clock; 0 = not yet */
    val syncedAtMs: Long,
    val lastError: String?,
)

class AttemptStore(context: Context) : SQLiteOpenHelper(context.applicationContext, "attempts.db", null, 1) {
    private val gson = Gson()
    private val mapType = object : TypeToken<Map<String, String>>() {}.type

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """CREATE TABLE attempts (
                exam_id TEXT NOT NULL, user_key TEXT NOT NULL, paper TEXT NOT NULL, answers TEXT NOT NULL,
                current_index INTEGER NOT NULL, left_count INTEGER NOT NULL, status TEXT NOT NULL,
                deadline_ms INTEGER NOT NULL, q_deadline_ms INTEGER NOT NULL, finished_at TEXT, lock_reason TEXT,
                result TEXT, synced_at_ms INTEGER NOT NULL DEFAULT 0, last_error TEXT,
                PRIMARY KEY (exam_id, user_key))""",
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit

    @Synchronized
    fun get(examId: String, userKey: String): LocalAttempt? =
        readableDatabase.query("attempts", null, "exam_id=? AND user_key=?", arrayOf(examId, userKey), null, null, null).use { c ->
            if (c.moveToFirst()) read(c) else null
        }

    /** Papers of this account that were handed in but not yet marked by the server. */
    @Synchronized
    fun waiting(userKey: String): List<LocalAttempt> =
        readableDatabase.query("attempts", null, "user_key=? AND status=?", arrayOf(userKey, AttemptStatus.FINISHED), null, null, null).use { c ->
            val list = ArrayList<LocalAttempt>()
            while (c.moveToNext()) list.add(read(c))
            list
        }

    @Synchronized
    fun save(a: LocalAttempt) {
        val v = ContentValues().apply {
            put("exam_id", a.examId)
            put("user_key", a.userKey)
            put("paper", a.paperJson)
            put("answers", gson.toJson(a.answers.mapKeys { it.key.toString() }))
            put("current_index", a.currentIndex)
            put("left_count", a.leftCount)
            put("status", a.status)
            put("deadline_ms", a.deadlineMs)
            put("q_deadline_ms", a.questionDeadlineMs)
            put("finished_at", a.finishedAt)
            put("lock_reason", a.lockReason)
            put("result", a.resultJson)
            put("synced_at_ms", a.syncedAtMs)
            put("last_error", a.lastError)
        }
        writableDatabase.insertWithOnConflict("attempts", null, v, SQLiteDatabase.CONFLICT_REPLACE)
    }

    private fun read(c: android.database.Cursor): LocalAttempt {
        fun s(name: String) = c.getString(c.getColumnIndexOrThrow(name))
        fun l(name: String) = c.getLong(c.getColumnIndexOrThrow(name))
        val raw: Map<String, String> = gson.fromJson(s("answers"), mapType) ?: emptyMap()
        return LocalAttempt(
            examId = s("exam_id"), userKey = s("user_key"), paperJson = s("paper"),
            answers = raw.mapNotNull { (k, v) -> k.toIntOrNull()?.let { it to v } }.toMap(),
            currentIndex = l("current_index").toInt(), leftCount = l("left_count").toInt(), status = s("status"),
            deadlineMs = l("deadline_ms"), questionDeadlineMs = l("q_deadline_ms"),
            finishedAt = s("finished_at"), lockReason = s("lock_reason"), resultJson = s("result"),
            syncedAtMs = l("synced_at_ms"), lastError = s("last_error"),
        )
    }
}
