package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.ClassEnrollmentApplication;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
public class EnrollmentApplicationResponse {

    private Long id;
    private String status;
    private String classLabel;
    private ChildResponse child;
    private UserResponse parent;
    private Instant requestedAt;
    private Instant reviewedAt;

    public static EnrollmentApplicationResponse from(ClassEnrollmentApplication application) {
        EnrollmentApplicationResponse response = new EnrollmentApplicationResponse();
        response.setId(application.getId());
        response.setStatus(application.getStatus().name());
        response.setClassLabel(application.getSchoolClass().getLabel());
        response.setChild(ChildResponse.from(application.getChild()));
        response.setParent(UserResponse.from(application.getParent()));
        response.setRequestedAt(application.getRequestedAt());
        response.setReviewedAt(application.getReviewedAt());
        return response;
    }
}
