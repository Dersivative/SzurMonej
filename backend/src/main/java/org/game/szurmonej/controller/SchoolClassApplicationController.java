package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.dto.SchoolClassApplicationRequest;
import org.game.szurmonej.dto.SchoolClassApplicationResponse;
import org.game.szurmonej.entity.EnrollmentStatus;
import org.game.szurmonej.service.SchoolClassApplicationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "School Class Applications", description = "Zarządzanie wnioskami o utworzenie klasy")
@RestController
@RequestMapping("/api/school-class-applications")
public class SchoolClassApplicationController {

    private final SchoolClassApplicationService applicationService;

    public SchoolClassApplicationController(SchoolClassApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @Operation(summary = "Złóż wniosek o utworzenie nowej klasy")
    @PostMapping
    public ResponseEntity<SchoolClassApplicationResponse> createApplication(@RequestBody SchoolClassApplicationRequest request) {
        return ResponseEntity.ok(applicationService.createApplication(request));
    }

    @Operation(summary = "Pobierz oczekujący wniosek dla bieżącego użytkownika")
    @GetMapping("/me/pending")
    public ResponseEntity<SchoolClassApplicationResponse> getMyPendingApplication() {
        return ResponseEntity.ok(applicationService.findPendingApplicationForCurrentUser());
    }

    @Operation(summary = "Pobierz wnioski o utworzenie klasy (tylko admin)")
    @GetMapping
    public ResponseEntity<List<SchoolClassApplicationResponse>> getApplications(@RequestParam EnrollmentStatus status) {
        return ResponseEntity.ok(applicationService.getApplicationsByStatus(status));
    }

    @Operation(summary = "Zatwierdź wniosek o utworzenie klasy (tylko admin)")
    @PostMapping("/{applicationId}/approve")
    public ResponseEntity<SchoolClassApplicationResponse> approveApplication(@PathVariable Long applicationId) {
        return ResponseEntity.ok(applicationService.approveApplication(applicationId));
    }

    @Operation(summary = "Odrzuć wniosek o utworzenie klasy (tylko admin)")
    @PostMapping("/{applicationId}/reject")
    public ResponseEntity<SchoolClassApplicationResponse> rejectApplication(@PathVariable Long applicationId) {
        return ResponseEntity.ok(applicationService.rejectApplication(applicationId));
    }
}
