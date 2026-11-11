package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.*;
import com.example.testmarking.adapter.rest.dtos.request.ExamRequest;
import com.example.testmarking.adapter.rest.dtos.request.GenerateVersionsRequest;
import com.example.testmarking.adapter.rest.dtos.response.*;
import com.example.testmarking.application.imp.ClassAccessImp.Access;
import com.example.testmarking.domain.entities.*;
import com.example.testmarking.domain.entities.Class;
import com.example.testmarking.domain.entities.enums.ExamFormat;
import com.example.testmarking.domain.entities.enums.ExamStatus;
import com.example.testmarking.domain.entities.enums.QuestionDifficulty;
import com.example.testmarking.template.exception.TemplateException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

/**
 * Exams of a teacher. Rules:
 *  - an exam belongs to a class the caller teaches; only its creator sees / changes it
 *  - formats: OFFLINE (teacher marks, publishes later), ONLINE (phone; result at once unless the teacher turns it off),
 *    SUBMIT (student photographs the paper sheet; result never at once)
 *  - OFFLINE / SUBMIT use a paper answer sheet (template). The number of questions of a version may be LESS than the
 *    template has (the unused rows stay blank) but never MORE
 *  - versions ("mã đề") are generated at random from the exam's question bank: N versions, each with the same number of
 *    easy / medium / hard questions, each in its own random order, numbered 001, 002, ...
 *  - an exam can only be changed while it is a DRAFT and has no marked papers
 */
@Service
public class ExamImp {

    public static final int MAX_VERSIONS = 20;
    public static final int MAX_QUESTIONS = 200;
    public static final int MAX_LIMIT = 50;

    private final ExaminationRepository exams;
    private final TestCodeRepository codes;
    private final TestCodeQuestionRepository codeQuestions;
    private final TestLayoutRepository layouts;
    private final QuestionRepository questions;
    private final QuestionAnswerRepository answers;
    private final ExamResultRepository results;
    private final ClassAccessImp access;
    private final QuestionBankImp bankService;
    private Random random = new Random();

    public ExamImp(ExaminationRepository exams, TestCodeRepository codes, TestCodeQuestionRepository codeQuestions,
                   TestLayoutRepository layouts, QuestionRepository questions, QuestionAnswerRepository answers,
                   ExamResultRepository results, ClassAccessImp access, QuestionBankImp bankService) {
        this.exams = exams;
        this.codes = codes;
        this.codeQuestions = codeQuestions;
        this.layouts = layouts;
        this.questions = questions;
        this.answers = answers;
        this.results = results;
        this.access = access;
        this.bankService = bankService;
    }

    /** Tests use a seeded Random. */
    void useRandom(Random r) { this.random = r; }

    // ─── exams ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ExamListResponse list(User me, Integer page, Integer limit, String search, String format, UUID classId) {
        return list(me, page, limit, search, format, classId, null);
    }

    /** role = "student": the exams of the classes I study in (never drafts, no teacher-only facts); otherwise my own exams. */
    @Transactional(readOnly = true)
    public ExamListResponse list(User me, Integer page, Integer limit, String search, String format, UUID classId, String role) {
        int p = page == null || page < 1 ? 1 : page;
        int l = limit == null || limit < 1 ? 10 : Math.min(limit, MAX_LIMIT);
        boolean hasFormat = format != null && !format.isBlank() && !format.equalsIgnoreCase("all");
        boolean asStudent = role != null && role.equalsIgnoreCase("student");
        ExamFormat fmt = hasFormat ? parseFormat(format) : ExamFormat.OFFLINE;
        String q = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        Page<Examination> result;
        if (asStudent) {
            long cid = classId == null ? 0L : access.requireMember(me, classId).cls().getId();
            result = exams.findForStudent(me.getId(), ExamStatus.DRAFT, hasFormat ? 1 : 0, fmt, cid, q, PageRequest.of(p - 1, l));
        } else {
            long cid = classId == null ? 0L : access.requireOwner(me, classId).cls().getId();
            result = exams.findMine(me.getId(), hasFormat ? 1 : 0, fmt, cid, q, PageRequest.of(p - 1, l));
        }
        List<ExamResponse> data = new ArrayList<>();
        for (Examination e : result.getContent()) data.add(asStudent ? studentView(e) : response(e));
        return new ExamListResponse(200, "OK", data, new ClassListMeta(p, l, result.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public ExamResponse get(User me, UUID examId) {
        Examination e = find(examId);
        return isCreator(me, e) ? response(e) : studentView(requireStudentAccess(me, e));
    }

    // ─── access shared with the result service ───────────────────

    public Examination find(UUID examId) {
        return exams.findByUuid(examId)
                .orElseThrow(() -> TemplateException.notFound("EXAM_NOT_FOUND", "Không tìm thấy kỳ thi"));
    }

    static boolean isCreator(User me, Examination e) {
        return e.getCreatedUser() != null && Objects.equals(e.getCreatedUser().getId(), me.getId());
    }

    /** The teacher of the exam (its creator). */
    public Examination requireTeacher(User me, UUID examId) {
        return requireOwned(me, examId);
    }

    /** A student of the exam's class; drafts are invisible to students. */
    public Examination requireStudentAccess(User me, Examination e) {
        if (e.getStatus() == ExamStatus.DRAFT || e.getClassEntity() == null) {
            throw TemplateException.notFound("EXAM_NOT_FOUND", "Không tìm thấy kỳ thi");
        }
        access.requireMember(me, e.getClassEntity());
        return e;
    }

    /**
     * Released = the students may see the results: the teacher published them, or the exam is ONLINE and shows the
     * result at once. OFFLINE and SUBMIT exams are never released before the teacher publishes.
     */
    public static boolean released(Examination e) {
        if (Boolean.TRUE.equals(e.getIsScorePublished())) return true;
        return e.getFormat() == ExamFormat.ONLINE && !Boolean.FALSE.equals(e.getShowResultImmediately());
    }

    @Transactional
    public ExamResponse create(User me, ExamRequest req) {
        Examination e = new Examination();
        e.setUuid(UUID.randomUUID());
        e.setCreatedUser(me);
        e.setStatus(ExamStatus.DRAFT);
        e.setNumberOfTestCodes(0);
        e.setIsScorePublished(false);
        apply(me, e, req);
        return response(exams.save(e));
    }

    @Transactional
    public ExamResponse update(User me, UUID examId, ExamRequest req) {
        Examination e = requireEditable(me, examId);
        apply(me, e, req);
        return response(exams.save(e));
    }

    @Transactional
    public MessageResponse delete(User me, UUID examId) {
        Examination e = requireEditable(me, examId);
        removeVersions(e);
        exams.delete(e);
        return new MessageResponse("Đã xóa kỳ thi");
    }

    /** DRAFT -> UPCOMING. The exam needs at least one version. */
    @Transactional
    public ExamResponse publish(User me, UUID examId) {
        Examination e = requireEditable(me, examId);
        if (codes.countByExamination_Id(e.getId()) == 0) {
            throw TemplateException.badRequestWithCode("EXAM_NO_VERSIONS", "Hãy tạo mã đề trước khi công bố kỳ thi");
        }
        e.setStatus(ExamStatus.UPCOMING);
        return response(exams.save(e));
    }

    // ─── versions ────────────────────────────────────────────────

    /** Replaces every version of the exam with `count` new ones. */
    @Transactional
    public List<ExamVersionSummaryResponse> generateVersions(User me, UUID examId, GenerateVersionsRequest req) {
        Examination e = requireEditable(me, examId);
        if (req == null) throw TemplateException.badRequest("Thiếu dữ liệu", "body: is required");
        int count = num(req.count(), 1);
        int easy = num(req.easy(), 0), medium = num(req.medium(), 0), hard = num(req.hard(), 0);
        if (count < 1 || count > MAX_VERSIONS) throw invalid("Số mã đề phải từ 1 đến " + MAX_VERSIONS);
        if (easy < 0 || medium < 0 || hard < 0) throw invalid("Số câu mỗi mức độ không được âm");
        int perVersion = easy + medium + hard;
        if (perVersion < 1) throw invalid("Mỗi mã đề cần ít nhất 1 câu hỏi");
        if (perVersion > MAX_QUESTIONS) throw invalid("Mỗi mã đề tối đa " + MAX_QUESTIONS + " câu");
        assertFitsTemplate(e.getTestLayout(), perVersion);
        QuestionBank bank = e.getQuestionBank();
        if (bank == null) throw TemplateException.badRequestWithCode("EXAM_NO_BANK", "Hãy chọn ngân hàng câu hỏi cho kỳ thi trước");

        Map<QuestionDifficulty, List<Long>> pool = new EnumMap<>(QuestionDifficulty.class);
        Map<QuestionDifficulty, Integer> need = new EnumMap<>(QuestionDifficulty.class);
        need.put(QuestionDifficulty.EASY, easy);
        need.put(QuestionDifficulty.MEDIUM, medium);
        need.put(QuestionDifficulty.HARD, hard);
        List<String> short_ = new ArrayList<>();
        for (QuestionDifficulty d : QuestionDifficulty.values()) {
            List<Long> ids = questions.findIdsByDifficulty(bank.getId(), d);
            pool.put(d, ids);
            if (ids.size() < need.get(d)) short_.add(label(d) + ": cần " + need.get(d) + ", ngân hàng có " + ids.size());
        }
        if (!short_.isEmpty()) {
            throw TemplateException.badRequestWithCode("NOT_ENOUGH_QUESTIONS",
                    "Ngân hàng không đủ câu hỏi (" + String.join("; ", short_) + ")", short_.toArray(new String[0]));
        }

        // the old versions are deleted (and flushed) first, so the new ones can reuse 001, 002, ...
        removeVersions(e);
        List<String> fresh = freshCodes(count);

        // pick first (so the questions can be loaded in ONE query), then write
        List<List<Long>> picked = new ArrayList<>();
        Set<Long> all = new HashSet<>();
        for (int v = 0; v < count; v++) {
            List<Long> chosen = new ArrayList<>();
            for (QuestionDifficulty d : QuestionDifficulty.values()) {
                List<Long> ids = new ArrayList<>(pool.get(d));
                Collections.shuffle(ids, random);
                chosen.addAll(ids.subList(0, need.get(d)));
            }
            Collections.shuffle(chosen, random);   // each version has its own order
            picked.add(chosen);
            all.addAll(chosen);
        }
        Map<Long, Question> byId = new HashMap<>();
        for (Question q : questions.findAllById(all)) byId.put(q.getId(), q);

        List<ExamVersionSummaryResponse> out = new ArrayList<>();
        for (int v = 0; v < count; v++) {
            TestCode code = new TestCode();
            code.setUuid(UUID.randomUUID());
            code.setExamination(e);
            code.setCodeNumber(fresh.get(v));
            code = codes.save(code);
            List<TestCodeQuestion> rows = new ArrayList<>();
            int order = 1;
            int[] byDifficulty = new int[3];
            for (Long qid : picked.get(v)) {
                Question q = byId.get(qid);
                TestCodeQuestion tq = new TestCodeQuestion();
                tq.setTestCode(code);
                tq.setQuestion(q);
                tq.setQuestionOrder(order++);
                tq.setCorrectAnswer(q.getCorrectAnswer());
                rows.add(tq);
                byDifficulty[q.getDifficulty().ordinal()]++;
            }
            codeQuestions.saveAll(rows);
            out.add(new ExamVersionSummaryResponse(code.getUuid(), code.getCodeNumber(), rows.size(), byDifficulty[0], byDifficulty[1], byDifficulty[2]));
        }
        out.sort(Comparator.comparing(ExamVersionSummaryResponse::code));
        e.setNumberOfTestCodes(count);
        e.setNumberOfEasyQuestions(easy);
        e.setNumberOfMediumQuestions(medium);
        e.setNumberOfHardQuestions(hard);
        exams.save(e);
        return out;
    }

    @Transactional(readOnly = true)
    public List<ExamVersionSummaryResponse> versions(User me, UUID examId) {
        Examination e = requireOwned(me, examId);
        List<TestCode> list = codes.findByExamination_IdOrderByCodeNumberAsc(e.getId());
        Map<Long, int[]> counts = new HashMap<>();
        if (!list.isEmpty()) {
            List<Long> ids = new ArrayList<>();
            for (TestCode c : list) ids.add(c.getId());
            for (TestCodeQuestion tq : codeQuestions.findByCodes(ids)) {
                counts.computeIfAbsent(tq.getTestCode().getId(), k -> new int[3])[tq.getQuestion().getDifficulty().ordinal()]++;
            }
        }
        List<ExamVersionSummaryResponse> out = new ArrayList<>();
        for (TestCode c : list) {
            int[] n = counts.getOrDefault(c.getId(), new int[3]);
            out.add(new ExamVersionSummaryResponse(c.getUuid(), c.getCodeNumber(), n[0] + n[1] + n[2], n[0], n[1], n[2]));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public ExamVersionDetailResponse version(User me, UUID examId, UUID codeId) {
        Examination e = requireOwned(me, examId);
        TestCode c = codes.findByUuidAndExamination_Id(codeId, e.getId())
                .orElseThrow(() -> TemplateException.notFound("EXAM_VERSION_NOT_FOUND", "Không tìm thấy mã đề"));
        return details(List.of(c)).get(0);
    }

    /** Every version with its questions: the A4 print page. */
    @Transactional(readOnly = true)
    public ExamPrintResponse print(User me, UUID examId) {
        Examination e = requireOwned(me, examId);
        TestLayout sheet = e.getTestLayout();
        return new ExamPrintResponse(e.getUuid(), e.getExamName(),
                sheet == null ? null : sheet.getName(), sheet == null ? null : sheet.getSheetCode(), details(codes.findByExamination_IdOrderByCodeNumberAsc(e.getId())));
    }

    // ─── helpers ─────────────────────────────────────────────────

    private Examination requireOwned(User me, UUID examId) {
        Examination e = exams.findByUuid(examId)
                .orElseThrow(() -> TemplateException.notFound("EXAM_NOT_FOUND", "Không tìm thấy kỳ thi"));
        if (e.getCreatedUser() == null || !Objects.equals(e.getCreatedUser().getId(), me.getId())) {
            throw TemplateException.forbidden("Đây không phải kỳ thi của bạn");
        }
        return e;
    }

    /** Owned, still a DRAFT and with no marked paper. */
    private Examination requireEditable(User me, UUID examId) {
        Examination e = requireOwned(me, examId);
        if (e.getStatus() != ExamStatus.DRAFT) {
            throw TemplateException.badRequestWithCode("EXAM_LOCKED", "Kỳ thi đã công bố nên không thể thay đổi");
        }
        if (results.existsByExamination_Id(e.getId())) {
            throw TemplateException.badRequestWithCode("EXAM_HAS_RESULTS", "Kỳ thi đã có bài làm nên không thể thay đổi");
        }
        return e;
    }

    private void apply(User me, Examination e, ExamRequest req) {
        if (req == null) throw TemplateException.badRequest("Thiếu dữ liệu", "body: is required");
        String name = req.name() == null ? "" : req.name().trim();
        if (name.isEmpty()) throw invalid("Tên kỳ thi không được để trống");
        if (name.length() > 200) throw invalid("Tên kỳ thi tối đa 200 ký tự");
        String subject = req.subject() == null ? "" : req.subject().trim();
        if (subject.length() > 100) throw invalid("Môn học tối đa 100 ký tự");
        ExamFormat format = parseFormat(req.format());
        int duration = req.durationMinutes() == null ? 60 : req.durationMinutes();
        if (duration < 1 || duration > 600) throw invalid("Thời gian làm bài phải từ 1 đến 600 phút");
        BigDecimal max = req.maxScore() == null ? new BigDecimal("10.00") : req.maxScore();
        if (max.signum() <= 0 || max.compareTo(new BigDecimal("100")) > 0) throw invalid("Điểm tối đa phải lớn hơn 0 và không quá 100");
        if (req.fromTime() != null && req.toTime() != null && !req.toTime().isAfter(req.fromTime())) {
            throw invalid("Thời gian kết thúc phải sau thời gian bắt đầu");
        }
        if (req.classId() == null) throw invalid("Hãy chọn lớp cho kỳ thi");
        Access a = access.requireOwner(me, req.classId());
        if (Boolean.TRUE.equals(a.cls().getIsArchived())) {
            throw TemplateException.badRequestWithCode("CLASS_ARCHIVED", "Lớp đã lưu trữ, hãy khôi phục trước khi tạo kỳ thi");
        }

        TestLayout layout = null;
        if (req.templateId() != null) {
            layout = layouts.findByUuid(req.templateId())
                    .orElseThrow(() -> TemplateException.notFound("TEMPLATE_NOT_FOUND", "Không tìm thấy mẫu phiếu"));
            if (layout.getCreatedUser() == null || !Objects.equals(layout.getCreatedUser().getId(), me.getId())) {
                throw TemplateException.forbidden("Đây không phải mẫu phiếu của bạn");
            }
        } else if (format != ExamFormat.ONLINE) {
            throw TemplateException.badRequestWithCode("TEMPLATE_REQUIRED", "Kỳ thi " + format.name() + " cần chọn mẫu phiếu trả lời");
        }

        QuestionBank bank = null;
        if (req.questionBankId() != null) bank = bankService.requireOwned(me, req.questionBankId());

        // versions already exist: the bank must stay (they were drawn from it), the template must still fit
        if (e.getId() != null) {
            long existing = codes.countByExamination_Id(e.getId());
            if (existing > 0) {
                Long oldBank = e.getQuestionBank() == null ? null : e.getQuestionBank().getId();
                Long newBank = bank == null ? null : bank.getId();
                if (!Objects.equals(oldBank, newBank)) {
                    throw TemplateException.badRequestWithCode("EXAM_HAS_VERSIONS", "Kỳ thi đã có mã đề, hãy xóa mã đề trước khi đổi ngân hàng câu hỏi");
                }
                assertFitsTemplate(layout, e.getNumberOfEasyQuestions() + e.getNumberOfMediumQuestions() + e.getNumberOfHardQuestions());
            }
        }

        e.setExamName(name);
        e.setSubjectName(subject.isEmpty() ? null : subject);
        e.setClassEntity(a.cls());
        e.setFormat(format);
        e.setFromTime(req.fromTime());
        // no end time given: the exam ends when the working time is over, so it can finish by itself
        e.setToTime(req.toTime() == null && req.fromTime() != null ? req.fromTime().plusMinutes(duration) : req.toTime());
        e.setDurationMinutes(duration);
        e.setMaxScore(max);
        e.setTestLayout(layout);
        e.setQuestionBank(bank);
        // only ONLINE may show the result at once (default yes); OFFLINE and SUBMIT never do
        e.setShowResultImmediately(format == ExamFormat.ONLINE && !Boolean.FALSE.equals(req.showResultImmediately()));
        // open book is an ONLINE-only switch and is off unless the teacher turns it on
        e.setAllowReference(format == ExamFormat.ONLINE && Boolean.TRUE.equals(req.allowReference()));
        // what leaving the exam screen does only matters for ONLINE without open book
        e.setLeavePolicy(OnlineExamRules.normalizePolicy(req.leavePolicy()));
    }

    /** Fewer questions than the sheet has is fine (the spare rows stay blank); more is impossible. */
    private static void assertFitsTemplate(TestLayout layout, int perVersion) {
        if (layout != null && perVersion > layout.getTotalQuestions()) {
            throw TemplateException.badRequestWithCode("QUESTIONS_EXCEED_TEMPLATE",
                    "Mỗi mã đề có " + perVersion + " câu, nhiều hơn số câu của mẫu phiếu (" + layout.getTotalQuestions() + ")",
                    "questions=" + perVersion, "template_questions=" + layout.getTotalQuestions());
        }
    }

    private void removeVersions(Examination e) {
        List<TestCode> old = codes.findByExamination_IdOrderByCodeNumberAsc(e.getId());
        if (old.isEmpty()) return;
        List<Long> ids = new ArrayList<>();
        for (TestCode c : old) ids.add(c.getId());
        codeQuestions.deleteAll(codeQuestions.findByTestCode_IdIn(ids));
        codeQuestions.flush();
        codes.deleteAll(old);
        codes.flush();
    }

    /** Version codes in order: 001, 002, 003, ... (the answer sheet has 3 cells for the code). */
    private List<String> freshCodes(int count) {
        List<String> out = new ArrayList<>();
        for (int n = 1; n <= count; n++) out.add(String.format("%03d", n));
        return out;
    }

    private List<ExamVersionDetailResponse> details(List<TestCode> list) {
        List<ExamVersionDetailResponse> out = new ArrayList<>();
        if (list.isEmpty()) return out;
        List<Long> codeIds = new ArrayList<>();
        for (TestCode c : list) codeIds.add(c.getId());
        List<TestCodeQuestion> rows = codeQuestions.findByCodes(codeIds);
        Set<Long> questionIds = new HashSet<>();
        for (TestCodeQuestion tq : rows) questionIds.add(tq.getQuestion().getId());
        Map<Long, List<QuestionAnswer>> options = new HashMap<>();
        if (!questionIds.isEmpty()) {
            for (QuestionAnswer qa : answers.findByQuestion_IdIn(questionIds)) {
                options.computeIfAbsent(qa.getQuestion().getId(), k -> new ArrayList<>()).add(qa);
            }
        }
        Map<Long, List<ExamVersionQuestionResponse>> byCode = new HashMap<>();
        for (TestCodeQuestion tq : rows) {
            Question q = tq.getQuestion();
            List<QuestionAnswer> source = new ArrayList<>(options.getOrDefault(q.getId(), List.of()));
            source.sort(Comparator.comparing(QuestionAnswer::getChoiceLabel));
            List<QuestionOptionResponse> opts = new ArrayList<>();
            List<String> correct = new ArrayList<>();
            for (QuestionAnswer qa : source) {
                boolean ok = Boolean.TRUE.equals(qa.getIsCorrect());
                opts.add(new QuestionOptionResponse(qa.getChoiceLabel(), qa.getContent(), ok));
                if (ok) correct.add(qa.getChoiceLabel());
            }
            byCode.computeIfAbsent(tq.getTestCode().getId(), k -> new ArrayList<>()).add(new ExamVersionQuestionResponse(
                    tq.getQuestionOrder(), q.getUuid(), q.getContent(), q.getQuestionType().name(), q.getDifficulty().name(), opts, correct));
        }
        for (TestCode c : list) out.add(new ExamVersionDetailResponse(c.getUuid(), c.getCodeNumber(), byCode.getOrDefault(c.getId(), List.of())));
        return out;
    }

    private ExamResponse response(Examination e) {
        Class cls = e.getClassEntity();
        TestLayout layout = e.getTestLayout();
        QuestionBank bank = e.getQuestionBank();
        int e1 = nz(e.getNumberOfEasyQuestions()), m = nz(e.getNumberOfMediumQuestions()), h = nz(e.getNumberOfHardQuestions());
        long versions = codes.countByExamination_Id(e.getId());
        boolean immediate = e.getFormat() == ExamFormat.ONLINE && !Boolean.FALSE.equals(e.getShowResultImmediately());
        return new ExamResponse(e.getUuid(), e.getExamName(), e.getSubjectName(),
                cls == null ? null : cls.getUuid(), cls == null ? null : cls.getName(),
                e.getFormat().name(), e.getStatus().name(), e.getFromTime(), e.getToTime(), e.getDurationMinutes(), e.getMaxScore(),
                layout == null ? null : layout.getUuid(), layout == null ? null : layout.getName(), layout == null ? null : layout.getTotalQuestions(),
                bank == null ? null : bank.getUuid(), bank == null ? null : bank.getName(),
                (int) versions, e1, m, h, versions > 0 ? e1 + m + h : 0,
                immediate, e.getFormat() == ExamFormat.ONLINE && Boolean.TRUE.equals(e.getAllowReference()),
                OnlineExamRules.normalizePolicy(e.getLeavePolicy()),
                immediate ? "IMMEDIATE" : "AFTER_TEACHER_PUBLISH", Boolean.TRUE.equals(e.getIsScorePublished()),
                released(e), "TEACHER", e.getCreatedAt());
    }

    /** What a student may know about the exam: no template, bank or version facts. */
    private ExamResponse studentView(Examination e) {
        ExamResponse r = response(e);
        return new ExamResponse(r.id(), r.name(), r.subject(), r.classId(), r.className(), r.format(), r.status(), r.fromTime(), r.toTime(),
                r.durationMinutes(), r.maxScore(), null, null, null, null, null, 0, 0, 0, 0, 0,
                r.showResultImmediately(), r.allowReference(), r.leavePolicy(), r.resultPolicy(), r.isScorePublished(), r.resultsReleased(), "STUDENT", r.createdAt());
    }

    private static ExamFormat parseFormat(String s) {
        String k = s == null ? "" : s.trim().toUpperCase(Locale.ROOT);
        if (k.isEmpty()) throw invalid("Hãy chọn loại kỳ thi (OFFLINE, ONLINE hoặc SUBMIT)");
        try {
            return ExamFormat.valueOf(k);
        } catch (IllegalArgumentException ex) {
            throw invalid("Loại kỳ thi không hợp lệ: " + s + " (OFFLINE, ONLINE hoặc SUBMIT)");
        }
    }

    private static String label(QuestionDifficulty d) {
        return switch (d) { case EASY -> "câu dễ"; case MEDIUM -> "câu trung bình"; case HARD -> "câu khó"; };
    }

    private static int num(Integer v, int dflt) { return v == null ? dflt : v; }
    private static int nz(Integer v) { return v == null ? 0 : v; }

    private static TemplateException invalid(String message) {
        return TemplateException.badRequestWithCode("INVALID_EXAM", message);
    }
}
