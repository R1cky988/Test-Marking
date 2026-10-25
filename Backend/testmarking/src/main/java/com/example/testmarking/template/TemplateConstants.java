package com.example.testmarking.template;

import com.example.testmarking.template.model.TemplateModel.AnchorPoint;
import com.example.testmarking.template.model.TemplateModel.BoundingBox;
import com.example.testmarking.template.model.TemplateModel.FixedZoneItem;
import com.example.testmarking.template.model.TemplateModel.FixedZones;
import com.example.testmarking.template.model.TemplateModel.IdZone;
import com.example.testmarking.template.model.TemplateModel.IdZoneItem;
import com.example.testmarking.template.model.TemplateModel.NumberLayout;
import com.example.testmarking.template.model.TemplateModel.NumberZone;

import java.util.List;

/** Port of DATN_Backend/src/web/templates/template.constants.ts (OMR designer, 12 AprilTags). */
public final class TemplateConstants {

    private TemplateConstants() {}

    /** Padding (px) subtracted from every zone's bounding box. */
    public static final double PADDING = 5;

    /** Page size in px. The scanner dewarps every photo into this space. */
    public static final int PAGE_WIDTH = 827;
    public static final int PAGE_HEIGHT = 1169;

    public static final double MARKER_SIZE = 50;

    public static final double BUBBLE_SIZE_MIN = 15;
    public static final double BUBBLE_SIZE_MAX = 25;
    public static final double BUBBLE_SIZE_DEFAULT = 18;
    public static final double BUBBLE_RATIO = 0.8;

    public static final double MAX_SPACING = 40;
    public static final double MIN_SPACING = 4;

    // Number-column constants (private in the original calculation service).
    public static final double NUMBER_COLUMN_RATIO = 0.12;
    public static final double NUMBER_COLUMN_MIN_WIDTH = 14;
    public static final double NUMBER_COLUMN_MAX_WIDTH = 30;
    public static final double NUMBER_COLUMN_MAX_TOTAL_RATIO = 0.32;
    public static final double ID_LABEL_ROW_HEIGHT = 16;
    public static final double ID_WRITE_BOX_GAP = 3;
    public static final double ID_COL_GAP_AFTER_LABEL = 2;
    public static final int ID_NUM_ROWS = 10;

    private static AnchorPoint anchor(int id, double x, double y) {
        return new AnchorPoint(id, x, y, x / PAGE_WIDTH, y / PAGE_HEIGHT);
    }

    public static List<AnchorPoint> defaultAnchorPoints() {
        return List.of(
                anchor(1, 45, 45),
                anchor(2, 782, 45),
                anchor(3, 782, 1124),
                anchor(4, 45, 1124),
                anchor(5, 45, 403),
                anchor(6, 414, 403),
                anchor(7, 782, 403),
                anchor(8, 782, 763),
                anchor(9, 414, 763),
                anchor(10, 45, 763),
                anchor(11, 414, 1124),
                anchor(12, 414, 45));
    }

    public static final BoundingBox DEFAULT_FIXED_ZONES_BBOX = new BoundingBox(45, 80, 339, 288);

    public static List<FixedZoneItem> defaultFixedZoneItems() {
        return List.of(
                new FixedZoneItem("full_name", true, "Ho va ten"),
                new FixedZoneItem("class_name", true, "Lop"),
                new FixedZoneItem("subject", true, "Mon hoc"),
                new FixedZoneItem("exam_date", true, "Ngay thi"));
    }

    public static FixedZones defaultFixedZones() {
        return new FixedZones(DEFAULT_FIXED_ZONES_BBOX, defaultFixedZoneItems());
    }

    public static IdZone defaultIdZone() {
        return new IdZone(new BoundingBox(389, 80, 418, 288), List.of(
                new IdZoneItem("student_id", true, 8),
                new IdZoneItem("class_code", true, 5),
                new IdZoneItem("exam_code", true, 3)));
    }

    /** Legacy number zones, used only when a config has no id_zones. */
    public static List<NumberZone> defaultNumberZones() {
        return List.of(
                new NumberZone("student_id", "number_grid", new BoundingBox(423, 141, 137.82, 224), new NumberLayout(6, 10)),
                new NumberZone("class_code", "number_grid", new BoundingBox(573.23, 141, 115.34, 224), new NumberLayout(5, 10)),
                new NumberZone("exam_code", "number_grid", new BoundingBox(700.11, 141, 69.66, 224), new NumberLayout(3, 10)));
    }

    /** Fixed answer-zone slot (id + bounding box). The teacher only chooses rows/options per slot. */
    public record ZoneSlot(String zoneId, BoundingBox boundingBox) {}

    public static List<ZoneSlot> defaultAnswerZones2() {
        return List.of(
                new ZoneSlot("answer_zone_1", new BoundingBox(90, 408, 279, 723)),
                new ZoneSlot("answer_zone_2", new BoundingBox(457, 408, 279, 723)));
    }

    public static List<ZoneSlot> defaultAnswerZones4() {
        return List.of(
                new ZoneSlot("answer_zone_1", new BoundingBox(90, 408, 279, 350)),
                new ZoneSlot("answer_zone_2", new BoundingBox(457, 408, 279, 350)),
                new ZoneSlot("answer_zone_3", new BoundingBox(90, 768, 279, 350)),
                new ZoneSlot("answer_zone_4", new BoundingBox(457, 768, 279, 350)));
    }

    public enum AnswerLayoutType { TWO_ZONE, FOUR_ZONE }

    public static List<ZoneSlot> defaultAnswerZonesByLayout(AnswerLayoutType type) {
        return type == AnswerLayoutType.TWO_ZONE ? defaultAnswerZones2() : defaultAnswerZones4();
    }
}
