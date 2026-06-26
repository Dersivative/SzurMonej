package org.game.szurmonej.service;

import org.game.szurmonej.dto.ChildFundraisersView;
import org.game.szurmonej.dto.FundraiserApplicationResponse;
import org.game.szurmonej.dto.FundraiserCreateRequest;
import org.game.szurmonej.dto.FundraiserResponse;
import org.game.szurmonej.dto.TransferToFundraiserRequest;
import org.game.szurmonej.dto.UpdateDetailsRequest;
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
import java.util.Comparator;
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
    private final FundraiserApplicationRepository fundraiserApplicationRepository;
    private final ClassMembershipRepository classMembershipRepository;

    public FundraiserService(FundraiserRepository fundraiserRepository, SchoolClassRepository schoolClassRepository, ChildRepository childRepository, FundraiserParticipantRepository participantRepository, ContributionRepository contributionRepository, AccountHistoryEntryRepository historyRepository, CurrentUserService currentUserService, AccountService accountService, RefundRepository refundRepository, RefundRequestRepository refundRequestRepository, FundraiserApplicationRepository fundraiserApplicationRepository, ClassMembershipRepository classMembershipRepository) {
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
        this.fundraiserApplicationRepository = fundraiserApplicationRepository;
        this.classMembershipRepository = classMembershipRepository;
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
        fundraiser.setEndsBy(request.getEndsBy());

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

        participatingChildren.forEach(child -> {
            FundraiserParticipant participant = new FundraiserParticipant();
            participant.setFundraiser(fundraiser);
            participant.setChild(child);
            participant.setAddedAt(LocalDate.now());
            participant.setStatus(EnrollmentStatus.APPROVED); // Set initial status
            fundraiser.getParticipants().add(participant);
        });

        Fundraiser savedFundraiser = fundraiserRepository.save(fundraiser);

        return FundraiserResponse.from(
                savedFundraiser,
                savedFundraiser.getParticipants(),
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
        List<FundraiserParticipant> participants = participantRepository.findByFundraiser_IdAndRemovedAtIsNull(fundraiserId);
        List<Refund> refunds = refundRepository.findByAccountHistoryEntry_Account_Fundraiser_Id(fundraiserId);
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
                fundraiserRepository.save(fundraiser);
            }
            return;
        }

        participant.setStatus(EnrollmentStatus.REMOVAL_PENDING);
        participantRepository.save(participant);

        List<Refund> existingRefunds = refundRepository.findByAccountHistoryEntry_Account_Fundraiser_Id(fundraiserId);

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

        if (netPaymentsByPayer.isEmpty()) {
            participant.setRemovedAt(LocalDate.now());
            participant.setStatus(EnrollmentStatus.REMOVED);
            participantRepository.save(participant);
            if (fundraiser.getFundraiserType() == FundraiserType.PER_CHILD_GOAL) {
                fundraiser.setGoalAmount(fundraiser.getGoalAmount().subtract(fundraiser.getPerChildAmount()));
                fundraiserRepository.save(fundraiser);
            }
            return;
        }

        for (Map.Entry<User, BigDecimal> entry : netPaymentsByPayer.entrySet()) {
            User payer = entry.getKey();
            BigDecimal amountToRefund = entry.getValue();

            RefundRequest refundRequest = new RefundRequest();
            refundRequest.setParticipant(participant);
            refundRequest.setRequester(payer); // The requester is the one who paid
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

        boolean isTreasurer = schoolClass.getTreasurer().getId().equals(currentUser.getId());
        boolean isParentInClass = classMembershipRepository.existsBySchoolClassIdAndChild_Parents_Id(classId, currentUser.getId());

        if (!isTreasurer && !currentUser.isAdmin() && !isParentInClass) {
            throw new ForbiddenOperationException("Nie masz uprawnień do przeglądania zbiórek tej klasy.");
        }

        return fundraiserRepository.findBySchoolClass_Id(classId).stream()
                .map(fundraiser -> {
                    List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiser.getId());
                    List<AccountHistoryEntry> historyEntries = historyRepository.findByAccount_Fundraiser_Id(fundraiser.getId());
                    List<FundraiserParticipant> participants = participantRepository.findByFundraiser_IdAndRemovedAtIsNull(fundraiser.getId());
                    List<Refund> refunds = refundRepository.findByAccountHistoryEntry_Account_Fundraiser_Id(fundraiser.getId());
                    return FundraiserResponse.from(fundraiser, participants, contributions, historyEntries, refunds);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FundraiserResponse getFundraiserDetails(Long fundraiserId) {
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zbiórki."));

        List<FundraiserParticipant> participants = participantRepository.findByFundraiser_IdAndRemovedAtIsNull(fundraiserId);

        boolean isParent = participants.stream()
                .anyMatch(p -> isParentOfChild(currentUser, p.getChild()));
        boolean isTreasurer = fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId());

        if (!isTreasurer && !isParent && !currentUser.isAdmin()) {
            throw new ForbiddenOperationException("Nie masz uprawnień do przeglądania tej zbiórki.");
        }
        
        List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiserId);
        List<AccountHistoryEntry> historyEntries = historyRepository.findByAccount_Fundraiser_Id(fundraiserId);
        List<Refund> refunds = refundRepository.findByAccountHistoryEntry_Account_Fundraiser_Id(fundraiserId);

        return FundraiserResponse.from(fundraiser, participants, contributions, historyEntries, refunds);
    }

    @Transactional
    public FundraiserResponse updateGoal(Long fundraiserId, BigDecimal newAmount) {
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zbiórki."));

        if (!fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Tylko skarbnik może zaktualizować kwotę docelową.");
        }

        if (fundraiser.getStatus() != FundraiserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Można aktualizować tylko aktywne zbiórki.");
        }

        if (newAmount == null || newAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nowa kwota nie może być ujemna.");
        }

        BigDecimal oldGoalAmount = fundraiser.getGoalAmount();
        BigDecimal newGoalAmount;

        if (fundraiser.getFundraiserType() == FundraiserType.PER_CHILD_GOAL) {
            fundraiser.setPerChildAmount(newAmount);
            long numberOfParticipants = participantRepository.countByFundraiser_IdAndRemovedAtIsNull(fundraiserId);
            newGoalAmount = newAmount.multiply(new BigDecimal(numberOfParticipants));
        } else {
            newGoalAmount = newAmount;
        }

        fundraiser.setGoalAmount(newGoalAmount);
        Fundraiser updatedFundraiser = fundraiserRepository.save(fundraiser);

        if (newGoalAmount.compareTo(oldGoalAmount) < 0) {
            refundOverpayments(updatedFundraiser);
        }

        List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiserId);
        List<AccountHistoryEntry> historyEntries = historyRepository.findByAccount_Fundraiser_Id(fundraiserId);
        List<FundraiserParticipant> participants = participantRepository.findByFundraiser_IdAndRemovedAtIsNull(fundraiserId);
        List<Refund> refunds = refundRepository.findByAccountHistoryEntry_Account_Fundraiser_Id(fundraiserId);
        return FundraiserResponse.from(updatedFundraiser, participants, contributions, historyEntries, refunds);
    }

    @Transactional
    public FundraiserResponse updateDetails(Long fundraiserId, UpdateDetailsRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zbiórki."));

        if (!fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Tylko skarbnik może zaktualizować szczegóły.");
        }

        if (fundraiser.getStatus() != FundraiserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Można aktualizować tylko aktywne zbiórki.");
        }

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            fundraiser.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            fundraiser.setDescription(request.getDescription());
        }

        Fundraiser updatedFundraiser = fundraiserRepository.save(fundraiser);

        List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiserId);
        List<AccountHistoryEntry> historyEntries = historyRepository.findByAccount_Fundraiser_Id(fundraiserId);
        List<FundraiserParticipant> participants = participantRepository.findByFundraiser_IdAndRemovedAtIsNull(fundraiserId);
        List<Refund> refunds = refundRepository.findByAccountHistoryEntry_Account_Fundraiser_Id(fundraiserId);
        return FundraiserResponse.from(updatedFundraiser, participants, contributions, historyEntries, refunds);
    }

    @Transactional(readOnly = true)
    public ChildFundraisersView getFundraisersForChild(Long childId) {
        User currentUser = currentUserService.getCurrentUser();
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono dziecka."));

        if (child.getParents().stream().noneMatch(parent -> parent.getId().equals(currentUser.getId()))) {
            throw new ForbiddenOperationException("Nie masz uprawnień do tego dziecka.");
        }

        List<FundraiserResponse> activeFundraisers = fundraiserRepository.findActiveFundraisersByChildId(childId).stream()
            .map(fundraiser -> {
                List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiser.getId());
                List<AccountHistoryEntry> historyEntries = historyRepository.findByAccount_Fundraiser_Id(fundraiser.getId());
                List<Refund> refunds = refundRepository.findByAccountHistoryEntry_Account_Fundraiser_Id(fundraiser.getId());

                BigDecimal totalContributedByChild = contributions.stream()
                    .filter(c -> c.getParticipant().getChild().getId().equals(childId))
                    .map(Contribution::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                
                BigDecimal totalRefundedForChild = refunds.stream()
                    .filter(r -> r.getContribution() != null && r.getContribution().getParticipant().getChild().getId().equals(childId))
                    .map(Refund::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal netContributedByChild = totalContributedByChild.subtract(totalRefundedForChild);

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
                        BigDecimal perChildGoal;
                        if (fundraiser.getFundraiserType() == FundraiserType.PER_CHILD_GOAL) {
                            perChildGoal = fundraiser.getPerChildAmount();
                        } else {
                            BigDecimal baseCost = fundraiser.getGoalAmount().divide(new BigDecimal(numberOfParticipants), 2, RoundingMode.FLOOR);
                            BigDecimal remainder = fundraiser.getGoalAmount().subtract(baseCost.multiply(new BigDecimal(numberOfParticipants)));
                            perChildGoal = baseCost;
                            if (activeParticipants.get(0).getChild().getId().equals(childId)) {
                                 if (remainder.compareTo(BigDecimal.ZERO) > 0) {
                                     perChildGoal = perChildGoal.add(new BigDecimal("0.01"));
                                 }
                            }
                        }
                        suggestedAmount = perChildGoal.subtract(netContributedByChild);
                        if (suggestedAmount.compareTo(BigDecimal.ZERO) < 0) {
                            suggestedAmount = BigDecimal.ZERO;
                        }
                    }
                }

                List<FundraiserParticipant> participants = participantRepository.findByFundraiser_IdAndRemovedAtIsNull(fundraiser.getId());
                return FundraiserResponse.from(fundraiser, participants, suggestedAmount, contributions, historyEntries, refunds);
            }).collect(Collectors.toList());

        Long classId = child.getClassMemberships().stream()
                .filter(m -> m.getLeftAt() == null)
                .findFirst()
                .map(m -> m.getSchoolClass().getId())
                .orElse(null);

        List<FundraiserApplicationResponse> pendingApplications = new ArrayList<>();
        if (classId != null) {
            pendingApplications = fundraiserApplicationRepository.findBySchoolClass_IdAndStatus(classId, EnrollmentStatus.PENDING)
                    .stream()
                    .map(FundraiserApplicationResponse::from)
                    .collect(Collectors.toList());
        }

        return new ChildFundraisersView(activeFundraisers, pendingApplications);
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

        fundraiser.setStatus(FundraiserStatus.RECONCILING);
        fundraiserRepository.save(fundraiser);
        
        settleFundraiser(fundraiserId);
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
    public void finalizeFundraiser(Long fundraiserId) {
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zbiórki."));

        if (!fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Tylko skarbnik tej klasy może zakończyć zbiórkę.");
        }

        if (fundraiser.getStatus() != FundraiserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Można finalizować tylko aktywne zbiórki.");
        }

        fundraiser.setStatus(FundraiserStatus.RECONCILING);
        fundraiserRepository.save(fundraiser);

        settleFundraiser(fundraiserId);
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

        // Recalculate final credits from scratch
        recalculateFinalCredits(fundraiser);
        
        List<FundraiserParticipant> participants = participantRepository.findByFundraiser_IdAndRemovedAtIsNull(fundraiserId);
        boolean allDebtsPaid = participants.stream().allMatch(p -> p.getDebt() == null || p.getDebt().compareTo(BigDecimal.ZERO) == 0);

        if (!allDebtsPaid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nie wszyscy uczestnicy spłacili swoje długi.");
        }
        
        List<FundraiserParticipant> participantsWithCredit = participantRepository.findByFundraiser_IdAndRemovedAtIsNull(fundraiserId)
                .stream()
                .filter(p -> p.getCredit() != null && p.getCredit().compareTo(BigDecimal.ZERO) > 0)
                .collect(Collectors.toList());

        for (FundraiserParticipant participant : participantsWithCredit) {
            BigDecimal amountToRefund = participant.getCredit();
            if (amountToRefund.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            distributeRefundToPayers(participant, amountToRefund);
            participant.setCredit(BigDecimal.ZERO);
        }

        fundraiser.setStatus(FundraiserStatus.FINISHED);
        fundraiser.setFinishedAt(LocalDate.now());
        fundraiserRepository.save(fundraiser);
    }

    private void recalculateFinalCredits(Fundraiser fundraiser) {
        List<AccountHistoryEntry> historyEntries = historyRepository.findByAccount_Fundraiser_Id(fundraiser.getId());
        BigDecimal totalWithdrawals = historyEntries.stream()
                .filter(entry -> "WITHDRAWAL_TREASURER".equals(entry.getType()))
                .map(AccountHistoryEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .negate();
        
        BigDecimal totalDeposits = historyEntries.stream()
                .filter(entry -> "DEPOSIT_TREASURER".equals(entry.getType()))
                .map(AccountHistoryEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSpent = totalWithdrawals.subtract(totalDeposits);

        List<FundraiserParticipant> participants = participantRepository.findByFundraiser_IdAndRemovedAtIsNull(fundraiser.getId());
        participants.sort(Comparator.comparing(FundraiserParticipant::getId));
        
        int numParticipants = participants.size();
        if (numParticipants == 0) return;
        
        BigDecimal baseCost = totalSpent.divide(new BigDecimal(numParticipants), 2, RoundingMode.FLOOR);
        BigDecimal remainder = totalSpent.subtract(baseCost.multiply(new BigDecimal(numParticipants)));

        List<Contribution> allContributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiser.getId());
        List<Refund> allRefunds = refundRepository.findByAccountHistoryEntry_Account_Fundraiser_Id(fundraiser.getId());

        for (int i = 0; i < numParticipants; i++) {
            FundraiserParticipant participant = participants.get(i);
            participant.setCredit(BigDecimal.ZERO);
            participant.setDebt(BigDecimal.ZERO);

            BigDecimal actualCostPerParticipant = baseCost;
            if (i < remainder.multiply(new BigDecimal("100")).intValue()) {
                actualCostPerParticipant = actualCostPerParticipant.add(new BigDecimal("0.01"));
            }

            BigDecimal netContributed = allContributions.stream()
                    .filter(c -> c.getParticipant().getId().equals(participant.getId()))
                    .map(Contribution::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            BigDecimal totalRefunded = allRefunds.stream()
                    .filter(r -> r.getContribution().getParticipant().getId().equals(participant.getId()))
                    .map(Refund::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            netContributed = netContributed.subtract(totalRefunded);

            BigDecimal difference = netContributed.subtract(actualCostPerParticipant);

            if (difference.compareTo(BigDecimal.ZERO) > 0) {
                participant.setCredit(difference);
            } else if (difference.compareTo(BigDecimal.ZERO) < 0) {
                participant.setDebt(difference.abs());
            }
        }
    }

    private void distributeRefundToPayers(FundraiserParticipant participant, BigDecimal amountToRefund) {
        List<Contribution> pContributions = contributionRepository.findByParticipant_Id(participant.getId());
        List<Refund> pRefunds = refundRepository.findByAccountHistoryEntry_Account_Fundraiser_Id(participant.getFundraiser().getId())
                .stream()
                .filter(r -> r.getContribution() != null && r.getContribution().getParticipant().getId().equals(participant.getId()))
                .collect(Collectors.toList());

        Map<User, BigDecimal> netContributions = new HashMap<>();
        BigDecimal totalNetContributions = BigDecimal.ZERO;

        Map<User, List<Contribution>> contributionsByPayer = pContributions.stream()
                .collect(Collectors.groupingBy(Contribution::getPayer));

        for (Map.Entry<User, List<Contribution>> entry : contributionsByPayer.entrySet()) {
            User payer = entry.getKey();
            BigDecimal grossPaid = entry.getValue().stream().map(Contribution::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalRefundedToPayer = pRefunds.stream()
                    .filter(r -> r.getContribution() != null && r.getContribution().getPayer().getId().equals(payer.getId()))
                    .map(Refund::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal netPaid = grossPaid.subtract(totalRefundedToPayer);
            if (netPaid.compareTo(BigDecimal.ZERO) > 0) {
                netContributions.put(payer, netPaid);
                totalNetContributions = totalNetContributions.add(netPaid);
            }
        }

        BigDecimal refundedInThisStep = BigDecimal.ZERO;
        List<User> payers = new ArrayList<>(netContributions.keySet());
        payers.sort(Comparator.comparing(User::getId)); // Sort for deterministic behavior

        for (int i = 0; i < payers.size(); i++) {
            User payer = payers.get(i);
            BigDecimal netPaidByPayer = netContributions.get(payer);
            BigDecimal refundForPayer;

            if (totalNetContributions.compareTo(BigDecimal.ZERO) == 0) continue;

            if (i == payers.size() - 1) {
                refundForPayer = amountToRefund.subtract(refundedInThisStep);
            } else {
                BigDecimal proportion = netPaidByPayer.divide(totalNetContributions, 10, RoundingMode.HALF_UP);
                refundForPayer = amountToRefund.multiply(proportion).setScale(2, RoundingMode.HALF_UP);
            }

            if (refundForPayer.compareTo(BigDecimal.ZERO) > 0) {
                String refundNote = String.format("Zwrot nadpłaty przy rozliczeniu dla %s za dziecko: %s %s",
                        payer.getFullName(), participant.getChild().getName(), participant.getChild().getSurname());
                accountService.refundFromFundraiser(participant.getFundraiser().getId(), participant.getId(), payer.getId(), refundForPayer, refundNote);
                refundedInThisStep = refundedInThisStep.add(refundForPayer);
            }
        }
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
        participants.sort(Comparator.comparing(FundraiserParticipant::getId));

        int numParticipants = participants.size();
        
        List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiser.getId());
        List<Refund> existingRefunds = refundRepository.findByAccountHistoryEntry_Account_Fundraiser_Id(fundraiser.getId());

        Map<Long, List<Contribution>> contributionsByParticipant = contributions.stream()
                .collect(Collectors.groupingBy(c -> c.getParticipant().getId()));
        Map<Long, List<Refund>> refundsByContributionId = existingRefunds.stream()
                .filter(r -> r.getContribution() != null)
                .collect(Collectors.groupingBy(r -> r.getContribution().getId()));

        List<PendingRefund> pendingRefunds = new ArrayList<>();

        for (int i = 0; i < numParticipants; i++) {
            FundraiserParticipant participant = participants.get(i);
            participant.setCredit(BigDecimal.ZERO); // Clear previous credit

            BigDecimal actualCostPerParticipant;
            if (fundraiser.getFundraiserType() == FundraiserType.PER_CHILD_GOAL) {
                actualCostPerParticipant = fundraiser.getPerChildAmount();
            } else {
                BigDecimal totalGoal = fundraiser.getGoalAmount();
                BigDecimal baseCost = totalGoal.divide(new BigDecimal(numParticipants), 2, RoundingMode.FLOOR);
                BigDecimal remainder = totalGoal.subtract(baseCost.multiply(new BigDecimal(numParticipants)));
                actualCostPerParticipant = baseCost;
                if (i < remainder.multiply(new BigDecimal("100")).intValue()) {
                    actualCostPerParticipant = actualCostPerParticipant.add(new BigDecimal("0.01"));
                }
            }

            List<Contribution> participantContributions = contributionsByParticipant.getOrDefault(participant.getId(), Collections.emptyList());

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

            BigDecimal overpaymentForChild = totalNetContributedForChild.subtract(actualCostPerParticipant);

            if (overpaymentForChild.compareTo(BigDecimal.ZERO) > 0) {
                if (totalNetContributedForChild.compareTo(BigDecimal.ZERO) > 0) {
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
        }

        BigDecimal totalOwed = pendingRefunds.stream()
                .map(PendingRefund::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal availableBalance = accountService.getBalance(fundraiser.getAccount());

        if (totalOwed.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        BigDecimal actualTotalToRefund = availableBalance.min(totalOwed);

        Map<FundraiserParticipant, BigDecimal> refundedByParticipant = new HashMap<>();

        if (actualTotalToRefund.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal totalRefundedAcc = BigDecimal.ZERO;
            for (int i = 0; i < pendingRefunds.size(); i++) {
                PendingRefund pending = pendingRefunds.get(i);
                BigDecimal refundAmount;

                if (i == pendingRefunds.size() - 1) {
                    refundAmount = actualTotalToRefund.subtract(totalRefundedAcc);
                } else {
                    BigDecimal proportion = pending.amount().divide(totalOwed, 10, RoundingMode.HALF_UP);
                    refundAmount = actualTotalToRefund.multiply(proportion).setScale(2, RoundingMode.HALF_UP);
                }

                if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
                    String refundNote = String.format("Automatyczny zwrot z powodu zmniejszenia celu dla: %s za: %s %s",
                            pending.payer().getFullName(), pending.participant().getChild().getName(), pending.participant().getChild().getSurname());
                    accountService.refundFromFundraiser(fundraiser.getId(), pending.participant().getId(), pending.payer().getId(), refundAmount, refundNote);
                    totalRefundedAcc = totalRefundedAcc.add(refundAmount);
                    refundedByParticipant.merge(pending.participant(), refundAmount, BigDecimal::add);
                }
            }
        }

        Map<FundraiserParticipant, BigDecimal> totalOverpaymentByParticipant = new HashMap<>();
        for (PendingRefund pr : pendingRefunds) {
            totalOverpaymentByParticipant.merge(pr.participant(), pr.amount(), BigDecimal::add);
        }

        for (Map.Entry<FundraiserParticipant, BigDecimal> entry : totalOverpaymentByParticipant.entrySet()) {
            FundraiserParticipant participant = entry.getKey();
            BigDecimal overpayment = entry.getValue();
            BigDecimal refunded = refundedByParticipant.getOrDefault(participant, BigDecimal.ZERO);
            BigDecimal remainingCredit = overpayment.subtract(refunded);

            if (remainingCredit.compareTo(BigDecimal.ZERO) > 0) {
                participant.setCredit(remainingCredit);
                participantRepository.save(participant);
            }
        }
    }
}