package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.AccountHistoryEntry;
import org.game.szurmonej.entity.Contribution;
import org.game.szurmonej.entity.Fundraiser;
import org.game.szurmonej.entity.FundraiserParticipant;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
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
    private List<ParticipantResponse> participants;
    private List<FundraiserHistoryEntryResponse> history;

    public static FundraiserResponse from(Fundraiser fundraiser, BigDecimal suggestedContribution, List<Contribution> contributions, List<AccountHistoryEntry> historyEntries) {
        FundraiserResponse response = from(fundraiser, contributions, historyEntries);
        response.setSuggestedContribution(suggestedContribution);
        return response;
    }

    public static FundraiserResponse from(Fundraiser fundraiser, List<Contribution> contributions, List<AccountHistoryEntry> historyEntries) {
        FundraiserResponse response = new FundraiserResponse();
        response.setId(fundraiser.getId());
        response.setTitle(fundraiser.getTitle());
        response.setDescription(fundraiser.getDescription());
        response.setGoalAmount(fundraiser.getGoalAmount());
        response.setStartedAt(fundraiser.getStartedAt());
        response.setEndedAt(fundraiser.getEndedAt());

        BigDecimal contributionAmount = contributions.stream()
                .map(Contribution::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal historyAmount = historyEntries.stream()
                .map(AccountHistoryEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        response.setCurrentAmount(contributionAmount.add(historyAmount));

        response.setParticipants(fundraiser.getParticipants().stream()
                .map(ParticipantResponse::from)
                .collect(Collectors.toList()));
        
        List<FundraiserHistoryEntryResponse> contributionHistory = contributions.stream()
                .map(FundraiserHistoryEntryResponse::from)
                .collect(Collectors.toList());

        List<FundraiserHistoryEntryResponse> accountHistory = historyEntries.stream()
                .map(FundraiserHistoryEntryResponse::from)
                .collect(Collectors.toList());

        response.setHistory(Stream.concat(contributionHistory.stream(), accountHistory.stream())
                .sorted(Comparator.comparing(FundraiserHistoryEntryResponse::getDate).reversed())
                .collect(Collectors.toList()));

        return response;
    }
    
    public static FundraiserResponse from(Fundraiser fundraiser) {
        return from(fundraiser, new ArrayList<>(), new ArrayList<>());
    }


    @Getter
    @Setter
    @NoArgsConstructor
    public static class ParticipantResponse {
        private Long childId;
        private String childName;
        private BigDecimal totalContribution;

        public static ParticipantResponse from(FundraiserParticipant participant) {
            ParticipantResponse response = new ParticipantResponse();
            response.setChildId(participant.getChild().getId());
            response.setChildName(participant.getChild().getName() + " " + participant.getChild().getSurname());

            BigDecimal totalContribution = participant.getContributions().stream()
                    .map(Contribution::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            response.setTotalContribution(totalContribution);

            return response;
        }
    }
}
