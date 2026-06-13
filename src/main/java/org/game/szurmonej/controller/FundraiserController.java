package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.dto.MoneyOperationResponse;
import org.game.szurmonej.dto.RefundRequest;
import org.game.szurmonej.entity.Fundraiser;
import org.game.szurmonej.repository.FundraiserRepository;
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

@Tag(name = "Fundraisers", description = "Zbiórki klasowe")
@RestController
@RequestMapping("/api/fundraisers")
public class FundraiserController {

    private final FundraiserRepository fundraiserRepository;
    private final AccountService accountService;

    public FundraiserController(FundraiserRepository fundraiserRepository, AccountService accountService) {
        this.fundraiserRepository = fundraiserRepository;
        this.accountService = accountService;
    }

    @GetMapping
    public List<Fundraiser> getAllFundraisers() {
        return fundraiserRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Fundraiser> getFundraiser(@PathVariable Long id) {
        Optional<Fundraiser> fundraiser = fundraiserRepository.findById(id);
        return fundraiser.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public Fundraiser createFundraiser(@RequestBody Fundraiser fundraiser) {
        return fundraiserRepository.save(fundraiser);
    }

    @Operation(summary = "Zwrot ze konta zbiórki na konto rodzica (tylko skarbnik klasy)")
    @PostMapping("/{id}/refund")
    public ResponseEntity<MoneyOperationResponse> refund(
            @PathVariable Long id,
            @RequestBody RefundRequest request
    ) {
        return ResponseEntity.ok(accountService.refundFromFundraiser(
                id,
                request.getTargetUserId(),
                request.getAmount()
        ));
    }
}
