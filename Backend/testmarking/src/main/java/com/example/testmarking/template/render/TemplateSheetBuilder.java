package com.example.testmarking.template.render;

import com.example.testmarking.template.calc.TemplateCalculationService;
import com.example.testmarking.template.calc.TemplateCalculationService.ComputedCell;
import com.example.testmarking.template.calc.TemplateCalculationService.ZoneGridResult;
import com.example.testmarking.template.model.TemplateModel.*;
import com.example.testmarking.template.render.Shape.*;

import static com.example.testmarking.template.TemplateConstants.MARKER_SIZE;
import static com.example.testmarking.template.TemplateConstants.PAGE_WIDTH;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Port of the drawing half of TemplatesService.getTemplateImage: turns a stored grid_config
 * into shapes. One list of shapes feeds both the SVG preview and the PDF download, so the two
 * can never disagree about where a bubble is.
 *
 * Like the original, answer bubbles are drawn as small dots (r = 2.6) and ID bubbles as
 * circles of the computed bubble size. No AprilTag markers are drawn (see README note).
 */
public class TemplateSheetBuilder {

    private static final double ANSWER_OPTION_LABEL_GAP = 0;

    private final TemplateCalculationService calc;

    public TemplateSheetBuilder(TemplateCalculationService calc) {
        this.calc = calc;
    }

    public List<Shape> build(GridConfig config) {
        return build(config, null);
    }

    /** sheetCode (e.g. "01") is printed as "Mã phiếu: 01" in the free band at the top of the sheet. */
    public List<Shape> build(GridConfig config, String sheetCode) {
        List<AnswerZone> zones = calc.computeStartQuestionIndices(config.answerZones());
        List<ComputedCell> cells = calc.computeAllGrids(new GridConfig(
                config.anchorPoints(), config.fixedZones(), config.idZones(), config.numberZones(), zones));

        List<Shape> shapes = new ArrayList<>();
        if (sheetCode != null && !sheetCode.isBlank()) {
            addSheetCode(shapes, config, sheetCode);
        } else {
            shapes.add(new Text(24, 34, "Template Preview", 18, false, "#111827", "start", false));
        }

        for (AnswerZone zone : config.answerZones()) {
            BoundingBox b = zone.boundingBox();
            shapes.add(new Rect(b.x(), b.y(), b.width(), b.height(), "#1e40af", 1.5, null));
        }
        if (config.numberZones() != null) {
            for (NumberZone zone : config.numberZones()) {
                BoundingBox b = zone.boundingBox();
                shapes.add(new Rect(b.x(), b.y(), b.width(), b.height(), "#0f766e", 1.5, null));
            }
        }

        addFixedZones(shapes, config.fixedZones());

        if (config.idZones() != null) {
            try {
                ZoneGridResult id = calc.computeIdZoneGrid(config.idZones());
                double r = id.bubbleSize() / 2;
                for (ComputedCell c : id.cells()) {
                    shapes.add(new Circle(c.xAbs(), c.yAbs(), r, "#ffffff", 1, "#0d9488", 0.8));
                }
            } catch (RuntimeException ignored) {
                // original: render nothing if the id grid cannot be computed
            }
        }

        List<ComputedCell> nonId = cells.stream().filter(c -> !c.zoneId().startsWith("id_")).toList();

        for (AnswerZone zone : config.answerZones()) {
            nonId.stream()
                    .filter(c -> c.zoneId().equals(zone.zoneId()) && c.type().equals("choice") && c.row() == 0)
                    .sorted(Comparator.comparingInt(ComputedCell::col))
                    .forEach(c -> shapes.add(new Text(c.xAbs(), zone.boundingBox().y() - ANSWER_OPTION_LABEL_GAP,
                            c.choiceLetter() == null ? "" : c.choiceLetter(), 10, true, "#374151", "middle", true)));
        }

        for (ComputedCell c : nonId) {
            shapes.add(new Circle(c.xAbs(), c.yAbs(), 2.6, "#111827", 0.8, null, 0));
        }
        return shapes;
    }

    private static final double CODE_FONT_SIZE = 18;
    private static final double CODE_BAND_TOP = 22;     // the code sits between y = 22 and y = 22 + CODE_BAND_HEIGHT
    private static final double CODE_BAND_HEIGHT = 30;
    private static final double MARKER_CLEARANCE = MARKER_SIZE / 2 + 8;

    /**
     * "Mã phiếu: 01" goes in the top margin, in the widest gap between two markers of the top row, so it can never sit on a marker
     * or on a bubble zone. If a zone has been dragged up into that band the next widest gap is tried.
     */
    private void addSheetCode(List<Shape> shapes, GridConfig config, String sheetCode) {
        String text = "Mã phiếu: " + sheetCode;
        double width = text.length() * CODE_FONT_SIZE * 0.62;          // generous: wider than the real text
        double top = CODE_BAND_TOP, bottom = CODE_BAND_TOP + CODE_BAND_HEIGHT;

        List<Double> topMarkers = new ArrayList<>();
        if (config.anchorPoints() != null) {
            for (AnchorPoint a : config.anchorPoints()) {
                if (a.absY() < 100) topMarkers.add(a.absX());
            }
        }
        topMarkers.sort(Double::compare);

        // gaps between neighbouring top markers (and the page edges), widest first
        List<double[]> gaps = new ArrayList<>();
        double previous = 0;
        for (double m : topMarkers) {
            gaps.add(new double[] {previous == 0 ? 20 : previous + MARKER_CLEARANCE, m - MARKER_CLEARANCE});
            previous = m;
        }
        gaps.add(new double[] {previous == 0 ? 20 : previous + MARKER_CLEARANCE, PAGE_WIDTH - 20});
        gaps.sort((g1, g2) -> Double.compare(g2[1] - g2[0], g1[1] - g1[0]));

        double centre = PAGE_WIDTH / 2.0;
        boolean placed = false;
        for (double[] g : gaps) {
            if (g[1] - g[0] < width) continue;
            double c = (g[0] + g[1]) / 2;
            if (!hitsZone(config, c - width / 2, top, width, bottom - top)) { centre = c; placed = true; break; }
        }
        if (!placed && !gaps.isEmpty()) {
            double[] widest = gaps.get(0);
            centre = (widest[0] + widest[1]) / 2;
        }
        shapes.add(new Text(centre, top + CODE_FONT_SIZE + 4, text, CODE_FONT_SIZE, true, "#111827", "middle", false));
    }

    private static boolean hitsZone(GridConfig config, double x, double y, double w, double h) {
        List<BoundingBox> boxes = new ArrayList<>();
        if (config.fixedZones() != null && config.fixedZones().boundingBox() != null) boxes.add(config.fixedZones().boundingBox());
        if (config.answerZones() != null) for (AnswerZone z : config.answerZones()) boxes.add(z.boundingBox());
        if (config.numberZones() != null) for (NumberZone z : config.numberZones()) boxes.add(z.boundingBox());
        if (config.idZones() != null && config.idZones().boundingBox() != null) boxes.add(config.idZones().boundingBox());
        for (BoundingBox b : boxes) {
            if (b == null) continue;
            if (x < b.x() + b.width() && x + w > b.x() && y < b.y() + b.height() && y + h > b.y()) return true;
        }
        return false;
    }

    private void addFixedZones(List<Shape> shapes, FixedZones fixed) {
        BoundingBox bbox = fixed.boundingBox();
        double padding = 5, rowHeight = 30, rowGap = 15, labelPaddingLeft = 8;
        double startX = bbox.x() + padding;
        double startY = bbox.y() + padding;
        double rightX = bbox.x() + bbox.width() - padding;
        double lineStartX = startX + labelPaddingLeft + 92;

        shapes.add(new Rect(bbox.x(), bbox.y(), bbox.width(), bbox.height(), "#f59e0b", 1.5, "5 4"));

        int index = 0;
        for (FixedZoneItem item : fixed.items()) {
            if (!item.enabled()) continue;
            double y = startY + index * (rowHeight + rowGap);
            double textX = startX + labelPaddingLeft;
            double textY = y + rowHeight / 2 + 5;
            shapes.add(new Text(textX, textY, item.label() + ":", 14, true, "#111827", "start", false));
            shapes.add(new Line(lineStartX, textY, rightX, textY, "#111827", 1));
            index++;
        }
    }
}
