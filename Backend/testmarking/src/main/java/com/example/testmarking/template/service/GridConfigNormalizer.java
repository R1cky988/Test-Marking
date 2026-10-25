package com.example.testmarking.template.service;

import com.example.testmarking.template.TemplateConstants.AnswerLayoutType;
import com.example.testmarking.template.TemplateConstants.ZoneSlot;
import com.example.testmarking.template.exception.TemplateException;
import com.example.testmarking.template.model.TemplateModel.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.example.testmarking.template.TemplateConstants.*;

/**
 * Port of TemplatesService.normalizeGridConfig / normalizeFixedZones, working directly on the
 * request body as a Map (no DTO classes). It also does the validation that the NestJS DTOs did
 * (class-validator), collecting every problem into one 400 response.
 *
 * Whatever the client sends, the stored config always has: the 12 fixed markers, locked
 * zone boxes for a 2- or 4-zone layout, fixed info-zone fields in a fixed order, and only
 * the teacher-controlled values (rows / options / number columns / id digits).
 */
public class GridConfigNormalizer {

    private static final Set<String> ID_TYPES = Set.of("student_id", "class_code", "exam_code");

    // ─── request body -> GridConfig ─────────────────────────────

    /** Validates and normalises the grid_config object of a request body. */
    public GridConfig normalize(Object gridConfig) {
        List<String> errors = new ArrayList<>();
        Map<String, Object> dto = asMap(gridConfig);
        if (dto == null || !(dto.get("answer_zones") instanceof List<?>)) {
            throw TemplateException.badRequest("Thiếu cấu hình vùng đáp án", "answer_zones bat buoc va phai la mang");
        }
        List<Object> zonesIn = asList(dto.get("answer_zones"));
        if (zonesIn.size() < 2 || zonesIn.size() > 4) {
            errors.add("grid_config.answer_zones: size must be between 2 and 4");
        }

        List<AnchorPoint> anchorsIn = null;
        if (dto.get("anchor_points") != null) {
            anchorsIn = parseAnchors(dto.get("anchor_points"), "grid_config.anchor_points", errors);
        }

        // validate every incoming zone, keep (zoneId -> layout) for the slots
        Map<String, Map<String, Object>> layoutById = new HashMap<>();
        List<Map<String, Object>> layoutByIndex = new ArrayList<>();
        for (int i = 0; i < zonesIn.size(); i++) {
            String path = "grid_config.answer_zones[" + i + "]";
            Map<String, Object> z = asMap(zonesIn.get(i));
            if (z == null) {
                errors.add(path + ": must be an object");
                layoutByIndex.add(null);
                continue;
            }
            String zoneId = z.get("zone_id") instanceof String s && !s.isBlank() ? s : null;
            if (zoneId == null) errors.add(path + ".zone_id: must not be blank");
            if (!"multiple_choice_grid".equals(z.get("type"))) errors.add(path + ".type: must be multiple_choice_grid");
            validateBox(z.get("bounding_box"), path + ".bounding_box", errors);
            Map<String, Object> layout = validateAnswerLayout(z.get("layout"), path + ".layout", errors);
            layoutByIndex.add(layout);
            if (zoneId != null && layout != null) layoutById.put(zoneId, layout);
        }

        IdZone idZone = null;
        if (dto.get("id_zones") != null) {
            idZone = parseIdZone(dto.get("id_zones"), "grid_config.id_zones", errors);
        }
        if (!errors.isEmpty()) {
            throw TemplateException.badRequest("Dữ liệu không hợp lệ", errors.toArray(new String[0]));
        }

        AnswerLayoutType layoutType = resolveLayoutType(zonesIn.size());
        List<ZoneSlot> slots = defaultAnswerZonesByLayout(layoutType);

        List<AnswerZone> answerZones = new ArrayList<>();
        for (int i = 0; i < slots.size(); i++) {
            ZoneSlot slot = slots.get(i);
            Map<String, Object> l = layoutById.getOrDefault(slot.zoneId(), layoutByIndex.get(i));
            if (l == null) {
                throw TemplateException.badRequest("Thiếu cấu hình bố cục vùng đáp án", "zone_id=" + slot.zoneId());
            }
            answerZones.add(new AnswerZone(slot.zoneId(), "multiple_choice_grid", slot.boundingBox(),
                    new AnswerLayout(intOf(l.get("rows")), intOf(l.get("options")),
                            Boolean.TRUE.equals(l.get("has_start_number")),
                            Boolean.TRUE.equals(l.get("has_end_number")), null)));
        }

        List<AnchorPoint> anchors = anchorsIn != null && anchorsIn.size() == 12 ? anchorsIn : defaultAnchorPoints();

        List<NumberZone> numberZones = null;
        if (idZone == null) {
            numberZones = defaultNumberZones();
        }
        return new GridConfig(anchors, normalizeFixedZones(dto.get("fixed_zones")), idZone, numberZones, answerZones);
    }

    /** Validates a top-level anchor_points array (exactly 12). */
    public static List<AnchorPoint> parseAnchorPoints(Object raw) {
        List<String> errors = new ArrayList<>();
        List<AnchorPoint> out = parseAnchors(raw, "anchor_points", errors);
        if (!errors.isEmpty()) {
            throw TemplateException.badRequest("Dữ liệu không hợp lệ", errors.toArray(new String[0]));
        }
        return out;
    }

    private static List<AnchorPoint> parseAnchors(Object raw, String path, List<String> errors) {
        List<AnchorPoint> out = new ArrayList<>();
        if (!(raw instanceof List<?> list)) {
            errors.add(path + ": must be an array");
            return out;
        }
        if (list.size() != 12) errors.add(path + ": size must be 12");
        for (int i = 0; i < list.size(); i++) {
            String p = path + "[" + i + "]";
            Map<String, Object> a = asMap(list.get(i));
            if (a == null) { errors.add(p + ": must be an object"); continue; }
            Integer id = wholeNumber(a.get("id"));
            Double absX = number(a.get("abs_x")), absY = number(a.get("abs_y")), u = number(a.get("u")), v = number(a.get("v"));
            if (id == null || id < 1 || id > 12) errors.add(p + ".id: must be an integer between 1 and 12");
            if (absX == null || absX < 0) errors.add(p + ".abs_x: must be a number >= 0");
            if (absY == null || absY < 0) errors.add(p + ".abs_y: must be a number >= 0");
            if (u == null || u < 0 || u > 1) errors.add(p + ".u: must be a number between 0 and 1");
            if (v == null || v < 0 || v > 1) errors.add(p + ".v: must be a number between 0 and 1");
            if (id != null && absX != null && absY != null && u != null && v != null) {
                out.add(new AnchorPoint(id, absX, absY, u, v));
            }
        }
        return out;
    }

    private static void validateBox(Object raw, String path, List<String> errors) {
        parseBox(raw, path, errors);
    }

    private static BoundingBox parseBox(Object raw, String path, List<String> errors) {
        Map<String, Object> b = asMap(raw);
        if (b == null) { errors.add(path + ": is required"); return null; }
        Double x = number(b.get("x")), y = number(b.get("y")), w = number(b.get("width")), h = number(b.get("height"));
        if (x == null || x < 0) errors.add(path + ".x: must be a number >= 0");
        if (y == null || y < 0) errors.add(path + ".y: must be a number >= 0");
        if (w == null || w < 1) errors.add(path + ".width: must be a number >= 1");
        if (h == null || h < 1) errors.add(path + ".height: must be a number >= 1");
        return x != null && y != null && w != null && h != null ? new BoundingBox(x, y, w, h) : null;
    }

    private static Map<String, Object> validateAnswerLayout(Object raw, String path, List<String> errors) {
        Map<String, Object> l = asMap(raw);
        if (l == null) { errors.add(path + ": is required"); return null; }
        Integer rows = wholeNumber(l.get("rows")), options = wholeNumber(l.get("options"));
        if (rows == null || rows < 0 || rows > 200) errors.add(path + ".rows: must be an integer between 0 and 200");
        if (options == null || options < 2 || options > 6) errors.add(path + ".options: must be an integer between 2 and 6");
        if (!(l.get("has_start_number") instanceof Boolean)) errors.add(path + ".has_start_number: must be a boolean");
        if (!(l.get("has_end_number") instanceof Boolean)) errors.add(path + ".has_end_number: must be a boolean");
        if (l.get("start_question_index") != null) {
            Integer s = wholeNumber(l.get("start_question_index"));
            if (s == null || s < 1) errors.add(path + ".start_question_index: must be an integer >= 1");
        }
        return l;
    }

    private static IdZone parseIdZone(Object raw, String path, List<String> errors) {
        Map<String, Object> z = asMap(raw);
        if (z == null) { errors.add(path + ": must be an object"); return null; }
        BoundingBox box = parseBox(z.get("bounding_box"), path + ".bounding_box", errors);
        List<IdZoneItem> items = new ArrayList<>();
        if (!(z.get("items") instanceof List<?> list) || list.size() != 3) {
            errors.add(path + ".items: must be an array of 3 items");
        } else {
            for (int i = 0; i < list.size(); i++) {
                String p = path + ".items[" + i + "]";
                Map<String, Object> it = asMap(list.get(i));
                if (it == null) { errors.add(p + ": must be an object"); continue; }
                Object type = it.get("type");
                Integer digits = wholeNumber(it.get("num_digits"));
                if (!(type instanceof String t) || !ID_TYPES.contains(t)) errors.add(p + ".type: must be student_id, class_code or exam_code");
                if (!(it.get("enabled") instanceof Boolean)) errors.add(p + ".enabled: must be a boolean");
                if (digits == null || digits < 1 || digits > 15) errors.add(p + ".num_digits: must be an integer between 1 and 15");
                if (type instanceof String t && ID_TYPES.contains(t) && it.get("enabled") instanceof Boolean en && digits != null && digits >= 1 && digits <= 15) {
                    items.add(new IdZoneItem(t, en, digits));
                }
            }
        }
        return box == null ? null : new IdZone(box, items);
    }

    private AnswerLayoutType resolveLayoutType(int count) {
        if (count == 2) return AnswerLayoutType.TWO_ZONE;
        if (count == 4) return AnswerLayoutType.FOUR_ZONE;
        throw TemplateException.badRequest("Chỉ hỗ trợ bố cục đáp án 2 vùng hoặc 4 vùng", "answer_zone_count=" + count);
    }

    // ─── fixed zones ─────────────────────────────────────────────

    /**
     * Accepts an object {bounding_box, items} or anything else (including the legacy array
     * shape) and always returns the 4 items in the fixed order, using defaults for gaps.
     */
    public FixedZones normalizeFixedZones(Object value) {
        FixedZones defaults = defaultFixedZones();
        Map<String, Object> obj = asMap(value);
        Map<String, Object> box = obj == null ? null : asMap(obj.get("bounding_box"));
        List<Object> items = obj == null || !(obj.get("items") instanceof List<?>) ? null : asList(obj.get("items"));

        BoundingBox d = defaults.boundingBox();
        BoundingBox bbox = new BoundingBox(
                lenient(box, "x", d.x()), lenient(box, "y", d.y()), lenient(box, "width", d.width()), lenient(box, "height", d.height()));

        List<FixedZoneItem> out = new ArrayList<>();
        for (FixedZoneItem def : defaults.items()) {
            Map<String, Object> found = null;
            if (items != null) {
                for (Object candidate : items) {
                    Map<String, Object> c = asMap(candidate);
                    if (c != null && def.type().equals(c.get("type"))) { found = c; break; }
                }
            }
            boolean enabled = found == null || !Boolean.FALSE.equals(found.get("enabled"));
            String label = found != null && found.get("label") instanceof String s && !s.isEmpty() ? s : def.label();
            out.add(new FixedZoneItem(def.type(), enabled, label));
        }
        return new FixedZones(bbox, out);
    }

    // ─── stored JSON (already normalised, maybe by an older version) -> GridConfig ─────

    /** Tolerant read of test_layouts.grid_config; old rows may carry fixed_zones as a legacy array. */
    public GridConfig fromStored(Map<String, Object> m) {
        List<AnchorPoint> anchors = new ArrayList<>();
        if (m.get("anchor_points") instanceof List<?> list) {
            for (Object o : list) {
                Map<String, Object> a = asMap(o);
                if (a == null) continue;
                anchors.add(new AnchorPoint(intOf(a.get("id")), dbl(a.get("abs_x")), dbl(a.get("abs_y")), dbl(a.get("u")), dbl(a.get("v"))));
            }
        }

        IdZone idZone = null;
        Map<String, Object> idRaw = asMap(m.get("id_zones"));
        if (idRaw != null) {
            List<IdZoneItem> items = new ArrayList<>();
            if (idRaw.get("items") instanceof List<?> list) {
                for (Object o : list) {
                    Map<String, Object> it = asMap(o);
                    if (it == null) continue;
                    items.add(new IdZoneItem((String) it.get("type"), !Boolean.FALSE.equals(it.get("enabled")), intOf(it.get("num_digits"))));
                }
            }
            idZone = new IdZone(box(idRaw.get("bounding_box")), items);
        }

        List<NumberZone> numberZones = null;
        if (m.get("number_zones") instanceof List<?> list) {
            numberZones = new ArrayList<>();
            for (Object o : list) {
                Map<String, Object> z = asMap(o);
                if (z == null) continue;
                Map<String, Object> l = asMap(z.get("layout"));
                numberZones.add(new NumberZone((String) z.get("zone_id"), (String) z.get("type"), box(z.get("bounding_box")),
                        new NumberLayout(l == null ? 0 : intOf(l.get("num_digits")), l == null ? 0 : intOf(l.get("rows")))));
            }
        }

        List<AnswerZone> zones = new ArrayList<>();
        if (m.get("answer_zones") instanceof List<?> list) {
            for (Object o : list) {
                Map<String, Object> z = asMap(o);
                Map<String, Object> l = z == null ? null : asMap(z.get("layout"));
                if (l == null) continue;
                Integer start = wholeNumber(l.get("start_question_index"));
                zones.add(new AnswerZone((String) z.get("zone_id"), (String) z.get("type"), box(z.get("bounding_box")),
                        new AnswerLayout(intOf(l.get("rows")), intOf(l.get("options")),
                                Boolean.TRUE.equals(l.get("has_start_number")), Boolean.TRUE.equals(l.get("has_end_number")), start)));
            }
        }
        return new GridConfig(anchors, normalizeFixedZones(m.get("fixed_zones")), idZone, numberZones, zones);
    }

    private static BoundingBox box(Object raw) {
        Map<String, Object> b = asMap(raw);
        return new BoundingBox(dbl(b == null ? null : b.get("x")), dbl(b == null ? null : b.get("y")),
                dbl(b == null ? null : b.get("width")), dbl(b == null ? null : b.get("height")));
    }

    // ─── small helpers ───────────────────────────────────────────

    @SuppressWarnings("unchecked")
    static Map<String, Object> asMap(Object o) {
        return o instanceof Map<?, ?> ? (Map<String, Object>) o : null;
    }

    @SuppressWarnings("unchecked")
    static List<Object> asList(Object o) {
        return o instanceof List<?> ? (List<Object>) o : List.of();
    }

    private static Double number(Object o) {
        return o instanceof Number n ? n.doubleValue() : null;
    }

    private static Integer wholeNumber(Object o) {
        if (!(o instanceof Number n)) return null;
        double d = n.doubleValue();
        return d == Math.rint(d) && Math.abs(d) < Integer.MAX_VALUE ? (int) d : null;
    }

    private static int intOf(Object o) {
        Integer v = wholeNumber(o);
        return v == null ? 0 : v;
    }

    private static double dbl(Object o) {
        return o instanceof Number n ? n.doubleValue() : 0;
    }

    private static double lenient(Map<String, Object> node, String key, double fallback) {
        if (node == null || node.get(key) == null) return fallback;
        Object v = node.get(key);
        if (v instanceof Number n) return n.doubleValue();
        if (v instanceof String s) {
            try { return Double.parseDouble(s); } catch (NumberFormatException e) { return fallback; }
        }
        return fallback;
    }
}
