package com.example.testmarking.domain.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "student_answers", uniqueConstraints = {
        @UniqueConstraint(name = "unique_result_question", columnNames = {"exam_result_id", "question_order"})
})
@Getter
@Setter
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_result_id", nullable = false)
    private ExamResult examResult;

    @Column(name = "question_order", nullable = false)
    private Integer questionOrder;

    @Column(name = "student_choice", length = 10)
    private String studentChoice;

    @Column(name = "is_correct", nullable = false)
    private Boolean isCorrect = false;
}