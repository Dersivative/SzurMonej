package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.dto.AccountLookupResponse;
import org.game.szurmonej.dto.AmountRequest;
import org.game.szurmonej.dto.MoneyOperationResponse;
import org.game.szurmonej.dto.TransferToFundraiserRequest;
import org.game.szurmonej.service.AccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Accounts", description = "Konta i operacje finansowe")
@RestController
@RequestMapping("/api/account") // Ujednolicona nazwa
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @Operation(summary = "Wyszukaj użytkownika po numerze konta")
    @GetMapping("/by-number/{accountNumber}")
    public ResponseEntity<AccountLookupResponse> lookupByAccountNumber(@PathVariable String accountNumber) {
        return ResponseEntity.ok(accountService.lookupUserByAccountNumber(accountNumber));
    }

    @Operation(summary = "Wpłata na własne konto rodzica")
    @PostMapping("/deposit")
    public ResponseEntity<MoneyOperationResponse> deposit(@RequestBody AmountRequest request) {
        return ResponseEntity.ok(accountService.depositToOwnAccount(request.getAmount()));
    }

    @Operation(summary = "Przelew z konta rodzica na zbiórkę za wybrane dziecko")
    @PostMapping("/transfer-to-fundraiser")
    public ResponseEntity<MoneyOperationResponse> transfer(@RequestBody TransferToFundraiserRequest request) {
        return ResponseEntity.ok(accountService.transferToFundraiser(request));
    }
}
