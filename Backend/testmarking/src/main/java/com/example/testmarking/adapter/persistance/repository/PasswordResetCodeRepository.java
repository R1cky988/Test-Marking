package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.PasswordResetCode;
import com.example.testmarking.domain.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PasswordResetCodeRepository extends JpaRepository<PasswordResetCode, Long> {

    Optional<PasswordResetCode> findFirstByUserOrderByCreatedAtDesc(User user);

    void deleteByUser(User user);
}
