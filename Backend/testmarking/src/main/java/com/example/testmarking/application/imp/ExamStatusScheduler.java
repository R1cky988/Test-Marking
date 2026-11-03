package com.example.testmarking.application.imp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

/** Moves exams between UPCOMING, ONGOING and COMPLETED by the clock. Every 30 s by default (exam.status-sync-ms), and once at start-up. */
@Component
public class ExamStatusScheduler {

    private static final Logger log = LoggerFactory.getLogger(ExamStatusScheduler.class);

    private final ExamStatusImp status;

    public ExamStatusScheduler(ExamStatusImp status) {
        this.status = status;
    }

    @Scheduled(initialDelay = 5000, fixedDelayString = "${exam.status-sync-ms:30000}")
    public void run() {
        try {
            int changed = status.sync(OffsetDateTime.now());
            if (changed > 0) log.info("Exam status sync: {} exam(s) changed", changed);
        } catch (RuntimeException e) {
            log.warn("Exam status sync failed: {}", e.getMessage());
        }
    }
}
