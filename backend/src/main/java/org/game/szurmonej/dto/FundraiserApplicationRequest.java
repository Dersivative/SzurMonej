package org.game.szurmonej.dto;

import lombok.Data;
import org.game.szurmonej.entity.FundraiserType;

import java.math.BigDecimal;
import java.util.List;

@Data
public class FundraiserApplicationRequest {
    private String title;
    private String description;
    private FundraiserType fundraiserType;
    private BigDecimal goalAmount;
    private BigDecimal perChildAmount;
    private List<Long> participantIds;
    private Long classId;
}