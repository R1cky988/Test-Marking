package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.SharedQuestionBankUser;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SharedQuestionBankUserRepository extends JpaRepository<SharedQuestionBankUser, Long> {
    void deleteByQuestionBank_Id(Long bankId);
}
