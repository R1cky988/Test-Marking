package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.ExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {

    @Query("select a from ExamAttempt a join fetch a.testCode "
            + "where a.examination.id = :examId and a.student.id = :studentId")
    Optional<ExamAttempt> findOf(@Param("examId") Long examId, @Param("studentId") Long studentId);

    /** Every attempt of the exam (the teacher's list shows who is working, locked or done). */
    @Query("select a from ExamAttempt a join fetch a.student s join fetch a.testCode where a.examination.id = :examId")
    List<ExamAttempt> findByExam(@Param("examId") Long examId);

    /** [testCodeId, attempts] : how many students already got each version. */
    @Query("select a.testCode.id, count(a) from ExamAttempt a where a.examination.id = :examId group by a.testCode.id")
    List<Object[]> countByVersion(@Param("examId") Long examId);
}
