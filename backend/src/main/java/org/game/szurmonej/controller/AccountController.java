package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.dto.AmountRequest;
import org.game.szurmonej.dto.MoneyOperationResponse;
import org.game.szurmonej.dto.TransferToFundraiserRequest;
import org.game.szurmonej.entity.Account;
import org.game.szurmonej.repository.AccountRepository;
import org.game.szurmonej.service.AccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@Tag(name = "Accounts", description = "Konta i operacje finansowe")
@RestController
@RequestMapping("/api/account") // Ujednolicona nazwa
public class AccountController {

    private final AccountRepository accountRepository;
    private final AccountService accountService;

    public AccountController(AccountRepository accountRepository, AccountService accountService) {
        this.accountRepository = accountRepository;
        this.accountService = accountService;
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
