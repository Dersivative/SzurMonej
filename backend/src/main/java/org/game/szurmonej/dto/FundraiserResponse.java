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
    private LocalDate endsBy;
    private FundraiserStatus status;
    private FundraiserType fundraiserType;
    private BigDecimal perChildAmount;
    private TreasurerResponse treasurer;
    private Long classId;
    private String classLabel;
    private List<ParticipantResponse> participants;
    private List<ChildResponse> nonParticipants;
    private List<FundraiserHistoryEntryResponse> history;

    public static FundraiserResponse from(Fundraiser fundraiser, BigDecimal suggestedContribution, List<Contribution> contributions, List<AccountHistoryEntry> historyEntries, List<Refund> refunds) {
        FundraiserResponse response = from(fundraiser, fundraiser.getParticipants(), contributions, historyEntries, refunds);
        response.setSuggestedContribution(suggestedContribution);
        return response;
    }

    public static FundraiserResponse from(
            Fundraiser fundraiser,
            List<FundraiserParticipant> participants,
            BigDecimal suggestedContribution,
            List<Contribution> contributions,
            List<AccountHistoryEntry> historyEntries,
            List<Refund> refunds
    ) {
        FundraiserResponse response = from(fundraiser, participants, contributions, historyEntries, refunds);
        response.setSuggestedContribution(suggestedContribution);
        return response;
    }

    public static FundraiserResponse from(Fundraiser fundraiser, List<Contribution> contributions, List<AccountHistoryEntry> historyEntries, List<Refund> refunds) {
        return from(fundraiser, fundraiser.getParticipants(), contributions, historyEntries, refunds);
    }

    public static FundraiserResponse from(
            Fundraiser fundraiser,
            List<FundraiserParticipant> participants,
            List<Contribution> contributions,
            List<AccountHistoryEntry> historyEntries,
            List<Refund> refunds
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
        response.setEndsBy(fundraiser.getEndsBy());
        response.setStatus(fundraiser.getStatus());

        if (fundraiser.getSchoolClass() != null) {
            response.setClassId(fundraiser.getSchoolClass().getId());
            response.setClassLabel(fundraiser.getSchoolClass().getLabel());
            if (fundraiser.getSchoolClass().getTreasurer() != null) {
                User treasurer = fundraiser.getSchoolClass().getTreasurer();
                response.setTreasurer(new TreasurerResponse(treasurer.getId(), treasurer.getFullName()));
            }

            Set<Long> participantChildIds = participants.stream()
                    .map(p -> p.getChild().getId())
                    .collect(Collectors.toSet());

            List<ChildResponse> nonParticipants = fundraiser.getSchoolClass().getMemberships().stream()
                    .filter(m -> m.getLeftAt() == null)
                    .filter(m -> !participantChildIds.contains(m.getChild().getId()))
                    .map(m -> ChildResponse.from(m.getChild()))
                    .collect(Collectors.toList());
            response.setNonParticipants(nonParticipants);
        }

        BigDecimal totalContributions = contributions.stream()
                .map(Contribution::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalRefunds = refunds.stream()
                .map(Refund::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        response.setCurrentAmount(totalContributions.subtract(totalRefunds));

        Map<Long, List<Contribution>> contributionsByParticipant = contributions.stream()
                .collect(Collectors.groupingBy(c -> c.getParticipant().getId()));
        
        Map<Long, List<Refund>> refundsByContributionId = refunds.stream()
                .filter(r -> r.getContribution() != null) // Only consider refunds linked to a specific contribution
                .collect(Collectors.groupingBy(r -> r.getContribution().getId()));

        List<ParticipantResponse> participantResponses = participants.stream()
                .map(p -> {
                    List<Contribution> pContributions = contributionsByParticipant.getOrDefault(p.getId(), Collections.emptyList());
                    BigDecimal totalParticipantContributions = pContributions.stream().map(Contribution::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
                    
                    BigDecimal totalParticipantRefunds = pContributions.stream()
                            .flatMap(c -> refundsByContributionId.getOrDefault(c.getId(), Collections.emptyList()).stream())
                            .map(Refund::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    return ParticipantResponse.from(p, totalParticipantContributions.subtract(totalParticipantRefunds), pContributions);
                })
                .collect(Collectors.toList());
        response.setParticipants(participantResponses);

        List<FundraiserHistoryEntryResponse> history = Stream.concat(
                contributions.stream().map(FundraiserHistoryEntryResponse::from),
                historyEntries.stream().map(FundraiserHistoryEntryResponse::from)
        ).sorted((a, b) -> b.getDate().compareTo(a.getDate())).collect(Collectors.toList());
        response.setHistory(history);

        return response;
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
        response.setEndsBy(fundraiser.getEndsBy());
        response.setStatus(fundraiser.getStatus());
        if (fundraiser.getSchoolClass() != null) {
            response.setClassId(fundraiser.getSchoolClass().getId());
            response.setClassLabel(fundraiser.getSchoolClass().getLabel());
        }
        return response;
    }
}