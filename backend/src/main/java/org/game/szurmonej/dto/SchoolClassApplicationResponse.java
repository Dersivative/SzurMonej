package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.EnrollmentStatus;
import org.game.szurmonej.entity.SchoolClassApplication;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
public class SchoolClassApplicationResponse {

    private Long id;
    private String proposedName;
    private EnrollmentStatus status;
    private Instant requestedAt;
    private UserResponse requestingParent;
    private UserResponse reviewedBy;
    private Instant reviewedAt;

    public static SchoolClassApplicationResponse from(SchoolClassApplication application) {
        SchoolClassApplicationResponse response = new SchoolClassApplicationResponse();
        response.setId(application.getId());
        response.setProposedName(application.getProposedName());
        response.setStatus(application.getStatus());
        response.setRequestedAt(application.getRequestedAt());
        response.setRequestingParent(UserResponse.from(application.getRequestingParent()));
        if (application.getReviewedBy() != null) {
            response.setReviewedBy(UserResponse.from(application.getReviewedBy()));
            response.setReviewedAt(application.getReviewedAt());
        }
        return response;
    }
}
