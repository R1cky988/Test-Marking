package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.*;
import com.example.testmarking.adapter.rest.dtos.request.ResultAnswerRequest;
import com.example.testmarking.adapter.rest.dtos.request.ResultRequest;
import com.example.testmarking.adapter.rest.dtos.request.ViolationRequest;
import com.example.testmarking.adapter.rest.dtos.response.*;
import com.example.testmarking.domain.entities.*;
import com.example.testmarking.domain.entities.enums.ExamFormat;
import com.example.testmarking.domain.entities.enums.ExamStatus;
import com.example.testmarking.domain.ports.StoragePort;
import com.example.testmarking.template.exception.TemplateException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Papers of an exam: who handed in what, the score, violations, statistics and the per-question analysis.
 *
 *  - every member of the class is a participant of the exam
 *  - a violation counts as 0 points, as if the student had chosen nothing; the real marks are kept so the teacher can undo it
 *  - students see results only when they are released: the teacher published them, or the exam is ONLINE and shows the result at once
 *  - only the teacher of the exam sees the list of papers, the violations, the analysis and the images of other students
 */
@Service
public class ExamResultImp {

    public static final String SRC_TEACHER = "TEACHER_OFFLINE";
    public static final String SRC_ONLINE = "ONLINE_FORM";
    public static final String SRC_STUDENT = "STUDENT_SHEET";
    public static final String NO_SUBMISSION = "NO_SUBMISSION";
    public static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024;
    static final Set<String> KINDS = Set.of("raw", "dewarped", "marked");
    static final Map<String, String> IMAGE_TYPES = Map.of("jpg", "image/jpeg", "jpeg", "image/jpeg", "png", "image/png", "webp", "image/webp");
    static final String[] BUCKET_LABELS = {"0-2", "2-4", "4-6", "6-8", "8-10"};

    public record FileData(String name, String contentType, long size, InputStream stream) {}
    public record Image(InputStream stream, String contentType) {}

    private final ExamImp exams;
    private final ExaminationRepository examRepo;
    private final ExamResultRepository results;
    private final StudentAnswerRepository studentAnswers;
    private final TestCodeRepository codes;
    private final TestCodeQuestionRepository codeQuestions;
    private final QuestionAnswerRepository questionAnswers;
    private final ClassStudentRepository classStudents;
    private final StudentRepository students;
    private final ExamAttemptRepository attempts;
    private final StoragePort storage;
    private final String bucket;
    private final Set<String> readyBuckets = new HashSet<>();

    public ExamResultImp(ExamImp exams, ExaminationRepository examRepo, ExamResultRepository results, StudentAnswerRepository studentAnswers,
                         TestCodeRepository codes, TestCodeQuestionRepository codeQuestions, QuestionAnswerRepository questionAnswers,
                         ClassStudentRepository classStudents, StudentRepository students, ExamAttemptRepository attempts, StoragePort storage,
                         @Value("${storage.buckets.exam-sheets:exam-sheets}") String bucket) {
        this.exams = exams;
        this.examRepo = examRepo;
        this.results = results;
        this.studentAnswers = studentAnswers;
        this.codes = codes;
        this.codeQuestions = codeQuestions;
        this.questionAnswers = questionAnswers;
        this.classStudents = classStudents;
        this.students = students;
        this.attempts = attempts;
        this.storage = storage;
        this.bucket = bucket;
    }

    // ─── statistics ──────────────────────────────────────────────

    /** Teacher only: a student sees his own paper, never the score spread of the class. */
    @Transactional(readOnly = true)
    public ExamStatsResponse stats(User me, UUID examId) {
        Examination e = exams.find(examId);
        if (!ExamImp.isCreator(me, e)) {
            exams.requireStudentAccess(me, e);
            throw TemplateException.forbidden("Học sinh chỉ xem được bài làm của mình, không xem phổ điểm");
        }
        return stats(e, true);
    }

    ExamStatsResponse stats(Examination e, boolean teacher) {
        List<ExamResult> all = results.findLatestByExam(e.getId());
        BigDecimal max = e.getMaxScore() == null ? BigDecimal.TEN : e.getMaxScore();
        int[] buckets = new int[5];
        BigDecimal sum = BigDecimal.ZERO, high = null, low = null;
        int marked = 0, violations = 0, submitted = 0;
        for (ExamResult r : all) {
            if (Boolean.TRUE.equals(r.getViolation())) violations++;
            if (!NO_SUBMISSION.equals(r.getProcessingStatus())) submitted++;
            BigDecimal s = score(r);
            if (s == null) continue;
            marked++;
            sum = sum.add(s);
            if (high == null || s.compareTo(high) > 0) high = s;
            if (low == null || s.compareTo(low) < 0) low = s;
            buckets[bucketOf(s, max)]++;
        }
        List<ScoreBucketResponse> dist = new ArrayList<>();
        for (int i = 0; i < 5; i++) dist.add(new ScoreBucketResponse(BUCKET_LABELS[i], i * 2, i * 2 + 2, buckets[i]));
        BigDecimal avg = marked == 0 ? null : sum.divide(BigDecimal.valueOf(marked), 2, RoundingMode.HALF_UP);
        long total = classStudents.countByClassEntity_Id(e.getClassEntity().getId());
        return new ExamStatsResponse(total, marked,
                e.getFormat() == ExamFormat.OFFLINE ? null : submitted,
                teacher ? violations : null, max, scale(high), scale(low), avg, dist);
    }

    /** 0-10 scale: [0,2) [2,4) [4,6) [6,8) [8,10]. */
    static int bucketOf(BigDecimal score, BigDecimal max) {
        double ten = max.signum() <= 0 ? 0 : score.doubleValue() * 10.0 / max.doubleValue();
        return Math.max(0, Math.min(4, (int) Math.floor(ten / 2.0)));
    }

    // ─── participants and papers (teacher) ───────────────────────

    /** Everybody of the class; submittedOnly keeps the ones who handed a paper in. */
    @Transactional(readOnly = true)
    public List<ExamParticipantResponse> participants(User me, UUID examId, boolean submittedOnly) {
        Examination e = exams.requireTeacher(me, examId);
        Map<Long, ExamResult> byStudent = latestByStudent(e);
        Map<Long, ExamAttempt> attemptOf = new HashMap<>();
        if (e.getFormat() == ExamFormat.ONLINE) for (ExamAttempt a : attempts.findByExam(e.getId())) attemptOf.put(a.getStudent().getId(), a);
        List<ExamParticipantResponse> out = new ArrayList<>();
        for (ClassStudent cs : classStudents.findRoster(e.getClassEntity().getId())) {
            ExamParticipantResponse p = participant(e, cs.getStudent(), byStudent.get(cs.getStudent().getId()), attemptOf.get(cs.getStudent().getId()));
            if (submittedOnly && !p.hasResult()) continue;
            out.add(p);
        }
        out.sort(Comparator.comparing(ExamParticipantResponse::studentCode, Comparator.nullsLast(Comparator.naturalOrder())));
        return out;
    }

    /** One row per paper, by student code. */
    @Transactional(readOnly = true)
    public List<ExamResultRowResponse> results(User me, UUID examId) {
        Examination e = exams.requireTeacher(me, examId);
        return results.findLatestByExam(e.getId()).stream().map(this::row).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ExamResultRowResponse> violations(User me, UUID examId) {
        Examination e = exams.requireTeacher(me, examId);
        return results.findLatestByExam(e.getId()).stream().filter(r -> Boolean.TRUE.equals(r.getViolation())).map(this::row).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ExamResultDetailResponse result(User me, UUID examId, UUID resultId) {
        Examination e = exams.requireTeacher(me, examId);
        return detail(e, requireResult(e, resultId));
    }

    // ─── the student's own paper ─────────────────────────────────

    @Transactional(readOnly = true)
    public MyResultResponse myResult(User me, UUID examId) {
        Examination e = exams.requireStudentAccess(me, exams.find(examId));
        boolean released = ExamImp.released(e);
        Student student = students.findByUser_Id(me.getId()).orElseThrow(() -> TemplateException.forbidden("Bạn không phải học sinh của lớp này"));
        ExamResult r = results.findLatestOf(e.getId(), student.getId()).orElse(null);
        boolean submitted = r != null && !NO_SUBMISSION.equals(r.getProcessingStatus());
        if (!released || r == null) return new MyResultResponse(released, submitted, null);
        return new MyResultResponse(true, submitted, forStudent(detail(e, r)));
    }

    // ─── publish ─────────────────────────────────────────────────

    /** The teacher releases (or hides again) the results to the students. */
    @Transactional
    public ExamResponse publishResults(User me, UUID examId, boolean publish) {
        Examination e = exams.requireTeacher(me, examId);
        if (e.getStatus() == ExamStatus.DRAFT) {
            throw TemplateException.badRequestWithCode("EXAM_NOT_PUBLISHED", "Hãy công bố kỳ thi trước khi công bố kết quả");
        }
        e.setIsScorePublished(publish);
        e.setScorePublishedAt(publish ? OffsetDateTime.now() : null);
        examRepo.save(e);
        return exams.get(me, examId);
    }

    // ─── marking ─────────────────────────────────────────────────

    /** The teacher enters (or corrects) the paper of one student. */
    @Transactional
    public ExamResultDetailResponse record(User me, UUID examId, ResultRequest req) {
        Examination e = exams.requireTeacher(me, examId);
        if (e.getStatus() == ExamStatus.DRAFT || e.getStatus() == ExamStatus.CANCELLED) {
            throw TemplateException.badRequestWithCode("EXAM_NOT_OPEN", "Kỳ thi chưa công bố hoặc đã hủy nên chưa nhận bài");
        }
        if (req == null) throw TemplateException.badRequest("Thiếu dữ liệu", "body: is required");
        Student student = findStudent(e, req.studentId(), req.studentCode());
        return detail(e, score(e, student, req, SRC_TEACHER, me));
    }

    /** A student hands in his own ONLINE paper (once). */
    @Transactional
    public MyResultResponse submit(User me, UUID examId, ResultRequest req) {
        Examination e = exams.requireStudentAccess(me, exams.find(examId));
        if (e.getFormat() != ExamFormat.ONLINE) {
            throw TemplateException.badRequestWithCode("EXAM_NOT_ONLINE", "Chỉ kỳ thi ONLINE mới nộp bài trực tiếp");
        }
        if (e.getStatus() != ExamStatus.ONGOING) {
            throw TemplateException.badRequestWithCode("EXAM_NOT_OPEN", "Kỳ thi không ở trong thời gian làm bài");
        }
        if (req == null) throw TemplateException.badRequest("Thiếu dữ liệu", "body: is required");
        Student student = students.findByUser_Id(me.getId()).orElseThrow(() -> TemplateException.forbidden("Bạn không phải học sinh của lớp này"));
        ExamResult existing = results.findLatestOf(e.getId(), student.getId()).orElse(null);
        if (existing != null && !NO_SUBMISSION.equals(existing.getProcessingStatus())) {
            throw TemplateException.badRequestWithCode("ALREADY_SUBMITTED", "Bạn đã nộp bài rồi");
        }
        ExamResult r = score(e, student, req, SRC_ONLINE, me);
        boolean released = ExamImp.released(e);
        return myResultOf(e, r);
    }

    // ─── the student photographs his own paper sheet (SUBMIT exams) ───

    /** The sheet layout a student needs to read his paper: only the template, never the answer keys. */
    @Transactional(readOnly = true)
    public TestLayout sheetLayout(User me, UUID examId) {
        Examination e = requireOpenForSheet(me, examId);
        if (e.getTestLayout() == null) throw TemplateException.badRequestWithCode("NO_TEMPLATE", "Kỳ thi chưa gắn mẫu phiếu");
        return e.getTestLayout();
    }

    /** A student hands in the answers read from his own sheet; he may resend until the teacher releases the results. */
    @Transactional
    public MyResultResponse submitSheet(User me, UUID examId, ResultRequest req) {
        Examination e = requireOpenForSheet(me, examId);
        if (req == null) throw TemplateException.badRequest("Thiếu dữ liệu", "body: is required");
        Student student = students.findByUser_Id(me.getId()).orElseThrow(() -> TemplateException.forbidden("Bạn không phải học sinh của lớp này"));
        String onSheet = req.studentCode() == null ? "" : req.studentCode().trim();
        // the code on the sheet must be readable and must be the code of the account that hands the sheet in
        if (onSheet.isEmpty() || onSheet.contains("?")) {
            throw TemplateException.badRequestWithCode("STUDENT_CODE_UNREADABLE", "Chưa đọc được mã số học sinh trên phiếu, hãy chụp lại");
        }
        if (!onSheet.equalsIgnoreCase(student.getStudentCode())) {
            throw TemplateException.badRequestWithCode("STUDENT_CODE_MISMATCH", "Mã số học sinh trên phiếu không phải của bạn");
        }
        ExamResult before = results.findLatestOf(e.getId(), student.getId()).filter(x -> !NO_SUBMISSION.equals(x.getProcessingStatus())).orElse(null);
        int used = before == null ? 0 : (before.getSubmitCount() == null ? 1 : before.getSubmitCount());
        if (used >= 1 + ExamImp.retakesOf(e)) {
            throw TemplateException.badRequestWithCode("RETAKES_EXHAUSTED", "Bạn đã hết lượt chụp lại bài làm, hãy đợi giáo viên công bố kết quả");
        }
        ExamResult r = score(e, student, req, SRC_STUDENT, me);
        // the newest submission replaces the previous one (score and answers are overwritten), so the old photos go too
        r.setImageMarkedRustKey(null);
        r.setImageDewarpedRustKey(null);
        r.setImageRawRustKey(null);
        r.setSubmitCount(used + 1);
        results.save(r);
        return myResultOf(e, r);
    }

    /** The photo of the student's own sheet (kind marked | dewarped | raw). */
    @Transactional
    public MyResultResponse uploadMySheetImage(User me, UUID examId, String kind, FileData file) {
        Examination e = requireOpenForSheet(me, examId);
        Student student = students.findByUser_Id(me.getId()).orElseThrow(() -> TemplateException.forbidden("Bạn không phải học sinh của lớp này"));
        ExamResult r = results.findLatestOf(e.getId(), student.getId())
                .filter(x -> !NO_SUBMISSION.equals(x.getProcessingStatus()))
                .orElseThrow(() -> TemplateException.notFound("RESULT_NOT_FOUND", "Bạn chưa gửi bài làm"));
        attachImage(e, r, kind, file);
        return myResultOf(e, r);
    }

    private Examination requireOpenForSheet(User me, UUID examId) {
        Examination e = exams.requireStudentAccess(me, exams.find(examId));
        if (e.getFormat() != ExamFormat.SUBMIT) {
            throw TemplateException.badRequestWithCode("EXAM_NOT_SUBMIT", "Chỉ kỳ thi nộp phiếu mới chụp bài làm");
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (e.getStatus() != ExamStatus.ONGOING || (e.getToTime() != null && now.isAfter(e.getToTime()))) {
            throw TemplateException.badRequestWithCode("EXAM_NOT_OPEN", "Kỳ thi đã kết thúc hoặc chưa bắt đầu");
        }
        if (ExamImp.released(e)) {
            throw TemplateException.badRequestWithCode("RESULT_RELEASED", "Giáo viên đã công bố kết quả, không thể nộp lại");
        }
        return e;
    }

    private ExamResult score(Examination e, Student student, ResultRequest req, String source, User by) {
        TestCode code = pickCode(e, req.testCode());
        List<TestCodeQuestion> paper = codeQuestions.findByCodes(List.of(code.getId()));
        if (paper.isEmpty()) throw TemplateException.badRequestWithCode("TEST_CODE_EMPTY", "Mã đề không có câu hỏi");
        Map<Integer, TestCodeQuestion> byOrder = new HashMap<>();
        for (TestCodeQuestion tq : paper) byOrder.put(tq.getQuestionOrder(), tq);

        Map<Integer, String> chosen = new HashMap<>();
        for (ResultAnswerRequest a : req.answers() == null ? List.<ResultAnswerRequest>of() : req.answers()) {
            if (a == null || a.order() == null || a.order() < 1) {
                throw TemplateException.badRequestWithCode("INVALID_RESULT", "Số câu không hợp lệ");
            }
            // the sheet may have more rows than the exam has questions: only questions 1..N of the version count
            if (!byOrder.containsKey(a.order())) continue;
            if (chosen.put(a.order(), normalizeChoice(a.choice())) != null) {
                throw TemplateException.badRequestWithCode("INVALID_RESULT", "Câu " + a.order() + " bị gửi hai lần");
            }
        }

        ExamResult r = results.findLatestOf(e.getId(), student.getId()).orElse(null);
        if (r == null) {
            r = new ExamResult();
            r.setUuid(UUID.randomUUID());
            r.setExamination(e);
            r.setStudent(student);
            r.setAttemptNumber(1);
            r.setIsLatest(true);
            r.setViolation(false);
        }
        r.setSubmittedBy(by);
        r.setTestCode(code);
        r.setSubmissionSource(source);
        r.setProcessingStatus("SUCCESS");

        r = results.save(r);
        Map<Integer, StudentAnswer> old = new HashMap<>();
        if (r.getId() != null) {
            for (StudentAnswer sa : studentAnswers.findByExamResult_IdOrderByQuestionOrder(r.getId())) old.put(sa.getQuestionOrder(), sa);
        }
        int correct = 0;
        List<StudentAnswer> toSave = new ArrayList<>();
        for (TestCodeQuestion tq : paper) {
            String choice = chosen.get(tq.getQuestionOrder());
            boolean ok = isRight(choice, tq.getCorrectAnswer());
            if (ok) correct++;
            StudentAnswer sa = old.remove(tq.getQuestionOrder());
            if (sa == null) {
                sa = new StudentAnswer();
                sa.setExamResult(r);
                sa.setQuestionOrder(tq.getQuestionOrder());
            }
            sa.setStudentChoice(choice);
            sa.setIsCorrect(ok);
            toSave.add(sa);
        }
        studentAnswers.saveAll(toSave);
        if (!old.isEmpty()) studentAnswers.deleteAll(old.values());

        BigDecimal max = e.getMaxScore() == null ? BigDecimal.TEN : e.getMaxScore();
        r.setTotalCorrect(correct);
        r.setTotalQuestions(paper.size());
        r.setTotalScore(BigDecimal.valueOf(correct).multiply(max).divide(BigDecimal.valueOf(paper.size()), 2, RoundingMode.HALF_UP));
        OffsetDateTime now = OffsetDateTime.now();
        r.setGradedAt(now);
        if (SRC_ONLINE.equals(source)) r.setSyncedAt(now);   // the answers arrive and are marked in the same step
        return results.save(r);
    }

    /**
     * Marks the paper an ONLINE student handed in (clientFinishedAt = when he handed in by the phone's clock). A violation that was
     * already recorded for him (he left the exam screen) stays: the paper is marked, but it counts 0 points until the teacher clears it.
     */
    public ExamResult gradeOnlineAttempt(Examination e, Student student, ResultRequest req, User by, OffsetDateTime clientFinishedAt) {
        ExamResult r = score(e, student, req, SRC_ONLINE, by);
        r.setClientSubmittedAt(clientFinishedAt);
        return results.save(r);
    }

    /**
     * The student left the exam screen of an exam where that is not allowed: a violation (0 points) is recorded at once, so it shows
     * in the teacher's violation list even while the exam is locked, and it stays when the teacher unlocks him. If he has no paper yet
     * a paper is made only to carry the violation (it is filled in when he hands in). The teacher can clear it in the violation tab.
     */
    @Transactional
    public void recordLeaveViolation(Examination e, Student student, User by, String reason) {
        ExamResult r = results.findLatestOf(e.getId(), student.getId()).orElse(null);
        if (r == null) {
            r = new ExamResult();
            r.setUuid(UUID.randomUUID());
            r.setExamination(e);
            r.setStudent(student);
            r.setAttemptNumber(1);
            r.setIsLatest(true);
            r.setSubmittedBy(by);
            r.setSubmissionSource(SRC_ONLINE);
            r.setProcessingStatus(NO_SUBMISSION);
        }
        r.setViolation(true);
        r.setViolationReason(reason);
        r.setViolationAt(OffsetDateTime.now());
        results.save(r);
    }

    /** What the student sees of his paper right after it was marked. */
    MyResultResponse myResultOf(Examination e, ExamResult r) {
        boolean released = ExamImp.released(e);
        boolean submitted = !NO_SUBMISSION.equals(r.getProcessingStatus());
        return new MyResultResponse(released, submitted, released ? forStudent(detail(e, r)) : null);
    }

    private TestCode pickCode(Examination e, String number) {
        List<TestCode> all = codes.findByExamination_IdOrderByCodeNumberAsc(e.getId());
        if (all.isEmpty()) throw TemplateException.badRequestWithCode("EXAM_NO_VERSIONS", "Kỳ thi chưa có mã đề");
        String n = number == null ? "" : number.trim();
        if (n.isEmpty() && all.size() == 1) return all.get(0);
        return all.stream().filter(c -> c.getCodeNumber().equals(n)).findFirst()
                .orElseThrow(() -> TemplateException.badRequestWithCode("TEST_CODE_NOT_FOUND", "Không có mã đề " + (n.isEmpty() ? "(trống)" : n) + " trong kỳ thi"));
    }

    /** "b", "A, c", "CA" -> "A,C"; blank -> null. */
    static String normalizeChoice(String raw) {
        if (raw == null) return null;
        TreeSet<String> labels = new TreeSet<>();
        for (char c : raw.toUpperCase(Locale.ROOT).toCharArray()) {
            if (c >= 'A' && c <= 'E') labels.add(String.valueOf(c));
            else if (c != ',' && c != ' ' && c != ';') {
                throw TemplateException.badRequestWithCode("INVALID_RESULT", "Đáp án chỉ gồm A–E: " + raw);
            }
        }
        return labels.isEmpty() ? null : String.join(",", labels);
    }

    static boolean isRight(String choice, String correct) {
        if (choice == null || correct == null || correct.isBlank()) return false;
        return new TreeSet<>(Arrays.asList(correct.replace(" ", "").split(","))).equals(new TreeSet<>(Arrays.asList(choice.split(","))));
    }

    // ─── violations ──────────────────────────────────────────────

    /** Marks (default) or clears the violation of a student: the paper then counts 0 / its real marks come back. */
    @Transactional
    public ExamParticipantResponse setViolation(User me, UUID examId, ViolationRequest req) {
        Examination e = exams.requireTeacher(me, examId);
        if (req == null || req.studentId() == null) throw TemplateException.badRequest("Thiếu dữ liệu", "student_id: is required");
        if (e.getStatus() == ExamStatus.DRAFT) {
            throw TemplateException.badRequestWithCode("EXAM_NOT_OPEN", "Kỳ thi chưa công bố");
        }
        Student student = findStudent(e, req.studentId(), null);
        ExamResult r = results.findLatestOf(e.getId(), student.getId()).orElse(null);
        boolean mark = !Boolean.FALSE.equals(req.violation());
        String reason = req.reason() == null ? "" : req.reason().trim();
        if (reason.length() > 500) throw TemplateException.badRequest("Dữ liệu không hợp lệ", "reason: max 500 characters");
        if (mark) {
            if (r == null) {
                r = new ExamResult();
                r.setUuid(UUID.randomUUID());
                r.setExamination(e);
                r.setStudent(student);
                r.setAttemptNumber(1);
                r.setIsLatest(true);
                r.setSubmittedBy(me);
                r.setSubmissionSource(SRC_TEACHER);
                r.setProcessingStatus(NO_SUBMISSION);
            }
            r.setViolation(true);
            r.setViolationReason(reason.isEmpty() ? null : reason);
            r.setViolationAt(OffsetDateTime.now());
            r = results.save(r);
            return participant(e, student, r, attemptOf(e, student));
        }
        if (r != null && Boolean.TRUE.equals(r.getViolation())) {
            if (NO_SUBMISSION.equals(r.getProcessingStatus())) {
                results.delete(r);   // a paper made only to carry the violation
                return participant(e, student, null, attemptOf(e, student));
            }
            r.setViolation(false);
            r.setViolationReason(null);
            r.setViolationAt(null);
            r = results.save(r);
        }
        return participant(e, student, r, attemptOf(e, student));
    }

    // ─── analysis per question (teacher) ─────────────────────────

    /**
     * How every question of the bank was answered, over the versions it appeared in. Versions are drawn at random, so the
     * numbers are per QUESTION (not per paper number). Violations are left out.
     */
    @Transactional(readOnly = true)
    public ExamAnalysisResponse analysis(User me, UUID examId) {
        Examination e = exams.requireTeacher(me, examId);
        List<TestCode> versions = codes.findByExamination_IdOrderByCodeNumberAsc(e.getId());
        List<String> codeNumbers = versions.stream().map(TestCode::getCodeNumber).collect(Collectors.toList());
        List<ExamResult> papers = results.findLatestByExam(e.getId()).stream()
                .filter(r -> !Boolean.TRUE.equals(r.getViolation()) && r.getTestCode() != null && !NO_SUBMISSION.equals(r.getProcessingStatus()))
                .collect(Collectors.toList());
        if (papers.isEmpty() || versions.isEmpty()) return new ExamAnalysisResponse(0, codeNumbers, List.of());

        Map<Long, Map<Integer, TestCodeQuestion>> paperOf = new HashMap<>();
        for (TestCodeQuestion tq : codeQuestions.findByCodes(versions.stream().map(TestCode::getId).collect(Collectors.toList()))) {
            paperOf.computeIfAbsent(tq.getTestCode().getId(), k -> new HashMap<>()).put(tq.getQuestionOrder(), tq);
        }
        Map<Long, Map<Integer, StudentAnswer>> answersOf = new HashMap<>();
        for (StudentAnswer sa : studentAnswers.findByExamResult_IdIn(papers.stream().map(ExamResult::getId).collect(Collectors.toList()))) {
            answersOf.computeIfAbsent(sa.getExamResult().getId(), k -> new HashMap<>()).put(sa.getQuestionOrder(), sa);
        }

        Map<Long, Agg> byQuestion = new LinkedHashMap<>();
        for (ExamResult r : papers) {
            Map<Integer, TestCodeQuestion> paper = paperOf.getOrDefault(r.getTestCode().getId(), Map.of());
            Map<Integer, StudentAnswer> given = answersOf.getOrDefault(r.getId(), Map.of());
            for (Map.Entry<Integer, TestCodeQuestion> en : new TreeMap<>(paper).entrySet()) {
                Question q = en.getValue().getQuestion();
                Agg a = byQuestion.computeIfAbsent(q.getId(), k -> new Agg(q));
                a.codes.add(r.getTestCode().getCodeNumber());
                a.appeared++;
                StudentAnswer sa = given.get(en.getKey());
                String choice = sa == null ? null : sa.getStudentChoice();
                if (choice == null || choice.isBlank()) { a.blank++; continue; }
                if (isRight(choice, en.getValue().getCorrectAnswer())) a.correct++;
                for (String label : choice.split(",")) a.picked.merge(label.trim(), 1, Integer::sum);
            }
        }

        Map<Long, List<QuestionAnswer>> optionsOf = new HashMap<>();
        for (QuestionAnswer qa : questionAnswers.findByQuestion_IdIn(byQuestion.keySet())) {
            optionsOf.computeIfAbsent(qa.getQuestion().getId(), k -> new ArrayList<>()).add(qa);
        }
        List<QuestionStatResponse> out = new ArrayList<>();
        for (Agg a : byQuestion.values()) {
            List<OptionStatResponse> opts = new ArrayList<>();
            List<QuestionAnswer> list = optionsOf.getOrDefault(a.q.getId(), List.of());
            list.sort(Comparator.comparing(QuestionAnswer::getChoiceLabel));
            for (QuestionAnswer qa : list) {
                int n = a.picked.getOrDefault(qa.getChoiceLabel(), 0);
                opts.add(new OptionStatResponse(qa.getChoiceLabel(), qa.getContent(), isOptionCorrect(a.q, qa), n, pct(n, a.appeared)));
            }
            out.add(new QuestionStatResponse(a.q.getUuid(), a.q.getContent(), a.q.getDifficulty() == null ? null : a.q.getDifficulty().name(),
                    a.q.getQuestionType() == null ? null : a.q.getQuestionType().name(), new ArrayList<>(a.codes),
                    a.appeared, a.blank, pct(a.blank, a.appeared), a.correct, pct(a.correct, a.appeared), opts));
        }
        out.sort(Comparator.comparingDouble(QuestionStatResponse::correctPercent));   // the hardest first
        return new ExamAnalysisResponse(papers.size(), codeNumbers, out);
    }

    private static boolean isOptionCorrect(Question q, QuestionAnswer qa) {
        return Boolean.TRUE.equals(qa.getIsCorrect());
    }

    private static final class Agg {
        final Question q;
        final TreeSet<String> codes = new TreeSet<>();
        final Map<String, Integer> picked = new HashMap<>();
        int appeared, blank, correct;
        Agg(Question q) { this.q = q; }
    }

    // ─── images ──────────────────────────────────────────────────

    /** kind = marked | dewarped | raw; none given = the best one there is (marked, then dewarped, then raw). */
    @Transactional(readOnly = true)
    public Image image(User me, UUID examId, UUID resultId, String kind) {
        Examination e = exams.find(examId);
        ExamResult r;
        if (ExamImp.isCreator(me, e)) {
            r = requireResult(e, resultId);
        } else {
            // the marked picture shows the right answers: only the teacher of the exam may look at the papers
            throw TemplateException.forbidden("Chỉ giáo viên của kỳ thi mới xem được ảnh bài làm");
        }
        String key;
        if (kind == null || kind.isBlank()) {
            key = firstNonBlank(r.getImageMarkedRustKey(), r.getImageDewarpedRustKey(), r.getImageRawRustKey());
        } else {
            key = switch (requireKind(kind)) {
                case "marked" -> r.getImageMarkedRustKey();
                case "dewarped" -> r.getImageDewarpedRustKey();
                default -> r.getImageRawRustKey();
            };
        }
        if (key == null || key.isBlank()) throw TemplateException.notFound("IMAGE_NOT_FOUND", "Bài làm chưa có ảnh");
        return new Image(storage.getFile(bucket, key), IMAGE_TYPES.getOrDefault(extension(key), "application/octet-stream"));
    }

    /** The teacher attaches the photo of a paper (the marked one by default). */
    @Transactional
    public ExamResultRowResponse uploadImage(User me, UUID examId, UUID resultId, String kind, FileData file) {
        Examination e = exams.requireTeacher(me, examId);
        ExamResult r = requireResult(e, resultId);
        return row(attachImage(e, r, kind, file));
    }

    private ExamResult attachImage(Examination e, ExamResult r, String kind, FileData file) {
        String k = requireKind(kind == null || kind.isBlank() ? "marked" : kind);
        if (file == null || file.stream() == null || file.size() <= 0) throw TemplateException.badRequest("Chưa chọn ảnh", "file: is required");
        if (file.size() > MAX_IMAGE_BYTES) throw TemplateException.badRequestWithCode("FILE_TOO_LARGE", "Ảnh vượt quá 10MB", "max_bytes=" + MAX_IMAGE_BYTES);
        String ext = extension(file.name());
        if (!IMAGE_TYPES.containsKey(ext)) {
            throw TemplateException.badRequestWithCode("FILE_TYPE_NOT_ALLOWED", "Chỉ nhận ảnh JPG, PNG hoặc WEBP", "allowed=" + new TreeSet<>(IMAGE_TYPES.keySet()));
        }
        String key = "exams/" + e.getUuid() + "/" + r.getUuid() + "/" + k + "-" + UUID.randomUUID().toString().substring(0, 8) + "." + ext;
        if (readyBuckets.add(bucket)) storage.ensureBucket(bucket);
        storage.uploadFile(bucket, key, file.stream(), IMAGE_TYPES.get(ext), file.size());
        switch (k) {
            case "marked" -> r.setImageMarkedRustKey(key);
            case "dewarped" -> r.setImageDewarpedRustKey(key);
            default -> r.setImageRawRustKey(key);
        }
        return results.save(r);
    }

    // ─── helpers ─────────────────────────────────────────────────

    private ExamResult requireResult(Examination e, UUID resultId) {
        return results.findByUuidAndExam(resultId, e.getId())
                .orElseThrow(() -> TemplateException.notFound("RESULT_NOT_FOUND", "Không tìm thấy bài làm"));
    }

    private Map<Long, ExamResult> latestByStudent(Examination e) {
        Map<Long, ExamResult> m = new HashMap<>();
        for (ExamResult r : results.findLatestByExam(e.getId())) if (r.getStudent() != null) m.put(r.getStudent().getId(), r);
        return m;
    }

    /** A student of the exam's class, by public id or by code (HSxxxxxxxx). */
    private Student findStudent(Examination e, UUID studentId, String studentCode) {
        String code = studentCode == null ? "" : studentCode.trim();
        for (ClassStudent cs : classStudents.findRoster(e.getClassEntity().getId())) {
            Student s = cs.getStudent();
            if (studentId != null ? s.getUuid().equals(studentId) : (!code.isEmpty() && code.equalsIgnoreCase(s.getStudentCode()))) return s;
        }
        throw TemplateException.notFound("STUDENT_NOT_FOUND", "Học sinh không thuộc lớp của kỳ thi");
    }

    ExamAttempt attemptOf(Examination e, Student s) {
        return e.getFormat() == ExamFormat.ONLINE ? attempts.findOf(e.getId(), s.getId()).orElse(null) : null;
    }

    /** a = the student's attempt of an ONLINE exam (null = he has not started); ignored for the other formats. */
    ExamParticipantResponse participant(Examination e, Student s, ExamResult r, ExamAttempt a) {
        boolean has = r != null && !NO_SUBMISSION.equals(r.getProcessingStatus());
        boolean online = e.getFormat() == ExamFormat.ONLINE;
        return new ExamParticipantResponse(s.getUuid(), s.getStudentCode(), ClassJson.displayName(s.getUser()), s.getUser().getEmail(),
                has, r == null ? null : r.getUuid(), r == null ? null : score(r), r == null ? null : correct(r),
                r != null && Boolean.TRUE.equals(r.getViolation()), r == null ? null : r.getCreatedAt(),
                online ? (a == null ? "NOT_STARTED" : a.getStatus()) : null,
                online ? (a == null ? 0 : a.getLeftCount()) : null,
                has ? r.getSyncedAt() : null, has ? r.getGradedAt() : null,
                has && r.getTestCode() != null ? r.getTestCode().getCodeNumber() : null, has ? e.getClassEntity().getName() : null,
                has ? r.getTotalQuestions() : null);
    }

    private ExamResultRowResponse row(ExamResult r) {
        Student s = r.getStudent();
        boolean v = Boolean.TRUE.equals(r.getViolation());
        return new ExamResultRowResponse(r.getUuid(), s.getUuid(), s.getStudentCode(), ClassJson.displayName(s.getUser()),
                r.getTestCode() == null ? null : r.getTestCode().getCodeNumber(), r.getExamination().getClassEntity().getName(), correct(r), r.getTotalQuestions(), score(r), v,
                v ? r.getViolationReason() : null,
                firstNonBlank(r.getImageMarkedRustKey(), r.getImageDewarpedRustKey(), r.getImageRawRustKey()) != null,
                r.getSubmissionSource(), v ? "VIOLATION" : r.getProcessingStatus(), r.getCreatedAt(),
                r.getGradedAt(), r.getSyncedAt(), r.getClientSubmittedAt());
    }

    /**
     * A student gets the summary of his paper (score, number right, version, time, violation) and never the questions, the
     * right answers or his choices question by question, so the question bank cannot be copied out through this API.
     */
    private static ExamResultDetailResponse forStudent(ExamResultDetailResponse d) {
        return new ExamResultDetailResponse(d.result(), d.maxScore(), List.of());
    }

    private ExamResultDetailResponse detail(Examination e, ExamResult r) {
        boolean v = Boolean.TRUE.equals(r.getViolation());
        List<ResultAnswerResponse> out = new ArrayList<>();
        if (r.getTestCode() != null) {
            Map<Integer, StudentAnswer> given = new HashMap<>();
            if (r.getId() != null) for (StudentAnswer sa : studentAnswers.findByExamResult_IdOrderByQuestionOrder(r.getId())) given.put(sa.getQuestionOrder(), sa);
            List<TestCodeQuestion> paper = codeQuestions.findByCodes(List.of(r.getTestCode().getId()));
            Set<Long> questionIds = new HashSet<>();
            for (TestCodeQuestion tq : paper) questionIds.add(tq.getQuestion().getId());
            Map<Long, List<QuestionOptionResponse>> optionsOf = new HashMap<>();
            if (!questionIds.isEmpty()) {
                List<QuestionAnswer> all = new ArrayList<>(questionAnswers.findByQuestion_IdIn(questionIds));
                all.sort(Comparator.comparing(QuestionAnswer::getChoiceLabel));
                for (QuestionAnswer qa : all) {
                    optionsOf.computeIfAbsent(qa.getQuestion().getId(), k -> new ArrayList<>())
                            .add(new QuestionOptionResponse(qa.getChoiceLabel(), qa.getContent(), Boolean.TRUE.equals(qa.getIsCorrect())));
                }
            }
            for (TestCodeQuestion tq : paper) {
                StudentAnswer sa = given.get(tq.getQuestionOrder());
                // a violation counts as "chose nothing"
                String choice = v || sa == null ? null : sa.getStudentChoice();
                Question q = tq.getQuestion();
                out.add(new ResultAnswerResponse(tq.getQuestionOrder(), choice, tq.getCorrectAnswer(),
                        !v && sa != null && Boolean.TRUE.equals(sa.getIsCorrect()),
                        q.getContent(), optionsOf.getOrDefault(q.getId(), List.of()), q.getExplanation()));
            }
        }
        return new ExamResultDetailResponse(row(r), e.getMaxScore(), out);
    }

    /** Points of a paper: 0 for a violation, null while it is not marked. */
    static BigDecimal score(ExamResult r) {
        if (Boolean.TRUE.equals(r.getViolation())) return BigDecimal.ZERO.setScale(2);
        return r.getTotalScore();
    }

    static Integer correct(ExamResult r) {
        return Boolean.TRUE.equals(r.getViolation()) ? Integer.valueOf(0) : r.getTotalCorrect();
    }

    private static BigDecimal scale(BigDecimal v) { return v == null ? null : v.setScale(2, RoundingMode.HALF_UP); }

    static double pct(int part, int whole) {
        return whole == 0 ? 0.0 : Math.round(part * 1000.0 / whole) / 10.0;
    }

    private static String requireKind(String kind) {
        String k = kind.trim().toLowerCase(Locale.ROOT);
        if (!KINDS.contains(k)) throw TemplateException.badRequestWithCode("INVALID_IMAGE_KIND", "kind phải là marked, dewarped hoặc raw");
        return k;
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) if (v != null && !v.isBlank()) return v;
        return null;
    }

    private static String extension(String name) {
        if (name == null) return "";
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private static TemplateException notReleased() {
        return TemplateException.forbiddenWithCode("RESULTS_NOT_RELEASED", "Giáo viên chưa công bố kết quả kỳ thi này");
    }
}
