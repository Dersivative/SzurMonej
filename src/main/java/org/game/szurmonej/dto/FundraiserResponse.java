package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.AccountHistoryEntry;
import org.game.szurmonej.entity.Contribution;
import org.game.szurmonej.entity.Fundraiser;
import org.game.szurmonej.entity.FundraiserParticipant;
import org.game.szurmonej.entity.FundraiserStatus;
import org.game.szurmonej.entity.User;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
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
    private TreasurerResponse treasurer;
    private String classLabel;
    private boolean parentView;
    private List<ParticipantResponse> participants;
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
        FundraiserResponse response = from(fundraiser, participants, contributions, historyEntries, false, null);
        response.setSuggestedContribution(suggestedContribution);
        return response;
    }

    public static FundraiserResponse from(Fundraiser fundraiser, List<Contribution> contributions, List<AccountHistoryEntry> historyEntries) {
        return from(fundraiser, fundraiser.getParticipants(), contributions, historyEntries, false, null);
    }

    public static FundraiserResponse from(
            Fundraiser fundraiser,
            List<FundraiserParticipant> participants,
            List<Contribution> contributions,
            List<AccountHistoryEntry> historyEntries
    ) {
        return from(fundraiser, participants, contributions, historyEntries, false, null);
    }

    public static FundraiserResponse from(
            Fundraiser fundraiser,
            List<FundraiserParticipant> participants,
            List<Contribution> contributions,
            List<AccountHistoryEntry> historyEntries,
            boolean parentView,
            User currentUser
    ) {
        FundraiserResponse response = new FundraiserResponse();
        response.setId(fundraiser.getId());
        response.setTitle(fundraiser.getTitle());
        response.setDescription(fundraiser.getDescription());
        response.setGoalAmount(fundraiser.getGoalAmount());
        response.setStartedAt(fundraiser.getStartedAt());
        response.setEndedAt(fundraiser.getFinishedAt());
        response.setStatus(fundraiser.getStatus());
        response.setParentView(parentView);

        if (fundraiser.getSchoolClass() != null) {
            response.setClassLabel(fundraiser.getSchoolClass().getLabel());
            if (fundraiser.getSchoolClass().getTreasurer() != null) {
                User treasurer = fundraiser.getSchoolClass().getTreasurer();
                response.setTreasurer(new TreasurerResponse(treasurer.getId(), treasurer.getFullName()));
            }
        }

        BigDecimal currentAmount = contributions.stream()
                .map(Contribution::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        response.setCurrentAmount(currentAmount);

        Map<Long, List<Contribution>> contributionsByParticipant = contributions.stream()
                .collect(Collectors.groupingBy(c -> c.getParticipant().getId()));

        List<ParticipantResponse> participantResponses = participants.stream()
                .filter(p -> p.getRemovedAt() == null)
                .filter(p -> !parentView || isChildOfUser(p, currentUser))
                .map(p -> ParticipantResponse.from(p, contributionsByParticipant.get(p.getId())))
                .collect(Collectors.toList());
        response.setParticipants(participantResponses);

        if (parentView) {
            response.setHistory(Collections.emptyList());
        } else {
            List<FundraiserHistoryEntryResponse> history = Stream.concat(
                    contributions.stream().map(FundraiserHistoryEntryResponse::from),
                    historyEntries.stream().map(FundraiserHistoryEntryResponse::from)
            ).sorted((a, b) -> b.getDate().compareTo(a.getDate())).collect(Collectors.toList());
            response.setHistory(history);
        }

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
        response.setStartedAt(fundraiser.getStartedAt());
        response.setEndedAt(fundraiser.getFinishedAt());
        response.setStatus(fundraiser.getStatus());
        // Note: This simplified 'from' does not include participants, contributions, or history.
        // This might be desired in some contexts, but it's the likely source of the issue.
        // For a full view, the more detailed 'from' method should be used.
        return response;
    }
}
