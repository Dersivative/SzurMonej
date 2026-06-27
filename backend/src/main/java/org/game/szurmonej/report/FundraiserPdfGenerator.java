package org.game.szurmonej.report;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Component
public class FundraiserPdfGenerator {

    private static final float[] PARTICIPANT_COLUMNS = {180f, 90f, 90f, 90f};
    private static final float[] HISTORY_COLUMNS = {95f, 85f, 155f, 70f, 45f};
    private static final String[] PARTICIPANT_HEADERS = {"Uczestnik", "Suma wpłat", "Należność", "Nadpłata"};
    private static final String[] HISTORY_HEADERS = {"Data", "Typ", "Opis", "Kwota", "Zał."};

    private final PdfReportSupport support;

    public FundraiserPdfGenerator(PdfReportSupport support) {
        this.support = support;
    }

    public byte[] generate(FundraiserReportData data) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDFont font = support.loadFont(document);
            PdfReportSupport.PageWriter writer = new PdfReportSupport.PageWriter(document, font, support);
            writeFundraiserBody(writer, data, true);
            appendAttachments(writer, data.getAttachments());
            writer.close();
            return toByteArray(document);
        }
    }

    public void writeFundraiserBody(PdfReportSupport.PageWriter writer, FundraiserReportData data, boolean withMainTitle)
            throws IOException {
        PdfReportSupport support = writer.getSupport();
        if (withMainTitle) {
            writer.writeTitle("Raport finansowy zbiórki");
        } else {
            writer.writeTitle("Zbiórka: " + nullToEmpty(data.getTitle()));
        }
        writer.writeLine("Nazwa: " + nullToEmpty(data.getTitle()), 10f, false);
        if (data.getDescription() != null && !data.getDescription().isBlank()) {
            writer.writeWrappedLine("Opis: " + data.getDescription(), 10f, 0f);
        }
        writer.writeLine("Klasa: " + nullToEmpty(data.getClassLabel()), 10f, false);
        writer.writeLine("Skarbnik: " + nullToEmpty(data.getTreasurerName()), 10f, false);
        writer.writeLine("Status: " + support.formatStatus(data.getStatus()), 10f, false);
        writer.writeLine("Cel: " + support.formatGoal(data), 10f, false);
        writer.writeLine("Data utworzenia: " + support.formatDate(data.getStartedAt()), 10f, false);
        writer.writeLine("Data zakończenia: " + support.formatDate(data.getFinishedAt()), 10f, false);
        if (data.getEndsBy() != null) {
            writer.writeLine("Planowane zakończenie: " + support.formatDate(data.getEndsBy()), 10f, false);
        }
        writer.writeLine("Zebrana kwota: " + support.formatMoney(data.getCurrentAmount()), 10f, false);
        writer.writeLine("Data wygenerowania raportu: " + support.formatDateTime(data.getGeneratedAt()), 10f, false);

        writeParticipantsSection(writer, data);
        writeHistorySection(writer, data);
    }

    public void appendAttachments(PdfReportSupport.PageWriter writer, List<AttachmentRef> attachments) throws IOException {
        if (attachments == null || attachments.isEmpty()) {
            return;
        }
        writer.newPage();
        writer.writeTitle("Załączniki");
        for (AttachmentRef attachment : attachments) {
            appendSingleAttachment(writer, attachment);
        }
    }

    private void writeParticipantsSection(PdfReportSupport.PageWriter writer, FundraiserReportData data)
            throws IOException {
        writer.writeSectionHeading("Uczestnicy");
        writer.writeTableHeader(PARTICIPANT_HEADERS, PARTICIPANT_COLUMNS, 9f);
        List<FundraiserReportData.ParticipantRow> participants = data.getParticipants().stream()
                .sorted(Comparator.comparing(FundraiserReportData.ParticipantRow::name))
                .toList();
        PdfReportSupport support = writer.getSupport();
        for (FundraiserReportData.ParticipantRow participant : participants) {
            writer.writeTableRow(new String[]{
                    participant.name(),
                    support.formatMoney(participant.totalContribution()),
                    support.formatMoney(participant.debt()),
                    support.formatMoney(participant.credit())
            }, PARTICIPANT_COLUMNS, 9f);
        }
    }

    private void writeHistorySection(PdfReportSupport.PageWriter writer, FundraiserReportData data) throws IOException {
        writer.writeSectionHeading("Historia operacji");
        writer.writeTableHeader(HISTORY_HEADERS, HISTORY_COLUMNS, 9f);
        List<FundraiserReportData.HistoryRow> history = data.getHistory().stream()
                .sorted(Comparator.comparing(FundraiserReportData.HistoryRow::date))
                .toList();
        PdfReportSupport support = writer.getSupport();
        for (FundraiserReportData.HistoryRow row : history) {
            String attachmentLabel = row.attachmentNumber() != null ? "zał. " + row.attachmentNumber() : "";
            writer.writeTableRow(new String[]{
                    support.formatDateTime(row.date()),
                    nullToEmpty(row.type()),
                    nullToEmpty(row.description()),
                    support.formatMoney(row.amount()),
                    attachmentLabel
            }, HISTORY_COLUMNS, 9f);
        }
    }

    private void appendSingleAttachment(PdfReportSupport.PageWriter writer, AttachmentRef attachment) throws IOException {
        writer.newPage();
        writer.writeTitle("Załącznik " + attachment.number());
        writer.writeWrappedLine(attachment.description(), 10f, 0f);
        writer.setY(writer.getY() - 10f);

        String contentType = attachment.contentType() != null ? attachment.contentType().toLowerCase() : "";
        if (contentType.startsWith("image/")) {
            appendImageAttachment(writer, attachment);
        } else if ("application/pdf".equals(contentType)) {
            appendPdfAttachment(writer, attachment);
        } else {
            writer.writeWrappedLine(
                    "Plik: " + nullToEmpty(attachment.filename())
                            + " (" + nullToEmpty(attachment.contentType())
                            + ") — format nieobsługiwany w podglądzie",
                    10f,
                    0f
            );
        }
    }

    private void appendImageAttachment(PdfReportSupport.PageWriter writer, AttachmentRef attachment) throws IOException {
        writer.closeStream();
        PDDocument document = writer.getDocument();
        PDImageXObject image = PDImageXObject.createFromByteArray(
                document,
                attachment.content(),
                "attachment-" + attachment.number()
        );
        float maxWidth = PdfReportSupport.CONTENT_WIDTH;
        float maxHeight = writer.getY() - PdfReportSupport.MARGIN;
        float scale = Math.min(maxWidth / image.getWidth(), maxHeight / image.getHeight());
        float width = image.getWidth() * scale;
        float height = image.getHeight() * scale;
        try (PDPageContentStream stream = new PDPageContentStream(
                document,
                writer.getPage(),
                PDPageContentStream.AppendMode.APPEND,
                true,
                true
        )) {
            stream.drawImage(image, PdfReportSupport.MARGIN, writer.getY() - height, width, height);
        }
        writer.setY(writer.getY() - height - 10f);
    }

    private void appendPdfAttachment(PdfReportSupport.PageWriter writer, AttachmentRef attachment) throws IOException {
        writer.closeStream();
        PDDocument mainDocument = writer.getDocument();
        try (PDDocument attachmentDocument = Loader.loadPDF(attachment.content())) {
            for (PDPage sourcePage : attachmentDocument.getPages()) {
                mainDocument.importPage(sourcePage);
            }
        }
    }

    private byte[] toByteArray(PDDocument document) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        document.save(output);
        return output.toByteArray();
    }

    static BigDecimal displayAmount(BigDecimal amount) {
        if (amount == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return amount.abs().setScale(2, RoundingMode.HALF_UP);
    }

    private static String nullToEmpty(String value) {
        return value != null ? value : "";
    }
}
