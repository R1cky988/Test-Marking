package com.example.testmarking.domain.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "test_code_questions", uniqueConstraints = {
        @UniqueConstraint(name = "unique_test_code_question_order", columnNames = {"test_code_id", "question_order"})
})
@Getter
@Setter
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestCodeQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_code_id", nullable = false)
    private TestCode testCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "question_order", nullable = false)
    private Integer questionOrder;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "answer_key_mapping", columnDefinition = "jsonb")
    private String answerKeyMapping;

    @Column(name = "correct_answer", nullable = false, length = 10)
    private String correctAnswer;
}