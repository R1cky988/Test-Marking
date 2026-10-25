package com.example.testmarking.adapter.rest.dtos.response;

import com.example.testmarking.domain.entities.User;
import jakarta.persistence.*;
import lombok.Builder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

public class TestLayoutResponse {

    private UUID uuid;

    private UUID createdUser;

    private String name;

    private String version = "1.0.0";

    private String templateType = "CUSTOM";

    private String imageRustKey;

    private String previewImageUrl;

    private String paperSize = "A4";

    private Integer canvasWidth = 827;

    private Integer canvasHeight = 1169;

    private String anchorPoints;   // [{id, abs_x, abs_y, u, v}] x 12

    private String gridConfig;     // {anchor_points, fixed_zones, id_zones, answer_zones}

    private Integer totalQuestions;
    private Integer choicesPerQuestion;


    private String compatibilityHash;
    private String minAppVersion;

    private String status = "DRAFT";      // DRAFT / PUBLISHED / ARCHIVED

    private Boolean isActive = true;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
