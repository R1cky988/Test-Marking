package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.QuestionBankTag;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionBankTagRepository extends JpaRepository<QuestionBankTag, Long> {
    void deleteByQuestionBank_Id(Long bankId);
}
