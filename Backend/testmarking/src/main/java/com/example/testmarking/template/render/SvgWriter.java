package com.example.testmarking.template.render;

import com.example.testmarking.template.render.Shape.*;

import java.util.List;
import java.util.Locale;

import static com.example.testmarking.template.TemplateConstants.PAGE_HEIGHT;
import static com.example.testmarking.template.TemplateConstants.PAGE_WIDTH;

/** Serialises shapes to the same SVG the NestJS service produced. */
public final class SvgWriter {

    private SvgWriter() {}

    public static String write(List<Shape> shapes) {
        StringBuilder sb = new StringBuilder(64 * 1024);
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"").append(PAGE_WIDTH)
                .append("\" height=\"").append(PAGE_HEIGHT).append("\" viewBox=\"0 0 ")
                .append(PAGE_WIDTH).append(' ').append(PAGE_HEIGHT).append("\">\n");
        sb.append("  <rect x=\"0\" y=\"0\" width=\"").append(PAGE_WIDTH).append("\" height=\"").append(PAGE_HEIGHT)
                .append("\" fill=\"#ffffff\" />\n");

        for (Shape s : shapes) {
            sb.append("  ");
            switch (s) {
                case Rect r -> {
                    sb.append("<rect x=\"").append(n(r.x())).append("\" y=\"").append(n(r.y()))
                            .append("\" width=\"").append(n(r.width())).append("\" height=\"").append(n(r.height()))
                            .append("\" fill=\"none\" stroke=\"").append(r.stroke())
                            .append("\" stroke-width=\"").append(n(r.strokeWidth())).append('"');
                    if (r.dash() != null) sb.append(" stroke-dasharray=\"").append(r.dash()).append('"');
                    sb.append(" />");
                }
                case Circle c -> {
                    sb.append("<circle cx=\"").append(n(c.cx())).append("\" cy=\"").append(n(c.cy()))
                            .append("\" r=\"").append(n(c.r())).append("\" fill=\"").append(c.fill()).append('"');
                    if (c.fillOpacity() != 1) sb.append(" fill-opacity=\"").append(n(c.fillOpacity())).append('"');
                    if (c.stroke() != null) {
                        sb.append(" stroke=\"").append(c.stroke()).append("\" stroke-width=\"")
                                .append(n(c.strokeWidth())).append('"');
                    }
                    sb.append(" />");
                }
                case Line l -> sb.append("<line x1=\"").append(n(l.x1())).append("\" y1=\"").append(n(l.y1()))
                        .append("\" x2=\"").append(n(l.x2())).append("\" y2=\"").append(n(l.y2()))
                        .append("\" stroke=\"").append(l.stroke()).append("\" stroke-width=\"")
                        .append(n(l.strokeWidth())).append("\" />");
                case Text t -> {
                    sb.append("<text x=\"").append(n(t.x())).append("\" y=\"").append(n(t.y()))
                            .append("\" fill=\"").append(t.fill()).append("\" font-size=\"").append(n(t.fontSize()))
                            .append("\" font-family=\"")
                            .append(t.afterEdge() ? "Segoe UI, Arial, sans-serif" : "Arial, sans-serif")
                            .append("\" font-weight=\"").append(t.bold() ? (t.afterEdge() ? "600" : "700") : "400")
                            .append('"');
                    if (t.anchor().equals("middle")) sb.append(" text-anchor=\"middle\"");
                    if (t.afterEdge()) sb.append(" dominant-baseline=\"text-after-edge\"");
                    sb.append('>').append(escapeXml(t.text())).append("</text>");
                }
            }
            sb.append('\n');
        }
        sb.append("</svg>");
        return sb.toString();
    }

    /** 90.0 -> "90", 137.82 -> "137.82" (matches JS number-to-string for these values). */
    static String n(double v) {
        if (v == Math.rint(v) && Math.abs(v) < 1e15) return String.valueOf((long) v);
        String s = String.format(Locale.ROOT, "%.4f", v);
        s = s.replaceAll("0+$", "");
        return s.endsWith(".") ? s.substring(0, s.length() - 1) : s;
    }

    static String escapeXml(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&apos;");
    }
}
