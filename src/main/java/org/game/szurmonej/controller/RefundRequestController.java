package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.dto.RefundRequestResponse;
import org.game.szurmonej.service.RefundRequestService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Refund Requests", description = "Zarządzanie prośbami o zwrot środków")
@RestController
@RequestMapping("/api")
public class RefundRequestController {

    private static final Logger log = LoggerFactory.getLogger(RefundRequestController.class);
    private final RefundRequestService refundRequestService;

    public RefundRequestController(RefundRequestService refundRequestService) {
        this.refundRequestService = refundRequestService;
    }

    @Operation(summary = "Pobierz oczekujące prośby o zwrot dla zbiórki")
    @GetMapping("/fundraisers/{fundraiserId}/refund-requests")
    public ResponseEntity<List<RefundRequestResponse>> getPendingRefundRequests(@PathVariable Long fundraiserId) {
        return ResponseEntity.ok(refundRequestService.getPendingRefundRequests(fundraiserId));
    }

    @Operation(summary = "Zatwierdź prośbę o zwrot")
    @PostMapping("/refund-requests/{requestId}/approve")
    public ResponseEntity<?> approveRefundRequest(@PathVariable Long requestId) {
        try {
            refundRequestService.approveRefundRequest(requestId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error approving refund request with ID: {}", requestId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @Operation(summary = "Odrzuć prośbę o zwrot")
    @PostMapping("/refund-requests/{requestId}/reject")
    public ResponseEntity<Void> rejectRefundRequest(@PathVariable Long requestId) {
        refundRequestService.rejectRefundRequest(requestId);
        return ResponseEntity.ok().build();
    }
}