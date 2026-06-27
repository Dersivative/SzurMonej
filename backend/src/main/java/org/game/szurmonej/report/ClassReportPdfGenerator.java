package org.game.szurmonej.report;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Component
public class ClassReportPdfGenerator {

    private static final float[] SUMMARY_COLUMNS = {120f, 70f, 65f, 65f, 80f, 80f};

    private final PdfReportSupport support;
    private final FundraiserPdfGenerator fundraiserPdfGenerator;

    public ClassReportPdfGenerator(PdfReportSupport support, FundraiserPdfGenerator fundraiserPdfGenerator) {
        this.support = support;
        this.fundraiserPdfGenerator = fundraiserPdfGenerator;
    }

    public byte[] generate(ClassReportData data) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDFont font = support.loadFont(document);
            PdfReportSupport.PageWriter writer = new PdfReportSupport.PageWriter(document, font, support);

            writeClassIntro(writer, data);
            writeFundraiserSummary(writer, data);

            List<AttachmentRef> allAttachments = new ArrayList<>();
            for (FundraiserReportData fundraiser : data.getFundraisers()) {
                writer.newPage();
                fundraiserPdfGenerator.writeFundraiserBody(writer, fundraiser, false);
                allAttachments.addAll(fundraiser.getAttachments());
            }

            fundraiserPdfGenerator.appendAttachments(writer, allAttachments);
            writer.close();

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            document.save(output);
            return output.toByteArray();
        }
    }

    private void writeClassIntro(PdfReportSupport.PageWriter writer, ClassReportData data) throws IOException {
        PdfReportSupport support = writer.getSupport();
        writer.writeTitle("Raport finansowy klasy");
        writer.writeLine("Klasa: " + data.getClassLabel(), 10f, false);
        writer.writeLine("Skarbnik: " + data.getTreasurerName(), 10f, false);
        writer.writeLine("Liczba zbiórek: " + data.getFundraisers().size(), 10f, false);
        writer.writeLine("Data wygenerowania raportu: " + support.formatDateTime(data.getGeneratedAt()), 10f, false);
    }

    private void writeFundraiserSummary(PdfReportSupport.PageWriter writer, ClassReportData data) throws IOException {
        writer.writeSectionHeading("Spis zbiórek");
        String[] headers = {"Tytuł", "Status", "Utworzono", "Zakończono", "Cel", "Zebrano"};
        writer.writeTableHeader(headers, SUMMARY_COLUMNS, 8f);

        List<FundraiserReportData> fundraisers = data.getFundraisers().stream()
                .sorted(Comparator.comparing(FundraiserReportData::getStartedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        PdfReportSupport support = writer.getSupport();
        for (FundraiserReportData fundraiser : fundraisers) {
            writer.writeTableRow(new String[]{
                    fundraiser.getTitle(),
                    support.formatStatus(fundraiser.getStatus()),
                    support.formatDate(fundraiser.getStartedAt()),
                    support.formatDate(fundraiser.getFinishedAt()),
                    support.formatGoal(fundraiser),
                    support.formatMoney(fundraiser.getCurrentAmount())
            }, SUMMARY_COLUMNS, 8f);
        }
    }
}
