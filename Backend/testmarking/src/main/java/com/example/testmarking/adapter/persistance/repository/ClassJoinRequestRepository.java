package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.ClassJoinRequest;
import com.example.testmarking.domain.entities.enums.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClassJoinRequestRepository extends JpaRepository<ClassJoinRequest, Long> {

    @Query("select r from ClassJoinRequest r join fetch r.student join fetch r.clazz where r.uuid = :uuid")
    Optional<ClassJoinRequest> findByUuid(@Param("uuid") UUID uuid);

    boolean existsByClazz_IdAndStudent_IdAndStatus(Long classId, Long userId, RequestStatus status);

    long countByClazz_IdAndStatus(Long classId, RequestStatus status);

    /** Oldest first for PENDING (first come first served); the service reverses it for history. */
    @Query("select r from ClassJoinRequest r join fetch r.student where r.clazz.id = :classId and r.status = :status "
            + "order by r.createdAt asc")
    List<ClassJoinRequest> findByClassAndStatus(@Param("classId") Long classId, @Param("status") RequestStatus status);
}
