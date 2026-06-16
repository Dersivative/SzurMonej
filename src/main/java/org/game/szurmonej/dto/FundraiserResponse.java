package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Getter
@Setter
@NoArgsConstructor
public class FundraiserResponse {

    private Long id;
    private String title;
    private String description;
    private BigDecimal goalAmount;
    private BigDecimal currentAmount;
    private BigDecimal suggestedContribution;
    private LocalDate startedAt;
    private LocalDate endedAt;
    private FundraiserStatus status;
    private FundraiserType fundraiserType;
    private BigDecimal perChildAmount;
    private TreasurerResponse treasurer;
    private Long classId; // Add classId
    private String classLabel;
    private List<ParticipantResponse> participants;
    private List<ChildResponse> nonParticipants;
    private List<FundraiserHistoryEntryResponse> history;

    public static FundraiserResponse from(Fundraiser fundraiser, BigDecimal suggestedContribution, List<Contribution> contributions, List<AccountHistoryEntry> historyEntries) {
        FundraiserResponse response = from(fundraiser, fundraiser.getParticipants(), contributions, historyEntries);
        response.setSuggestedContribution(suggestedContribution);
        return response;
    }

    public static FundraiserResponse from(
            Fundraiser fundraiser,
            List<FundraiserParticipant> participants,
            BigDecimal suggestedContribution,
            List<Contribution> contributions,
            List<AccountHistoryEntry> historyEntries
    ) {
        FundraiserResponse response = from(fundraiser, participants, contributions, historyEntries, false, null); // parentView and currentUser are now ignored
        response.setSuggestedContribution(suggestedContribution);
        return response;
    }

    public static FundraiserResponse from(Fundraiser fundraiser, List<Contribution> contributions, List<AccountHistoryEntry> historyEntries) {
        return from(fundraiser, fundraiser.getParticipants(), contributions, historyEntries, false, null); // parentView and currentUser are now ignored
    }

    public static FundraiserResponse from(
            Fundraiser fundraiser,
            List<FundraiserParticipant> participants,
            List<Contribution> contributions,
            List<AccountHistoryEntry> historyEntries
    ) {
        return from(fundraiser, participants, contributions, historyEntries, false, null); // parentView and currentUser are now ignored
    }

    public static FundraiserResponse from(
            Fundraiser fundraiser,
            List<FundraiserParticipant> participants,
            List<Contribution> contributions,
            List<AccountHistoryEntry> historyEntries,
            boolean parentView, // This parameter is now ignored for filtering
            User currentUser // This parameter is now ignored for filtering
    ) {
        FundraiserResponse response = new FundraiserResponse();
        response.setId(fundraiser.getId());
        response.setTitle(fundraiser.getTitle());
        response.setDescription(fundraiser.getDescription());
        response.setGoalAmount(fundraiser.getGoalAmount());
        response.setFundraiserType(fundraiser.getFundraiserType());
        response.setPerChildAmount(fundraiser.getPerChildAmount());
        response.setStartedAt(fundraiser.getStartedAt());
        response.setEndedAt(fundraiser.getFinishedAt());
        response.setStatus(fundraiser.getStatus());

        if (fundraiser.getSchoolClass() != null) {
            response.setClassId(fundraiser.getSchoolClass().getId());
            response.setClassLabel(fundraiser.getSchoolClass().getLabel());
            if (fundraiser.getSchoolClass().getTreasurer() != null) {
                User treasurer = fundraiser.getSchoolClass().getTreasurer();
                response.setTreasurer(new TreasurerResponse(treasurer.getId(), treasurer.getFullName()));
            }

            // nonParticipants logic remains, as it's only relevant for treasurer view
            Set<Long> participantChildIds = participants.stream()
                    .filter(p -> p.getRemovedAt() == null)
                    .map(p -> p.getChild().getId())
                    .collect(Collectors.toSet());

                List<ChildResponse> nonParticipants = fundraiser.getSchoolClass().getMemberships().stream()
                        .filter(m -> m.getLeftAt() == null)
                        .filter(m -> !participantChildIds.contains(m.getChild().getId()))
                        .map(m -> ChildResponse.from(m.getChild()))
                        .collect(Collectors.toList());
                response.setNonParticipants(nonParticipants);
        }

        BigDecimal currentAmount = contributions.stream()
                .map(Contribution::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        response.setCurrentAmount(currentAmount);

        Map<Long, List<Contribution>> contributionsByParticipant = contributions.stream()
                .collect(Collectors.groupingBy(c -> c.getParticipant().getId()));

        // Participants are no longer filtered by parentView here
        List<ParticipantResponse> participantResponses = participants.stream()
                .filter(p -> p.getRemovedAt() == null)
                .map(p -> ParticipantResponse.from(p, contributionsByParticipant.get(p.getId())))
                .collect(Collectors.toList());
        response.setParticipants(participantResponses);

        // History is no longer filtered by parentView here
        List<FundraiserHistoryEntryResponse> history = Stream.concat(
                contributions.stream().map(FundraiserHistoryEntryResponse::from),
                historyEntries.stream().map(FundraiserHistoryEntryResponse::from)
        ).sorted((a, b) -> b.getDate().compareTo(a.getDate())).collect(Collectors.toList());
        response.setHistory(history);

        return response;
    }

    private static boolean isChildOfUser(FundraiserParticipant participant, User user) {
        return user != null
                && participant.getChild().getParents() != null
                && participant.getChild().getParents().stream()
                .anyMatch(parent -> parent.getId().equals(user.getId()));
    }

    public static FundraiserResponse from(Fundraiser fundraiser) {
        FundraiserResponse response = new FundraiserResponse();
        response.setId(fundraiser.getId());
        response.setTitle(fundraiser.getTitle());
        response.setDescription(fundraiser.getDescription());
        response.setGoalAmount(fundraiser.getGoalAmount());
        response.setFundraiserType(fundraiser.getFundraiserType());
        response.setPerChildAmount(fundraiser.getPerChildAmount());
        response.setStartedAt(fundraiser.getStartedAt());
        response.setEndedAt(fundraiser.getFinishedAt());
        response.setStatus(fundraiser.getStatus());
        if (fundraiser.getSchoolClass() != null) {
            response.setClassId(fundraiser.getSchoolClass().getId());
            response.setClassLabel(fundraiser.getSchoolClass().getLabel());
        }
        return response;
    }
}
