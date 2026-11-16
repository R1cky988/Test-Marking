package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.TestLayout;
import com.example.testmarking.domain.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TestLayoutRepository extends JpaRepository<TestLayout, Long> {

    Optional<TestLayout> findByUuid(UUID uuid);

    List<TestLayout> findByCreatedUserOrderByCreatedAtDesc(User createdUser);

    List<TestLayout> findByCreatedUserAndStatusOrderByCreatedAtDesc(User createdUser, String status);

    /** How many exams use this layout. A layout used by an exam cannot be edited or deleted. */
    /** The highest layout_id this teacher has used: 0 when he has no sheet yet. */
    @Query("select coalesce(max(l.layoutId), 0) from TestLayout l where l.createdUser = :user")
    int maxLayoutId(@Param("user") User user);

    @Query("select count(e) from Examination e where e.testLayout.id = :layoutId")
    long countExamsUsing(@Param("layoutId") Long layoutId);
}
