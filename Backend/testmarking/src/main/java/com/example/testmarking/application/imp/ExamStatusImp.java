package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.ExaminationRepository;
import com.example.testmarking.domain.entities.enums.ExamStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Exams change status by themselves with the clock of the server:
 * UPCOMING -> ONGOING when the start time comes, UPCOMING / ONGOING -> COMPLETED when the end time has passed.
 * DRAFT (not published) and CANCELLED never move. ExamImp gives every exam an end time (start + working time) when none is typed.
 */
@Service
public class ExamStatusImp {

    private final ExaminationRepository exams;

    public ExamStatusImp(ExaminationRepository exams) {
        this.exams = exams;
    }

    /** The status an exam has at `now`; used by the dashboard so it is right even between two runs of the job. */
    public static ExamStatus statusAt(ExamStatus current, OffsetDateTime from, OffsetDateTime to, OffsetDateTime now) {
        if (current != ExamStatus.UPCOMING && current != ExamStatus.ONGOING) return current;
        if (to != null && !to.isAfter(now)) return ExamStatus.COMPLETED;
        if (current == ExamStatus.UPCOMING && from != null && !from.isAfter(now)) return ExamStatus.ONGOING;
        return current;
    }

    /** Runs the two updates (finish first, so an exam that is already over never shows as ONGOING). Returns how many exams changed. */
    @Transactional
    public int sync(OffsetDateTime now) {
        int finished = exams.completeFinished(now, ExamStatus.COMPLETED, List.of(ExamStatus.UPCOMING, ExamStatus.ONGOING));
        int started = exams.startDue(now, ExamStatus.ONGOING, ExamStatus.UPCOMING);
        return finished + started;
    }
}
