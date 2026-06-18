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
    private String payerName;
    private String payeeName;

    public static FundraiserHistoryEntryResponse from(Contribution contribution) {
        String description = String.format("Wpłata za: %s %s",
                contribution.getParticipant().getChild().getName(),
                contribution.getParticipant().getChild().getSurname());
        if (contribution.getNote() != null && !contribution.getNote().isBlank()) {
            description += " - " + contribution.getNote();
        }
        
        var response = new FundraiserHistoryEntryResponse();
        response.setId(contribution.getId());
        response.setDate(contribution.getPaidAt());
        response.setDescription(description);
        response.setAmount(contribution.getAmount());
        response.setType("Wpłata rodzica");
        response.setPayerName(contribution.getPayer().getFullName());
        response.setHasAttachment(false);
        return response;
    }

    public static FundraiserHistoryEntryResponse from(AccountHistoryEntry historyEntry) {
        var response = new FundraiserHistoryEntryResponse();
        response.setId(historyEntry.getId());
        response.setDate(historyEntry.getDate());
        response.setAmount(historyEntry.getAmount());
        response.setHasAttachment(historyEntry.getAttachment() != null);

        String type = "Inna operacja";
        String description = historyEntry.getDescription();

        if ("DEPOSIT_TREASURER".equals(historyEntry.getType())) {
            type = "Wpłata skarbnika";
            response.setPayerName(historyEntry.getAccount().getFundraiser().getSchoolClass().getTreasurer().getFullName());
        } else if ("WITHDRAWAL_TREASURER".equals(historyEntry.getType())) {
            type = "Wypłata skarbnika";
            response.setPayeeName(historyEntry.getAccount().getFundraiser().getSchoolClass().getTreasurer().getFullName());
        } else if ("REFUND".equals(historyEntry.getType())) {
            type = "Zwrot nadpłaty";
            
            // W AccountService dodaliśmy " - Uznanie: Imię Nazwisko" do opisu.
            // Spróbujmy to wyciągnąć, żeby wyświetlić ładniej na froncie.
            if (description != null && description.contains(" - Uznanie: ")) {
                int index = description.indexOf(" - Uznanie: ");
                response.setPayeeName(description.substring(index + 12));
                // Usuwamy z opisu część o uznaniu, skoro będzie w `payeeName`
                description = description.substring(0, index);
            }
        }
        
        response.setDescription(description);
        response.setType(type);

        return response;
    }
}
