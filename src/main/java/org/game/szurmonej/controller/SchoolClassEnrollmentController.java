package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.dto.EnrollmentApplicationResponse;
import org.game.szurmonej.dto.EnrollmentLinkResponse;
import org.game.szurmonej.entity.EnrollmentStatus;
import org.game.szurmonej.service.ClassEnrollmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@Tag(name = "Class enrollment", description = "Zarządzanie zapisem do klasy (skarbnik)")
@RestController
@RequestMapping("/api/school-classes")
public class SchoolClassEnrollmentController {

    private final ClassEnrollmentService classEnrollmentService;

    public SchoolClassEnrollmentController(ClassEnrollmentService classEnrollmentService) {
        this.classEnrollmentService = classEnrollmentService;
    }

    @Operation(summary = "Wygeneruj lub odśwież link zapisu dla klasy")
    @PostMapping("/{classId}/enrollment-link")
    public ResponseEntity<EnrollmentLinkResponse> generateEnrollmentLink(@PathVariable Long classId) {
        return ResponseEntity.ok(classEnrollmentService.generateEnrollmentLink(classId));
    }

    @Operation(summary = "Pobierz aktywny link zapisu klasy")
    @GetMapping("/{classId}/enrollment-link")
    public ResponseEntity<EnrollmentLinkResponse> getEnrollmentLink(@PathVariable Long classId) {
        return ResponseEntity.ok(classEnrollmentService.getActiveEnrollmentLink(classId));
    }

    @Operation(summary = "Dezaktywuj link zapisu klasy")
    @DeleteMapping("/{classId}/enrollment-link")
    public ResponseEntity<Void> deactivateEnrollmentLink(@PathVariable Long classId) {
        classEnrollmentService.deactivateEnrollmentLink(classId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Lista zgłoszeń zapisu do klasy")
    @GetMapping("/{classId}/enrollment-applications")
    public ResponseEntity<List<EnrollmentApplicationResponse>> getEnrollmentApplications(
            @PathVariable Long classId,
            @RequestParam(required = false) EnrollmentStatus status
    ) {
        List<EnrollmentApplicationResponse> applications = classEnrollmentService
                .getApplicationsForClass(classId, status).stream()
                .map(EnrollmentApplicationResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(applications);
    }

    @Operation(summary = "Zaakceptuj zgłoszenie zapisu")
    @PostMapping("/{classId}/enrollment-applications/{applicationId}/approve")
    public ResponseEntity<EnrollmentApplicationResponse> approveApplication(
            @PathVariable Long classId,
            @PathVariable Long applicationId
    ) {
        return ResponseEntity.ok(
                EnrollmentApplicationResponse.from(classEnrollmentService.approveApplication(classId, applicationId))
        );
    }

    @Operation(summary = "Odrzuć zgłoszenie zapisu")
    @PostMapping("/{classId}/enrollment-applications/{applicationId}/reject")
    public ResponseEntity<EnrollmentApplicationResponse> rejectApplication(
            @PathVariable Long classId,
            @PathVariable Long applicationId
    ) {
        return ResponseEntity.ok(
                EnrollmentApplicationResponse.from(classEnrollmentService.rejectApplication(classId, applicationId))
        );
    }

    @Operation(summary = "Usuń dziecko z klasy (skarbnik lub admin)")
    @DeleteMapping("/{classId}/members/{childId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long classId,
            @PathVariable Long childId
    ) {
        classEnrollmentService.removeClassMember(classId, childId);
        return ResponseEntity.noContent().build();
    }
}