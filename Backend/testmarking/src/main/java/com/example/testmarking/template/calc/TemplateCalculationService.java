package com.example.testmarking.template.calc;

import com.example.testmarking.template.exception.TemplateException;
import com.example.testmarking.template.model.TemplateModel.AnswerLayout;
import com.example.testmarking.template.model.TemplateModel.AnswerZone;
import com.example.testmarking.template.model.TemplateModel.BoundingBox;
import com.example.testmarking.template.model.TemplateModel.GridConfig;
import com.example.testmarking.template.model.TemplateModel.IdZone;
import com.example.testmarking.template.model.TemplateModel.IdZoneItem;
import com.example.testmarking.template.model.TemplateModel.NumberZone;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static com.example.testmarking.template.TemplateConstants.*;

/**
 * Port of template-calculation.service.ts.
 *
 * This is the single source of truth for where every bubble is. The Android scanner
 * (layout_calculator.cpp), the web designer and omr_core.py recompute the same maths, so
 * do NOT change a constant or a formula here without changing them all.
 *
 * Plain class on purpose (no Spring annotations): register it as a bean in TemplateConfig.
 */
public class TemplateCalculationService {

    // ─── Result types ────────────────────────────────────────────

    public record ComputedCell(String zoneId, Integer questionIndex, int row, int col, String type,
                               String choiceLetter, double xAbs, double yAbs) {}

    public record ZoneGridResult(String zoneId, double effX, double effY, double effWidth, double effHeight,
                                 double dx, double dy, double bubbleSize, List<ComputedCell> cells) {}

    public record GridLayoutResult(double spacing, double offset, boolean ok, String error) {}

    // ─── Public API ──────────────────────────────────────────────

    /**
     * Assigns start_question_index: zones are sorted top to bottom, then left to right, and
     * numbered cumulatively by rows starting at 1. Returns the zones in their ORIGINAL order,
     * each with its layout.startQuestionIndex set (the NestJS version mutated in place).
     */
    public List<AnswerZone> computeStartQuestionIndices(List<AnswerZone> answerZones) {
        List<AnswerZone> sorted = new ArrayList<>(answerZones);
        sorted.sort(Comparator
                .comparingDouble((AnswerZone z) -> z.boundingBox().y())
                .thenComparingDouble(z -> z.boundingBox().x())
                .thenComparing(AnswerZone::zoneId));

        Map<String, Integer> startByZone = new HashMap<>();
        int current = 1;
        for (AnswerZone zone : sorted) {
            startByZone.put(zone.zoneId(), current);
            current += Math.max(0, zone.layout().rows());
        }

        List<AnswerZone> result = new ArrayList<>(answerZones.size());
        for (AnswerZone zone : answerZones) {
            result.add(zone.withLayout(zone.layout().withStartQuestionIndex(startByZone.get(zone.zoneId()))));
        }
        return result;
    }

    public ZoneGridResult computeAnswerZoneGrid(AnswerZone zone) {
        AnswerLayout layout = zone.layout();
        int rows = layout.rows();
        int options = layout.options();
        if (rows <= 0) {
            return new ZoneGridResult(zone.zoneId(), 0, 0, 0, 0, 0, 0, 0, List.of());
        }

        double[] eff = computeEffectiveArea(zone.boundingBox(), zone.zoneId());
        double effX = eff[0], effY = eff[1], effW = eff[2], effH = eff[3];

        int numberColumnCount = (layout.hasStartNumber() ? 1 : 0) + (layout.hasEndNumber() ? 1 : 0);
        double preferredNumberWidth = clamp(effW * NUMBER_COLUMN_RATIO, NUMBER_COLUMN_MIN_WIDTH, NUMBER_COLUMN_MAX_WIDTH);
        double totalNumberWidth = numberColumnCount > 0
                ? Math.min(preferredNumberWidth * numberColumnCount, effW * NUMBER_COLUMN_MAX_TOTAL_RATIO)
                : 0;
        double numberColumnWidth = numberColumnCount > 0 ? totalNumberWidth / numberColumnCount : 0;
        double startNumberWidth = layout.hasStartNumber() ? numberColumnWidth : 0;
        double endNumberWidth = layout.hasEndNumber() ? numberColumnWidth : 0;

        double choiceAreaX = effX + startNumberWidth;
        double choiceAreaWidth = effW - startNumberWidth - endNumberWidth;
        double dx = choiceAreaWidth / options;
        double dy = effH / rows;
        double bubbleSize = computeBubbleSize(dx, dy, zone.zoneId());
        int totalColumns = options + numberColumnCount;

        int startIndex = layout.startQuestionIndex() != null ? layout.startQuestionIndex() : 1;
        List<ComputedCell> cells = new ArrayList<>();

        for (int i = 0; i < rows; i++) {
            int questionIndex = startIndex + i;
            double yAbs = effY + (i + 0.5) * dy;

            if (layout.hasStartNumber()) {
                cells.add(new ComputedCell(zone.zoneId(), questionIndex, i, 0, "question_number", null,
                        round2(effX + startNumberWidth / 2), round2(yAbs)));
            }

            for (int o = 0; o < options; o++) {
                double xAbs = choiceAreaX + (o + 0.5) * dx;
                cells.add(new ComputedCell(zone.zoneId(), questionIndex, i, o + (layout.hasStartNumber() ? 1 : 0),
                        "choice", String.valueOf((char) ('A' + o)), round2(xAbs), round2(yAbs)));
            }

            if (layout.hasEndNumber()) {
                cells.add(new ComputedCell(zone.zoneId(), questionIndex, i, totalColumns - 1, "question_number", null,
                        round2(choiceAreaX + choiceAreaWidth + endNumberWidth / 2), round2(yAbs)));
            }
        }

        return new ZoneGridResult(zone.zoneId(), effX, effY, effW, effH, dx, dy, bubbleSize, cells);
    }

    /** Legacy fixed number-grid zone. */
    public ZoneGridResult computeNumberZoneGrid(NumberZone zone) {
        double[] eff = computeEffectiveArea(zone.boundingBox(), zone.zoneId());
        double effX = eff[0], effY = eff[1], effW = eff[2], effH = eff[3];

        int totalColumns = zone.layout().numDigits();
        int rows = zone.layout().rows();
        double dx = effW / totalColumns;
        double dy = effH / rows;
        double bubbleSize = computeBubbleSize(dx, dy, zone.zoneId());

        List<ComputedCell> cells = new ArrayList<>();
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < totalColumns; j++) {
                cells.add(new ComputedCell(zone.zoneId(), null, i, j, "digit", null,
                        round2(effX + (j + 0.5) * dx), round2(effY + (i + 0.5) * dy)));
            }
        }
        return new ZoneGridResult(zone.zoneId(), effX, effY, effW, effH, dx, dy, bubbleSize, cells);
    }

    /** Flexible ID zone: row-number column on the left, label + write boxes on top, then 10 digit rows. */
    public ZoneGridResult computeIdZoneGrid(IdZone idZone) {
        BoundingBox bbox = idZone.boundingBox();
        double padding = Math.min(PADDING, Math.min(bbox.width() / 8, bbox.height() / 8));
        double effX = bbox.x() + padding;
        double effY = bbox.y() + padding;
        double effW = bbox.width() - 2 * padding;
        double effH = bbox.height() - 2 * padding;

        if (effW <= 0 || effH <= 0) {
            throw TemplateException.badRequest("ID zone: insufficient space for padding",
                    "bounding_box: " + bbox, "effective: " + effW + "x" + effH);
        }

        List<IdZoneItem> enabledItems = idZone.items().stream().filter(IdZoneItem::enabled).toList();
        int totalColumns = enabledItems.stream().mapToInt(IdZoneItem::numDigits).sum();
        if (totalColumns <= 0) {
            throw TemplateException.badRequest("ID zone: no enabled items or total columns is zero");
        }

        int rows = ID_NUM_ROWS;

        // Estimate bubble size
        double estimatedOverhead = ID_LABEL_ROW_HEIGHT + ID_COL_GAP_AFTER_LABEL + (BUBBLE_SIZE_DEFAULT + 4) + ID_WRITE_BOX_GAP;
        double estimatedGridH = Math.max(1, effH - estimatedOverhead);
        double rawDx = effW / totalColumns;
        double rawDy = estimatedGridH / rows;
        double bubbleSize = Math.min(Math.min(rawDx, rawDy) * BUBBLE_RATIO, BUBBLE_SIZE_MAX);

        if (bubbleSize < BUBBLE_SIZE_MIN) {
            throw TemplateException.badRequest(
                    "ID zone: quá nhiều chữ số so với kích thước vùng. Vui lòng tăng kích thước vùng hoặc giảm số chữ số.",
                    "dx=" + fixed2(rawDx) + ", dy=" + fixed2(rawDy),
                    "bubble_size=" + fixed2(bubbleSize));
        }

        // Horizontal: row-number column (= one bubble column wide)
        GridLayoutResult prelimH = calculateGridLayout(effW, totalColumns, bubbleSize);
        double rowNumColW = Math.min(prelimH.spacing() != 0 ? prelimH.spacing() : bubbleSize, effW * 0.15);
        double rowNumGap = 4;
        double bubbleGridWidth = effW - rowNumColW - rowNumGap;
        if (bubbleGridWidth <= 0) {
            throw TemplateException.badRequest("ID zone: không đủ chiều rộng");
        }
        double bubbleGridX = effX + rowNumColW + rowNumGap;
        double groupGap = enabledItems.size() > 1 ? 12 : 0;
        double totalGroupGap = Math.max(0, enabledItems.size() - 1) * groupGap;
        double columnGridWidth = bubbleGridWidth - totalGroupGap;
        if (columnGridWidth <= 0) {
            throw TemplateException.badRequest("ID zone: insufficient width after group gaps",
                    "bubble_grid_width=" + fixed2(bubbleGridWidth),
                    "total_group_gap=" + fixed2(totalGroupGap));
        }

        // Vertical: label + write-box overhead
        double writeBoxRowH = bubbleSize + 4;
        double topOverhead = ID_LABEL_ROW_HEIGHT + ID_COL_GAP_AFTER_LABEL + writeBoxRowH + ID_WRITE_BOX_GAP;
        double bubbleGridHeight = effH - topOverhead;
        if (bubbleGridHeight <= 0) {
            throw TemplateException.badRequest("ID zone: không đủ chiều cao");
        }
        double bubbleGridY = effY + topOverhead;

        GridLayoutResult hLayout = calculateGridLayout(columnGridWidth, totalColumns, bubbleSize);
        GridLayoutResult vLayout = calculateGridLayout(bubbleGridHeight, rows, bubbleSize);

        boolean hOk = hLayout.ok() && hLayout.spacing() > 0;
        boolean vOk = vLayout.ok() && vLayout.spacing() > 0;
        double colSpacing = hOk ? hLayout.spacing() : columnGridWidth / totalColumns;
        double colOffset = hOk ? hLayout.offset() : 0;
        double rowSpacing = vOk ? vLayout.spacing() : bubbleGridHeight / rows;
        double rowOffset = vOk ? vLayout.offset() : 0;

        List<ComputedCell> cells = new ArrayList<>();
        int colIndex = 0;
        int itemIndex = 0;
        for (IdZoneItem item : enabledItems) {
            double groupOffsetX = itemIndex * groupGap;
            for (int d = 0; d < item.numDigits(); d++) {
                double xAbs = bubbleGridX + colOffset + groupOffsetX + colIndex * colSpacing + bubbleSize / 2;
                for (int r = 0; r < rows; r++) {
                    double yAbs = bubbleGridY + rowOffset + r * rowSpacing + bubbleSize / 2;
                    cells.add(new ComputedCell("id_" + item.type(), null, r, colIndex, "digit", null,
                            round2(xAbs), round2(yAbs)));
                }
                colIndex++;
            }
            itemIndex++;
        }

        return new ZoneGridResult("id_zone", bubbleGridX, bubbleGridY, bubbleGridWidth, bubbleGridHeight,
                colSpacing, rowSpacing, bubbleSize, cells);
    }

    /** All cells of a config: id zone (or legacy number zones) first, then answer zones. */
    public List<ComputedCell> computeAllGrids(GridConfig config) {
        List<AnswerZone> answerZones = computeStartQuestionIndices(config.answerZones());
        List<AnswerZone> reading = sortReadingOrder(answerZones);

        List<ComputedCell> all = new ArrayList<>();
        if (config.idZones() != null) {
            all.addAll(computeIdZoneGrid(config.idZones()).cells());
        } else if (config.numberZones() != null && !config.numberZones().isEmpty()) {
            for (NumberZone nz : config.numberZones()) {
                all.addAll(computeNumberZoneGrid(nz).cells());
            }
        }
        for (AnswerZone az : reading) {
            all.addAll(computeAnswerZoneGrid(az).cells());
        }
        return all;
    }

    /** Throws TemplateException (400) when any zone cannot hold bubbles of at least 15 px. */
    public void validateGridConfig(GridConfig config) {
        int totalAnswerRows = config.answerZones().stream()
                .mapToInt(z -> Math.max(0, z.layout().rows())).sum();
        if (totalAnswerRows <= 0) {
            throw TemplateException.badRequest("Mẫu phiếu phải có ít nhất 1 câu hỏi",
                    "answer_zones total rows must be greater than 0");
        }

        if (config.idZones() != null) {
            computeIdZoneGrid(config.idZones());
        } else if (config.numberZones() != null && !config.numberZones().isEmpty()) {
            for (NumberZone nz : config.numberZones()) {
                computeNumberZoneGrid(nz);
            }
        }

        for (AnswerZone az : sortReadingOrder(computeStartQuestionIndices(config.answerZones()))) {
            computeAnswerZoneGrid(az);
        }
    }

    // ─── Grid maths shared with the ID zone ──────────────────────

    public static GridLayoutResult calculateGridLayout(double totalWidth, int numColumns, double bubbleSize) {
        return calculateGridLayout(totalWidth, numColumns, bubbleSize, MAX_SPACING, MIN_SPACING);
    }

    public static GridLayoutResult calculateGridLayout(double totalWidth, int numColumns, double bubbleSize,
                                                       double maxSpacing, double minSpacing) {
        if (numColumns <= 0) {
            return new GridLayoutResult(0, 0, false, "numColumns must be >= 1");
        }
        if (totalWidth <= 0) {
            return new GridLayoutResult(0, 0, false, "totalWidth must be > 0");
        }

        if (numColumns == 1) {
            double offset = (totalWidth - bubbleSize) / 2;
            if (offset < 0) {
                return new GridLayoutResult(0, 0, false, "Bubble does not fit in zone width");
            }
            return new GridLayoutResult(0, offset, true, null);
        }

        double effectiveMin = bubbleSize + minSpacing;
        double spacing = (totalWidth - bubbleSize) / (numColumns - 1);
        spacing = Math.max(effectiveMin, Math.min(maxSpacing, spacing));

        double occupiedWidth = (numColumns - 1) * spacing + bubbleSize;
        if (occupiedWidth > totalWidth + 0.01) {
            spacing = Math.max(effectiveMin, (totalWidth - bubbleSize) / (numColumns - 1));
            double minOccupied = (numColumns - 1) * spacing + bubbleSize;
            if (minOccupied > totalWidth + 0.01) {
                return new GridLayoutResult(0, 0, false,
                        "Không đủ chỗ: cần " + (long) Math.ceil(minOccupied) + "px nhưng chỉ có "
                                + (long) Math.ceil(totalWidth)
                                + "px. Vui lòng tăng kích thước vùng hoặc giảm số cột.");
            }
        }

        double offset = (totalWidth - ((numColumns - 1) * spacing + bubbleSize)) / 2;
        return new GridLayoutResult(spacing, Math.max(0, offset), true, null);
    }

    // ─── Private helpers ─────────────────────────────────────────

    private static List<AnswerZone> sortReadingOrder(List<AnswerZone> zones) {
        List<AnswerZone> sorted = new ArrayList<>(zones);
        sorted.sort(Comparator
                .comparingDouble((AnswerZone z) -> z.boundingBox().y())
                .thenComparingDouble(z -> z.boundingBox().x())
                .thenComparing(AnswerZone::zoneId));
        return sorted;
    }

    private double[] computeEffectiveArea(BoundingBox bbox, String zoneId) {
        double effX = bbox.x() + PADDING;
        double effY = bbox.y() + PADDING;
        double effW = bbox.width() - 2 * PADDING;
        double effH = bbox.height() - 2 * PADDING;
        if (effW <= 0 || effH <= 0) {
            throw TemplateException.badRequest("Zone " + zoneId + ": insufficient space for padding",
                    "bounding_box: " + bbox, "effective: " + effW + "x" + effH);
        }
        return new double[] {effX, effY, effW, effH};
    }

    private double computeBubbleSize(double dx, double dy, String zoneId) {
        double bubbleSize = Math.min(dx, dy) * BUBBLE_RATIO;
        bubbleSize = Math.min(bubbleSize, BUBBLE_SIZE_MAX);
        if (bubbleSize < BUBBLE_SIZE_MIN) {
            throw TemplateException.badRequest(
                    "Số câu hỏi / số lựa chọn quá lớn so với kích thước vùng. Vui lòng giảm số câu hỏi hoặc chuyển sang kiểu 4 vùng",
                    "zone_id=" + zoneId,
                    "dx=" + fixed2(dx) + ", dy=" + fixed2(dy),
                    "bubble_size=" + fixed2(bubbleSize));
        }
        return round2(bubbleSize);
    }

    private static double clamp(double value, double min, double max) {
        return Math.min(max, Math.max(min, value));
    }

    /** JS: Math.round(x * 100) / 100 */
    private static double round2(double x) {
        return Math.round(x * 100) / 100.0;
    }

    /** JS: x.toFixed(2) */
    private static String fixed2(double x) {
        return String.format(Locale.ROOT, "%.2f", x);
    }
}
