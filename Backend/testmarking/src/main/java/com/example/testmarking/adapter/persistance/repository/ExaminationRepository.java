package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.Examination;
import com.example.testmarking.domain.entities.enums.ExamFormat;
import com.example.testmarking.domain.entities.enums.ExamStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExaminationRepository extends JpaRepository<Examination, Long> {
    List<Examination> findByClassEntity_IdOrderByFromTimeDesc(Long classId);

    boolean existsByQuestionBank_Id(Long bankId);

    /** Everything the exam page shows is fetched at once (the access check runs outside of a lazy session in some paths). */
    @Query("select e from Examination e join fetch e.createdUser left join fetch e.classEntity "
            + "left join fetch e.testLayout left join fetch e.questionBank where e.uuid = :uuid")
    Optional<Examination> findByUuid(@Param("uuid") UUID uuid);

    /**
     * My exams, newest first. Sentinels instead of "is null": formatMode 0 = any / 1 = use format; classId 0 = any; search "" = any (lower-cased).
     */
    @Query(value = "select e from Examination e left join fetch e.classEntity c left join fetch e.testLayout left join fetch e.questionBank "
            + "where e.createdUser.id = :userId "
            + "and (:formatMode = 0 or e.format = :format) "
            + "and (:classId = 0 or c.id = :classId) "
            + "and (:search = '' or lower(e.examName) like concat('%', :search, '%')) "
            + "order by e.id desc",
            countQuery = "select count(e) from Examination e where e.createdUser.id = :userId "
                    + "and (:formatMode = 0 or e.format = :format) "
                    + "and (:classId = 0 or e.classEntity.id = :classId) "
                    + "and (:search = '' or lower(e.examName) like concat('%', :search, '%'))")
    Page<Examination> findMine(@Param("userId") Long userId, @Param("formatMode") int formatMode, @Param("format") ExamFormat format,
                               @Param("classId") long classId, @Param("search") String search, Pageable pageable);

    /**
     * Exams of the classes I study in (never drafts), newest first. Sentinels as in findMine.
     */
    @Query(value = "select e from Examination e join fetch e.classEntity c left join fetch e.testLayout left join fetch e.questionBank "
            + "where e.status <> :draft "
            + "and exists (select 1 from ClassStudent cs where cs.classEntity = c and cs.student.user.id = :userId) "
            + "and (:formatMode = 0 or e.format = :format) "
            + "and (:classId = 0 or c.id = :classId) "
            + "and (:search = '' or lower(e.examName) like concat('%', :search, '%')) "
            + "order by e.id desc",
            countQuery = "select count(e) from Examination e where e.status <> :draft "
                    + "and exists (select 1 from ClassStudent cs where cs.classEntity = e.classEntity and cs.student.user.id = :userId) "
                    + "and (:formatMode = 0 or e.format = :format) "
                    + "and (:classId = 0 or e.classEntity.id = :classId) "
                    + "and (:search = '' or lower(e.examName) like concat('%', :search, '%'))")
    Page<Examination> findForStudent(@Param("userId") Long userId, @Param("draft") ExamStatus draft,
                                     @Param("formatMode") int formatMode, @Param("format") ExamFormat format,
                                     @Param("classId") long classId, @Param("search") String search, Pageable pageable);

    /** Dashboard: every exam I teach plus the ones of the classes I study in, drafts excluded. */
    @Query("select e from Examination e join fetch e.classEntity c where e.status <> :draft and (e.createdUser.id = :userId "
            + "or exists (select 1 from ClassStudent cs where cs.classEntity = c and cs.student.user.id = :userId))")
    List<Examination> findForOverview(@Param("userId") Long userId, @Param("draft") ExamStatus draft);

    long countByCreatedUser_IdAndStatus(Long userId, ExamStatus status);

    /** Automatic status: an exam whose end time has passed is COMPLETED. Returns the number of exams changed. */
    @Modifying(clearAutomatically = true)
    @Query("update Examination e set e.status = :to, e.updatedAt = :now "
            + "where e.status in :from and e.toTime is not null and e.toTime <= :now")
    int completeFinished(@Param("now") OffsetDateTime now, @Param("to") ExamStatus to, @Param("from") Collection<ExamStatus> from);

    /** Automatic status: an UPCOMING exam whose start time has come is ONGOING. */
    @Modifying(clearAutomatically = true)
    @Query("update Examination e set e.status = :to, e.updatedAt = :now "
            + "where e.status = :from and e.fromTime is not null and e.fromTime <= :now")
    int startDue(@Param("now") OffsetDateTime now, @Param("to") ExamStatus to, @Param("from") ExamStatus from);
}
