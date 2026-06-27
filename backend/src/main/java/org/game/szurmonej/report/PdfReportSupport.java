package org.game.szurmonej.report;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.game.szurmonej.entity.FundraiserStatus;
import org.game.szurmonej.entity.FundraiserType;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Component
public class PdfReportSupport {

    static final float MARGIN = 50f;
    static final float PAGE_WIDTH = PDRectangle.A4.getWidth();
    static final float PAGE_HEIGHT = PDRectangle.A4.getHeight();
    static final float CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
    static final float LINE_HEIGHT = 14f;
    static final float TABLE_ROW_HEIGHT = 16f;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    private final DecimalFormat moneyFormat;

    public PdfReportSupport() {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(new Locale("pl", "PL"));
        symbols.setGroupingSeparator(' ');
        symbols.setDecimalSeparator(',');
        moneyFormat = new DecimalFormat("#,##0.00", symbols);
    }

    public PDFont loadFont(PDDocument document) throws IOException {
        try (InputStream fontStream = getClass().getResourceAsStream("/fonts/DejaVuSans.ttf")) {
            if (fontStream == null) {
                throw new IOException("Font DejaVuSans.ttf not found in classpath");
            }
            return PDType0Font.load(document, fontStream);
        }
    }

    public String formatMoney(BigDecimal amount) {
        if (amount == null) {
            return "0,00 zł";
        }
        return moneyFormat.format(amount.setScale(2, RoundingMode.HALF_UP)) + " zł";
    }

    public String formatDate(LocalDate date) {
        if (date == null) {
            return "—";
        }
        return date.format(DATE_FORMAT);
    }

    public String formatDateTime(LocalDateTime dateTime) {
        if (dateTime == null) {
            return "—";
        }
        return dateTime.format(DATE_TIME_FORMAT);
    }

    public String formatStatus(FundraiserStatus status) {
        if (status == null) {
            return "—";
        }
        return switch (status) {
            case ACTIVE -> "Aktywna";
            case RECONCILING -> "Rozliczanie";
            case FINISHED -> "Zakończona";
        };
    }

    public String formatGoal(FundraiserReportData data) {
        if (data.getFundraiserType() == FundraiserType.PER_CHILD_GOAL) {
            return formatMoney(data.getPerChildAmount()) + " na dziecko, łącznie " + formatMoney(data.getGoalAmount());
        }
        return "Kwota łączna: " + formatMoney(data.getGoalAmount());
    }

    public String sanitizeFilename(String value) {
        if (value == null || value.isBlank()) {
            return "raport";
        }
        return value.replaceAll("[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ._-]", "_");
    }

    public static class PageWriter {
        private final PDDocument document;
        private final PDFont font;
        private final PdfReportSupport support;
        private PDPage page;
        private PDPageContentStream stream;
        private float y;
        private int pageNumber;
        private final List<Integer> pageNumbers = new ArrayList<>();

        public PageWriter(PDDocument document, PDFont font, PdfReportSupport support) throws IOException {
            this.document = document;
            this.font = font;
            this.support = support;
            newPage();
        }

        public void newPage() throws IOException {
            closeStream();
            page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            pageNumber = document.getNumberOfPages();
            pageNumbers.add(pageNumber);
            stream = new PDPageContentStream(document, page);
            y = PAGE_HEIGHT - MARGIN;
        }

        public void ensureSpace(float requiredHeight) throws IOException {
            if (y - requiredHeight < MARGIN) {
                newPage();
            }
        }

        public void writeTitle(String text) throws IOException {
            writeLine(text, 16f, true);
            y -= 4f;
        }

        public void writeSectionHeading(String text) throws IOException {
            y -= 8f;
            ensureSpace(LINE_HEIGHT + 4f);
            writeLine(text, 12f, true);
            y -= 4f;
        }

        public void writeLine(String text, float fontSize, boolean bold) throws IOException {
            ensureSpace(LINE_HEIGHT);
            stream.beginText();
            stream.setFont(font, fontSize);
            stream.newLineAtOffset(MARGIN, y);
            stream.showText(text != null ? text : "");
            stream.endText();
            y -= LINE_HEIGHT;
        }

        public void writeWrappedLine(String text, float fontSize, float indent) throws IOException {
            List<String> lines = support.wrapText(text, font, fontSize, CONTENT_WIDTH - indent);
            for (String line : lines) {
                ensureSpace(LINE_HEIGHT);
                stream.beginText();
                stream.setFont(font, fontSize);
                stream.newLineAtOffset(MARGIN + indent, y);
                stream.showText(line);
                stream.endText();
                y -= LINE_HEIGHT;
            }
        }

        public void writeTableHeader(String[] headers, float[] columnWidths, float fontSize) throws IOException {
            float rowHeight = measureRowHeight(headers, columnWidths, fontSize);
            ensureSpace(rowHeight + 8f);
            float rowTop = y;
            drawRowCells(headers, columnWidths, fontSize, rowTop);
            y -= rowHeight;
            drawHorizontalRule(y);
            y -= 6f;
        }

        public void writeTableRow(String[] cells, float[] columnWidths, float fontSize) throws IOException {
            float rowHeight = measureRowHeight(cells, columnWidths, fontSize);
            ensureSpace(rowHeight + 2f);
            float rowTop = y;
            drawRowCells(cells, columnWidths, fontSize, rowTop);
            y -= rowHeight;
        }

        private float measureRowHeight(String[] cells, float[] columnWidths, float fontSize) throws IOException {
            float rowHeight = TABLE_ROW_HEIGHT;
            for (int i = 0; i < cells.length; i++) {
                int lineCount = support.wrapText(cells[i], font, fontSize, columnWidths[i] - 4f).size();
                rowHeight = Math.max(rowHeight, lineCount * LINE_HEIGHT + 4f);
            }
            return rowHeight;
        }

        private void drawRowCells(String[] cells, float[] columnWidths, float fontSize, float rowTop)
                throws IOException {
            float x = MARGIN;
            for (int i = 0; i < cells.length; i++) {
                drawCellText(cells[i], x, rowTop, columnWidths[i], fontSize);
                x += columnWidths[i];
            }
        }

        private void drawHorizontalRule(float lineY) throws IOException {
            stream.setLineWidth(0.5f);
            stream.moveTo(MARGIN, lineY);
            stream.lineTo(MARGIN + CONTENT_WIDTH, lineY);
            stream.stroke();
        }

        private void drawCellText(String text, float x, float topY, float width, float fontSize)
                throws IOException {
            String value = text != null ? text : "";
            List<String> lines = support.wrapText(value, font, fontSize, width - 4f);
            float cellY = topY - fontSize - 2f;
            for (String line : lines) {
                stream.beginText();
                stream.setFont(font, fontSize);
                stream.newLineAtOffset(x + 2f, cellY);
                stream.showText(line);
                stream.endText();
                cellY -= LINE_HEIGHT;
            }
        }

        public PDPageContentStream getStream() {
            return stream;
        }

        public float getY() {
            return y;
        }

        public void setY(float y) {
            this.y = y;
        }

        public PDPage getPage() {
            return page;
        }

        public PDDocument getDocument() {
            return document;
        }

        public PDFont getFont() {
            return font;
        }

        public PdfReportSupport getSupport() {
            return support;
        }

        public void closeStream() throws IOException {
            if (stream != null) {
                stream.close();
                stream = null;
            }
        }

        public void close() throws IOException {
            closeStream();
        }
    }

    public List<String> wrapText(String text, PDFont font, float fontSize, float maxWidth) throws IOException {
        List<String> lines = new ArrayList<>();
        if (text == null || text.isBlank()) {
            lines.add("");
            return lines;
        }
        String[] words = text.split("\\s+");
        StringBuilder current = new StringBuilder();
        for (String word : words) {
            String candidate = current.isEmpty() ? word : current + " " + word;
            float width = font.getStringWidth(candidate) / 1000f * fontSize;
            if (width > maxWidth && !current.isEmpty()) {
                lines.add(current.toString());
                current = new StringBuilder(word);
            } else {
                current = new StringBuilder(candidate);
            }
        }
        if (!current.isEmpty()) {
            lines.add(current.toString());
        }
        return lines;
    }
}
