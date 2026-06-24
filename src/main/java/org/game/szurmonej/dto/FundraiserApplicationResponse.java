package org.game.szurmonej.dto;

import lombok.Data;
import org.game.szurmonej.entity.EnrollmentStatus;
import org.game.szurmonej.entity.FundraiserApplication;
import org.game.szurmonej.entity.FundraiserType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
public class FundraiserApplicationResponse {
    private Long id;
    private String title;
    private String description;
    private FundraiserType fundraiserType;
    private BigDecimal goalAmount;
    private BigDecimal perChildAmount;
    private List<Long> participantIds;
    private EnrollmentStatus status;
    private Instant requestedAt;
    private UserResponse requestingParent;

    public static FundraiserApplicationResponse from(FundraiserApplication application) {
        FundraiserApplicationResponse dto = new FundraiserApplicationResponse();
        dto.setId(application.getId());
        dto.setTitle(application.getTitle());
        dto.setDescription(application.getDescription());
        dto.setFundraiserType(application.getFundraiserType());
        dto.setGoalAmount(application.getGoalAmount());
        dto.setPerChildAmount(application.getPerChildAmount());
        dto.setParticipantIds(application.getParticipantIds());
        dto.setStatus(application.getStatus());
        dto.setRequestedAt(application.getRequestedAt());
        dto.setRequestingParent(UserResponse.from(application.getRequestingParent()));
        return dto;
    }
}