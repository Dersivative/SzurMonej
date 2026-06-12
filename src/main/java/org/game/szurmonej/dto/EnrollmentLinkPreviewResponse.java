package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.ClassEnrollmentLink;

@Getter
@Setter
@NoArgsConstructor
public class EnrollmentLinkPreviewResponse {

    private Long classId;
    private String classLabel;

    public static EnrollmentLinkPreviewResponse from(ClassEnrollmentLink link) {
        EnrollmentLinkPreviewResponse response = new EnrollmentLinkPreviewResponse();
        response.setClassId(link.getSchoolClass().getId());
        response.setClassLabel(link.getSchoolClass().getLabel());
        return response;
    }
}
