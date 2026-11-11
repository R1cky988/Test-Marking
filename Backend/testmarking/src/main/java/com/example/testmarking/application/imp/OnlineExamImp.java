package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.*;
import com.example.testmarking.adapter.rest.dtos.request.AttemptSyncRequest;
import com.example.testmarking.adapter.rest.dtos.request.ResultAnswerRequest;
import com.example.testmarking.adapter.rest.dtos.request.ResultRequest;
import com.example.testmarking.adapter.rest.dtos.response.*;
import com.example.testmarking.domain.entities.*;
import com.example.testmarking.domain.entities.enums.ExamFormat;
import com.example.testmarking.domain.entities.enums.ExamStatus;
import com.example.testmarking.template.exception.TemplateException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * Taking an ONLINE exam on the phone (never on the web).
 *
 *  1. start: the phone downloads the student's paper (version, questions, time rules). Needs the network.
 *  2. the student works; the phone keeps every answer on the device, so a lost connection does not stop him and is never a violation.
 *  3. sync: whenever there is network the phone sends everything it has (answers, how often he left the screen, whether he handed in).
 *     The final sync is what marks the paper; synced_at / graded_at tell the teacher when that happened.
 *
 * Closed book (allow_reference = false): the questions only go forward, each with its own time. Leaving the exam screen is
 * counted; leave_policy FLAG only reports it (the teacher decides: 0 points, minus points or nothing), LOCK locks the exam until the teacher unlocks it.
 * Open book: free time, free order, leaving is ignored.
 */
@Service
public class OnlineExamImp {

    private final ExamImp exams;
    private final ExamResultImp resultService;
    private final ExamAttemptRepository attempts;
    private final ExamResultRepository results;
    private final StudentRepository students;
    private final ClassStudentRepository classStudents;
    private final TestCodeRepository codes;
    private final TestCodeQuestionRepository codeQuestions;
    private final QuestionAnswerRepository questionAnswers;
    private final Random random = new Random();

    public OnlineExamImp(ExamImp exams, ExamResultImp resultService, ExamAttemptRepository attempts, ExamResultRepository results,
                         StudentRepository students, ClassStudentRepository classStudents, TestCodeRepository codes,
                         TestCodeQuestionRepository codeQuestions, QuestionAnswerRepository questionAnswers) {
        this.exams = exams;
        this.resultService = resultService;
        this.attempts = attempts;
        this.results = results;
        this.students = students;
        this.classStudents = classStudents;
        this.codes = codes;
        this.codeQuestions = codeQuestions;
        this.questionAnswers = questionAnswers;
    }

    // ─── 1. start ────────────────────────────────────────────────

    /** The paper of the student. Calling it again returns the same paper and the answers the server already has (a new phone, a reinstall). */
    @Transactional
    public OnlinePaperResponse start(User me, UUID examId) {
        Examination e = onlineExamOf(me, examId);
        Student student = studentOf(me, e);
        OffsetDateTime now = OffsetDateTime.now();
        ExamAttempt a = attempts.findOf(e.getId(), student.getId()).orElse(null);
        if (a != null && ExamAttempt.SUBMITTED.equals(a.getStatus())) {
            throw TemplateException.badRequestWithCode("ALREADY_SUBMITTED", "Bạn đã nộp bài rồi");
        }
        if (a == null) {
            requireOpen(e, now);
            ExamResult done = results.findLatestOf(e.getId(), student.getId()).orElse(null);
            if (done != null && !ExamResultImp.NO_SUBMISSION.equals(done.getProcessingStatus())) {
                throw TemplateException.badRequestWithCode("ALREADY_SUBMITTED", "Bài làm của bạn đã được ghi nhận rồi");
            }
            a = attempts.save(newAttempt(e, student, now));
        } else {
            a.setLastSyncAt(now);
            a = attempts.save(a);
        }
        return paper(e, a, now);
    }

    private ExamAttempt newAttempt(Examination e, Student student, OffsetDateTime now) {
        List<TestCode> all = codes.findByExamination_IdOrderByCodeNumberAsc(e.getId());
        if (all.isEmpty()) throw TemplateException.badRequestWithCode("EXAM_NO_VERSIONS", "Kỳ thi chưa có mã đề");
        List<Long> ids = new ArrayList<>();
        for (TestCode c : all) ids.add(c.getId());
        Map<Long, Long> handedOut = new HashMap<>();
        for (Object[] row : attempts.countByVersion(e.getId())) handedOut.put((Long) row[0], (Long) row[1]);
        long pick = OnlineExamRules.pickLeastUsed(ids, handedOut, random);
        TestCode code = all.stream().filter(c -> c.getId() == pick).findFirst().orElse(all.get(0));

        ExamAttempt a = new ExamAttempt();
        a.setUuid(UUID.randomUUID());
        a.setExamination(e);
        a.setStudent(student);
        a.setTestCode(code);
        a.setStatus(ExamAttempt.IN_PROGRESS);
        a.setStartedAt(now);
        a.setDeadlineAt(OnlineExamRules.deadline(now, e.getDurationMinutes() == null ? 60 : e.getDurationMinutes(), e.getToTime()));
        a.setAnswers("");
        a.setLastSyncAt(now);
        return a;
    }

    private OnlinePaperResponse paper(Examination e, ExamAttempt a, OffsetDateTime now) {
        List<TestCodeQuestion> rows = new ArrayList<>(codeQuestions.findByCodes(List.of(a.getTestCode().getId())));
        rows.sort(Comparator.comparing(TestCodeQuestion::getQuestionOrder));
        Set<Long> questionIds = new HashSet<>();
        for (TestCodeQuestion tq : rows) questionIds.add(tq.getQuestion().getId());
        Map<Long, List<PaperOptionResponse>> optionsOf = new HashMap<>();
        if (!questionIds.isEmpty()) {
            List<QuestionAnswer> all = new ArrayList<>(questionAnswers.findByQuestion_IdIn(questionIds));
            all.sort(Comparator.comparing(QuestionAnswer::getChoiceLabel));
            // the options only: which one is right is not sent before the result is released
            for (QuestionAnswer qa : all) {
                optionsOf.computeIfAbsent(qa.getQuestion().getId(), k -> new ArrayList<>()).add(new PaperOptionResponse(qa.getChoiceLabel(), qa.getContent()));
            }
        }

        boolean allowReference = Boolean.TRUE.equals(e.getAllowReference());
        int[] seconds = null;
        if (!allowReference) {
            List<String> difficulties = new ArrayList<>();
            for (TestCodeQuestion tq : rows) difficulties.add(tq.getQuestion().getDifficulty() == null ? null : tq.getQuestion().getDifficulty().name());
            int minutes = e.getDurationMinutes() == null ? 60 : e.getDurationMinutes();
            seconds = OnlineExamRules.allocate(minutes * 60, difficulties);
        }
        List<PaperQuestionResponse> questions = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            TestCodeQuestion tq = rows.get(i);
            Question q = tq.getQuestion();
            questions.add(new PaperQuestionResponse(tq.getQuestionOrder(), q.getContent(),
                    q.getQuestionType() == null ? null : q.getQuestionType().name(),
                    q.getDifficulty() == null ? null : q.getDifficulty().name(),
                    seconds == null ? null : seconds[i], optionsOf.getOrDefault(q.getId(), List.of())));
        }
        return new OnlinePaperResponse(e.getUuid(), e.getExamName(), e.getSubjectName(),
                e.getDurationMinutes() == null ? 60 : e.getDurationMinutes(), allowReference, OnlineExamRules.normalizePolicy(e.getLeavePolicy()),
                e.getFromTime(), e.getToTime(), ExamImp.released(e), a.getTestCode().getCodeNumber(), state(a, now), questions);
    }

    // ─── 2. state ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AttemptStateResponse state(User me, UUID examId) {
        Examination e = onlineExamOf(me, examId);
        Student student = studentOf(me, e);
        ExamAttempt a = attempts.findOf(e.getId(), student.getId())
                .orElseThrow(() -> TemplateException.notFound("ATTEMPT_NOT_STARTED", "Bạn chưa bắt đầu làm bài thi này"));
        return state(a, OffsetDateTime.now());
    }

    private AttemptStateResponse state(ExamAttempt a, OffsetDateTime now) {
        List<ResultAnswerRequest> answers = new ArrayList<>();
        for (Map.Entry<Integer, String> en : OnlineExamRules.decodeAnswers(a.getAnswers()).entrySet()) {
            answers.add(new ResultAnswerRequest(en.getKey(), en.getValue()));
        }
        boolean locked = ExamAttempt.LOCKED.equals(a.getStatus());
        return new AttemptStateResponse(a.getStatus(), a.getStartedAt(), a.getDeadlineAt(), now,
                a.getLeftCount() == null ? 0 : a.getLeftCount(), a.getCurrentIndex() == null ? 0 : a.getCurrentIndex(),
                locked ? a.getLockReason() : null, answers);
    }

    // ─── 3. sync ─────────────────────────────────────────────────

    /**
     * Cumulative and idempotent: the phone may send it again after a lost answer. Progress is always stored; when finished = true
     * and the attempt is not locked the paper is marked now. A locked attempt only stores the progress and waits for the teacher.
     */
    @Transactional
    public AttemptSyncResponse sync(User me, UUID examId, AttemptSyncRequest req) {
        if (req == null) throw TemplateException.badRequest("Thiếu dữ liệu", "body: is required");
        Examination e = onlineExamOf(me, examId);
        Student student = studentOf(me, e);
        ExamAttempt a = attempts.findOf(e.getId(), student.getId())
                .orElseThrow(() -> TemplateException.notFound("ATTEMPT_NOT_STARTED", "Bạn chưa bắt đầu làm bài thi này"));
        OffsetDateTime now = OffsetDateTime.now();

        if (ExamAttempt.SUBMITTED.equals(a.getStatus())) {   // a retry after the answer got lost: nothing changes
            ExamResult r = results.findLatestOf(e.getId(), student.getId()).orElse(null);
            return new AttemptSyncResponse(state(a, now), r == null ? null : resultService.myResultOf(e, r));
        }
        if (e.getStatus() == ExamStatus.CANCELLED) {
            throw TemplateException.badRequestWithCode("EXAM_CANCELLED", "Kỳ thi đã bị hủy");
        }

        // answers: the phone sends all of them every time
        Map<Integer, String> chosen = new TreeMap<>();
        for (ResultAnswerRequest ans : req.answers() == null ? List.<ResultAnswerRequest>of() : req.answers()) {
            if (ans == null || ans.order() == null || ans.order() < 1) {
                throw TemplateException.badRequestWithCode("INVALID_RESULT", "Số câu không hợp lệ");
            }
            String choice = ExamResultImp.normalizeChoice(ans.choice());
            if (choice != null) chosen.put(ans.order(), choice);
        }
        a.setAnswers(OnlineExamRules.encodeAnswers(chosen));
        if (req.currentIndex() != null) a.setCurrentIndex(Math.max(0, req.currentIndex()));

        // leaving the screen (never counted with open book)
        boolean allowReference = Boolean.TRUE.equals(e.getAllowReference());
        int clientLeft = Math.max(0, req.leftCount() == null ? 0 : req.leftCount());
        if (!allowReference && clientLeft > nz(a.getLeftCount())) {
            a.setLeftCount(clientLeft);
            a.setLastLeftAt(now);
            if (OnlineExamRules.locksOnLeave(false, e.getLeavePolicy()) && ExamAttempt.IN_PROGRESS.equals(a.getStatus())) {
                a.setStatus(ExamAttempt.LOCKED);
                a.setLockedAt(now);
                a.setLockReason(OnlineExamRules.leaveReason(clientLeft));
                a.setUnlockedAt(null);
            }
        }
        a.setLastSyncAt(now);

        boolean finished = Boolean.TRUE.equals(req.finished());
        if (!finished || ExamAttempt.LOCKED.equals(a.getStatus())) {
            return new AttemptSyncResponse(state(attempts.save(a), now), null);
        }

        // final answers: mark the paper now
        OffsetDateTime clientAt = req.clientFinishedAt() == null || req.clientFinishedAt().isAfter(now) ? now : req.clientFinishedAt();
        List<ResultAnswerRequest> list = new ArrayList<>();
        for (Map.Entry<Integer, String> en : chosen.entrySet()) list.add(new ResultAnswerRequest(en.getKey(), en.getValue()));
        ResultRequest rr = new ResultRequest(null, null, a.getTestCode().getCodeNumber(), list);
        boolean flagged = OnlineExamRules.flagsViolation(allowReference, e.getLeavePolicy(), nz(a.getLeftCount()));
        ExamResult result = resultService.gradeOnlineAttempt(e, student, rr, me, clientAt, flagged, OnlineExamRules.leaveReason(nz(a.getLeftCount())));

        a.setStatus(ExamAttempt.SUBMITTED);
        a.setClientFinishedAt(clientAt);
        a.setSyncedAt(now);
        a.setExamResult(result);
        return new AttemptSyncResponse(state(attempts.save(a), now), resultService.myResultOf(e, result));
    }

    // ─── teacher: unlock ─────────────────────────────────────────

    /**
     * The teacher lets a locked student go on. The time he was locked is added to his deadline, so the lock does not cost him
     * working time. The leave stays on record (left_count) but is not a violation: unlocking is the teacher's decision.
     */
    @Transactional
    public ExamParticipantResponse unlock(User me, UUID examId, UUID studentId) {
        Examination e = exams.requireTeacher(me, examId);
        if (e.getFormat() != ExamFormat.ONLINE) {
            throw TemplateException.badRequestWithCode("EXAM_NOT_ONLINE", "Chỉ kỳ thi ONLINE mới có khóa bài");
        }
        Student student = classStudents.findByClassAndStudentUuid(e.getClassEntity().getId(), studentId)
                .orElseThrow(() -> TemplateException.notFound("STUDENT_NOT_FOUND", "Học sinh không thuộc lớp của kỳ thi")).getStudent();
        ExamAttempt a = attempts.findOf(e.getId(), student.getId())
                .orElseThrow(() -> TemplateException.notFound("ATTEMPT_NOT_FOUND", "Học sinh này chưa bắt đầu làm bài"));
        if (!ExamAttempt.LOCKED.equals(a.getStatus())) {
            throw TemplateException.badRequestWithCode("ATTEMPT_NOT_LOCKED", "Bài làm này không bị khóa");
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (a.getLockedAt() != null && now.isAfter(a.getLockedAt())) {
            a.setDeadlineAt(a.getDeadlineAt().plus(Duration.between(a.getLockedAt(), now)));
        }
        a.setStatus(ExamAttempt.IN_PROGRESS);
        a.setUnlockedAt(now);
        a.setUnlockedBy(me);
        a.setLockedAt(null);
        a.setLockReason(null);
        a = attempts.save(a);
        ExamResult r = results.findLatestOf(e.getId(), student.getId()).orElse(null);
        return resultService.participant(e, student, r, a);
    }

    // ─── helpers ─────────────────────────────────────────────────

    /** The exam, for a student of its class; only ONLINE exams are taken this way, and the teacher does not sit them. */
    private Examination onlineExamOf(User me, UUID examId) {
        Examination e = exams.find(examId);
        if (ExamImp.isCreator(me, e)) throw TemplateException.forbidden("Giáo viên không làm bài thi của chính mình");
        e = exams.requireStudentAccess(me, e);
        if (e.getFormat() != ExamFormat.ONLINE) {
            throw TemplateException.badRequestWithCode("EXAM_NOT_ONLINE", "Chỉ kỳ thi ONLINE mới làm bài trên điện thoại");
        }
        return e;
    }

    private Student studentOf(User me, Examination e) {
        Student s = students.findByUser_Id(me.getId()).orElseThrow(() -> TemplateException.forbidden("Bạn không phải học sinh của lớp này"));
        if (!classStudents.existsByClassEntity_IdAndStudent_Id(e.getClassEntity().getId(), s.getId())) {
            throw TemplateException.forbidden("Bạn không phải học sinh của lớp này");
        }
        return s;
    }

    /** A new attempt needs a running exam; the clock decides (the status field is refreshed only every few seconds). */
    private static void requireOpen(Examination e, OffsetDateTime now) {
        ExamStatus status = ExamStatusImp.statusAt(e.getStatus(), e.getFromTime(), e.getToTime(), now);
        if (status == ExamStatus.ONGOING) return;
        String why = switch (status) {
            case UPCOMING -> "Kỳ thi chưa đến giờ làm bài";
            case COMPLETED -> "Kỳ thi đã kết thúc";
            case CANCELLED -> "Kỳ thi đã bị hủy";
            default -> "Kỳ thi không ở trong thời gian làm bài";
        };
        throw TemplateException.badRequestWithCode("EXAM_NOT_OPEN", why);
    }

    private static int nz(Integer v) {
        return v == null ? 0 : v;
    }
}
