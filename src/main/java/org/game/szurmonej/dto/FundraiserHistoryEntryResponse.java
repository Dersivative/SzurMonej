package org.game.szurmonej.dto;

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
public class FundraiserHistoryEntryResponse {
    private Long id;
    private LocalDateTime date;
    private String description;
    private BigDecimal amount;
    private String type;
    private boolean hasAttachment;

    public static FundraiserHistoryEntryResponse from(Contribution contribution) {
        String description = String.format("Wpłata od %s (za: %s %s)",
                contribution.getPayerAccount().getUser().getFullName(),
                contribution.getParticipant().getChild().getName(),
                contribution.getParticipant().getChild().getSurname());
        if (contribution.getNote() != null && !contribution.getNote().isBlank()) {
            description += " - " + contribution.getNote();
        }
        
        var response = new FundraiserHistoryEntryResponse();
        response.setId(contribution.getId()); // Assuming Contribution has an ID that can be used
        response.setDate(contribution.getPaidAt());
        response.setDescription(description);
        response.setAmount(contribution.getAmount());
        response.setType("Wpłata rodzica");
        response.setHasAttachment(false); // Contributions from parents don't have attachments
        return response;
    }

    public static FundraiserHistoryEntryResponse from(AccountHistoryEntry historyEntry) {
        String type = "Inna operacja";
        if ("DEPOSIT_TREASURER".equals(historyEntry.getType())) {
            type = "Wpłata skarbnika";
        } else if ("WITHDRAWAL_TREASURER".equals(historyEntry.getType())) {
            type = "Wypłata skarbnika";
        } else if ("REFUND".equals(historyEntry.getType())) {
            type = "Zwrot nadpłaty";
        }

        var response = new FundraiserHistoryEntryResponse();
        response.setId(historyEntry.getId());
        response.setDate(historyEntry.getDate());
        response.setDescription(historyEntry.getDescription());
        response.setAmount(historyEntry.getAmount());
        response.setType(type);
        response.setHasAttachment(historyEntry.getAttachment() != null);
        return response;
    }
}
