package org.game.szurmonej.service;

import org.game.szurmonej.dto.MoneyOperationResponse;
import org.game.szurmonej.dto.TransferToFundraiserRequest;
import org.game.szurmonej.entity.*;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.exception.InsufficientFundsException;
import org.game.szurmonej.exception.ResourceNotFoundException;
import org.game.szurmonej.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final ContributionRepository contributionRepository;
    private final FundraiserRepository fundraiserRepository;
    private final FundraiserParticipantRepository participantRepository;
    private final AccountHistoryEntryRepository historyRepository;
    private final CurrentUserService currentUserService;

    public AccountService(
            AccountRepository accountRepository,
            ContributionRepository contributionRepository,
            FundraiserRepository fundraiserRepository,
            FundraiserParticipantRepository participantRepository,
            AccountHistoryEntryRepository historyRepository, 
            CurrentUserService currentUserService
    ) {
        this.accountRepository = accountRepository;
        this.contributionRepository = contributionRepository;
        this.fundraiserRepository = fundraiserRepository;
        this.participantRepository = participantRepository;
        this.historyRepository = historyRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public MoneyOperationResponse depositToOwnAccount(BigDecimal amount) {
        validatePositiveAmount(amount);
        User currentUser = currentUserService.getCurrentUser();
        Account account = accountRepository.findByUser_Id(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User account not found"));
        assertUserAccount(account);

        account.setBalance(account.getBalance().add(amount));
        accountRepository.save(account);

        return MoneyOperationResponse.singleAccount(account.getId(), account.getBalance());
    }

    @Transactional
    public MoneyOperationResponse transferToFundraiser(TransferToFundraiserRequest request) {
        validatePositiveAmount(request.getAmount());
        User currentUser = currentUserService.getCurrentUser();

        Account payerAccount = accountRepository.findByUser_Id(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User account not found"));
        assertUserAccount(payerAccount);
        assertAccountOwner(payerAccount, currentUser);

        Fundraiser fundraiser = fundraiserRepository.findById(request.getFundraiserId())
                .orElseThrow(() -> new ResourceNotFoundException("Fundraiser not found: " + request.getFundraiserId()));
        Account fundraiserAccount = fundraiser.getAccount();
        if (fundraiserAccount == null) {
            throw new ResourceNotFoundException("Fundraiser account not found");
        }

        FundraiserParticipant participant = participantRepository
                .findByFundraiser_IdAndChild_Id(request.getFundraiserId(), request.getChildId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Child is not a participant of this fundraiser"));
        if (participant.getRemovedAt() != null) {
            throw new IllegalArgumentException("Child is no longer an active participant");
        }

        debit(payerAccount, request.getAmount());
        credit(fundraiserAccount, request.getAmount());
        accountRepository.save(payerAccount);
        accountRepository.save(fundraiserAccount);

        Contribution contribution = new Contribution();
        contribution.setParticipant(participant);
        contribution.setAmount(request.getAmount());
        contribution.setPaidAt(LocalDateTime.now());
        contribution.setPayerAccount(payerAccount);
        contribution.setNote(request.getNote());
        contribution = contributionRepository.save(contribution);

        return MoneyOperationResponse.transfer(
                payerAccount.getId(),
                payerAccount.getBalance(),
                fundraiserAccount.getId(),
                fundraiserAccount.getBalance(),
                contribution.getId()
        );
    }

    @Transactional
    public MoneyOperationResponse depositToFundraiser(Long fundraiserId, BigDecimal amount, String note) {
        validatePositiveAmount(amount);
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = assertTreasurerAndGetFundraiser(fundraiserId, currentUser);
        Account fundraiserAccount = fundraiser.getAccount();
        Account treasurerAccount = accountRepository.findByUser_Id(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Treasurer account not found"));

        debit(treasurerAccount, amount);
        credit(fundraiserAccount, amount);
        accountRepository.save(treasurerAccount);
        accountRepository.save(fundraiserAccount);
        
        AccountHistoryEntry historyEntry = new AccountHistoryEntry();
        historyEntry.setAccount(fundraiserAccount);
        historyEntry.setAmount(amount);
        historyEntry.setDate(LocalDateTime.now());
        historyEntry.setDescription("Wpłata skarbnika: " + note);
        historyEntry.setType("DEPOSIT_TREASURER");
        historyRepository.save(historyEntry);

        return MoneyOperationResponse.transfer(
                treasurerAccount.getId(),
                treasurerAccount.getBalance(),
                fundraiserAccount.getId(),
                fundraiserAccount.getBalance(),
                null
        );
    }

    @Transactional
    public MoneyOperationResponse withdrawFromFundraiser(Long fundraiserId, BigDecimal amount, String note) {
        validatePositiveAmount(amount);
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = assertTreasurerAndGetFundraiser(fundraiserId, currentUser);
        Account fundraiserAccount = fundraiser.getAccount();
        Account treasurerAccount = accountRepository.findByUser_Id(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Treasurer account not found"));

        debit(fundraiserAccount, amount);
        credit(treasurerAccount, amount);
        accountRepository.save(fundraiserAccount);
        accountRepository.save(treasurerAccount);

        AccountHistoryEntry historyEntry = new AccountHistoryEntry();
        historyEntry.setAccount(fundraiserAccount);
        historyEntry.setAmount(amount.negate());
        historyEntry.setDate(LocalDateTime.now());
        historyEntry.setDescription("Wypłata skarbnika: " + note);
        historyEntry.setType("WITHDRAWAL_TREASURER");
        historyRepository.save(historyEntry);

        return MoneyOperationResponse.transfer(
                treasurerAccount.getId(),
                treasurerAccount.getBalance(),
                fundraiserAccount.getId(),
                fundraiserAccount.getBalance(),
                null
        );
    }

    @Transactional
    public MoneyOperationResponse refundFromFundraiser(Long fundraiserId, Long targetUserId, BigDecimal amount) {
        validatePositiveAmount(amount);
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = assertTreasurerAndGetFundraiser(fundraiserId, currentUser);
        Account fundraiserAccount = fundraiser.getAccount();

        Account targetAccount = accountRepository.findByUser_Id(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Target user account not found"));
        assertUserAccount(targetAccount);

        debit(fundraiserAccount, amount);
        credit(targetAccount, amount);
        accountRepository.save(fundraiserAccount);
        accountRepository.save(targetAccount);

        return MoneyOperationResponse.transfer(
                fundraiserAccount.getId(),
                fundraiserAccount.getBalance(),
                targetAccount.getId(),
                targetAccount.getBalance(),
                null
        );
    }

    private Fundraiser assertTreasurerAndGetFundraiser(Long fundraiserId, User user) {
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResourceNotFoundException("Fundraiser not found: " + fundraiserId));
        if (!fundraiser.getSchoolClass().getTreasurer().getId().equals(user.getId()) && !user.isAdmin()) {
            throw new ForbiddenOperationException("Only the class treasurer or admin can manage this fundraiser");
        }
        return fundraiser;
    }

    private void validatePositiveAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
    }

    private void assertUserAccount(Account account) {
        if (account.getUser() == null) {
            throw new IllegalArgumentException("Account is not a personal user account");
        }
    }

    private void assertAccountOwner(Account account, User user) {
        if (!account.getUser().getId().equals(user.getId())) {
            throw new ForbiddenOperationException("You can only operate on your own account");
        }
    }

    private void debit(Account account, BigDecimal amount) {
        if (account.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException("Insufficient funds on account " + account.getId());
        }
        account.setBalance(account.getBalance().subtract(amount));
    }

    private void credit(Account account, BigDecimal amount) {
        account.setBalance(account.getBalance().add(amount));
    }
}
