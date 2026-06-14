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
import java.util.ArrayList;
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

    public FundraiserService(FundraiserRepository fundraiserRepository, SchoolClassRepository schoolClassRepository, ChildRepository childRepository, FundraiserParticipantRepository participantRepository, ContributionRepository contributionRepository, AccountHistoryEntryRepository historyRepository, CurrentUserService currentUserService, AccountService accountService) {
        this.fundraiserRepository = fundraiserRepository;
        this.schoolClassRepository = schoolClassRepository;
        this.childRepository = childRepository;
        this.participantRepository = participantRepository;
        this.contributionRepository = contributionRepository;
        this.historyRepository = historyRepository;
        this.currentUserService = currentUserService;
        this.accountService = accountService;
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
        if (request.getGoalAmount() == null || request.getGoalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kwota docelowa musi być większa od zera.");
        }

        Fundraiser fundraiser = new Fundraiser();
        fundraiser.setTitle(request.getTitle());
        fundraiser.setDescription(request.getDescription());
        fundraiser.setGoalAmount(request.getGoalAmount());
        fundraiser.setSchoolClass(schoolClass);
        fundraiser.setStartedAt(LocalDate.now());

        Account account = new Account();
        account.setAccountNumber(UUID.randomUUID().toString());
        account.setFundraiser(fundraiser);
        fundraiser.setAccount(account);

        Fundraiser savedFundraiser = fundraiserRepository.save(fundraiser);

        schoolClass.getMemberships().stream()
                .filter(m -> m.getLeftAt() == null)
                .forEach(membership -> {
                    FundraiserParticipant participant = new FundraiserParticipant();
                    participant.setFundraiser(savedFundraiser);
                    participant.setChild(membership.getChild());
                    participant.setAddedAt(LocalDate.now());
                    participantRepository.save(participant);
                });

        return FundraiserResponse.from(savedFundraiser, new ArrayList<>(), new ArrayList<>());
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
                    return FundraiserResponse.from(fundraiser, contributions, historyEntries);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FundraiserResponse getFundraiserDetails(Long fundraiserId) {
        User currentUser = currentUserService.getCurrentUser();
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zbiórki."));

        boolean isParent = fundraiser.getParticipants().stream()
                .anyMatch(p -> p.getChild().getParents().contains(currentUser));
        boolean isTreasurer = fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId());

        if (!isTreasurer && !isParent && !currentUser.isAdmin()) {
            throw new ForbiddenOperationException("Nie masz uprawnień do przeglądania tej zbiórki.");
        }
        
        List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiserId);
        List<AccountHistoryEntry> historyEntries = historyRepository.findByAccount_Fundraiser_Id(fundraiserId);
        return FundraiserResponse.from(fundraiser, contributions, historyEntries);
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
            BigDecimal suggestedAmount = BigDecimal.ZERO;
            if (fundraiser.getStatus() == FundraiserStatus.RECONCILING) {
                FundraiserParticipant participant = participantRepository.findByFundraiser_IdAndChild_Id(fundraiser.getId(), childId).orElse(null);
                if (participant != null && participant.getDebt() != null) {
                    suggestedAmount = participant.getDebt();
                }
            } else if (fundraiser.getStatus() == FundraiserStatus.ACTIVE) {
                long numberOfChildrenInClass = fundraiser.getSchoolClass().getMemberships().stream()
                        .filter(m -> m.getLeftAt() == null).count();
                if (numberOfChildrenInClass > 0) {
                    suggestedAmount = fundraiser.getGoalAmount().divide(new BigDecimal(numberOfChildrenInClass), 2, RoundingMode.CEILING);
                }
            }

            List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiser.getId());
            List<AccountHistoryEntry> historyEntries = historyRepository.findByAccount_Fundraiser_Id(fundraiser.getId());
            return FundraiserResponse.from(fundraiser, suggestedAmount, contributions, historyEntries);
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

        BigDecimal currentBalance = accountService.getBalance(fundraiser.getAccount());
        if (currentBalance.compareTo(BigDecimal.ZERO) > 0) {
            accountService.withdrawFromFundraiser(fundraiserId, currentBalance, "Zakończenie zbiórki - wypłata środków");
        }
        fundraiser.setStatus(FundraiserStatus.FINISHED);
        fundraiser.setFinishedAt(LocalDate.now());
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
                .filter(entry -> entry.getAmount().compareTo(BigDecimal.ZERO) < 0)
                .map(AccountHistoryEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .abs();

        fundraiser.setGoalAmount(totalSpent);
        fundraiser.setStatus(FundraiserStatus.RECONCILING);

        int numParticipants = participants.size();
        BigDecimal baseCost = totalSpent.divide(new BigDecimal(numParticipants), 2, RoundingMode.FLOOR);
        BigDecimal remainder = totalSpent.subtract(baseCost.multiply(new BigDecimal(numParticipants)));

        List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiserId);
        Map<Long, BigDecimal> participantContributions = contributions.stream()
                .collect(Collectors.groupingBy(c -> c.getParticipant().getId(),
                        Collectors.mapping(Contribution::getAmount, Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))));

        for (int i = 0; i < numParticipants; i++) {
            FundraiserParticipant participant = participants.get(i);
            BigDecimal actualCostPerParticipant = baseCost;
            if (i < remainder.multiply(new BigDecimal("100")).intValue()) {
                actualCostPerParticipant = actualCostPerParticipant.add(new BigDecimal("0.01"));
            }

            BigDecimal contributedAmount = participantContributions.getOrDefault(participant.getId(), BigDecimal.ZERO);
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
        request.setAmount(participant.getDebt());
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
            User parent = participant.getChild().getParents().stream().findFirst()
                    .orElseThrow(() -> new IllegalStateException("Dziecko nie ma przypisanego rodzica do zwrotu środków."));
            accountService.refundFromFundraiser(fundraiser.getId(), parent.getId(), participant.getCredit(), "Zwrot nadpłaty");
            participant.setCredit(null);
            participantRepository.save(participant);
        }

        fundraiser.setStatus(FundraiserStatus.FINISHED);
        fundraiser.setFinishedAt(LocalDate.now());
        fundraiserRepository.save(fundraiser);
    }
}
