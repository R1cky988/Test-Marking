package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeacherRepository extends JpaRepository<Teacher, Long> {
}
