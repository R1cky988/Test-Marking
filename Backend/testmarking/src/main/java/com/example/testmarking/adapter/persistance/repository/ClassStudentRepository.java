package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.ClassStudent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClassStudentRepository extends JpaRepository<ClassStudent, Long> {

    /** Is this user an enrolled student of the class? (ClassStudent.student.user) */
    boolean existsByClassEntity_IdAndStudent_User_Id(Long classId, Long userId);

    boolean existsByClassEntity_IdAndStudent_Id(Long classId, Long studentId);

    long countByClassEntity_Id(Long classId);

    void deleteByStudent_Id(Long studentId);

    /** Roster, with student and user loaded in one query. */
    @Query("select cs from ClassStudent cs join fetch cs.student s join fetch s.user "
            + "where cs.classEntity.id = :classId order by cs.joinedAt asc")
    List<ClassStudent> findRoster(@Param("classId") Long classId);

    @Query("select cs from ClassStudent cs where cs.classEntity.id = :classId and cs.student.uuid = :studentUuid")
    Optional<ClassStudent> findByClassAndStudentUuid(@Param("classId") Long classId, @Param("studentUuid") UUID studentUuid);

    /** [classId, studentCount] rows for a page of the class list (one query instead of one per class). */
    @Query("select cs.classEntity.id, count(cs) from ClassStudent cs where cs.classEntity.id in :classIds group by cs.classEntity.id")
    List<Object[]> countByClassIds(@Param("classIds") Collection<Long> classIds);

}
