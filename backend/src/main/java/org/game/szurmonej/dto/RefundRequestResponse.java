package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.RefundRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class RefundRequestResponse {

    private Long id;
    private ParticipantDto participant;
    private RequesterDto requester;
    private BigDecimal amount;
    private String status;
    private LocalDateTime requestedAt;

    @Getter
    @Setter
    @NoArgsConstructor
    public static class ParticipantDto {
        private ChildDto child;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class ChildDto {
        private String name;
        private String surname;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class RequesterDto {
        private String fullName;
    }

    public static RefundRequestResponse from(RefundRequest request) {
        RefundRequestResponse response = new RefundRequestResponse();
        response.setId(request.getId());
        response.setAmount(request.getAmount());
        response.setStatus(request.getStatus().name());
        response.setRequestedAt(request.getRequestedAt());

        ChildDto childDto = new ChildDto();
        childDto.setName(request.getParticipant().getChild().getName());
        childDto.setSurname(request.getParticipant().getChild().getSurname());

        ParticipantDto participantDto = new ParticipantDto();
        participantDto.setChild(childDto);
        response.setParticipant(participantDto);

        RequesterDto requesterDto = new RequesterDto();
        requesterDto.setFullName(request.getRequester().getFullName());
        response.setRequester(requesterDto);

        return response;
    }
}
