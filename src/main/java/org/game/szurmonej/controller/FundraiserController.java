package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.dto.FundraiserActionRequest;
import org.game.szurmonej.dto.FundraiserCreateRequest;
import org.game.szurmonej.dto.FundraiserResponse;
import org.game.szurmonej.dto.MoneyOperationResponse;
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
}
