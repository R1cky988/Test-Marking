package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.QuestionAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface QuestionAnswerRepository extends JpaRepository<QuestionAnswer, Long> {

    /** Answers of a whole page of questions in ONE query (no N+1). */
    List<QuestionAnswer> findByQuestion_IdIn(Collection<Long> questionIds);
}
