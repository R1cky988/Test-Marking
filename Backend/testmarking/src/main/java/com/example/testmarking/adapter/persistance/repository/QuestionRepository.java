package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.Question;
import com.example.testmarking.domain.entities.enums.QuestionDifficulty;
import com.example.testmarking.domain.entities.enums.QuestionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, Long> {

    @Query("select q from Question q where q.uuid = :uuid and q.questionBank.id = :bankId")
    Optional<Question> findInBank(@Param("bankId") Long bankId, @Param("uuid") UUID uuid);

    /**
     * Questions of one bank, newest first. Filters use sentinels instead of "is null" so the query does not depend on how
     * the driver types null parameters: difficultyMode / typeMode 0 = any, 1 = use difficulty / type;
     * search "" = any (already lower-cased).
     */
    @Query(value = "select q from Question q where q.questionBank.id = :bankId "
            + "and (:difficultyMode = 0 or q.difficulty = :difficulty) "
            + "and (:typeMode = 0 or q.questionType = :type) "
            + "and (:search = '' or lower(q.content) like concat('%', :search, '%')) "
            + "order by q.id desc",
            countQuery = "select count(q) from Question q where q.questionBank.id = :bankId "
                    + "and (:difficultyMode = 0 or q.difficulty = :difficulty) "
                    + "and (:typeMode = 0 or q.questionType = :type) "
                    + "and (:search = '' or lower(q.content) like concat('%', :search, '%'))")
    Page<Question> search(@Param("bankId") Long bankId,
                          @Param("difficultyMode") int difficultyMode, @Param("difficulty") QuestionDifficulty difficulty,
                          @Param("typeMode") int typeMode, @Param("type") QuestionType type,
                          @Param("search") String search, Pageable pageable);

    long countByQuestionBank_Id(Long bankId);

    /** Rows of [difficulty, count] for one bank. */
    @Query("select q.difficulty, count(q) from Question q where q.questionBank.id = :bankId group by q.difficulty")
    List<Object[]> countByDifficulty(@Param("bankId") Long bankId);

    /** Rows of [bank id, difficulty, count] for several banks (one query for the whole list page). */
    @Query("select q.questionBank.id, q.difficulty, count(q) from Question q where q.questionBank.id in :bankIds group by q.questionBank.id, q.difficulty")
    List<Object[]> countByBankAndDifficulty(@Param("bankIds") List<Long> bankIds);

    List<Question> findByQuestionBank_Id(Long bankId);
}
