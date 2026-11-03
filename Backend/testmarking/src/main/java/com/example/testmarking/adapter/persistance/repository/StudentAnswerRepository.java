package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.StudentAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface StudentAnswerRepository extends JpaRepository<StudentAnswer, Long> {

    List<StudentAnswer> findByExamResult_IdIn(Collection<Long> resultIds);

    List<StudentAnswer> findByExamResult_IdOrderByQuestionOrder(Long resultId);
}
