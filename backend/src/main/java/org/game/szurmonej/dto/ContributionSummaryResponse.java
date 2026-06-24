package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.Contribution;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class ContributionSummaryResponse {

    private LocalDateTime paidAt;
    private BigDecimal amount;

    public static ContributionSummaryResponse from(Contribution contribution) {
        ContributionSummaryResponse response = new ContributionSummaryResponse();
        response.setPaidAt(contribution.getPaidAt());
        response.setAmount(contribution.getAmount());
        return response;
    }
}
