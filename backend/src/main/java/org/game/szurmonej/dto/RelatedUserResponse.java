package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.User;

@Getter
@Setter
@NoArgsConstructor
public class RelatedUserResponse {

    private Long id;
    private String fullName;
    private String email;

    public static RelatedUserResponse from(User user) {
        RelatedUserResponse response = new RelatedUserResponse();
        response.setId(user.getId());
        response.setFullName(user.getFullName());
        response.setEmail(user.getEmail());
        return response;
    }
}
