package com.example.testmarking.domain.entities;

import com.example.testmarking.domain.entities.enums.ExamFormat;
import com.example.testmarking.domain.entities.enums.ExamStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "examinations")
@Getter
@Setter
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Examination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
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
    @Column(nullable = false)
    private ExamFormat format = ExamFormat.OFFLINE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
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

    @Column(name = "created_at")
    private LocalDate createdAt;

    @Column(name = "updated_at")
    private LocalDate updatedAt;

    @PrePersist
    public void generateUuid() {
        if (createdAt == null) {
            createdAt = LocalDate.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDate.now();
        }
        if (uuid == null) {
            uuid = UUID.randomUUID();
        }
    }
}