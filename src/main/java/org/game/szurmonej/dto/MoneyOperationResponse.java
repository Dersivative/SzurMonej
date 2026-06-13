package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
public class MoneyOperationResponse {

    private Long sourceAccountId;
    private BigDecimal sourceBalance;
    private Long targetAccountId;
    private BigDecimal targetBalance;
    private Long contributionId;

    public static MoneyOperationResponse singleAccount(Long accountId, BigDecimal balance) {
        MoneyOperationResponse response = new MoneyOperationResponse();
        response.setSourceAccountId(accountId);
        response.setSourceBalance(balance);
        return response;
    }

    public static MoneyOperationResponse transfer(
            Long sourceAccountId,
            BigDecimal sourceBalance,
            Long targetAccountId,
            BigDecimal targetBalance,
            Long contributionId
    ) {
        MoneyOperationResponse response = new MoneyOperationResponse();
        response.setSourceAccountId(sourceAccountId);
        response.setSourceBalance(sourceBalance);
        response.setTargetAccountId(targetAccountId);
        response.setTargetBalance(targetBalance);
        response.setContributionId(contributionId);
        return response;
    }
}
