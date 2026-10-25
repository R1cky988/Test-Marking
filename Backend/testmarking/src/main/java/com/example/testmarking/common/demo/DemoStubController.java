package com.example.testmarking.common.demo;

import com.example.testmarking.adapter.persistance.repository.ClassRepository;
import com.example.testmarking.adapter.persistance.security.SecurityUser;
import com.example.testmarking.domain.entities.enums.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * DEMO ONLY (demo.enabled=true). The ExamHub shell asks for notifications and a dashboard right after login; your Spring
 * backend has no such endpoints yet, so the app would show errors. These answers are empty/zero on purpose.
 * Delete this file when the real endpoints exist.
 */
@RestController
@RequestMapping("/api/v1/web")
@ConditionalOnProperty(name = "demo.enabled", havingValue = "true")
@RequiredArgsConstructor
public class DemoStubController {

    private final ClassRepository classes;

    @GetMapping("/dashboard/summary")
    public Map<String, Object> dashboard(@AuthenticationPrincipal SecurityUser me) {
        long classCount = me.getUser().getRole() == Role.TEACHER
                ? classes.findOwned(me.getUser().getId(), 1, "", "", PageRequest.of(0, 1)).getTotalElements() : 0;
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("class_count", classCount);
        stats.put("active_exam_count", 0);
        stats.put("pending_close_exams", 0);
        stats.put("pending_appeals", 0);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("stats", stats);
        data.put("recent_exams", List.of());
        data.put("pending_appeals", List.of());
        data.put("degraded", true);
        data.put("warnings", List.of("Demo: exams and appeals are not connected to the Spring backend yet"));
        return Map.of("data", data);
    }
}
