package org.game.szurmonej.service;

import org.game.szurmonej.dto.FundraiserCreateRequest;
import org.game.szurmonej.dto.FundraiserResponse;
import org.game.szurmonej.dto.TransferToFundraiserRequest;
import org.game.szurmonej.entity.*;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class FundraiserService {

    private final FundraiserRepository fundraiserRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final ChildRepository childRepository;
    private final FundraiserParticipantRepository participantRepository;
    private final ContributionRepository contributionRepository;
    private final AccountHistoryEntryRepository historyRepository;
    private final CurrentUserService currentUserService;
    private final AccountService accountService;
    private final RefundRepository refundRepository;
    private final RefundRequestRepository refundRequestRepository;

    public FundraiserService(FundraiserRepository fundraiserRepository, SchoolClassRepository schoolClassRepository, ChildRepository childRepository, FundraiserParticipantRepository participantRepository, ContributionRepository contributionRepository, AccountHistoryEntryRepository historyRepository, CurrentUserService currentUserService, AccountService accountService, RefundRepository refundRepository, RefundRequestRepository refundRequestRepository) {
        this.fundraiserRepository = fundraiserRepository;
        this.schoolClassRepository = schoolClassRepository;
        this.childRepository = childRepository;
        this.participantRepository = participantRepository;
        this.contributionRepository = contributionRepository;
        this.historyRepository = historyRepository;
        this.currentUserService = currentUserService;
        this.accountService = accountService;
        this.refundRepository = refundRepository;
        this.refundRequestRepository = refundRequestRepository;
    }

    @Transactional
    public FundraiserResponse createFundraiser(FundraiserCreateRequest request, Long classId) {
        User currentUser = currentUserService.getCurrentUser();
        SchoolClass schoolClass = schoolClassRepository.findById(classId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono klasy."));

        if (!schoolClass.getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Tylko skarbnik tej klasy może tworzyć dla niej zbiórki.");
        }

        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tytuł zbiórki jest wymagany.");
        }

        Fundraiser fundraiser = new Fundraiser();
        fundraiser.setTitle(request.getTitle());
        fundraiser.setDescription(request.getDescription());
        fundraiser.setFundraiserType(request.getFundraiserType());
        fundraiser.setSchoolClass(schoolClass);
        fundraiser.setStartedAt(LocalDate.now());

        List<ClassMembership> activeMemberships = schoolClass.getMemberships().stream()
                .filter(m -> m.getLeftAt() == null)
                .collect(Collectors.toList());

        List<Child> participatingChildren;
        if (request.getParticipantIds() != null && !request.getParticipantIds().isEmpty()) {
            participatingChildren = activeMemberships.stream()
                    .map(ClassMembership::getChild)
                    .filter(c -> request.getParticipantIds().contains(c.getId()))
                    .collect(Collectors.toList());
        } else {
            participatingChildren = activeMemberships.stream()
                    .map(ClassMembership::getChild)
                    .collect(Collectors.toList());
        }

        long numberOfChildren = participatingChildren.size();

        if (request.getFundraiserType() == FundraiserType.TOTAL_GOAL) {
            if (request.getGoalAmount() == null || request.getGoalAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kwota docelowa musi być większa od zera.");
            }
            fundraiser.setGoalAmount(request.getGoalAmount());
        } else if (request.getFundraiserType() == FundraiserType.PER_CHILD_GOAL) {
            if (request.getPerChildAmount() == null || request.getPerChildAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kwota na dziecko musi być większa od zera.");
            }
            fundraiser.setPerChildAmount(request.getPerChildAmount());
            if (numberOfChildren > 0) {
                fundraiser.setGoalAmount(request.getPerChildAmount().multiply(new BigDecimal(numberOfChildren)));
            } else {
                fundraiser.setGoalAmount(BigDecimal.ZERO);
            }
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nieznany typ zbiórki.");
        }

        Account account = new Account();
        account.setAccountNumber(UUID.randomUUID().toString());
        account.setFundraiser(fundraiser);
        fundraiser.setAccount(account);

        Fundraiser savedFundraiser = fundraiserRepository.save(fundraiser);

        participatingChildren.forEach(child -> {
            FundraiserParticipant participant = new FundraiserParticipant();
            participant.setFundraiser(savedFundraiser);
            participant.setChild(child);
            participant.setAddedAt(LocalDate.now());
            participant.setStatus(EnrollmentStatus.APPROVED); // Set initial status
            participantRepository.save(participant);
        });

        return FundraiserResponse.from(
                savedFundraiser,
                participantRepository.findByFundraiser_Id(savedFundraiser.getId()),
                new ArrayList<>(),
                new ArrayList<>(),
                new ArrayList<>()
        );
    }

    @Transactional
    public FundraiserResponse addParticipant(Long fundraiserId, Long childId) {
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zbiórki."));

        if (!fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Tylko skarbnik może dodawać uczestników do zbiórki.");
        }

        if (fundraiser.getStatus() != FundraiserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Można dodawać uczestników tylko do aktywnych zbiórek.");
        }

        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono dziecka."));

        // Check if child is already an active participant
        boolean isActiveParticipant = participantRepository.findByFundraiser_IdAndChild_IdAndRemovedAtIsNull(fundraiserId, childId).isPresent();
        if (isActiveParticipant) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dziecko już jest aktywnym uczestnikiem tej zbiórki.");
        }

        final Fundraiser finalFundraiser = fundraiser;
        FundraiserParticipant participant = participantRepository.findByFundraiser_IdAndChild_Id(fundraiserId, childId)
                .map(p -> {
                    p.setRemovedAt(null);
                    p.setStatus(EnrollmentStatus.APPROVED);
                    return p;
                })
                .orElseGet(() -> {
                    FundraiserParticipant newParticipant = new FundraiserParticipant();
                    newParticipant.setFundraiser(finalFundraiser);
                    newParticipant.setChild(child);
                    newParticipant.setAddedAt(LocalDate.now());
                    newParticipant.setStatus(EnrollmentStatus.APPROVED);
                    return newParticipant;
                });
        
        participantRepository.save(participant);

        if (fundraiser.getFundraiserType() == FundraiserType.PER_CHILD_GOAL) {
            fundraiser.setGoalAmount(fundraiser.getGoalAmount().add(fundraiser.getPerChildAmount()));
        }

        fundraiser = fundraiserRepository.save(fundraiser);
        refundOverpayments(fundraiser);

        List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiserId);
        List<AccountHistoryEntry> historyEntries = historyRepository.findByAccount_Fundraiser_Id(fundraiserId);
        List<FundraiserParticipant> participants = participantRepository.findByFundraiser_Id(fundraiserId);
        List<Refund> refunds = refundRepository.findByContribution_Participant_Fundraiser_Id(fundraiserId);
        return FundraiserResponse.from(fundraiser, participants, contributions, historyEntries, refunds);
    }

    @Transactional
    public void removeParticipant(Long fundraiserId, Long childId) {
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zbiórki."));

        if (fundraiser.getStatus() != FundraiserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Można usuwać uczestników tylko z aktywnych zbiórek.");
        }

        FundraiserParticipant participant = participantRepository.findByFundraiser_IdAndChild_IdAndRemovedAtIsNull(fundraiserId, childId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Uczestnik nie został znaleziony lub już usunięty."));

        if (participant.getStatus() == EnrollmentStatus.REMOVAL_PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dla tego uczestnika istnieje już prośba o zwrot środków.");
        }

        boolean isTreasurer = fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId());
        boolean isParent = isParentOfChild(currentUser, participant.getChild());

        if (!isTreasurer && !isParent && !currentUser.isAdmin()) {
            throw new ForbiddenOperationException("Nie masz uprawnień do usunięcia tego dziecka ze zbiórki.");
        }

        List<Contribution> contributions = contributionRepository.findByParticipant_Id(participant.getId());
        if (contributions.isEmpty()) {
            participant.setRemovedAt(LocalDate.now());
            participantRepository.save(participant);
            if (fundraiser.getFundraiserType() == FundraiserType.PER_CHILD_GOAL) {
                fundraiser.setGoalAmount(fundraiser.getGoalAmount().subtract(fundraiser.getPerChildAmount()));
            }
            fundraiserRepository.save(fundraiser);
            return;
        }

        participant.setStatus(EnrollmentStatus.REMOVAL_PENDING);
        participantRepository.save(participant);

        List<Refund> existingRefunds = refundRepository.findByContribution_Participant_Fundraiser_Id(fundraiserId);

        Map<User, BigDecimal> netPaymentsByPayer = new HashMap<>();

        for (Contribution contribution : contributions) {
            BigDecimal grossAmount = contribution.getAmount();
            BigDecimal refundedAmount = existingRefunds.stream()
                    .filter(r -> r.getContribution() != null && r.getContribution().getId().equals(contribution.getId()))
                    .map(Refund::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal netAmount = grossAmount.subtract(refundedAmount);

            if (netAmount.compareTo(BigDecimal.ZERO) > 0) {
                netPaymentsByPayer.merge(contribution.getPayer(), netAmount, BigDecimal::add);
            }
        }

        for (Map.Entry<User, BigDecimal> entry : netPaymentsByPayer.entrySet()) {
            User payer = entry.getKey();
            BigDecimal amountToRefund = entry.getValue();

            RefundRequest refundRequest = new RefundRequest();
            refundRequest.setParticipant(participant);
            refundRequest.setRequester(currentUser);
            refundRequest.setAmount(amountToRefund);
            refundRequest.setRequestedAt(LocalDateTime.now());
            refundRequest.setStatus(EnrollmentStatus.PENDING);
            refundRequestRepository.save(refundRequest);
        }
    }

    @Transactional(readOnly = true)
    public List<FundraiserResponse> getFundraisersForClass(Long classId) {
        User currentUser = currentUserService.getCurrentUser();
        SchoolClass schoolClass = schoolClassRepository.findById(classId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono klasy."));

        if (!schoolClass.getTreasurer().getId().equals(currentUser.getId()) && !currentUser.isAdmin()) {
            throw new ForbiddenOperationException("Nie masz uprawnień do przeglądania zbiórek tej klasy.");
        }

        return fundraiserRepository.findBySchoolClass_Id(classId).stream()
                .map(fundraiser -> {
                    List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiser.getId());
                    List<AccountHistoryEntry> historyEntries = historyRepository.findByAccount_Fundraiser_Id(fundraiser.getId());
                    List<FundraiserParticipant> participants = participantRepository.findByFundraiser_Id(fundraiser.getId());
                    List<Refund> refunds = refundRepository.findByContribution_Participant_Fundraiser_Id(fundraiser.getId());
                    return FundraiserResponse.from(fundraiser, participants, contributions, historyEntries, refunds);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FundraiserResponse getFundraiserDetails(Long fundraiserId) {
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zbiórki."));

        List<FundraiserParticipant> participants = participantRepository.findByFundraiser_Id(fundraiserId);

        boolean isParent = participants.stream()
                .anyMatch(p -> isParentOfChild(currentUser, p.getChild()));
        boolean isTreasurer = fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId());

        if (!isTreasurer && !isParent && !currentUser.isAdmin()) {
            throw new ForbiddenOperationException("Nie masz uprawnień do przeglądania tej zbiórki.");
        }
        
        List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiserId);
        List<AccountHistoryEntry> historyEntries = historyRepository.findByAccount_Fundraiser_Id(fundraiserId);
        List<Refund> refunds = refundRepository.findByContribution_Participant_Fundraiser_Id(fundraiserId);

        return FundraiserResponse.from(fundraiser, participants, contributions, historyEntries, refunds);
    }

    @Transactional
    public FundraiserResponse updateGoal(Long fundraiserId, BigDecimal newGoalAmount) {
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zbiórki."));

        if (!fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Tylko skarbnik może zaktualizować kwotę docelową.");
        }

        if (fundraiser.getStatus() != FundraiserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Można aktualizować tylko aktywne zbiórki.");
        }

        if (newGoalAmount == null || newGoalAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nowa kwota docelowa nie może być ujemna.");
        }

        BigDecimal oldGoalAmount = fundraiser.getGoalAmount();
        fundraiser.setGoalAmount(newGoalAmount);
        Fundraiser updatedFundraiser = fundraiserRepository.save(fundraiser);

        if (newGoalAmount.compareTo(oldGoalAmount) < 0) {
            refundOverpayments(updatedFundraiser);
        }

        List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiserId);
        List<AccountHistoryEntry> historyEntries = historyRepository.findByAccount_Fundraiser_Id(fundraiserId);
        List<FundraiserParticipant> participants = participantRepository.findByFundraiser_Id(fundraiserId);
        List<Refund> refunds = refundRepository.findByContribution_Participant_Fundraiser_Id(fundraiserId);
        return FundraiserResponse.from(updatedFundraiser, participants, contributions, historyEntries, refunds);
    }

    @Transactional(readOnly = true)
    public List<FundraiserResponse> getFundraisersForChild(Long childId) {
        User currentUser = currentUserService.getCurrentUser();
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono dziecka."));

        if (child.getParents().stream().noneMatch(parent -> parent.getId().equals(currentUser.getId()))) {
            throw new ForbiddenOperationException("Nie masz uprawnień do tego dziecka.");
        }

        List<Fundraiser> fundraisers = fundraiserRepository.findByParticipants_Child_Id(childId);

        return fundraisers.stream().map(fundraiser -> {
            List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiser.getId());
            List<AccountHistoryEntry> historyEntries = historyRepository.findByAccount_Fundraiser_Id(fundraiser.getId());
            
            BigDecimal totalContributedByChild = contributions.stream()
                .filter(c -> c.getParticipant().getChild().getId().equals(childId))
                .map(Contribution::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal suggestedAmount = BigDecimal.ZERO;
            if (fundraiser.getStatus() == FundraiserStatus.RECONCILING) {
                FundraiserParticipant participant = participantRepository.findByFundraiser_IdAndChild_Id(fundraiser.getId(), childId).orElse(null);
                if (participant != null && participant.getDebt() != null) {
                    suggestedAmount = participant.getDebt();
                }
            } else if (fundraiser.getStatus() == FundraiserStatus.ACTIVE) {
                List<FundraiserParticipant> activeParticipants = participantRepository.findByFundraiser_IdAndRemovedAtIsNull(fundraiser.getId());
                long numberOfParticipants = activeParticipants.size();
                if (numberOfParticipants > 0) {
                    BigDecimal perChildGoal = fundraiser.getGoalAmount().divide(new BigDecimal(numberOfParticipants), 2, RoundingMode.CEILING);
                    suggestedAmount = perChildGoal.subtract(totalContributedByChild);
                    if (suggestedAmount.compareTo(BigDecimal.ZERO) < 0) {
                        suggestedAmount = BigDecimal.ZERO;
                    }
                }
            }

            List<FundraiserParticipant> participants = participantRepository.findByFundraiser_Id(fundraiser.getId());
            List<Refund> refunds = refundRepository.findByContribution_Participant_Fundraiser_Id(fundraiser.getId());
            return FundraiserResponse.from(fundraiser, participants, suggestedAmount, contributions, historyEntries, refunds);
        }).collect(Collectors.toList());
    }

    @Transactional
    public void withdrawAll(Long fundraiserId) {
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zbiórki."));

        if (!fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Tylko skarbnik tej klasy może zakończyć zbiórkę.");
        }

        if (fundraiser.getStatus() != FundraiserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Zbiórka nie jest aktywna.");
        }

        // First, refund any overpayments
        refundOverpayments(fundraiser);

        // Then, withdraw the remaining balance
        BigDecimal currentBalance = accountService.getBalance(fundraiser.getAccount());
        if (currentBalance.compareTo(BigDecimal.ZERO) > 0) {
            accountService.withdrawFromFundraiser(fundraiserId, currentBalance, "Zakończenie zbiórki - wypłata środków");
        }

        fundraiser.setStatus(FundraiserStatus.FINISHED);
        fundraiser.setFinishedAt(LocalDate.now());
        fundraiserRepository.save(fundraiser);
    }

    @Transactional
    public void reopenFundraiser(Long fundraiserId) {
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zbiórki."));

        if (!fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Tylko skarbnik może wznowić zbiórkę.");
        }

        if (fundraiser.getStatus() != FundraiserStatus.FINISHED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Można wznawiać tylko zakończone zbiórki.");
        }

        fundraiser.setStatus(FundraiserStatus.ACTIVE);
        fundraiser.setFinishedAt(null);
        fundraiserRepository.save(fundraiser);
    }

    @Transactional
    public void reconcileFundraiser(Long fundraiserId, String note) {
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zbiórki."));

        if (!fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Tylko skarbnik tej klasy może zakończyć zbiórkę.");
        }

        if (fundraiser.getStatus() != FundraiserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Zbiórka nie jest aktywna.");
        }

        List<FundraiserParticipant> participants = participantRepository.findByFundraiser_IdAndRemovedAtIsNull(fundraiserId);
        if (participants.isEmpty()) {
            withdrawAll(fundraiserId);
            return;
        }

        List<AccountHistoryEntry> historyEntries = historyRepository.findByAccount_Fundraiser_Id(fundraiserId);
        
        BigDecimal totalSpent = historyEntries.stream()
                .filter(entry -> "WITHDRAWAL_TREASURER".equals(entry.getType()) || "DEPOSIT_TREASURER".equals(entry.getType()))
                .map(AccountHistoryEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .negate();

        fundraiser.setGoalAmount(totalSpent);
        fundraiser.setStatus(FundraiserStatus.RECONCILING);

        int numParticipants = participants.size();
        BigDecimal baseCost = totalSpent.divide(new BigDecimal(numParticipants), 2, RoundingMode.FLOOR);
        BigDecimal remainder = totalSpent.subtract(baseCost.multiply(new BigDecimal(numParticipants)));

        List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiserId);
        Map<Long, List<Contribution>> contributionsByParticipant = contributions.stream()
                .collect(Collectors.groupingBy(c -> c.getParticipant().getId()));

        for (int i = 0; i < numParticipants; i++) {
            FundraiserParticipant participant = participants.get(i);
            BigDecimal actualCostPerParticipant = baseCost;
            if (i < remainder.multiply(new BigDecimal("100")).intValue()) {
                actualCostPerParticipant = actualCostPerParticipant.add(new BigDecimal("0.01"));
            }

            BigDecimal contributedAmount = contributionsByParticipant.getOrDefault(participant.getId(), Collections.emptyList()).stream()
                    .map(Contribution::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal difference = contributedAmount.subtract(actualCostPerParticipant);

            if (difference.compareTo(BigDecimal.ZERO) > 0) {
                participant.setCredit(difference);
            } else if (difference.compareTo(BigDecimal.ZERO) < 0) {
                participant.setDebt(difference.abs());
            }
            participantRepository.save(participant);
        }

        fundraiserRepository.save(fundraiser);
    }

    @Transactional
    public void payDebt(Long fundraiserId, Long childId) {
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zbiórki."));

        if (fundraiser.getStatus() != FundraiserStatus.RECONCILING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Zbiórka nie jest w trakcie rozliczania.");
        }

        FundraiserParticipant participant = participantRepository.findByFundraiser_IdAndChild_Id(fundraiserId, childId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Uczestnik nie został znaleziony."));
        
        if (participant.getChild().getParents().stream().noneMatch(parent -> parent.getId().equals(currentUser.getId()))) {
            throw new ForbiddenOperationException("Nie masz uprawnień do spłaty długu dla tego dziecka.");
        }

        if (participant.getDebt() == null || participant.getDebt().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uczestnik nie ma żadnego długu do spłacenia.");
        }

        TransferToFundraiserRequest request = new TransferToFundraiserRequest();
        request.setFundraiserId(fundraiserId);
        request.setChildId(childId);
        request.setNote("Spłata długu");
        accountService.transferToFundraiser(request);
        
        participant.setDebt(null);
        participantRepository.save(participant);
    }

    @Transactional
    public void settleFundraiser(Long fundraiserId) {
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zbiórki."));

        if (!fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Tylko skarbnik tej klasy może zakończyć zbiórkę.");
        }

        if (fundraiser.getStatus() != FundraiserStatus.RECONCILING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Zbiórka nie jest w trakcie rozliczania.");
        }

        List<FundraiserParticipant> participants = participantRepository.findByFundraiser_IdAndRemovedAtIsNull(fundraiserId);
        boolean allDebtsPaid = participants.stream().allMatch(p -> p.getDebt() == null || p.getDebt().compareTo(BigDecimal.ZERO) == 0);

        if (!allDebtsPaid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nie wszyscy uczestnicy spłacili swoje długi.");
        }

        List<FundraiserParticipant> participantsWithCredit = participants.stream()
                .filter(p -> p.getCredit() != null && p.getCredit().compareTo(BigDecimal.ZERO) > 0)
                .collect(Collectors.toList());

        for (FundraiserParticipant participant : participantsWithCredit) {
            // Find all contributions for this participant
            List<Contribution> contributions = contributionRepository.findByParticipant_Id(participant.getId());
            
            // Group contributions by payer
            Map<User, BigDecimal> paymentsByUser = contributions.stream()
                    .collect(Collectors.groupingBy(Contribution::getPayer,
                            Collectors.mapping(Contribution::getAmount, Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))));

            // Determine how much each payer overpaid
            BigDecimal totalContributed = paymentsByUser.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal perChildCost = totalContributed.subtract(participant.getCredit()); // Total contributed minus credit is the actual cost

            for (Map.Entry<User, BigDecimal> entry : paymentsByUser.entrySet()) {
                User payer = entry.getKey();
                BigDecimal amountPaidByPayer = entry.getValue();
                
                // Calculate payer's share of the overpayment
                BigDecimal payerOverpayment = amountPaidByPayer.subtract(perChildCost.multiply(amountPaidByPayer).divide(totalContributed, 2, RoundingMode.HALF_UP));

                if (payerOverpayment.compareTo(BigDecimal.ZERO) > 0) {
                    String refundNote = String.format("Zwrot nadpłaty dla %s za dziecko: %s %s",
                            payer.getFullName(), participant.getChild().getName(), participant.getChild().getSurname());
                    accountService.refundFromFundraiser(fundraiser.getId(), payer.getId(), payerOverpayment, refundNote);
                }
            }
            participant.setCredit(null);
            participantRepository.save(participant);
        }

        fundraiser.setStatus(FundraiserStatus.FINISHED);
        fundraiser.setFinishedAt(LocalDate.now());
        fundraiserRepository.save(fundraiser);
    }

    private boolean isParentOfChild(User user, Child child) {
        return child.getParents() != null
                && child.getParents().stream().anyMatch(parent -> parent.getId().equals(user.getId()));
    }

    private record PendingRefund(User payer, FundraiserParticipant participant, BigDecimal amount) {}

    private void refundOverpayments(Fundraiser fundraiser) {
        List<FundraiserParticipant> participants = participantRepository.findByFundraiser_IdAndRemovedAtIsNull(fundraiser.getId());
        if (participants.isEmpty()) {
            return;
        }

        BigDecimal newPerChildGoal = fundraiser.getGoalAmount().divide(new BigDecimal(participants.size()), 2, RoundingMode.CEILING);

        List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiser.getId());
        List<Refund> existingRefunds = refundRepository.findByContribution_Participant_Fundraiser_Id(fundraiser.getId());
        
        Map<Long, List<Contribution>> contributionsByParticipant = contributions.stream()
                .collect(Collectors.groupingBy(c -> c.getParticipant().getId()));
        Map<Long, List<Refund>> refundsByContributionId = existingRefunds.stream()
                .filter(r -> r.getContribution() != null)
                .collect(Collectors.groupingBy(r -> r.getContribution().getId()));

        List<PendingRefund> pendingRefunds = new ArrayList<>();

        for (FundraiserParticipant participant : participants) {
            List<Contribution> participantContributions = contributionsByParticipant.getOrDefault(participant.getId(), Collections.emptyList());
            
            // Calculate net contributions per payer for this participant
            Map<User, BigDecimal> netPaymentsByPayerForChild = new HashMap<>();
            BigDecimal totalNetContributedForChild = BigDecimal.ZERO;
            
            for (Contribution contribution : participantContributions) {
                BigDecimal grossAmount = contribution.getAmount();
                BigDecimal refundedAmount = refundsByContributionId.getOrDefault(contribution.getId(), Collections.emptyList())
                        .stream().map(Refund::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal netAmount = grossAmount.subtract(refundedAmount);
                if (netAmount.compareTo(BigDecimal.ZERO) > 0) {
                    netPaymentsByPayerForChild.merge(contribution.getPayer(), netAmount, BigDecimal::add);
                    totalNetContributedForChild = totalNetContributedForChild.add(netAmount);
                }
            }
            
            BigDecimal overpaymentForChild = totalNetContributedForChild.subtract(newPerChildGoal);

            if (overpaymentForChild.compareTo(BigDecimal.ZERO) > 0) {
                // Distribute this overpayment proportionally among payers based on net payments
                for (Map.Entry<User, BigDecimal> entry : netPaymentsByPayerForChild.entrySet()) {
                    User payer = entry.getKey();
                    BigDecimal netAmountPaidByPayer = entry.getValue();
                    BigDecimal payerShareOfOverpayment = overpaymentForChild.multiply(netAmountPaidByPayer).divide(totalNetContributedForChild, 2, RoundingMode.HALF_UP);
                    
                    if (payerShareOfOverpayment.compareTo(BigDecimal.ZERO) > 0) {
                        pendingRefunds.add(new PendingRefund(payer, participant, payerShareOfOverpayment));
                    }
                }
            }
        }

        BigDecimal availableBalance = accountService.getBalance(fundraiser.getAccount());
        
        for (PendingRefund pendingRefund : pendingRefunds) {
            BigDecimal refundAmount = pendingRefund.amount().min(availableBalance); // Refund up to available balance
            if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
                String refundNote = String.format("Automatyczny zwrot z powodu zmniejszenia celu dla: %s za: %s %s",
                        pendingRefund.payer().getFullName(), pendingRefund.participant().getChild().getName(), pendingRefund.participant().getChild().getSurname());
                accountService.refundFromFundraiser(fundraiser.getId(), pendingRefund.payer().getId(), refundAmount, refundNote);
                availableBalance = availableBalance.subtract(refundAmount);
            }
        }
    }
}