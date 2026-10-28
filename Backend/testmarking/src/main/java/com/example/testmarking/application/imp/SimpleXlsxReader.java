package com.example.testmarking.application.imp;

import com.example.testmarking.template.exception.TemplateException;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Reads the first sheet of an .xlsx as rows of text, with only the JDK (an .xlsx is a zip of XML files), so no extra
 * library is needed. Formulas are read as the value Excel cached; dates and numbers come back as the raw cell text.
 * Safe against XML entity tricks and zip bombs (every entry is capped).
 */
final class SimpleXlsxReader {

    private SimpleXlsxReader() {}

    /** One sheet row: its number in Excel (1-based) and its cells by column (index 0 = column A, "" when empty). */
    record Row(int number, List<String> cells) {
        String cell(int col) { return col >= 0 && col < cells.size() ? cells.get(col) : ""; }
        boolean blank() { return cells.stream().allMatch(String::isBlank); }
    }

    private static final int MAX_ENTRY_BYTES = 20 * 1024 * 1024;
    private static final int MAX_COLUMNS = 200;
    private static final int MAX_ROWS = 20_000;

    static List<Row> readFirstSheet(byte[] file) {
        Map<String, byte[]> parts = unzip(file);
        List<String> shared = parts.containsKey("xl/sharedStrings.xml") ? sharedStrings(parse(parts.get("xl/sharedStrings.xml"))) : List.of();
        String sheetPath = firstSheetPath(parts);
        byte[] sheet = parts.get(sheetPath);
        if (sheet == null) throw notExcel();
        return rows(parse(sheet), shared);
    }

    // ─── zip ─────────────────────────────────────────────────────

    private static Map<String, byte[]> unzip(byte[] file) {
        Map<String, byte[]> out = new HashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(file))) {
            ZipEntry e;
            while ((e = zip.getNextEntry()) != null) {
                String name = e.getName();
                if (e.isDirectory() || !(name.startsWith("xl/") && name.endsWith(".xml") || name.endsWith(".rels"))) continue;
                out.put(name, readCapped(zip));
            }
        } catch (IOException e) {
            throw notExcel();
        }
        if (!out.containsKey("xl/workbook.xml")) throw notExcel();
        return out;
    }

    private static byte[] readCapped(InputStream in) throws IOException {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int n;
        while ((n = in.read(chunk)) > 0) {
            buf.write(chunk, 0, n);
            if (buf.size() > MAX_ENTRY_BYTES) {
                throw TemplateException.badRequestWithCode("FILE_TOO_LARGE", "Tệp Excel quá lớn");
            }
        }
        return buf.toByteArray();
    }

    private static TemplateException notExcel() {
        return TemplateException.badRequestWithCode("NOT_XLSX", "Tệp không phải Excel (.xlsx) hợp lệ");
    }

    // ─── xml ─────────────────────────────────────────────────────

    private static Document parse(byte[] xml) {
        try {
            DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
            f.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            f.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            f.setExpandEntityReferences(false);
            f.setNamespaceAware(false);
            DocumentBuilder b = f.newDocumentBuilder();
            return b.parse(new ByteArrayInputStream(xml));
        } catch (Exception e) {
            throw notExcel();
        }
    }

    private static String firstSheetPath(Map<String, byte[]> parts) {
        try {
            NodeList sheets = parse(parts.get("xl/workbook.xml")).getElementsByTagName("sheet");
            byte[] rels = parts.get("xl/_rels/workbook.xml.rels");
            if (sheets.getLength() > 0 && rels != null) {
                String rid = ((Element) sheets.item(0)).getAttribute("r:id");
                NodeList all = parse(rels).getElementsByTagName("Relationship");
                for (int i = 0; i < all.getLength(); i++) {
                    Element r = (Element) all.item(i);
                    if (rid.equals(r.getAttribute("Id"))) {
                        String t = r.getAttribute("Target");
                        return t.startsWith("/") ? t.substring(1) : "xl/" + t;
                    }
                }
            }
        } catch (TemplateException e) {
            throw e;
        } catch (RuntimeException ignored) {
            // fall back below
        }
        return "xl/worksheets/sheet1.xml";
    }

    private static List<String> sharedStrings(Document doc) {
        List<String> out = new ArrayList<>();
        NodeList items = doc.getElementsByTagName("si");
        for (int i = 0; i < items.getLength(); i++) out.add(textOf(items.item(i)));
        return out;
    }

    /** Text of an <si> / <is>: its <t> children and the <t> inside runs <r>, not phonetic hints (<rPh>). */
    private static String textOf(Node holder) {
        StringBuilder sb = new StringBuilder();
        for (Node c = holder.getFirstChild(); c != null; c = c.getNextSibling()) {
            if (c.getNodeType() != Node.ELEMENT_NODE) continue;
            if (c.getNodeName().equals("t")) sb.append(c.getTextContent());
            else if (c.getNodeName().equals("r")) {
                for (Node t = c.getFirstChild(); t != null; t = t.getNextSibling()) {
                    if (t.getNodeType() == Node.ELEMENT_NODE && t.getNodeName().equals("t")) sb.append(t.getTextContent());
                }
            }
        }
        return sb.toString();
    }

    private static List<Row> rows(Document sheet, List<String> shared) {
        List<Row> out = new ArrayList<>();
        NodeList rowNodes = sheet.getElementsByTagName("row");
        if (rowNodes.getLength() > MAX_ROWS) throw TemplateException.badRequestWithCode("FILE_TOO_LARGE", "Tệp Excel có quá nhiều dòng");
        int auto = 0;
        for (int i = 0; i < rowNodes.getLength(); i++) {
            Element row = (Element) rowNodes.item(i);
            auto++;
            int number = row.hasAttribute("r") ? parseInt(row.getAttribute("r"), auto) : auto;
            auto = number;
            List<String> cells = new ArrayList<>();
            int nextCol = 0;
            for (Node c = row.getFirstChild(); c != null; c = c.getNextSibling()) {
                if (c.getNodeType() != Node.ELEMENT_NODE || !c.getNodeName().equals("c")) continue;
                Element cell = (Element) c;
                int col = cell.hasAttribute("r") ? column(cell.getAttribute("r")) : nextCol;
                if (col < 0 || col >= MAX_COLUMNS) continue;
                while (cells.size() < col) cells.add("");
                cells.add(cellText(cell, shared));
                nextCol = col + 1;
            }
            out.add(new Row(number, cells));
        }
        return out;
    }

    private static String cellText(Element cell, List<String> shared) {
        String type = cell.getAttribute("t");
        if (type.equals("inlineStr")) {
            NodeList is = cell.getElementsByTagName("is");
            return is.getLength() == 0 ? "" : textOf(is.item(0)).trim();
        }
        NodeList vs = cell.getElementsByTagName("v");
        if (vs.getLength() == 0) return "";
        String v = vs.item(0).getTextContent().trim();
        if (type.equals("s")) {
            int idx = parseInt(v, -1);
            return idx >= 0 && idx < shared.size() ? shared.get(idx).trim() : "";
        }
        return v;
    }

    /** "C12" -> 2 (column letters only). */
    private static int column(String ref) {
        int col = 0, n = 0;
        for (char ch : ref.toCharArray()) {
            if (!Character.isLetter(ch)) break;
            col = col * 26 + (Character.toUpperCase(ch) - 'A' + 1);
            if (++n > 3) return -1;
        }
        return n == 0 ? -1 : col - 1;
    }

    private static int parseInt(String s, int fallback) {
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }
}
