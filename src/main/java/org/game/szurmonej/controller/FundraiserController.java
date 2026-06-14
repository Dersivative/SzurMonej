package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.dto.FundraiserActionRequest;
import org.game.szurmonej.dto.FundraiserCreateRequest;
import org.game.szurmonej.dto.FundraiserResponse;
import org.game.szurmonej.dto.MoneyOperationResponse;
import org.game.szurmonej.dto.UpdateGoalRequest;
import org.game.szurmonej.service.AccountService;
import org.game.szurmonej.service.FundraiserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Fundraisers", description = "Zbiórki w ramach klasy")
@RestController
@RequestMapping()
public class FundraiserController {

    private final FundraiserService fundraiserService;
    private final AccountService accountService;

    public FundraiserController(FundraiserService fundraiserService, AccountService accountService) {
        this.fundraiserService = fundraiserService;
        this.accountService = accountService;
    }

    @Operation(summary = "Pobierz wszystkie zbiórki dla danej klasy")
    @GetMapping("/api/school-classes/{classId}/fundraisers")
    public ResponseEntity<List<FundraiserResponse>> getFundraisersForClass(@PathVariable Long classId) {
        return ResponseEntity.ok(fundraiserService.getFundraisersForClass(classId));
    }

    @Operation(summary = "Stwórz nową zbiórkę dla klasy (tylko skarbnik)")
    @PostMapping("/api/school-classes/{classId}/fundraisers")
    public ResponseEntity<FundraiserResponse> createFundraiser(
            @PathVariable Long classId,
            @RequestBody FundraiserCreateRequest request
    ) {
        return ResponseEntity.ok(fundraiserService.createFundraiser(request, classId));
    }

    @Operation(summary = "Pobierz wszystkie zbiórki dla danego dziecka")
    @GetMapping("/api/children/{childId}/fundraisers")
    public ResponseEntity<List<FundraiserResponse>> getFundraisersForChild(@PathVariable Long childId) {
        return ResponseEntity.ok(fundraiserService.getFundraisersForChild(childId));
    }

    @Operation(summary = "Pobierz szczegóły jednej zbiórki (tylko skarbnik/admin)")
    @GetMapping("/api/fundraisers/{fundraiserId}")
    public ResponseEntity<FundraiserResponse> getFundraiserDetails(@PathVariable Long fundraiserId) {
        return ResponseEntity.ok(fundraiserService.getFundraiserDetails(fundraiserId));
    }

    @Operation(summary = "Zaktualizuj kwotę docelową zbiórki")
    @PatchMapping("/api/fundraisers/{fundraiserId}/goal")
    public ResponseEntity<FundraiserResponse> updateGoal(
            @PathVariable Long fundraiserId,
            @RequestBody UpdateGoalRequest request
    ) {
        return ResponseEntity.ok(fundraiserService.updateGoal(fundraiserId, request.getNewGoalAmount()));
    }

    @Operation(summary = "Wpłata na zbiórkę przez skarbnika")
    @PostMapping("/api/fundraisers/{fundraiserId}/deposit")
    public ResponseEntity<MoneyOperationResponse> deposit(
            @PathVariable Long fundraiserId,
            @RequestBody FundraiserActionRequest request
    ) {
        return ResponseEntity.ok(accountService.depositToFundraiser(fundraiserId, request.getAmount(), request.getNote()));
    }

    @Operation(summary = "Wypłata ze zbiórki przez skarbnika")
    @PostMapping("/api/fundraisers/{fundraiserId}/withdraw")
    public ResponseEntity<MoneyOperationResponse> withdraw(
            @PathVariable Long fundraiserId,
            @RequestBody FundraiserActionRequest request
    ) {
        return ResponseEntity.ok(accountService.withdrawFromFundraiser(fundraiserId, request.getAmount(), request.getNote()));
    }

    @Operation(summary = "Wypłać wszystkie środki i zakończ zbiórkę")
    @PostMapping("/api/fundraisers/{fundraiserId}/withdraw-all")
    public ResponseEntity<Void> withdrawAll(@PathVariable Long fundraiserId) {
        fundraiserService.withdrawAll(fundraiserId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Rozlicz zbiórkę")
    @PostMapping("/api/fundraisers/{fundraiserId}/reconcile")
    public ResponseEntity<Void> reconcile(@PathVariable Long fundraiserId, @RequestBody(required = false) FundraiserActionRequest request) {
        String note = (request != null && request.getNote() != null) ? request.getNote() : "Rozliczenie zbiórki";
        fundraiserService.reconcileFundraiser(fundraiserId, note);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Spłać dług w ramach zbiórki")
    @PostMapping("/api/fundraisers/{fundraiserId}/children/{childId}/pay-debt")
    public ResponseEntity<Void> payDebt(@PathVariable Long fundraiserId, @PathVariable Long childId) {
        fundraiserService.payDebt(fundraiserId, childId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Zakończ rozliczanie zbiórki")
    @PostMapping("/api/fundraisers/{fundraiserId}/settle")
    public ResponseEntity<Void> settle(@PathVariable Long fundraiserId) {
        fundraiserService.settleFundraiser(fundraiserId);
        return ResponseEntity.ok().build();
    }
}
