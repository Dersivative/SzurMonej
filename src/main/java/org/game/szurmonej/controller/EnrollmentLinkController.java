package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.dto.EnrollmentApplicationRequest;
import org.game.szurmonej.dto.EnrollmentApplicationResponse;
import org.game.szurmonej.dto.EnrollmentLinkPreviewResponse;
import org.game.szurmonej.service.ClassEnrollmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Enrollment links", description = "Linki zapisu dzieci do klasy")
@RestController
@RequestMapping("/api/enrollment-links")
public class EnrollmentLinkController {

    private final ClassEnrollmentService classEnrollmentService;

    public EnrollmentLinkController(ClassEnrollmentService classEnrollmentService) {
        this.classEnrollmentService = classEnrollmentService;
    }

    @Operation(summary = "Podgląd klasy powiązanej z linkiem (publiczny)")
    @SecurityRequirements
    @GetMapping("/{token}")
    public ResponseEntity<EnrollmentLinkPreviewResponse> preview(@PathVariable String token) {
        return ResponseEntity.ok(classEnrollmentService.previewEnrollmentLink(token));
    }

    @Operation(summary = "Zgłoś istniejące dziecko do klasy przez link")
    @PostMapping("/{token}/applications")
    public ResponseEntity<EnrollmentApplicationResponse> submitApplication(
            @PathVariable String token,
            @RequestBody EnrollmentApplicationRequest request
    ) {
        return ResponseEntity.ok(classEnrollmentService.submitApplication(token, request));
    }
}