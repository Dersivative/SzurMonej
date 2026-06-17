package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.dto.RefundRequestResponse;
import org.game.szurmonej.service.RefundRequestService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Refund Requests", description = "Zarządzanie prośbami o zwrot środków")
@RestController
@RequestMapping("/api")
public class RefundRequestController {

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
    public ResponseEntity<Void> approveRefundRequest(@PathVariable Long requestId) {
        refundRequestService.approveRefundRequest(requestId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Odrzuć prośbę o zwrot")
    @PostMapping("/refund-requests/{requestId}/reject")
    public ResponseEntity<Void> rejectRefundRequest(@PathVariable Long requestId) {
        refundRequestService.rejectRefundRequest(requestId);
        return ResponseEntity.ok().build();
    }
}
