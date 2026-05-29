package org.game.szurmonej.service;

import org.game.szurmonej.dto.MoneyOperationResponse;
import org.game.szurmonej.entity.Account;
import org.game.szurmonej.entity.Contribution;
import org.game.szurmonej.entity.Fundraiser;
import org.game.szurmonej.entity.FundraiserParticipant;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.exception.InsufficientFundsException;
import org.game.szurmonej.exception.ResourceNotFoundException;
import org.game.szurmonej.repository.AccountRepository;
import org.game.szurmonej.repository.ContributionRepository;
import org.game.szurmonej.repository.FundraiserParticipantRepository;
import org.game.szurmonej.repository.FundraiserRepository;
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
    private final CurrentUserService currentUserService;

    public AccountService(
            AccountRepository accountRepository,
            ContributionRepository contributionRepository,
            FundraiserRepository fundraiserRepository,
            FundraiserParticipantRepository participantRepository,
            CurrentUserService currentUserService
    ) {
        this.accountRepository = accountRepository;
        this.contributionRepository = contributionRepository;
        this.fundraiserRepository = fundraiserRepository;
        this.participantRepository = participantRepository;
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
    public MoneyOperationResponse transferToFundraiser(
            Long fundraiserId,
            Long childId,
            BigDecimal amount,
            String note
    ) {
        validatePositiveAmount(amount);
        User currentUser = currentUserService.getCurrentUser();

        Account payerAccount = accountRepository.findByUser_Id(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User account not found"));
        assertUserAccount(payerAccount);
        assertAccountOwner(payerAccount, currentUser);

        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResourceNotFoundException("Fundraiser not found: " + fundraiserId));
        Account fundraiserAccount = fundraiser.getAccount();
        if (fundraiserAccount == null) {
            throw new ResourceNotFoundException("Fundraiser account not found");
        }

        FundraiserParticipant participant = participantRepository
                .findByFundraiser_IdAndChild_Id(fundraiserId, childId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Child is not a participant of this fundraiser"));
        if (participant.getRemovedAt() != null) {
            throw new IllegalArgumentException("Child is no longer an active participant");
        }

        debit(payerAccount, amount);
        credit(fundraiserAccount, amount);
        accountRepository.save(payerAccount);
        accountRepository.save(fundraiserAccount);

        Contribution contribution = new Contribution();
        contribution.setParticipant(participant);
        contribution.setAmount(amount);
        contribution.setPaidAt(LocalDateTime.now());
        contribution.setPayerAccount(payerAccount);
        contribution.setNote(note);
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
    public MoneyOperationResponse refundFromFundraiser(Long fundraiserId, Long targetUserId, BigDecimal amount) {
        validatePositiveAmount(amount);
        User currentUser = currentUserService.getCurrentUser();

        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResourceNotFoundException("Fundraiser not found: " + fundraiserId));

        if (!fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Only the class treasurer can refund from this fundraiser");
        }

        Account fundraiserAccount = fundraiser.getAccount();
        if (fundraiserAccount == null) {
            throw new ResourceNotFoundException("Fundraiser account not found");
        }

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
