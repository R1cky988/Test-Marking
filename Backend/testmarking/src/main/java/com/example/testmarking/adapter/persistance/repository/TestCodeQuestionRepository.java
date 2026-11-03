package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.TestCodeQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface TestCodeQuestionRepository extends JpaRepository<TestCodeQuestion, Long> {

    /** A question already placed in a test code (exam paper) must not be deleted. */
    boolean existsByQuestion_Id(Long questionId);

    boolean existsByQuestion_QuestionBank_Id(Long bankId);

    /** The questions of several versions in paper order, with the question itself (no N+1). */
    @Query("select tq from TestCodeQuestion tq join fetch tq.question where tq.testCode.id in :codeIds order by tq.testCode.id, tq.questionOrder")
    List<TestCodeQuestion> findByCodes(@Param("codeIds") Collection<Long> codeIds);

    List<TestCodeQuestion> findByTestCode_IdIn(Collection<Long> codeIds);
}
