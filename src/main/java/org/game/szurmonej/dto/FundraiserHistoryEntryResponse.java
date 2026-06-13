package org.game.szurmonej.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.AccountHistoryEntry;
import org.game.szurmonej.entity.Contribution;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FundraiserHistoryEntryResponse {
    private LocalDateTime date;
    private String description;
    private BigDecimal amount;
    private String type;

    public static FundraiserHistoryEntryResponse from(Contribution contribution) {
        String description = String.format("Wpłata od %s (za: %s %s)",
                contribution.getPayerAccount().getUser().getUsername(),
                contribution.getParticipant().getChild().getName(),
                contribution.getParticipant().getChild().getSurname());
        if (contribution.getNote() != null && !contribution.getNote().isBlank()) {
            description += " - " + contribution.getNote();
        }
        return new FundraiserHistoryEntryResponse(
                contribution.getPaidAt(),
                description,
                contribution.getAmount(),
                "Wpłata rodzica"
        );
    }

    public static FundraiserHistoryEntryResponse from(AccountHistoryEntry historyEntry) {
        String type = "Inna operacja";
        if ("DEPOSIT_TREASURER".equals(historyEntry.getType())) {
            type = "Wpłata skarbnika";
        } else if ("WITHDRAWAL_TREASURER".equals(historyEntry.getType())) {
            type = "Wypłata skarbnika";
        }
        return new FundraiserHistoryEntryResponse(
                historyEntry.getDate(),
                historyEntry.getDescription(),
                historyEntry.getAmount(),
                type
        );
    }
}
