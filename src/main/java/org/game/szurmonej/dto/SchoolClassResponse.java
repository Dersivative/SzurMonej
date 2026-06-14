package org.game.szurmonej.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.ClassMembership;
import org.game.szurmonej.entity.SchoolClass;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SchoolClassResponse {

    private Long id;
    private String label;
    private TreasurerResponse treasurer;
    private List<ChildResponse> children;

    public static SchoolClassResponse from(SchoolClass schoolClass) {
        if (schoolClass == null) {
            return null;
        }
        TreasurerResponse treasurerResponse = null;
        if (schoolClass.getTreasurer() != null) {
            treasurerResponse = new TreasurerResponse(
                schoolClass.getTreasurer().getId(),
                schoolClass.getTreasurer().getUsername()
            );
        }
        List<ChildResponse> childrenResponse = schoolClass.getMemberships() != null ?
                schoolClass.getMemberships().stream()
                        .filter(membership -> membership.getLeftAt() == null)
                        .map(ClassMembership::getChild)
                        .map(ChildResponse::from)
                        .collect(Collectors.toList()) :
                Collections.emptyList();

        return new SchoolClassResponse(
                schoolClass.getId(),
                schoolClass.getLabel(),
                treasurerResponse,
                childrenResponse
        );
    }
}
