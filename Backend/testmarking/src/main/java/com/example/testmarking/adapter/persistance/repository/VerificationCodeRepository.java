package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.User;
import com.example.testmarking.domain.entities.VerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VerificationCodeRepository extends JpaRepository<VerificationCode, Long> {
    Optional<VerificationCode> findByCodeAndUser(String code, User user);
    Optional<VerificationCode> findByUser(User user);
}