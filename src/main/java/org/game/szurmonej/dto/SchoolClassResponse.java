package org.game.szurmonej.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.SchoolClass;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SchoolClassResponse {

    private Long id;
    private String label;
    private TreasurerResponse treasurer;

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
        return new SchoolClassResponse(
            schoolClass.getId(),
            schoolClass.getLabel(),
            treasurerResponse
        );
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TreasurerResponse {
        private Long id;
        private String username;
    }
}