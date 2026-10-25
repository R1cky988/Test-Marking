package com.example.testmarking.template.render;

import com.example.testmarking.template.render.Shape.*;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.List;

import static com.example.testmarking.template.TemplateConstants.PAGE_HEIGHT;
import static com.example.testmarking.template.TemplateConstants.PAGE_WIDTH;

/**
 * Draws the shapes as vector graphics on an A4 page (595.28 x 841.89 pt), stretching the
 * 827 x 1169 template space over the full page exactly like the original (which stretched a PNG).
 *
 * Vietnamese labels need a Unicode font. Put NotoSans-Regular.ttf and NotoSans-Bold.ttf in
 * src/main/resources/fonts/. Without them the writer falls back to Helvetica and strips accents.
 */
public final class PdfWriter {

    private static final float KAPPA = 0.5522847498f;

    private PdfWriter() {}

    public static byte[] write(List<Shape> shapes) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            float pw = page.getMediaBox().getWidth();
            float ph = page.getMediaBox().getHeight();
            float sx = pw / PAGE_WIDTH;
            float sy = ph / PAGE_HEIGHT;

            Fonts fonts = Fonts.load(doc);

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                for (Shape s : shapes) {
                    switch (s) {
                        case Rect r -> {
                            cs.setStrokingColor(color(r.stroke(), 1));
                            cs.setLineWidth((float) (r.strokeWidth() * sx));
                            if (r.dash() != null) cs.setLineDashPattern(new float[] {5 * sx, 4 * sx}, 0);
                            else cs.setLineDashPattern(new float[] {}, 0);
                            cs.addRect((float) (r.x() * sx), ph - (float) ((r.y() + r.height()) * sy),
                                    (float) (r.width() * sx), (float) (r.height() * sy));
                            cs.stroke();
                            cs.setLineDashPattern(new float[] {}, 0);
                        }
                        case Circle c -> {
                            circlePath(cs, (float) (c.cx() * sx), ph - (float) (c.cy() * sy),
                                    (float) (c.r() * sx), (float) (c.r() * sy));
                            cs.setNonStrokingColor(color(c.fill(), c.fillOpacity()));
                            if (c.stroke() != null) {
                                cs.setStrokingColor(color(c.stroke(), 1));
                                cs.setLineWidth((float) (c.strokeWidth() * sx));
                                cs.fillAndStroke();
                            } else {
                                cs.fill();
                            }
                        }
                        case Line l -> {
                            cs.setStrokingColor(color(l.stroke(), 1));
                            cs.setLineWidth((float) (l.strokeWidth() * sx));
                            cs.moveTo((float) (l.x1() * sx), ph - (float) (l.y1() * sy));
                            cs.lineTo((float) (l.x2() * sx), ph - (float) (l.y2() * sy));
                            cs.stroke();
                        }
                        case Text t -> {
                            PDFont font = t.bold() ? fonts.bold : fonts.regular;
                            String text = fonts.unicode ? t.text() : stripAccents(t.text());
                            float size = (float) (t.fontSize() * sx);
                            float width = font.getStringWidth(text) / 1000f * size;
                            float x = (float) (t.x() * sx) - (t.anchor().equals("middle") ? width / 2 : 0);
                            float y = ph - (float) (t.y() * sy);
                            if (t.afterEdge()) y += size * 0.2f; // text sits above y; lift off the descender
                            cs.beginText();
                            cs.setFont(font, size);
                            cs.setNonStrokingColor(color(t.fill(), 1));
                            cs.newLineAtOffset(x, y);
                            cs.showText(text);
                            cs.endText();
                        }
                    }
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    private static void circlePath(PDPageContentStream cs, float cx, float cy, float rx, float ry) throws IOException {
        cs.moveTo(cx + rx, cy);
        cs.curveTo(cx + rx, cy + KAPPA * ry, cx + KAPPA * rx, cy + ry, cx, cy + ry);
        cs.curveTo(cx - KAPPA * rx, cy + ry, cx - rx, cy + KAPPA * ry, cx - rx, cy);
        cs.curveTo(cx - rx, cy - KAPPA * ry, cx - KAPPA * rx, cy - ry, cx, cy - ry);
        cs.curveTo(cx + KAPPA * rx, cy - ry, cx + rx, cy - KAPPA * ry, cx + rx, cy);
        cs.closePath();
    }

    /** "#rrggbb" blended with white at the given opacity (avoids PDF transparency groups). */
    private static Color color(String hex, double opacity) {
        int rgb = Integer.parseInt(hex.substring(1), 16);
        int r = (rgb >> 16) & 255, g = (rgb >> 8) & 255, b = rgb & 255;
        double a = Math.max(0, Math.min(1, opacity));
        return new Color((int) Math.round(r * a + 255 * (1 - a)),
                (int) Math.round(g * a + 255 * (1 - a)),
                (int) Math.round(b * a + 255 * (1 - a)));
    }

    private static String stripAccents(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}+", "")
                .replace('đ', 'd').replace('Đ', 'D');
    }

    private record Fonts(PDFont regular, PDFont bold, boolean unicode) {
        static Fonts load(PDDocument doc) throws IOException {
            try (InputStream reg = PdfWriter.class.getResourceAsStream("/fonts/NotoSans-Regular.ttf");
                 InputStream bld = PdfWriter.class.getResourceAsStream("/fonts/NotoSans-Bold.ttf")) {
                if (reg != null && bld != null) {
                    return new Fonts(PDType0Font.load(doc, reg), PDType0Font.load(doc, bld), true);
                }
            }
            return new Fonts(new PDType1Font(Standard14Fonts.FontName.HELVETICA),
                    new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), false);
        }
    }
}
