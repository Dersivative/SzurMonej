package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.ClassEnrollmentLink;

@Getter
@Setter
@NoArgsConstructor
public class EnrollmentLinkPreviewResponse {

    private Long schoolClassId;
    private String schoolClassName;
    private String treasurerName;

    public static EnrollmentLinkPreviewResponse from(ClassEnrollmentLink link) {
        EnrollmentLinkPreviewResponse response = new EnrollmentLinkPreviewResponse();
        response.setSchoolClassId(link.getSchoolClass().getId());
        response.setSchoolClassName(link.getSchoolClass().getLabel());
        
        if (link.getSchoolClass().getTreasurer() != null) {
            response.setTreasurerName(link.getSchoolClass().getTreasurer().getFullName());
        }

        return response;
    }
}
