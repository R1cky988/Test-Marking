package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.TestLayoutRepository;
import com.example.testmarking.domain.entities.TestLayout;
import com.example.testmarking.domain.entities.User;
import com.example.testmarking.template.Json;
import com.example.testmarking.template.calc.TemplateCalculationService;
import com.example.testmarking.template.calc.TemplateCalculationService.ComputedCell;
import com.example.testmarking.template.exception.TemplateException;
import com.example.testmarking.template.model.TemplateModel.AnchorPoint;
import com.example.testmarking.template.model.TemplateModel.AnswerZone;
import com.example.testmarking.template.model.TemplateModel.GridConfig;
import com.example.testmarking.template.render.PdfWriter;
import com.example.testmarking.template.render.SvgWriter;
import com.example.testmarking.template.render.TemplateSheetBuilder;
import com.example.testmarking.template.service.DistributionPolicy;
import com.example.testmarking.template.service.GridConfigNormalizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Port of NestJS TemplatesService (create / save / read / update / delete / preview / render).
 * Works straight on the TestLayout entity: request bodies arrive as Map, the entity goes out as JSON.
 * No RabbitMQ: template create/save never used it.
 */
@Service
public class TestLayoutImp {

    private static final Set<String> STATUSES = Set.of("DRAFT", "PUBLISHED", "ARCHIVED");
    private static final Set<String> TYPES = Set.of("STANDARD", "CUSTOM", "LEGACY");

    private final TestLayoutRepository repository;
    private final TemplateCalculationService calc;
    private final GridConfigNormalizer normalizer;
    private final TemplateSheetBuilder sheetBuilder;
    private final boolean enforceDistribution;
    private final String defaultStatus;
    private final String defaultType;

    public TestLayoutImp(TestLayoutRepository repository, TemplateCalculationService calc,
                         GridConfigNormalizer normalizer, TemplateSheetBuilder sheetBuilder,
                         @Value("${omr.template.enforce-distribution:true}") boolean enforceDistribution,
                         @Value("${omr.template.default-status:PUBLISHED}") String defaultStatus,
                         @Value("${omr.template.default-type:STANDARD}") String defaultType) {
        if (!STATUSES.contains(defaultStatus)) {
            throw new IllegalArgumentException("omr.template.default-status must be DRAFT, PUBLISHED or ARCHIVED");
        }
        if (!TYPES.contains(defaultType)) {
            throw new IllegalArgumentException("omr.template.default-type must be STANDARD, CUSTOM or LEGACY");
        }
        this.repository = repository;
        this.calc = calc;
        this.normalizer = normalizer;
        this.sheetBuilder = sheetBuilder;
        this.enforceDistribution = enforceDistribution;
        this.defaultStatus = defaultStatus;
        this.defaultType = defaultType;
    }

    public record Asset(byte[] bytes, String filename, String contentType) {}

    // ─── Create ──────────────────────────────────────────────────

    @Transactional
    public TestLayout create(User teacher, Map<String, Object> body) {
        List<String> errors = new ArrayList<>();
        String name = body.get("name") instanceof String s && !s.isBlank() ? s.trim() : null;
        if (name == null) errors.add("name: must not be blank");
        String type = templateType(body, errors);
        if (!errors.isEmpty()) {
            throw TemplateException.badRequest("Dữ liệu không hợp lệ", errors.toArray(new String[0]));
        }

        GridConfig grid = normalizer.normalize(body.get("grid_config"));
        List<AnchorPoint> anchors = GridConfigNormalizer.parseAnchorPoints(body.get("anchor_points"));
        grid = finalizeGrid(grid, anchors);
        checkDistribution(grid);
        requireFixedIdZone(grid);

        TestLayout layout = TestLayout.builder()
                .createdUser(teacher)
                .name(name)
                .version("1.0.0")
                .templateType(type != null ? type : defaultType)
                .anchorPoints(Json.write(anchors))
                .gridConfig(Json.write(grid))
                .totalQuestions(totalQuestions(grid))
                .choicesPerQuestion(choicesPerQuestion(grid))
                .status(defaultStatus)
                .build();
        return repository.save(layout);
    }

    // ─── Read ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TestLayout> findAll(User teacher, String status) {
        if (status != null && !STATUSES.contains(status)) {
            throw TemplateException.badRequest("status không hợp lệ");
        }
        return status == null
                ? repository.findByCreatedUserOrderByCreatedAtDesc(teacher)
                : repository.findByCreatedUserAndStatusOrderByCreatedAtDesc(teacher, status);
    }

    @Transactional(readOnly = true)
    public TestLayout findOne(User teacher, UUID templateId) {
        return requireOwned(teacher, templateId);
    }

    // ─── Update ──────────────────────────────────────────────────

    @Transactional
    public TestLayout update(User teacher, UUID templateId, Map<String, Object> body) {
        TestLayout layout = requireOwned(teacher, templateId);
        assertNotUsed(layout, "edit");

        List<String> errors = new ArrayList<>();
        String type = templateType(body, errors);
        if (body.get("name") != null && !(body.get("name") instanceof String)) errors.add("name: must be a string");
        if (!errors.isEmpty()) {
            throw TemplateException.badRequest("Dữ liệu không hợp lệ", errors.toArray(new String[0]));
        }

        if (body.get("name") instanceof String n) {
            layout.setName(n.trim());
        }

        if (body.get("grid_config") != null) {
            // The sheet size (number of answer zones, e.g. 20 -> 40 answers) may change: assertNotUsed() above already
            // guarantees that no exam uses this template, and checkDistribution() below validates the new layout.
            GridConfig grid = normalizer.normalize(body.get("grid_config"));
            List<AnchorPoint> anchors = body.get("anchor_points") != null
                    ? GridConfigNormalizer.parseAnchorPoints(body.get("anchor_points"))
                    : grid.anchorPoints();
            grid = finalizeGrid(grid, anchors);
            checkDistribution(grid);
            requireFixedIdZone(grid);

            layout.setGridConfig(Json.write(grid));
            layout.setAnchorPoints(Json.write(anchors));
            layout.setTotalQuestions(totalQuestions(grid));
            layout.setChoicesPerQuestion(choicesPerQuestion(grid));
        } else if (body.get("anchor_points") != null) {
            // as in the original: anchor-only updates do not touch grid_config.anchor_points
            layout.setAnchorPoints(Json.write(GridConfigNormalizer.parseAnchorPoints(body.get("anchor_points"))));
        }

        if (type != null) {
            layout.setTemplateType(type);
        }
        return repository.save(layout);
    }

    // ─── Delete ──────────────────────────────────────────────────

    @Transactional
    public void remove(User teacher, UUID templateId) {
        TestLayout layout = requireOwned(teacher, templateId);
        assertNotUsed(layout, "delete");
        repository.delete(layout);
    }

    // ─── Preview / render ────────────────────────────────────────

    /** Bubble grid for a config, not saved. Keys match the NestJS response exactly. */
    public List<Map<String, Object>> preview(Map<String, Object> gridConfig) {
        GridConfig grid = normalizer.normalize(gridConfig);
        List<ComputedCell> cells = calc.computeAllGrids(grid);
        List<Map<String, Object>> out = new ArrayList<>(cells.size());
        for (ComputedCell c : cells) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("zone_id", c.zoneId());
            if (c.questionIndex() != null) m.put("questionIndex", c.questionIndex());
            m.put("row", c.row());
            m.put("col", c.col());
            m.put("type", c.type());
            if (c.choiceLetter() != null) m.put("choiceLetter", c.choiceLetter());
            m.put("x_abs", c.xAbs());
            m.put("y_abs", c.yAbs());
            out.add(m);
        }
        return out;
    }

    @Transactional(readOnly = true)
    public String getTemplateImage(User teacher, UUID templateId) {
        TestLayout layout = requireOwned(teacher, templateId);
        return SvgWriter.write(sheetBuilder.build(requireRenderable(layout), layout.getSheetCode()));
    }

    @Transactional(readOnly = true)
    public Asset downloadTemplateAsset(User teacher, UUID templateId) {
        TestLayout layout = requireOwned(teacher, templateId);
        try {
            byte[] pdf = PdfWriter.write(sheetBuilder.build(requireRenderable(layout), layout.getSheetCode()));
            return new Asset(pdf, slugify(layout.getName()) + "_Phieu_Tra_Loi_OMR.pdf", "application/pdf");
        } catch (IOException e) {
            throw new IllegalStateException("Cannot render template PDF", e);
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────

    private static String templateType(Map<String, Object> body, List<String> errors) {
        Object t = body.get("template_type");
        if (t == null) return null;
        if (t instanceof String s && TYPES.contains(s)) return s;
        errors.add("template_type: must be STANDARD, CUSTOM or LEGACY");
        return null;
    }

    private TestLayout requireOwned(User teacher, UUID templateId) {
        TestLayout layout = repository.findByUuid(templateId)
                .orElseThrow(() -> TemplateException.notFound("TEMPLATE_NOT_FOUND", "Mẫu phiếu không tồn tại"));
        if (layout.getCreatedUser() != null && !layout.getCreatedUser().getId().equals(teacher.getId())) {
            throw TemplateException.forbidden("Bạn không có quyền quản lý template này");
        }
        return layout;
    }

    /** Replaces prisma.exam.count({ where: { templateId } }): a template used by an exam is locked. */
    private void assertNotUsed(TestLayout layout, String action) {
        long examCount = repository.countExamsUsing(layout.getId());
        if (examCount > 0) {
            String verb = action.equals("edit") ? "sửa" : "xóa";
            throw TemplateException.badRequestWithCode("TEMPLATE_IN_USE",
                    "Template đã được sử dụng trong một hoặc nhiều kỳ thi, không thể " + verb
                            + ". Bạn có thể tạo bản sao template mới.",
                    "exam_count=" + examCount);
        }
    }

    /** Sets the anchors, assigns start_question_index and validates (bubble size >= 15 px). */
    private GridConfig finalizeGrid(GridConfig grid, List<AnchorPoint> anchors) {
        List<AnswerZone> zones = calc.computeStartQuestionIndices(grid.answerZones());
        GridConfig result = new GridConfig(anchors, grid.fixedZones(), grid.idZones(), grid.numberZones(), zones);
        calc.validateGridConfig(result);
        return result;
    }

    /** Student codes are HSxxxxxxxx and exam codes have 3 digits: both are fixed on every sheet. */
    static final int STUDENT_ID_DIGITS = 8;
    static final int EXAM_CODE_DIGITS = 3;

    static void requireFixedIdZone(GridConfig grid) {
        var zone = grid.idZones();
        boolean student = false, exam = false;
        if (zone != null && zone.items() != null) {
            for (var item : zone.items()) {
                if ("student_id".equals(item.type()) && item.enabled() && item.numDigits() == STUDENT_ID_DIGITS) student = true;
                if ("exam_code".equals(item.type()) && item.enabled() && item.numDigits() == EXAM_CODE_DIGITS) exam = true;
            }
        }
        if (!student || !exam) {
            throw TemplateException.badRequestWithCode("TEMPLATE_ID_FIXED",
                    "Mã học sinh phải đủ " + STUDENT_ID_DIGITS + " chữ số và mã đề phải đủ " + EXAM_CODE_DIGITS + " ô (cố định, luôn bật).",
                    "student_id=" + STUDENT_ID_DIGITS, "exam_code=" + EXAM_CODE_DIGITS);
        }
    }

    private void checkDistribution(GridConfig grid) {
        if (enforceDistribution) {
            DistributionPolicy.assertMatchesPreset(grid);
        }
    }

    private GridConfig requireRenderable(TestLayout layout) {
        GridConfig grid = readGridConfig(layout.getGridConfig());
        if (grid.answerZones() == null || grid.answerZones().isEmpty()) {
            throw TemplateException.badRequest("Mẫu phiếu chưa có cấu hình hợp lệ");
        }
        return grid;
    }

    @SuppressWarnings("unchecked")
    private GridConfig readGridConfig(String json) {
        try {
            Object parsed = Json.parse(json);
            if (!(parsed instanceof Map<?, ?>)) throw new IllegalArgumentException("not an object");
            return normalizer.fromStored((Map<String, Object>) parsed);
        } catch (IllegalArgumentException e) {
            throw TemplateException.badRequest("Mẫu phiếu chưa có cấu hình hợp lệ");
        }
    }

    private static int totalQuestions(GridConfig grid) {
        return grid.answerZones().stream().mapToInt(z -> Math.max(0, z.layout().rows())).sum();
    }

    private static int choicesPerQuestion(GridConfig grid) {
        return grid.answerZones().get(0).layout().options();
    }

    static String slugify(String value) {
        String slug = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace("đ", "d").replace("Đ", "D")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
        if (slug.length() > 80) slug = slug.substring(0, 80);
        return slug.isEmpty() ? "Template_OMR" : slug;
    }
}
