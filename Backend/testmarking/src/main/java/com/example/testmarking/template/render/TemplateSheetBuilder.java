package com.example.testmarking.template.render;

import com.example.testmarking.template.calc.TemplateCalculationService;
import com.example.testmarking.template.calc.TemplateCalculationService.ComputedCell;
import com.example.testmarking.template.calc.TemplateCalculationService.ZoneGridResult;
import com.example.testmarking.template.model.TemplateModel.*;
import com.example.testmarking.template.render.Shape.*;

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
        List<AnswerZone> zones = calc.computeStartQuestionIndices(config.answerZones());
        List<ComputedCell> cells = calc.computeAllGrids(new GridConfig(
                config.anchorPoints(), config.fixedZones(), config.idZones(), config.numberZones(), zones));

        List<Shape> shapes = new ArrayList<>();
        shapes.add(new Text(24, 34, "Template Preview", 18, false, "#111827", "start", false));

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
