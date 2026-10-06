package com.example.testmarking.domain.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "shared_question_bank_users", uniqueConstraints = {
        @UniqueConstraint(name = "unique_shared_bank_user", columnNames = {"question_bank_id", "user_id"})
})
@Getter
@Setter
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SharedQuestionBankUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_bank_id", nullable = false)
    private QuestionBank questionBank;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "shared_at")
    private LocalDate sharedAt;

    @PrePersist
    public void generateUuid() {
        if (sharedAt == null) {
            sharedAt = LocalDate.now();
        }
    }
}