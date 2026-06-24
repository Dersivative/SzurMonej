package org.game.szurmonej.dto;

import lombok.Data;
import org.game.szurmonej.entity.Child;
import org.game.szurmonej.entity.EnrollmentStatus;

import java.time.LocalDate;

@Data
public class ChildResponse {
    private Long id;
    private String name;
    private String surname;
    private LocalDate dateOfBirth;
    private String schoolClassName;
    private Long schoolClassId;
    private Long membershipId;
    private EnrollmentStatus status;
    private boolean isArchived;

    public static ChildResponse from(Child child) {
        ChildResponse response = new ChildResponse();
        response.setId(child.getId());
        response.setName(child.getName());
        response.setSurname(child.getSurname());
        response.setDateOfBirth(child.getDateOfBirth());
        response.setArchived(child.isArchived());
        
        if (child.getClassMemberships() != null) {
            child.getClassMemberships().stream()
                .filter(membership -> membership.getLeftAt() == null)
                .findFirst()
                .ifPresent(membership -> {
                    response.setSchoolClassName(membership.getSchoolClass().getLabel());
                    response.setSchoolClassId(membership.getSchoolClass().getId());
                    response.setMembershipId(membership.getId());
                    response.setStatus(membership.getStatus());
                });
        }

        return response;
    }
}