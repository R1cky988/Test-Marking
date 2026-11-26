package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.ExamResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExamResultRepository extends JpaRepository<ExamResult, Long> {

    /** An exam that already has marked / submitted papers must keep its versions. */
    boolean existsByExamination_Id(Long examId);

    /** The current paper of every student of the exam (a re-marked paper replaces the older attempt), by student code. */
    @Query("select r from ExamResult r join fetch r.student s join fetch s.user left join fetch r.testCode "
            + "where r.examination.id = :examId and r.isLatest = true order by s.studentCode")
    List<ExamResult> findLatestByExam(@Param("examId") Long examId);

    @Query("select r from ExamResult r join fetch r.student s join fetch s.user left join fetch r.testCode "
            + "where r.uuid = :uuid and r.examination.id = :examId")
    Optional<ExamResult> findByUuidAndExam(@Param("uuid") UUID uuid, @Param("examId") Long examId);

    @Query("select r from ExamResult r left join fetch r.testCode "
            + "where r.examination.id = :examId and r.student.id = :studentId and r.isLatest = true")
    Optional<ExamResult> findLatestOf(@Param("examId") Long examId, @Param("studentId") Long studentId);

    /** The user has handed in a paper for the exam (a paper that only carries a violation does not count). */
    @Query("select count(r) > 0 from ExamResult r where r.examination.id = :examId and r.student.user.id = :userId "
            + "and r.isLatest = true and r.processingStatus <> 'NO_SUBMISSION'")
    boolean hasSubmitted(@Param("examId") Long examId, @Param("userId") Long userId);

    /** How many times the student handed in his sheet (null count = 1, made before the counter existed); empty list = not handed in. */
    @Query("select coalesce(r.submitCount, 1) from ExamResult r where r.examination.id = :examId and r.student.user.id = :userId "
            + "and r.isLatest = true and r.processingStatus <> 'NO_SUBMISSION'")
    java.util.List<Integer> submitCounts(@Param("examId") Long examId, @Param("userId") Long userId);
}
