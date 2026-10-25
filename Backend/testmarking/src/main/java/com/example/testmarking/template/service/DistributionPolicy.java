package com.example.testmarking.template.service;

import com.example.testmarking.template.calc.QuestionDistribution;
import com.example.testmarking.template.exception.TemplateException;
import com.example.testmarking.template.model.TemplateModel.AnswerZone;
import com.example.testmarking.template.model.TemplateModel.GridConfig;

import java.util.List;

/**
 * Server-side check of the 20 / 40 / 60 answer presets.
 *
 * The designer derives the zone count and the rows of each zone from one number (the total).
 * This policy makes the API refuse anything the designer could not have produced, so another
 * client cannot save a layout such as 3 zones or 12/12/12/12. The stored data is unchanged.
 *
 * total 1..20 -> 2 zones (10+10), total 21..40 -> 4 zones (10 each), total 41..60 -> 4 zones (15 each),
 * removing rows from the last zone first.
 */
public final class DistributionPolicy {

    public static final String CODE = "TEMPLATE_DISTRIBUTION_INVALID";

    private DistributionPolicy() {}

    public static void assertMatchesPreset(GridConfig grid) {
        List<AnswerZone> zones = grid.answerZones();
        int total = zones.stream().mapToInt(z -> Math.max(0, z.layout().rows())).sum();
        // distribute() throws a 400 itself when total is outside 1..60
        QuestionDistribution.Result expected = QuestionDistribution.distribute(total);

        boolean ok = expected.rows().length == zones.size();
        for (int i = 0; ok && i < zones.size(); i++) {
            ok = zones.get(i).layout().rows() == expected.rows()[i];
        }
        if (!ok) {
            throw TemplateException.badRequestWithCode(CODE,
                    "Số câu mỗi vùng không đúng với mẫu 20/40/60 câu",
                    "total_questions=" + total,
                    "expected_rows=" + java.util.Arrays.toString(expected.rows()),
                    "actual_rows=" + zones.stream().map(z -> String.valueOf(z.layout().rows())).toList());
        }
    }
}
