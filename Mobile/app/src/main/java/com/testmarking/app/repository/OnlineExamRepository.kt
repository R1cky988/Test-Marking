package com.testmarking.app.repository

import com.google.gson.Gson
import com.testmarking.app.data.AnswerDto
import com.testmarking.app.data.AttemptStateDto
import com.testmarking.app.data.AttemptSyncBody
import com.testmarking.app.data.ExamApi
import com.testmarking.app.data.ExamDetailDto
import com.testmarking.app.data.OnlinePaperDto
import com.testmarking.app.data.ParticipantDto
import com.testmarking.app.data.SessionStore
import com.testmarking.app.data.local.AttemptStatus
import com.testmarking.app.data.local.AttemptStore
import com.testmarking.app.data.local.LocalAttempt
import com.testmarking.app.network.apiCall
import com.testmarking.app.network.requireData
import com.testmarking.app.util.TimeFormat
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Online exam on the phone. Every answer is written to the phone first; the network only carries copies.
 * The server marks the paper when the final sync arrives, so working offline is fine and never a violation.
 */
class OnlineExamRepository(
    private val api: ExamApi,
    private val store: AttemptStore,
    private val session: SessionStore,
    private val gson: Gson,
) {
    /** One sync at a time (a heartbeat and the network callback may meet). */
    private val syncLock = Mutex()

    private fun userKey(): String = session.cachedUser()?.email.orEmpty()

    // ---- teacher + intro ----
    suspend fun detail(examId: String): Result<ExamDetailDto> = apiCall { api.detail(examId).requireData() }
    suspend fun participants(examId: String): Result<List<ParticipantDto>> = apiCall { api.participants(examId).requireData() }
    suspend fun decideFlag(examId: String, studentId: String, decision: String, points: Double?): Result<ParticipantDto> =
        apiCall { api.decideFlag(examId, com.testmarking.app.data.FlagDecisionBody(studentId, decision, points)).requireData() }

    suspend fun unlock(examId: String, studentId: String): Result<ParticipantDto> = apiCall { api.unlock(examId, studentId).requireData() }

    // ---- the phone's copy ----
    fun local(examId: String): LocalAttempt? = store.get(examId, userKey())
    fun save(a: LocalAttempt) = store.save(a)
    fun paperOf(a: LocalAttempt): OnlinePaperDto = gson.fromJson(a.paperJson, OnlinePaperDto::class.java)

    /**
     * Downloads the paper (needs the network) and starts the clock. A paper that is already on the phone is simply resumed:
     * the phone's answers are newer than the server's.
     */
    suspend fun start(examId: String): Result<LocalAttempt> {
        local(examId)?.let { return Result.success(it) }
        val res = apiCall { api.start(examId).requireData() }
        return res.map { paper ->
            val st = paper.attempt
            val first = paper.questions.orEmpty().getOrNull(st?.currentIndex ?: 0)
            val now = System.currentTimeMillis()
            val a = LocalAttempt(
                examId = examId, userKey = userKey(), paperJson = gson.toJson(paper),
                answers = st?.answers.orEmpty().mapNotNull { x -> x.choice?.takeIf { it.isNotBlank() }?.let { x.order to it } }.toMap(),
                currentIndex = st?.currentIndex ?: 0, leftCount = st?.leftCount ?: 0,
                status = if (st?.status == "LOCKED") AttemptStatus.LOCKED else AttemptStatus.IN_PROGRESS,
                deadlineMs = localDeadline(st, now),
                questionDeadlineMs = first?.seconds?.let { now + it * 1000L } ?: 0L,
                finishedAt = null, lockReason = st?.lockReason, resultJson = null, syncedAtMs = 0L, lastError = null,
            )
            store.save(a)
            a
        }
    }

    /** The server's deadline on this phone's clock: the phone's clock may be wrong, so only the remaining time is trusted. */
    private fun localDeadline(st: AttemptStateDto?, now: Long): Long {
        val deadline = TimeFormat.parse(st?.deadlineAt)?.time ?: return now
        val serverNow = TimeFormat.parse(st?.serverNow)?.time ?: return deadline
        return now + (deadline - serverNow)
    }

    /**
     * Sends everything the phone has. Returns the updated local copy; failure = the copy is unchanged and nothing is lost.
     * A refused sync (not a network failure) is written to last_error so the screen can say so.
     */
    suspend fun sync(examId: String): Result<LocalAttempt> = syncLock.withLock {
        val a = local(examId) ?: return Result.failure(IllegalStateException("no attempt"))
        if (a.status == AttemptStatus.SYNCED) return Result.success(a)
        val finished = a.status == AttemptStatus.FINISHED
        val body = AttemptSyncBody(
            answers = a.answers.entries.sortedBy { it.key }.map { AnswerDto(it.key, it.value) },
            currentIndex = a.currentIndex, leftCount = a.leftCount, finished = finished, clientFinishedAt = a.finishedAt,
        )
        val res = apiCall { api.sync(examId, body).requireData() }
        val data = res.getOrNull()
        if (data == null) {
            val err = res.exceptionOrNull() as? com.testmarking.app.network.ApiException
            // httpStatus 0 = no network: keep going quietly. Anything else the server said is worth showing.
            if (err != null && err.httpStatus != 0) store.save((local(examId) ?: a).copy(lastError = err.message))
            return Result.failure(err ?: IllegalStateException("sync failed"))
        }
        // the screen may have changed the copy while the request was running: merge into the newest one
        var cur = local(examId) ?: a
        val st = data.attempt
        cur = cur.copy(lastError = null)
        if (data.result != null || st?.status == "SUBMITTED") {
            cur = cur.copy(status = AttemptStatus.SYNCED, syncedAtMs = System.currentTimeMillis(), lockReason = null,
                resultJson = data.result?.let { gson.toJson(it) })
        } else if (st != null) {
            val serverSawLeaves = (st.leftCount ?: 0) >= cur.leftCount
            val serverLocked = st.status == "LOCKED"
            cur = when {
                serverLocked -> cur.copy(
                    status = if (cur.status == AttemptStatus.FINISHED) AttemptStatus.FINISHED else AttemptStatus.LOCKED,
                    lockReason = st.lockReason ?: cur.lockReason,
                )
                // the teacher unlocked: only believed once the server has seen all of the leaves of this phone
                cur.lockReason != null && serverSawLeaves -> cur.copy(
                    status = if (cur.status == AttemptStatus.LOCKED) AttemptStatus.IN_PROGRESS else cur.status,
                    lockReason = null,
                    deadlineMs = localDeadline(st, System.currentTimeMillis()),
                    questionDeadlineMs = if (cur.status == AttemptStatus.LOCKED) restartQuestion(cur) else cur.questionDeadlineMs,
                )
                else -> cur
            }
        }
        store.save(cur)
        Result.success(cur)
    }

    /** After an unlock the current question gets its time back in full (the lock must not eat it). */
    private fun restartQuestion(a: LocalAttempt): Long {
        val q = paperOf(a).questions.orEmpty().getOrNull(a.currentIndex)
        return q?.seconds?.let { System.currentTimeMillis() + it * 1000L } ?: 0L
    }

    /** Papers handed in while offline: send them now. Called when the network is back and when the app starts. */
    suspend fun flushWaiting() {
        for (a in store.waiting(userKey())) sync(a.examId)
    }
}
