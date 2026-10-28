package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.QuestionBank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuestionBankRepository extends JpaRepository<QuestionBank, Long> {

    /** Owner is fetched: the access check reads it after the query. */
    @Query("select b from QuestionBank b join fetch b.createdUser where b.uuid = :uuid")
    Optional<QuestionBank> findByUuid(@Param("uuid") UUID uuid);

    /** My banks, newest first. search: "" = no filter (already lower-cased by the service). */
    @Query("select b from QuestionBank b where b.createdUser.id = :userId "
            + "and (:search = '' or lower(b.name) like concat('%', :search, '%') or lower(coalesce(b.subject, '')) like concat('%', :search, '%')) "
            + "order by b.id desc")
    List<QuestionBank> findOwned(@Param("userId") Long userId, @Param("search") String search);
}
