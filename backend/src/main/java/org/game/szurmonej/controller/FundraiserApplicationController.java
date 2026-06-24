package org.game.szurmonej.controller;

import org.game.szurmonej.dto.FundraiserApplicationRequest;
import org.game.szurmonej.dto.FundraiserApplicationResponse;
import org.game.szurmonej.service.FundraiserApplicationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fundraiser-applications")
public class FundraiserApplicationController {

    private final FundraiserApplicationService applicationService;

    public FundraiserApplicationController(FundraiserApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    public ResponseEntity<FundraiserApplicationResponse> createApplication(@RequestBody FundraiserApplicationRequest request) {
        return ResponseEntity.ok(applicationService.createApplication(request));
    }

    @GetMapping("/class/{classId}/pending")
    public ResponseEntity<List<FundraiserApplicationResponse>> getPendingApplications(@PathVariable Long classId) {
        return ResponseEntity.ok(applicationService.getPendingApplications(classId));
    }

    @PostMapping("/{applicationId}/approve")
    public ResponseEntity<Void> approveApplication(@PathVariable Long applicationId, @RequestBody FundraiserApplicationRequest request) {
        applicationService.approveApplication(applicationId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{applicationId}/reject")
    public ResponseEntity<Void> rejectApplication(@PathVariable Long applicationId) {
        applicationService.rejectApplication(applicationId);
        return ResponseEntity.ok().build();
    }
}