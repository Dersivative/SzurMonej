package org.game.szurmonej.service;

import org.game.szurmonej.dto.FundraiserCreateRequest;
import org.game.szurmonej.dto.FundraiserResponse;
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
import java.util.List;
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

    public FundraiserService(FundraiserRepository fundraiserRepository, SchoolClassRepository schoolClassRepository, ChildRepository childRepository, FundraiserParticipantRepository participantRepository, ContributionRepository contributionRepository, AccountHistoryEntryRepository historyRepository, CurrentUserService currentUserService) {
        this.fundraiserRepository = fundraiserRepository;
        this.schoolClassRepository = schoolClassRepository;
        this.childRepository = childRepository;
        this.participantRepository = participantRepository;
        this.contributionRepository = contributionRepository;
        this.historyRepository = historyRepository;
        this.currentUserService = currentUserService;
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

        return FundraiserResponse.from(savedFundraiser);
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

        if (!fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId()) && !currentUser.isAdmin()) {
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

        List<Fundraiser> fundraisers = fundraiserRepository.findBySchoolClass_Memberships_Child_Id(childId);

        return fundraisers.stream().map(fundraiser -> {
            long numberOfChildrenInClass = fundraiser.getSchoolClass().getMemberships().stream()
                    .filter(m -> m.getLeftAt() == null).count();

            BigDecimal suggestedAmount = BigDecimal.ZERO;
            if (numberOfChildrenInClass > 0) {
                suggestedAmount = fundraiser.getGoalAmount().divide(new BigDecimal(numberOfChildrenInClass), 2, RoundingMode.CEILING);
            }
            List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiser.getId());
            List<AccountHistoryEntry> historyEntries = historyRepository.findByAccount_Fundraiser_Id(fundraiser.getId());
            return FundraiserResponse.from(fundraiser, suggestedAmount, contributions, historyEntries);
        }).collect(Collectors.toList());
    }
}
