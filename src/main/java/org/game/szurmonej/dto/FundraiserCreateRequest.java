package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.FundraiserType;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
public class FundraiserCreateRequest {
    private String title;
    private String description;
    private FundraiserType fundraiserType;
    private BigDecimal goalAmount; // Used for TOTAL_GOAL
    private BigDecimal perChildAmount; // Used for PER_CHILD_GOAL
}
