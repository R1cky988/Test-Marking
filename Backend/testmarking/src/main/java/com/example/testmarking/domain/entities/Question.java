package com.example.testmarking.domain.entities;

import com.example.testmarking.domain.entities.enums.QuestionDifficulty;
import com.example.testmarking.domain.entities.enums.QuestionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "questions", indexes = {
        @Index(name = "idx_question_bank_id", columnList = "bank_id"),
        @Index(name = "idx_question_difficulty", columnList = "difficulty")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false)
    private UUID uuid;

    // Sửa name = "bank_id" để khớp với CSDL
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_id", nullable = false)
    private QuestionBank questionBank;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    /*
     * Lưu danh sách lựa chọn dạng JSONB (Khớp với cột options trong CSDL của bạn: ["<p>asdf</p>", ...])
     * Nếu bạn sử dụng song song với bảng QuestionAnswer thì có thể giữ nguyên cột này làm cache
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "options", columnDefinition = "jsonb")
    private String options;

    @Column(name = "number_of_answers", nullable = false)
    @Builder.Default
    private Integer numberOfAnswers = 4;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false)
    @Builder.Default
    private QuestionType questionType = QuestionType.SINGLE;

    /* Lời giải / giải thích, hiển thị sau khi chấm (có thể chứa LaTeX) */
    @Column(columnDefinition = "TEXT")
    private String explanation;

    // Lưu nhãn đáp án đúng (VD: "A", "B" hoặc "A,C")
    @Column(name = "correct_answer", length = 50)
    private String correctAnswer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private QuestionDifficulty difficulty = QuestionDifficulty.MEDIUM;

    @Column(length = 100)
    private String topic;

    /* Ánh xạ 1-N tới bảng QuestionAnswer (Tùy chọn nếu bạn muốn load danh sách đáp án từ Java) */
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<QuestionAnswer> answers = new ArrayList<>();

    /* Audit fields với OffsetDateTime */
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        this.updatedAt = now;
        if (this.uuid == null) {
            this.uuid = UUID.randomUUID();
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}