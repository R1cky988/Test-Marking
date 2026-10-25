package com.example.testmarking.template.render;

/** Drawing primitives in template space (827 x 1169 px, origin top-left). */
public sealed interface Shape {

    record Rect(double x, double y, double width, double height, String stroke, double strokeWidth, String dash)
            implements Shape {}

    record Circle(double cx, double cy, double r, String fill, double fillOpacity, String stroke, double strokeWidth)
            implements Shape {}

    record Line(double x1, double y1, double x2, double y2, String stroke, double strokeWidth) implements Shape {}

    /** anchor: "start" or "middle". afterEdge: SVG dominant-baseline text-after-edge (text sits above y). */
    record Text(double x, double y, String text, double fontSize, boolean bold, String fill, String anchor,
                boolean afterEdge) implements Shape {}
}
