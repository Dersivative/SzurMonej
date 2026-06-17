package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.Contribution;
import org.game.szurmonej.entity.FundraiserParticipant;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
public class ParticipantResponse {

    private Long childId;
    private String childName;
    private String childFirstName;
    private String childSurname;
    private BigDecimal totalContribution;
    private BigDecimal debt;
    private BigDecimal credit;
    private List<ContributionSummaryResponse> contributions;

    public static ParticipantResponse from(FundraiserParticipant participant, BigDecimal totalContribution, List<Contribution> contributions) {
        ParticipantResponse response = new ParticipantResponse();
        response.setChildId(participant.getChild().getId());
        response.setChildFirstName(participant.getChild().getName());
        response.setChildSurname(participant.getChild().getSurname());
        response.setChildName(participant.getChild().getName() + " " + participant.getChild().getSurname());
        
        response.setTotalContribution(totalContribution);
        response.setContributions(contributions.stream()
                .map(ContributionSummaryResponse::from)
                .sorted((a, b) -> b.getPaidAt().compareTo(a.getPaidAt()))
                .collect(Collectors.toList()));

        response.setDebt(participant.getDebt());
        response.setCredit(participant.getCredit());

        return response;
    }
}
