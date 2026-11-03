package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.Student;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByUser_Id(Long userId);

    Optional<Student> findByStudentCode(String studentCode);

    List<Student> findByUser_IdIn(Collection<Long> userIds);
}
