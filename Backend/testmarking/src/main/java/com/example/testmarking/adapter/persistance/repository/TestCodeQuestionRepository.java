package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.TestCodeQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TestCodeQuestionRepository extends JpaRepository<TestCodeQuestion, Long> {

    /** A question already placed in a test code (exam paper) must not be deleted. */
    boolean existsByQuestion_Id(Long questionId);

    boolean existsByQuestion_QuestionBank_Id(Long bankId);
}
