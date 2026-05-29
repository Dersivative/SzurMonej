package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
public class TransferToFundraiserRequest {

    private Long fundraiserId;
    private Long childId;
    private BigDecimal amount;
    private String note;
}
