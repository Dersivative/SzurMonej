package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.Contribution;
import org.game.szurmonej.entity.FundraiserParticipant;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class ParticipantResponse {

    private Long childId;
    private String childName;
    private BigDecimal totalContribution;
    private BigDecimal debt;
    private BigDecimal credit;

    public static ParticipantResponse from(FundraiserParticipant participant, List<Contribution> contributions) {
        ParticipantResponse response = new ParticipantResponse();
        response.setChildId(participant.getChild().getId());
        response.setChildName(participant.getChild().getName() + " " + participant.getChild().getSurname());
        
        BigDecimal totalContribution = (contributions == null) ? BigDecimal.ZERO : contributions.stream()
                .map(Contribution::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        response.setTotalContribution(totalContribution);

        response.setDebt(participant.getDebt());
        response.setCredit(participant.getCredit());

        return response;
    }
}
