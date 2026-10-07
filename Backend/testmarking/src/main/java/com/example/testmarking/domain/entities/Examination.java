package com.example.testmarking.domain.entities;

import com.example.testmarking.domain.entities.enums.ExamFormat;
import com.example.testmarking.domain.entities.enums.ExamStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "examinations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Examination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "uuid", nullable = false, unique = true, updatable = false)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_user_id", nullable = false)
    private User createdUser;

    @Column(name = "exam_name", nullable = false, length = 200)
    private String examName;

    @Column(name = "subject_name", length = 100)
    private String subjectName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private Class classEntity;

    @Column(name = "grade_level", length = 50)
    private String gradeLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "format", nullable = false, length = 30)
    private ExamFormat format = ExamFormat.OFFLINE;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ExamStatus status = ExamStatus.DRAFT;

    @Column(name = "from_time")
    private OffsetDateTime fromTime;

    @Column(name = "to_time")
    private OffsetDateTime toTime;

    @Column(name = "duration_minutes")
    private Integer durationMinutes = 60;

    @Column(name = "max_score", precision = 5, scale = 2)
    private BigDecimal maxScore = new BigDecimal("10.00");

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_layout_id")
    private TestLayout testLayout;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_bank_id")
    private QuestionBank questionBank;

    @Column(name = "number_of_test_codes", nullable = false)
    private Integer numberOfTestCodes = 1;

    @Column(name = "number_of_easy_questions", nullable = false)
    private Integer numberOfEasyQuestions = 0;

    @Column(name = "number_of_medium_questions", nullable = false)
    private Integer numberOfMediumQuestions = 0;

    @Column(name = "number_of_hard_questions", nullable = false)
    private Integer numberOfHardQuestions = 0;

    // Cờ kiểm soát công bố điểm (Examxy policy)
    @Column(name = "is_score_published", nullable = false)
    private Boolean isScorePublished = false;

    @Column(name = "score_published_at")
    private OffsetDateTime scorePublishedAt;

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
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.uuid == null) {
            this.uuid = UUID.randomUUID();
        }
        if (this.isScorePublished == null) {
            this.isScorePublished = false;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}