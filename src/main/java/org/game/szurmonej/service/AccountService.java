package org.game.szurmonej.service;

import org.game.szurmonej.dto.MoneyOperationResponse;
import org.game.szurmonej.dto.TransferToFundraiserRequest;
import org.game.szurmonej.entity.*;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.exception.InsufficientFundsException;
import org.game.szurmonej.exception.ResourceNotFoundException;
import org.game.szurmonej.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final ContributionRepository contributionRepository;
    private final FundraiserRepository fundraiserRepository;
    private final FundraiserParticipantRepository participantRepository;
    private final AccountHistoryEntryRepository historyRepository;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final RefundRepository refundRepository;

    public AccountService(
            AccountRepository accountRepository,
            ContributionRepository contributionRepository,
            FundraiserRepository fundraiserRepository,
            FundraiserParticipantRepository participantRepository,
            AccountHistoryEntryRepository historyRepository, 
            CurrentUserService currentUserService,
            UserRepository userRepository,
            RefundRepository refundRepository
    ) {
        this.accountRepository = accountRepository;
        this.contributionRepository = contributionRepository;
        this.fundraiserRepository = fundraiserRepository;
        this.participantRepository = participantRepository;
        this.historyRepository = historyRepository;
        this.currentUserService = currentUserService;
        this.userRepository = userRepository;
        this.refundRepository = refundRepository;
    }

    @Transactional(readOnly = true)
    public BigDecimal getBalance(Account account) {
        return account.getBalance();
    }

    @Transactional
    public MoneyOperationResponse depositToOwnAccount(BigDecimal amount) {
        validatePositiveAmount(amount);
        User currentUser = currentUserService.getCurrentUser();
        Account account = accountRepository.findByUser_Id(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User account not found"));
        assertUserAccount(account);

        account.setBalance(account.getBalance().add(amount));
        Account savedAccount = accountRepository.save(account);

        return MoneyOperationResponse.singleAccount(savedAccount.getId(), savedAccount.getBalance());
    }

    @Transactional
    public MoneyOperationResponse transferToFundraiser(TransferToFundraiserRequest request) {
        User currentUser = currentUserService.getCurrentUser();

        Account payerAccount = accountRepository.findByUser_Id(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User account not found"));
        assertUserAccount(payerAccount);

        Fundraiser fundraiser = fundraiserRepository.findById(request.getFundraiserId())
                .orElseThrow(() -> new ResourceNotFoundException("Fundraiser not found: " + request.getFundraiserId()));
        
        if (fundraiser.getStatus() != FundraiserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Można wpłacać tylko na aktywne zbiórki.");
        }
        
        Account fundraiserAccount = accountRepository.findByFundraiser_Id(fundraiser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Fundraiser account not found"));

        FundraiserParticipant participant = participantRepository
                .findByFundraiser_IdAndChild_Id(request.getFundraiserId(), request.getChildId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Child is not a participant of this fundraiser"));
        if (participant.getRemovedAt() != null) {
            throw new IllegalArgumentException("Child is no longer an active participant");
        }

        BigDecimal amountToPay = calculateAmountToPay(fundraiser, participant);
        validatePositiveAmount(amountToPay);

        debit(payerAccount, amountToPay);
        credit(fundraiserAccount, amountToPay);
        
        Account savedPayerAccount = accountRepository.save(payerAccount);
        Account savedFundraiserAccount = accountRepository.save(fundraiserAccount);

        Contribution contribution = new Contribution();
        contribution.setParticipant(participant);
        contribution.setPayer(currentUser);
        contribution.setAmount(amountToPay);
        contribution.setPaidAt(LocalDateTime.now());
        contribution.setNote(request.getNote());
        contribution = contributionRepository.save(contribution);

        return MoneyOperationResponse.transfer(
                savedPayerAccount.getId(),
                savedPayerAccount.getBalance(),
                savedFundraiserAccount.getId(),
                savedFundraiserAccount.getBalance(),
                contribution.getId()
        );
    }

    private BigDecimal calculateAmountToPay(Fundraiser fundraiser, FundraiserParticipant participant) {
        List<Contribution> contributions = contributionRepository.findByParticipant_Id(participant.getId());
        BigDecimal totalContributedByChild = contributions.stream()
                .map(Contribution::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (fundraiser.getFundraiserType() == FundraiserType.PER_CHILD_GOAL) {
            return fundraiser.getPerChildAmount().subtract(totalContributedByChild);
        } else { // TOTAL_GOAL
            long numberOfParticipants = participantRepository.countByFundraiser_IdAndRemovedAtIsNull(fundraiser.getId());
            if (numberOfParticipants > 0) {
                BigDecimal perChildGoal = fundraiser.getGoalAmount().divide(new BigDecimal(numberOfParticipants), 2, RoundingMode.CEILING);
                return perChildGoal.subtract(totalContributedByChild);
            }
            return BigDecimal.ZERO;
        }
    }

    @Transactional
    public MoneyOperationResponse depositToFundraiser(Long fundraiserId, BigDecimal amount, String note) {
        validatePositiveAmount(amount);
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = assertTreasurerAndGetFundraiser(fundraiserId, currentUser);
        Account fundraiserAccount = accountRepository.findByFundraiser_Id(fundraiser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Fundraiser account not found"));
        Account treasurerAccount = accountRepository.findByUser_Id(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Treasurer account not found"));

        debit(treasurerAccount, amount);
        credit(fundraiserAccount, amount);
        Account savedTreasurerAccount = accountRepository.save(treasurerAccount);
        Account savedFundraiserAccount = accountRepository.save(fundraiserAccount);
        
        AccountHistoryEntry historyEntry = new AccountHistoryEntry();
        historyEntry.setAccount(savedFundraiserAccount);
        historyEntry.setAmount(amount);
        historyEntry.setDate(LocalDateTime.now());
        historyEntry.setDescription("Wpłata skarbnika: " + note);
        historyEntry.setType("DEPOSIT_TREASURER");
        historyRepository.save(historyEntry);

        return MoneyOperationResponse.transfer(
                savedTreasurerAccount.getId(),
                savedTreasurerAccount.getBalance(),
                savedFundraiserAccount.getId(),
                savedFundraiserAccount.getBalance(),
                null
        );
    }

    @Transactional
    public MoneyOperationResponse withdrawFromFundraiser(Long fundraiserId, BigDecimal amount, String note) {
        validatePositiveAmount(amount);
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = assertTreasurerAndGetFundraiser(fundraiserId, currentUser);
        Account fundraiserAccount = accountRepository.findByFundraiser_Id(fundraiser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Fundraiser account not found"));
        Account treasurerAccount = accountRepository.findByUser_Id(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Treasurer account not found"));

        debit(fundraiserAccount, amount);
        credit(treasurerAccount, amount);
        Account savedFundraiserAccount = accountRepository.save(fundraiserAccount);
        Account savedTreasurerAccount = accountRepository.save(treasurerAccount);

        AccountHistoryEntry historyEntry = new AccountHistoryEntry();
        historyEntry.setAccount(savedFundraiserAccount);
        historyEntry.setAmount(amount.negate());
        historyEntry.setDate(LocalDateTime.now());
        historyEntry.setDescription("Wypłata skarbnika: " + note);
        historyEntry.setType("WITHDRAWAL_TREASURER");
        historyRepository.save(historyEntry);

        return MoneyOperationResponse.transfer(
                savedTreasurerAccount.getId(),
                savedTreasurerAccount.getBalance(),
                savedFundraiserAccount.getId(),
                savedFundraiserAccount.getBalance(),
                null
        );
    }

    @Transactional
    public MoneyOperationResponse refundFromFundraiser(Long fundraiserId, Long targetUserId, BigDecimal amount, String note) {
        validatePositiveAmount(amount);
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = assertTreasurerAndGetFundraiser(fundraiserId, currentUser);
        Account fundraiserAccount = fundraiser.getAccount();

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Target user not found"));
        Account targetAccount = accountRepository.findByUser_Id(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Target user account not found"));
        assertUserAccount(targetAccount);

        debit(fundraiserAccount, amount);
        credit(targetAccount, amount);
        
        accountRepository.save(fundraiserAccount);
        accountRepository.save(targetAccount);

        String finalNote = String.format("%s - Uznanie: %s", note, targetUser.getFullName());

        AccountHistoryEntry historyEntry = new AccountHistoryEntry();
        historyEntry.setAccount(fundraiserAccount);
        historyEntry.setAmount(amount.negate());
        historyEntry.setDate(LocalDateTime.now());
        historyEntry.setDescription(finalNote);
        historyEntry.setType("REFUND");
        historyRepository.save(historyEntry);

        // Find a contribution to link the refund to
        List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_IdAndPayer_Id(fundraiserId, targetUserId);
        if (!contributions.isEmpty()) {
            Refund refund = new Refund();
            refund.setContribution(contributions.get(0)); // Link to the first contribution
            refund.setAmount(amount);
            refund.setRefundedAt(LocalDateTime.now());
            refund.setNote(finalNote);
            refundRepository.save(refund);
        }

        return MoneyOperationResponse.transfer(
                fundraiserAccount.getId(),
                fundraiserAccount.getBalance(),
                targetAccount.getId(),
                targetAccount.getBalance(),
                null
        );
    }

    @Transactional
    public void depositToUser(Long userId, BigDecimal amount, String note) {
        validatePositiveAmount(amount);
        Account userAccount = accountRepository.findByUser_Id(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User account not found for user: " + userId));
        credit(userAccount, amount);
        accountRepository.save(userAccount);
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
