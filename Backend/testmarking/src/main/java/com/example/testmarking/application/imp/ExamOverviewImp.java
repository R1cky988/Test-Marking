package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.ClassRepository;
import com.example.testmarking.adapter.persistance.repository.ExaminationRepository;
import com.example.testmarking.adapter.rest.dtos.response.ExamOverviewResponse;
import com.example.testmarking.adapter.rest.dtos.response.OverviewClassResponse;
import com.example.testmarking.adapter.rest.dtos.response.OverviewExamResponse;
import com.example.testmarking.domain.entities.Class;
import com.example.testmarking.domain.entities.Examination;
import com.example.testmarking.domain.entities.User;
import com.example.testmarking.domain.entities.enums.ExamStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Dashboard: the exams that are coming, running and over (4 of each, with the totals), the 4 newest classes
 * (the ones I teach and the ones I study in, with their total) and, for a teacher, how many drafts are waiting.
 */
@Service
public class ExamOverviewImp {

    public static final int LIMIT = 4;

    private final ExaminationRepository exams;
    private final ClassRepository classes;

    public ExamOverviewImp(ExaminationRepository exams, ClassRepository classes) {
        this.exams = exams;
        this.classes = classes;
    }

    @Transactional(readOnly = true)
    public ExamOverviewResponse overview(User me) {
        return overview(me, OffsetDateTime.now());
    }

    ExamOverviewResponse overview(User me, OffsetDateTime now) {
        Map<ExamStatus, List<Examination>> byStatus = new EnumMap<>(ExamStatus.class);
        for (Examination e : exams.findForOverview(me.getId(), ExamStatus.DRAFT)) {
            ExamStatus s = ExamStatusImp.statusAt(e.getStatus(), e.getFromTime(), e.getToTime(), now);
            byStatus.computeIfAbsent(s, k -> new ArrayList<>()).add(e);
        }
        List<Examination> upcoming = byStatus.getOrDefault(ExamStatus.UPCOMING, List.of());
        List<Examination> ongoing = byStatus.getOrDefault(ExamStatus.ONGOING, List.of());
        List<Examination> completed = byStatus.getOrDefault(ExamStatus.COMPLETED, List.of());

        Comparator<OffsetDateTime> soonest = Comparator.nullsLast(Comparator.naturalOrder());
        Comparator<OffsetDateTime> latest = Comparator.nullsLast(Comparator.reverseOrder());

        List<Class> mine = new ArrayList<>(classes.findOwned(me.getId(), 1, "", PageRequest.of(0, 50)).getContent());
        List<Class> joined = new ArrayList<>(classes.findJoined(me.getId(), "", PageRequest.of(0, 50)).getContent());
        Set<Long> ownedIds = mine.stream().map(Class::getId).collect(Collectors.toSet());
        List<Class> all = new ArrayList<>(mine);
        all.addAll(joined);
        // the newest classes first (created_at is a date, so the id breaks the tie), 4 of them
        all.sort(Comparator.comparing(Class::getCreatedAt, Comparator.nullsLast(Comparator.<java.time.LocalDate>reverseOrder()))
                .thenComparing(Class::getId, Comparator.nullsLast(Comparator.<Long>reverseOrder())));
        List<OverviewClassResponse> related = new ArrayList<>();
        for (Class c : all.stream().limit(LIMIT).collect(Collectors.toList())) {
            related.add(new OverviewClassResponse(c.getUuid(), c.getName(), ownedIds.contains(c.getId()) ? ClassAccessImp.TEACHER : ClassAccessImp.STUDENT));
        }
        return new ExamOverviewResponse(upcoming.size(), ongoing.size(), completed.size(),
                exams.countByCreatedUser_IdAndStatus(me.getId(), ExamStatus.DRAFT), all.size(),
                top(upcoming, Comparator.comparing(Examination::getFromTime, soonest), me, ExamStatus.UPCOMING),
                top(ongoing, Comparator.comparing(Examination::getToTime, soonest), me, ExamStatus.ONGOING),
                top(completed, Comparator.comparing(Examination::getToTime, latest), me, ExamStatus.COMPLETED),
                related);
    }

    private static List<OverviewExamResponse> top(List<Examination> list, Comparator<Examination> order, User me, ExamStatus shown) {
        return list.stream().sorted(order).limit(LIMIT).map(e -> {
            Class c = e.getClassEntity();
            boolean teacher = e.getCreatedUser() != null && Objects.equals(e.getCreatedUser().getId(), me.getId());
            return new OverviewExamResponse(e.getUuid(), e.getExamName(), e.getSubjectName(), c == null ? null : c.getUuid(),
                    c == null ? null : c.getName(), e.getFormat().name(), shown.name(), e.getFromTime(), e.getToTime(),
                    teacher ? ClassAccessImp.TEACHER : ClassAccessImp.STUDENT);
        }).collect(Collectors.toList());
    }
}
