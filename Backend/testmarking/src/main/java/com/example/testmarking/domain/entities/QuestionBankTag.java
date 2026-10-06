package com.example.testmarking.domain.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "question_bank_tags", uniqueConstraints = {
        @UniqueConstraint(name = "unique_bank_tag", columnNames = {"question_bank_id", "tag_id"})
})
@Getter
@Setter
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionBankTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_bank_id", nullable = false)
    private QuestionBank questionBank;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id", nullable = false)
    private Tag tag;
}