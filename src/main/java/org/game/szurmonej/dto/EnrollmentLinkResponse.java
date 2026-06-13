package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.ClassEnrollmentLink;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class EnrollmentLinkResponse {

    private UUID token;
    private String url;
    private boolean active;
    private Instant createdAt;

    public static EnrollmentLinkResponse from(ClassEnrollmentLink link, String frontendBaseUrl) {
        EnrollmentLinkResponse response = new EnrollmentLinkResponse();
        response.setToken(link.getToken());
        response.setUrl(frontendBaseUrl + "/enroll/" + link.getToken());
        response.setActive(link.isActive());
        response.setCreatedAt(link.getCreatedAt());
        return response;
    }
}
