package com.example.testmarking.common.demo;

import com.example.testmarking.adapter.persistance.repository.ClassRepository;
import com.example.testmarking.adapter.persistance.security.SecurityUser;
import com.example.testmarking.adapter.rest.dtos.response.DashboardStatsResponse;
import com.example.testmarking.adapter.rest.dtos.response.DashboardSummaryResponse;
import com.example.testmarking.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * DEMO ONLY (demo.enabled=true). The ExamHub shell asks for notifications and a dashboard right after login; your Spring
 * backend has no such endpoints yet, so the app would show errors. These answers are empty/zero on purpose.
 * Delete this file when the real endpoints exist.
 */
@RestController
@RequestMapping("/api/v1/web")
//@ConditionalOnProperty(havingValue = "true")
@RequiredArgsConstructor
public class DemoStubController {

    private final ClassRepository classes;

    @GetMapping("/dashboard/summary")
    public ApiResponse<DashboardSummaryResponse> dashboard(@AuthenticationPrincipal SecurityUser me) {
        long classCount = classes.findMine(me.getUser().getId(), 1, "", PageRequest.of(0, 1)).getTotalElements();
        DashboardSummaryResponse data = new DashboardSummaryResponse(
                new DashboardStatsResponse(classCount, 0, 0, 0),
                List.of(),
                List.of(),
                true,
                List.of("Demo: exams and appeals are not connected to the Spring backend yet"));
        return ApiResponse.<DashboardSummaryResponse>builder().status(200).message("OK").data(data).build();
    }
}
