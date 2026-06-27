package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.entity.Fundraiser;
import org.game.szurmonej.entity.SchoolClass;
import org.game.szurmonej.repository.FundraiserRepository;
import org.game.szurmonej.repository.SchoolClassRepository;
import org.game.szurmonej.report.FinancialReportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@Tag(name = "Financial Reports", description = "Raporty finansowe PDF")
@RestController
@RequestMapping("/api")
public class FinancialReportController {

    private final FinancialReportService financialReportService;
    private final FundraiserRepository fundraiserRepository;
    private final SchoolClassRepository schoolClassRepository;

    public FinancialReportController(
            FinancialReportService financialReportService,
            FundraiserRepository fundraiserRepository,
            SchoolClassRepository schoolClassRepository
    ) {
        this.financialReportService = financialReportService;
        this.fundraiserRepository = fundraiserRepository;
        this.schoolClassRepository = schoolClassRepository;
    }

    @Operation(summary = "Pobierz raport finansowy PDF dla zbiórki (skarbnik/admin/rodzic uczestnika)")
    @GetMapping("/fundraisers/{fundraiserId}/report")
    public ResponseEntity<byte[]> downloadFundraiserReport(@PathVariable Long fundraiserId) {
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zbiórki."));
        byte[] pdf = financialReportService.generateFundraiserReport(fundraiserId);
        return buildPdfResponse(pdf, financialReportService.buildFundraiserReportFilename(fundraiser));
    }

    @Operation(summary = "Pobierz raport finansowy PDF dla klasy (skarbnik/admin/rodzic w klasie)")
    @GetMapping("/school-classes/{classId}/report")
    public ResponseEntity<byte[]> downloadClassReport(@PathVariable Long classId) {
        SchoolClass schoolClass = schoolClassRepository.findById(classId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono klasy."));
        byte[] pdf = financialReportService.generateClassReport(classId);
        return buildPdfResponse(pdf, financialReportService.buildClassReportFilename(schoolClass));
    }

    private ResponseEntity<byte[]> buildPdfResponse(byte[] pdf, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", filename);
        return ResponseEntity.ok().headers(headers).body(pdf);
    }
}
