package org.game.szurmonej.report;

import org.game.szurmonej.entity.*;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.repository.*;
import org.game.szurmonej.service.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FinancialReportService {

    private final FundraiserRepository fundraiserRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final FundraiserParticipantRepository participantRepository;
    private final ContributionRepository contributionRepository;
    private final AccountHistoryEntryRepository historyRepository;
    private final RefundRepository refundRepository;
    private final ClassMembershipRepository classMembershipRepository;
    private final CurrentUserService currentUserService;
    private final FundraiserPdfGenerator fundraiserPdfGenerator;
    private final ClassReportPdfGenerator classReportPdfGenerator;

    public FinancialReportService(
            FundraiserRepository fundraiserRepository,
            SchoolClassRepository schoolClassRepository,
            FundraiserParticipantRepository participantRepository,
            ContributionRepository contributionRepository,
            AccountHistoryEntryRepository historyRepository,
            RefundRepository refundRepository,
            ClassMembershipRepository classMembershipRepository,
            CurrentUserService currentUserService,
            FundraiserPdfGenerator fundraiserPdfGenerator,
            ClassReportPdfGenerator classReportPdfGenerator
    ) {
        this.fundraiserRepository = fundraiserRepository;
        this.schoolClassRepository = schoolClassRepository;
        this.participantRepository = participantRepository;
        this.contributionRepository = contributionRepository;
        this.historyRepository = historyRepository;
        this.refundRepository = refundRepository;
        this.classMembershipRepository = classMembershipRepository;
        this.currentUserService = currentUserService;
        this.fundraiserPdfGenerator = fundraiserPdfGenerator;
        this.classReportPdfGenerator = classReportPdfGenerator;
    }

    @Transactional(readOnly = true)
    public byte[] generateFundraiserReport(Long fundraiserId) {
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zbiórki."));
        assertCanDownloadReport(fundraiser);
        FundraiserReportData data = loadFundraiserReportData(fundraiser);
        try {
            return fundraiserPdfGenerator.generate(data);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Nie udało się wygenerować raportu PDF.");
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateClassReport(Long classId) {
        SchoolClass schoolClass = schoolClassRepository.findById(classId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono klasy."));
        assertCanDownloadClassReport(schoolClass);

        ClassReportData classReportData = new ClassReportData();
        classReportData.setClassLabel(schoolClass.getLabel());
        classReportData.setTreasurerName(schoolClass.getTreasurer().getFullName());
        classReportData.setGeneratedAt(LocalDateTime.now());

        List<FundraiserReportData> fundraisers = fundraiserRepository.findBySchoolClass_Id(classId).stream()
                .sorted(Comparator.comparing(Fundraiser::getStartedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::loadFundraiserReportData)
                .toList();
        classReportData.setFundraisers(fundraisers);

        try {
            return classReportPdfGenerator.generate(classReportData);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Nie udało się wygenerować raportu PDF.");
        }
    }

    public String buildFundraiserReportFilename(Fundraiser fundraiser) {
        return "raport-zbiorki-" + fundraiser.getId() + ".pdf";
    }

    public String buildClassReportFilename(SchoolClass schoolClass) {
        String label = schoolClass.getLabel() != null ? schoolClass.getLabel() : "klasa";
        return "raport-klasy-" + label.replaceAll("[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ._-]", "_") + ".pdf";
    }

    private FundraiserReportData loadFundraiserReportData(Fundraiser fundraiser) {
        Long fundraiserId = fundraiser.getId();
        List<FundraiserParticipant> participants = participantRepository.findByFundraiser_IdAndRemovedAtIsNull(fundraiserId);
        List<Contribution> contributions = contributionRepository.findByParticipant_Fundraiser_Id(fundraiserId);
        List<AccountHistoryEntry> historyEntries = historyRepository.findByAccount_Fundraiser_Id(fundraiserId);
        List<Refund> refunds = refundRepository.findByAccountHistoryEntry_Account_Fundraiser_Id(fundraiserId);

        FundraiserReportData data = new FundraiserReportData();
        data.setId(fundraiser.getId());
        data.setTitle(fundraiser.getTitle());
        data.setDescription(fundraiser.getDescription());
        data.setStatus(fundraiser.getStatus());
        data.setFundraiserType(fundraiser.getFundraiserType());
        data.setGoalAmount(fundraiser.getGoalAmount());
        data.setPerChildAmount(fundraiser.getPerChildAmount());
        data.setStartedAt(fundraiser.getStartedAt());
        data.setFinishedAt(fundraiser.getFinishedAt());
        data.setEndsBy(fundraiser.getEndsBy());
        data.setGeneratedAt(LocalDateTime.now());

        if (fundraiser.getSchoolClass() != null) {
            data.setClassLabel(fundraiser.getSchoolClass().getLabel());
            if (fundraiser.getSchoolClass().getTreasurer() != null) {
                data.setTreasurerName(fundraiser.getSchoolClass().getTreasurer().getFullName());
            }
        }

        BigDecimal totalContributions = contributions.stream()
                .map(Contribution::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalRefunds = refunds.stream()
                .map(Refund::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        data.setCurrentAmount(totalContributions.subtract(totalRefunds));

        Map<Long, List<Contribution>> contributionsByParticipant = contributions.stream()
                .collect(Collectors.groupingBy(c -> c.getParticipant().getId()));
        Map<Long, List<Refund>> refundsByContributionId = refunds.stream()
                .filter(r -> r.getContribution() != null)
                .collect(Collectors.groupingBy(r -> r.getContribution().getId()));

        List<FundraiserReportData.ParticipantRow> participantRows = participants.stream()
                .map(participant -> {
                    List<Contribution> participantContributions = contributionsByParticipant
                            .getOrDefault(participant.getId(), Collections.emptyList());
                    BigDecimal totalParticipantContributions = participantContributions.stream()
                            .map(Contribution::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal totalParticipantRefunds = participantContributions.stream()
                            .flatMap(c -> refundsByContributionId.getOrDefault(c.getId(), Collections.emptyList()).stream())
                            .map(Refund::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    String name = participant.getChild().getName() + " " + participant.getChild().getSurname();
                    return new FundraiserReportData.ParticipantRow(
                            name,
                            totalParticipantContributions.subtract(totalParticipantRefunds),
                            participant.getDebt(),
                            participant.getCredit()
                    );
                })
                .toList();
        data.setParticipants(participantRows);

        List<AttachmentRef> attachments = new ArrayList<>();
        int attachmentCounter = 1;

        List<FundraiserReportData.HistoryRow> historyRows = new ArrayList<>();

        for (Contribution contribution : contributions) {
            historyRows.add(mapContribution(contribution));
        }

        List<AccountHistoryEntry> sortedHistoryEntries = historyEntries.stream()
                .sorted(Comparator.comparing(AccountHistoryEntry::getDate))
                .toList();

        for (AccountHistoryEntry historyEntry : sortedHistoryEntries) {
            Integer attachmentNumber = null;
            if ("WITHDRAWAL_TREASURER".equals(historyEntry.getType())) {
                byte[] attachmentBytes = historyEntry.getAttachment();
                if (attachmentBytes != null && attachmentBytes.length > 0) {
                    attachmentNumber = attachmentCounter;
                    attachments.add(new AttachmentRef(
                            attachmentCounter,
                            buildAttachmentDescription(historyEntry),
                            attachmentBytes,
                            historyEntry.getAttachmentContentType(),
                            historyEntry.getAttachmentFilename()
                    ));
                    attachmentCounter++;
                }
            }
            historyRows.add(mapHistoryEntry(historyEntry, attachmentNumber));
        }

        data.setHistory(historyRows);
        data.setAttachments(attachments);
        return data;
    }

    private FundraiserReportData.HistoryRow mapContribution(Contribution contribution) {
        String description = String.format("Wpłata za: %s %s",
                contribution.getParticipant().getChild().getName(),
                contribution.getParticipant().getChild().getSurname());
        if (contribution.getNote() != null && !contribution.getNote().isBlank()) {
            description += " - " + contribution.getNote();
        }
        return new FundraiserReportData.HistoryRow(
                contribution.getPaidAt(),
                "Wpłata rodzica",
                description,
                FundraiserPdfGenerator.displayAmount(contribution.getAmount()),
                null
        );
    }

    private FundraiserReportData.HistoryRow mapHistoryEntry(AccountHistoryEntry historyEntry, Integer attachmentNumber) {
        String type = "Inna operacja";
        String description = historyEntry.getDescription();
        BigDecimal amount = FundraiserPdfGenerator.displayAmount(historyEntry.getAmount());

        if ("DEPOSIT_TREASURER".equals(historyEntry.getType())) {
            type = "Wpłata skarbnika";
        } else if ("WITHDRAWAL_TREASURER".equals(historyEntry.getType())) {
            type = "Wypłata skarbnika";
        } else if ("REFUND".equals(historyEntry.getType())) {
            type = "Zwrot nadpłaty";
            if (description != null && description.contains(" - Uznanie: ")) {
                int index = description.indexOf(" - Uznanie: ");
                description = description.substring(0, index);
            }
        }

        return new FundraiserReportData.HistoryRow(
                historyEntry.getDate(),
                type,
                description,
                amount,
                attachmentNumber
        );
    }

    private String buildAttachmentDescription(AccountHistoryEntry historyEntry) {
        return "Wypłata skarbnika z dnia "
                + historyEntry.getDate().format(java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"))
                + ", kwota: "
                + FundraiserPdfGenerator.displayAmount(historyEntry.getAmount())
                + " zł"
                + (historyEntry.getDescription() != null ? ". " + historyEntry.getDescription() : "");
    }

    private void assertCanDownloadReport(Fundraiser fundraiser) {
        User user = currentUserService.getCurrentUser();
        boolean isTreasurer = fundraiser.getSchoolClass().getTreasurer().getId().equals(user.getId());
        if (isTreasurer || user.isAdmin()) {
            return;
        }

        List<FundraiserParticipant> participants = participantRepository
                .findByFundraiser_IdAndRemovedAtIsNull(fundraiser.getId());
        boolean isParent = participants.stream()
                .anyMatch(participant -> isParentOfChild(user, participant.getChild()));
        if (!isParent) {
            throw new ForbiddenOperationException("Nie masz uprawnień do pobrania raportu finansowego.");
        }
    }

    private void assertCanDownloadClassReport(SchoolClass schoolClass) {
        User user = currentUserService.getCurrentUser();
        boolean isTreasurer = schoolClass.getTreasurer().getId().equals(user.getId());
        if (isTreasurer || user.isAdmin()) {
            return;
        }

        boolean isParentInClass = classMembershipRepository
                .existsBySchoolClassIdAndChild_Parents_Id(schoolClass.getId(), user.getId());
        if (!isParentInClass) {
            throw new ForbiddenOperationException("Nie masz uprawnień do pobrania raportu finansowego klasy.");
        }
    }

    private boolean isParentOfChild(User user, Child child) {
        return child.getParents() != null
                && child.getParents().stream().anyMatch(parent -> parent.getId().equals(user.getId()));
    }
}
