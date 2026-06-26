package org.game.szurmonej.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class WithdrawRequest {
    private BigDecimal amount;
}