package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.QuestionAnswerRepository;
import com.example.testmarking.adapter.persistance.repository.QuestionRepository;
import com.example.testmarking.adapter.persistance.repository.TestCodeQuestionRepository;
import com.example.testmarking.adapter.rest.dtos.request.QuestionRequest;
import com.example.testmarking.adapter.rest.dtos.response.*;
import com.example.testmarking.application.imp.QuestionRules.Clean;
import com.example.testmarking.application.imp.SimpleXlsxReader.Row;
import com.example.testmarking.domain.entities.Question;
import com.example.testmarking.domain.entities.QuestionAnswer;
import com.example.testmarking.domain.entities.QuestionBank;
import com.example.testmarking.domain.entities.User;
import com.example.testmarking.domain.entities.enums.QuestionDifficulty;
import com.example.testmarking.domain.entities.enums.QuestionType;
import com.example.testmarking.template.exception.TemplateException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Questions of a bank (owner of the bank only). A question is single-answer (exactly one correct option) or
 * multiple-answer (one or more). Content, options and explanation are LaTeX-friendly text, stored as typed.
 * QuestionAnswer rows are the source of truth; Question.options / correctAnswer are a cache kept in step with them.
 */
@Service
public class QuestionImp {

    public static final int MAX_LIMIT = 50;
    public static final long MAX_BYTES = 5L * 1024 * 1024;
    public static final int MAX_IMPORT_ROWS = 500;

    private final QuestionBankImp bankService;
    private final QuestionRepository questions;
    private final QuestionAnswerRepository answers;
    private final TestCodeQuestionRepository used;

    public QuestionImp(QuestionBankImp bankService, QuestionRepository questions, QuestionAnswerRepository answers, TestCodeQuestionRepository used) {
        this.bankService = bankService;
        this.questions = questions;
        this.answers = answers;
        this.used = used;
    }

    @Transactional(readOnly = true)
    public QuestionListResponse list(User me, UUID bankId, Integer page, Integer limit, String search,
                                     String difficulty, String type) {
        QuestionBank bank = bankService.requireOwned(me, bankId);
        int p = page == null || page < 1 ? 1 : page;
        int l = limit == null || limit < 1 ? 10 : Math.min(limit, MAX_LIMIT);
        boolean hasDifficulty = difficulty != null && !difficulty.isBlank() && !difficulty.equalsIgnoreCase("all");
        boolean hasType = type != null && !type.isBlank() && !type.equalsIgnoreCase("all");
        Page<Question> result = questions.search(bank.getId(),
                hasDifficulty ? 1 : 0, hasDifficulty ? QuestionRules.parseDifficulty(difficulty) : QuestionDifficulty.MEDIUM,
                hasType ? 1 : 0, hasType ? QuestionRules.parseType(type, 1) : QuestionType.SINGLE,
                search == null ? "" : search.trim().toLowerCase(Locale.ROOT),
                PageRequest.of(p - 1, l));
        List<Question> rows = result.getContent();
        Map<Long, List<QuestionAnswer>> byQuestion = new HashMap<>();
        if (!rows.isEmpty()) {
            List<Long> ids = new ArrayList<>();
            for (Question q : rows) ids.add(q.getId());
            for (QuestionAnswer a : answers.findByQuestion_IdIn(ids)) {
                byQuestion.computeIfAbsent(a.getQuestion().getId(), k -> new ArrayList<>()).add(a);
            }
        }
        List<QuestionResponse> data = new ArrayList<>();
        for (Question q : rows) data.add(response(bank, q, byQuestion.getOrDefault(q.getId(), List.of())));
        return new QuestionListResponse(200, "OK", data, new ClassListMeta(p, l, result.getTotalElements()));
    }

    @Transactional
    public QuestionResponse create(User me, UUID bankId, QuestionRequest req) {
        QuestionBank bank = bankService.requireOwned(me, bankId);
        Question q = insert(bank, QuestionRules.clean(req));
        bankService.refreshCount(bank);
        return response(bank, q, q.getAnswers());
    }

    @Transactional
    public QuestionResponse update(User me, UUID bankId, UUID questionId, QuestionRequest req) {
        QuestionBank bank = bankService.requireOwned(me, bankId);
        Question q = find(bank, questionId);
        Clean c = QuestionRules.clean(req);
        q.setContent(c.content());
        q.setExplanation(c.explanation());
        q.setQuestionType(c.type());
        q.setDifficulty(c.difficulty());
        q.setOptions(QuestionRules.optionsJson(c.options()));
        q.setNumberOfAnswers(c.options().size());
        q.setCorrectAnswer(String.join(",", c.correct()));
        // answers are updated IN PLACE by label: (question, label) is unique and Hibernate inserts before it deletes,
        // so "clear and add again" would break that constraint
        Map<String, QuestionAnswer> byLabel = new HashMap<>();
        for (QuestionAnswer a : q.getAnswers()) byLabel.put(a.getChoiceLabel(), a);
        for (int i = 0; i < c.options().size(); i++) {
            String label = QuestionRules.label(i);
            QuestionAnswer a = byLabel.remove(label);
            if (a == null) {
                a = newAnswer(q, label);
                q.getAnswers().add(a);
            }
            a.setContent(c.options().get(i));
            a.setIsCorrect(c.correct().contains(label));
        }
        q.getAnswers().removeAll(byLabel.values());   // options that were deleted from the form (orphanRemoval)
        questions.save(q);
        bankService.refreshCount(bank);
        return response(bank, q, q.getAnswers());
    }

    @Transactional
    public MessageResponse delete(User me, UUID bankId, UUID questionId) {
        QuestionBank bank = bankService.requireOwned(me, bankId);
        Question q = find(bank, questionId);
        if (used.existsByQuestion_Id(q.getId())) {
            throw TemplateException.badRequestWithCode("QUESTION_IN_USE", "Câu hỏi đã nằm trong một đề thi nên không thể xóa");
        }
        questions.delete(q);
        bankService.refreshCount(bank);
        return new MessageResponse("Đã xóa câu hỏi");
    }

    // ─── Excel import ────────────────────────────────────────────

    /**
     * Columns (header in the first 10 rows, any order): Nội dung câu hỏi | A..E | Đáp án đúng | Độ khó | Lời giải.
     * "Đáp án đúng" = "B" or "A,C" (two or more -> multiple-answer). A bad row is reported and skipped, the good ones are kept.
     */
    @Transactional
    public QuestionImportResponse importXlsx(User me, UUID bankId, byte[] file) {
        QuestionBank bank = bankService.requireOwned(me, bankId);
        if (file == null || file.length == 0) throw TemplateException.badRequest("Chưa chọn tệp", "file: is required");
        if (file.length > MAX_BYTES) throw TemplateException.badRequestWithCode("FILE_TOO_LARGE", "Tệp vượt quá 5MB");

        List<Row> sheet = SimpleXlsxReader.readFirstSheet(file);
        Header h = findHeader(sheet);
        List<Row> data = new ArrayList<>();
        for (Row r : sheet) if (r.number() > h.row && !r.blank()) data.add(r);
        if (data.size() > MAX_IMPORT_ROWS) {
            throw TemplateException.badRequestWithCode("TOO_MANY_ROWS", "Tối đa " + MAX_IMPORT_ROWS + " dòng mỗi lần", "rows=" + data.size());
        }

        int imported = 0;
        List<QuestionImportErrorResponse> errors = new ArrayList<>();
        for (Row r : data) {
            List<String> options = new ArrayList<>();
            for (int col : h.optionCols) options.add(r.cell(col).trim());
            List<String> correct = new ArrayList<>();
            for (String part : r.cell(h.correctCol).split("[,;\\s]+")) if (!part.isBlank()) correct.add(part);
            try {
                Clean c = QuestionRules.clean(new QuestionRequest(r.cell(h.contentCol), h.explanationCol < 0 ? null : r.cell(h.explanationCol),
                        options, null, correct, h.difficultyCol < 0 ? null : r.cell(h.difficultyCol)));
                insert(bank, c);
                imported++;
            } catch (TemplateException e) {
                errors.add(new QuestionImportErrorResponse(r.number(), e.getMessage()));
            }
        }
        if (imported > 0) bankService.refreshCount(bank);
        return new QuestionImportResponse(imported, errors.size(), errors);
    }

    private record Header(int row, int contentCol, List<Integer> optionCols, int correctCol, int difficultyCol, int explanationCol) {}

    private static Header findHeader(List<Row> sheet) {
        int limit = Math.min(sheet.size(), 10);
        for (int i = 0; i < limit; i++) {
            Row r = sheet.get(i);
            int content = -1, correct = -1, difficulty = -1, explanation = -1;
            Map<Character, Integer> opts = new TreeMap<>();
            for (int c = 0; c < r.cells().size(); c++) {
                String k = QuestionRules.key(r.cell(c));
                if (content < 0 && (k.equals("noidungcauhoi") || k.equals("noidung") || k.equals("cauhoi") || k.equals("content") || k.equals("question"))) content = c;
                else if (correct < 0 && (k.equals("dapandung") || k.equals("dapan") || k.equals("correct") || k.equals("correctanswer"))) correct = c;
                else if (difficulty < 0 && (k.equals("dokho") || k.equals("difficulty"))) difficulty = c;
                else if (explanation < 0 && (k.equals("loigiai") || k.equals("giaithich") || k.equals("explanation"))) explanation = c;
                else if (k.length() == 1 && k.charAt(0) >= 'a' && k.charAt(0) <= 'e') opts.putIfAbsent(k.charAt(0), c);
                else if (k.length() == 7 && k.startsWith("option") && k.charAt(6) >= 'a' && k.charAt(6) <= 'e') opts.putIfAbsent(k.charAt(6), c);
            }
            if (content >= 0 && correct >= 0 && opts.size() >= 2) {
                return new Header(r.number(), content, new ArrayList<>(opts.values()), correct, difficulty, explanation);
            }
        }
        throw TemplateException.badRequestWithCode("MISSING_COLUMNS", "Thiếu cột bắt buộc",
                "expected header: Nội dung câu hỏi, A, B, ..., Đáp án đúng");
    }

    // ─── helpers ─────────────────────────────────────────────────

    private Question insert(QuestionBank bank, Clean c) {
        Question q = Question.builder()
                .uuid(UUID.randomUUID())
                .questionBank(bank)
                .content(c.content())
                .explanation(c.explanation())
                .options(QuestionRules.optionsJson(c.options()))
                .numberOfAnswers(c.options().size())
                .questionType(c.type())
                .correctAnswer(String.join(",", c.correct()))
                .difficulty(c.difficulty())
                .build();
        for (int i = 0; i < c.options().size(); i++) {
            String label = QuestionRules.label(i);
            QuestionAnswer a = newAnswer(q, label);
            a.setContent(c.options().get(i));
            a.setIsCorrect(c.correct().contains(label));
            q.getAnswers().add(a);
        }
        return questions.save(q);   // answers are saved with it (cascade)
    }

    private static QuestionAnswer newAnswer(Question q, String label) {
        QuestionAnswer a = new QuestionAnswer();
        a.setUuid(UUID.randomUUID());
        a.setQuestion(q);
        a.setChoiceLabel(label);
        return a;
    }

    private Question find(QuestionBank bank, UUID questionId) {
        return questions.findInBank(bank.getId(), questionId)
                .orElseThrow(() -> TemplateException.notFound("QUESTION_NOT_FOUND", "Không tìm thấy câu hỏi"));
    }

    private static QuestionResponse response(QuestionBank bank, Question q, List<QuestionAnswer> source) {
        List<QuestionAnswer> sorted = new ArrayList<>(source);
        sorted.sort(Comparator.comparing(QuestionAnswer::getChoiceLabel));
        List<QuestionOptionResponse> options = new ArrayList<>();
        List<String> correct = new ArrayList<>();
        for (QuestionAnswer a : sorted) {
            boolean ok = Boolean.TRUE.equals(a.getIsCorrect());
            options.add(new QuestionOptionResponse(a.getChoiceLabel(), a.getContent(), ok));
            if (ok) correct.add(a.getChoiceLabel());
        }
        return new QuestionResponse(q.getUuid(), bank.getUuid(), q.getContent(), q.getExplanation(), q.getQuestionType().name(),
                options, correct, q.getDifficulty().name(), q.getCreatedAt(), q.getUpdatedAt());
    }
}
