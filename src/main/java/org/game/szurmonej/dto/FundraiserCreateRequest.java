package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
public class FundraiserCreateRequest {
    private String title;
    private String description;
    private BigDecimal goalAmount;
}
