package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.Class;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ClassRepository extends JpaRepository<Class, Long> {

    /** Owner is fetched: the access check reads it outside of a lazy session in some paths. */
    @Query("select c from Class c join fetch c.createdUser where c.uuid = :uuid")
    Optional<Class> findByUuid(@Param("uuid") UUID uuid);

    @Query("select c from Class c join fetch c.createdUser where c.classJoinCode = :code")
    Optional<Class> findByJoinCode(@Param("code") String code);

    boolean existsByClassJoinCode(String classJoinCode);

    boolean existsByClassCode(String classCode);

    /**
     * Teacher's own classes, newest first.
     * archivedMode: 0 = all, 1 = active only, 2 = archived only.  schoolYear / search: "" = no filter (search is lower-cased).
     * Sentinel values instead of "is null" checks keep the query independent of how the driver types null parameters.
     */
    @Query(value = "select c from Class c join fetch c.createdUser u where u.id = :userId "
            + "and (:archivedMode = 0 or (:archivedMode = 1 and c.isArchived = false) or (:archivedMode = 2 and c.isArchived = true)) "
            + "and (:schoolYear = '' or c.schoolYear = :schoolYear) "
            + "and (:search = '' or lower(c.name) like concat('%', :search, '%')) "
            + "order by c.createdAt desc, c.id desc",
            countQuery = "select count(c) from Class c where c.createdUser.id = :userId "
                    + "and (:archivedMode = 0 or (:archivedMode = 1 and c.isArchived = false) or (:archivedMode = 2 and c.isArchived = true)) "
                    + "and (:schoolYear = '' or c.schoolYear = :schoolYear) "
                    + "and (:search = '' or lower(c.name) like concat('%', :search, '%'))")
    Page<Class> findOwned(@Param("userId") Long userId, @Param("archivedMode") int archivedMode,
                          @Param("schoolYear") String schoolYear, @Param("search") String search, Pageable pageable);

    /** Classes a student is enrolled in (archived classes are hidden from students). */
    @Query(value = "select c from Class c join fetch c.createdUser where c.isArchived = false "
            + "and exists (select 1 from ClassStudent cs where cs.classEntity = c and cs.student.user.id = :userId) "
            + "and (:schoolYear = '' or c.schoolYear = :schoolYear) "
            + "and (:search = '' or lower(c.name) like concat('%', :search, '%')) "
            + "order by c.createdAt desc, c.id desc",
            countQuery = "select count(c) from Class c where c.isArchived = false "
                    + "and exists (select 1 from ClassStudent cs where cs.classEntity = c and cs.student.user.id = :userId) "
                    + "and (:schoolYear = '' or c.schoolYear = :schoolYear) "
                    + "and (:search = '' or lower(c.name) like concat('%', :search, '%'))")
    Page<Class> findJoined(@Param("userId") Long userId, @Param("schoolYear") String schoolYear,
                           @Param("search") String search, Pageable pageable);
}
