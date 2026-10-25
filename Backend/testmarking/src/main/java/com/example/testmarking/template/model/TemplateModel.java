package com.example.testmarking.template.model;

import java.util.List;

/**
 * Plain (annotation-free) model of the OMR template JSON stored in test_layouts.grid_config.
 *
 * Serialize/deserialize with a Jackson ObjectMapper configured with SNAKE_CASE naming so the
 * stored JSON keeps the exact keys used by Exam Hub and the Android scanner
 * (anchor_points, bounding_box, has_start_number, start_question_index, num_digits, ...).
 */
public final class TemplateModel {

    private TemplateModel() {}

    public record BoundingBox(double x, double y, double width, double height) {}

    /** abs_x / abs_y are marker centres in the 827x1169 page; u = abs_x/827, v = abs_y/1169. */
    public record AnchorPoint(int id, double absX, double absY, double u, double v) {}

    public record AnswerLayout(int rows, int options, boolean hasStartNumber, boolean hasEndNumber,
                               Integer startQuestionIndex) {
        public AnswerLayout withStartQuestionIndex(int index) {
            return new AnswerLayout(rows, options, hasStartNumber, hasEndNumber, index);
        }
    }

    public record AnswerZone(String zoneId, String type, BoundingBox boundingBox, AnswerLayout layout) {
        public AnswerZone withLayout(AnswerLayout newLayout) {
            return new AnswerZone(zoneId, type, boundingBox, newLayout);
        }
    }

    /** Legacy fixed-digit zone, kept for backward compatibility with old templates. */
    public record NumberLayout(int numDigits, int rows) {}

    public record NumberZone(String zoneId, String type, BoundingBox boundingBox, NumberLayout layout) {}

    /** type is one of student_id, class_code, exam_code. */
    public record IdZoneItem(String type, boolean enabled, int numDigits) {}

    public record IdZone(BoundingBox boundingBox, List<IdZoneItem> items) {}

    /** type is one of full_name, class_name, subject, exam_date. */
    public record FixedZoneItem(String type, boolean enabled, String label) {}

    public record FixedZones(BoundingBox boundingBox, List<FixedZoneItem> items) {}

    public record GridConfig(List<AnchorPoint> anchorPoints,
                             FixedZones fixedZones,
                             IdZone idZones,
                             List<NumberZone> numberZones,
                             List<AnswerZone> answerZones) {}
}
