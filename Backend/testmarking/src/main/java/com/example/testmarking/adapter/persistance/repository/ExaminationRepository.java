package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.Examination;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExaminationRepository extends JpaRepository<Examination, Long> {
    List<Examination> findByClassEntity_IdOrderByFromTimeDesc(Long classId);
}
