package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.TestCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** A TestCode is one version ("mã đề") of an exam. */
public interface TestCodeRepository extends JpaRepository<TestCode, Long> {

    List<TestCode> findByExamination_IdOrderByCodeNumberAsc(Long examId);

    Optional<TestCode> findByUuidAndExamination_Id(UUID uuid, Long examId);

    long countByExamination_Id(Long examId);
}
