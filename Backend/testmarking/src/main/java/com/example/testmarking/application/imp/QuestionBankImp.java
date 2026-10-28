package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.*;
import com.example.testmarking.adapter.rest.dtos.request.QuestionBankRequest;
import com.example.testmarking.adapter.rest.dtos.response.DifficultyCountsResponse;
import com.example.testmarking.adapter.rest.dtos.response.MessageResponse;
import com.example.testmarking.adapter.rest.dtos.response.QuestionBankResponse;
import com.example.testmarking.domain.entities.QuestionBank;
import com.example.testmarking.domain.entities.User;
import com.example.testmarking.domain.entities.enums.QuestionDifficulty;
import com.example.testmarking.template.exception.TemplateException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

/**
 * Question banks. Like classes, a bank belongs to the person who created it (QuestionBank.createdUser): he is the only one
 * who may see or change it, whatever his global role. Somebody else's bank answers 403, an unknown id 404.
 */
@Service
public class QuestionBankImp {

    public static final int MAX_NAME = 200;
    public static final int MAX_SUBJECT = 100;
    public static final int MAX_DESCRIPTION = 2000;

    private final QuestionBankRepository banks;
    private final QuestionRepository questions;
    private final TestCodeQuestionRepository used;
    private final ExaminationRepository exams;
    private final QuestionBankTagRepository tags;
    private final SharedQuestionBankUserRepository shared;

    public QuestionBankImp(QuestionBankRepository banks, QuestionRepository questions, TestCodeQuestionRepository used,
                           ExaminationRepository exams, QuestionBankTagRepository tags, SharedQuestionBankUserRepository shared) {
        this.banks = banks;
        this.questions = questions;
        this.used = used;
        this.exams = exams;
        this.tags = tags;
        this.shared = shared;
    }

    /** The bank, when it is mine. Used by the question service too. */
    QuestionBank requireOwned(User me, UUID bankId) {
        QuestionBank bank = banks.findByUuid(bankId)
                .orElseThrow(() -> TemplateException.notFound("QUESTION_BANK_NOT_FOUND", "Không tìm thấy ngân hàng câu hỏi"));
        if (bank.getCreatedUser() == null || !Objects.equals(bank.getCreatedUser().getId(), me.getId())) {
            throw TemplateException.forbidden("Đây không phải ngân hàng câu hỏi của bạn");
        }
        return bank;
    }

    @Transactional(readOnly = true)
    public List<QuestionBankResponse> list(User me, String search) {
        List<QuestionBank> mine = banks.findOwned(me.getId(), search == null ? "" : search.trim().toLowerCase(Locale.ROOT));
        Map<Long, int[]> counts = new HashMap<>();   // bank id -> [easy, medium, hard]
        if (!mine.isEmpty()) {
            List<Long> ids = new ArrayList<>();
            for (QuestionBank b : mine) ids.add(b.getId());
            for (Object[] row : questions.countByBankAndDifficulty(ids)) {
                int[] c = counts.computeIfAbsent((Long) row[0], k -> new int[3]);
                c[((QuestionDifficulty) row[1]).ordinal()] = ((Number) row[2]).intValue();
            }
        }
        List<QuestionBankResponse> out = new ArrayList<>();
        for (QuestionBank b : mine) out.add(response(b, counts.getOrDefault(b.getId(), new int[3])));
        return out;
    }

    @Transactional(readOnly = true)
    public QuestionBankResponse get(User me, UUID bankId) {
        return responseOf(requireOwned(me, bankId));
    }

    @Transactional
    public QuestionBankResponse create(User me, QuestionBankRequest req) {
        QuestionBank bank = new QuestionBank();
        bank.setUuid(UUID.randomUUID());
        bank.setCreatedUser(me);
        bank.setNumberOfQuestions(0);
        bank.setIsPrivate(true);
        apply(bank, req);
        bank.setCreatedAt(LocalDate.now());
        bank.setUpdatedAt(LocalDate.now());
        return responseOf(banks.save(bank));
    }

    @Transactional
    public QuestionBankResponse update(User me, UUID bankId, QuestionBankRequest req) {
        QuestionBank bank = requireOwned(me, bankId);
        apply(bank, req);
        bank.setUpdatedAt(LocalDate.now());
        return responseOf(banks.save(bank));
    }

    /** A bank an exam was built from, or with a question already printed on a paper, cannot be deleted: the exam would lose it. */
    @Transactional
    public MessageResponse delete(User me, UUID bankId) {
        QuestionBank bank = requireOwned(me, bankId);
        if (exams.existsByQuestionBank_Id(bank.getId()) || used.existsByQuestion_QuestionBank_Id(bank.getId())) {
            throw TemplateException.badRequestWithCode("QUESTION_BANK_IN_USE",
                    "Ngân hàng đang được một kỳ thi sử dụng nên không thể xóa");
        }
        tags.deleteByQuestionBank_Id(bank.getId());
        shared.deleteByQuestionBank_Id(bank.getId());
        questions.deleteAll(questions.findByQuestionBank_Id(bank.getId()));   // answers go with them (cascade)
        banks.delete(bank);
        return new MessageResponse("Đã xóa ngân hàng câu hỏi");
    }

    /** Keeps QuestionBank.numberOfQuestions equal to the real count after every change of its questions. */
    void refreshCount(QuestionBank bank) {
        bank.setNumberOfQuestions((int) questions.countByQuestionBank_Id(bank.getId()));
        bank.setUpdatedAt(LocalDate.now());
        banks.save(bank);
    }

    // ─── helpers ─────────────────────────────────────────────────

    private static void apply(QuestionBank bank, QuestionBankRequest req) {
        if (req == null) throw TemplateException.badRequest("Thiếu dữ liệu", "body: is required");
        String name = req.name() == null ? "" : req.name().trim();
        if (name.isEmpty()) throw TemplateException.badRequestWithCode("INVALID_QUESTION_BANK", "Tên ngân hàng không được để trống", "name: is required");
        if (name.length() > MAX_NAME) throw TemplateException.badRequestWithCode("INVALID_QUESTION_BANK", "Tên ngân hàng tối đa " + MAX_NAME + " ký tự", "name: too long");
        String subject = req.subject() == null ? "" : req.subject().trim();
        if (subject.length() > MAX_SUBJECT) throw TemplateException.badRequestWithCode("INVALID_QUESTION_BANK", "Môn học tối đa " + MAX_SUBJECT + " ký tự", "subject: too long");
        String description = req.description() == null ? "" : req.description().trim();
        if (description.length() > MAX_DESCRIPTION) throw TemplateException.badRequestWithCode("INVALID_QUESTION_BANK", "Mô tả tối đa " + MAX_DESCRIPTION + " ký tự", "description: too long");
        bank.setName(name);
        bank.setSubject(subject.isEmpty() ? null : subject);
        bank.setDescription(description.isEmpty() ? null : description);
    }

    private QuestionBankResponse responseOf(QuestionBank bank) {
        int[] c = new int[3];
        for (Object[] row : questions.countByDifficulty(bank.getId())) c[((QuestionDifficulty) row[0]).ordinal()] = ((Number) row[1]).intValue();
        return response(bank, c);
    }

    private static QuestionBankResponse response(QuestionBank b, int[] c) {
        // QuestionDifficulty order: EASY, MEDIUM, HARD
        return new QuestionBankResponse(b.getUuid(), b.getName(), b.getSubject(), b.getDescription(),
                c[0] + c[1] + c[2], new DifficultyCountsResponse(c[0], c[1], c[2]), b.getCreatedAt(), b.getUpdatedAt());
    }
}
