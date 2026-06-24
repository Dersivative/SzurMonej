package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.User;

@Getter
@Setter
@NoArgsConstructor
public class ChatUserResponse {

    private Long id;
    private String fullName;
    private String email;

    public static ChatUserResponse from(User user) {
        ChatUserResponse response = new ChatUserResponse();
        response.setId(user.getId());
        response.setFullName(user.getFullName());
        response.setEmail(user.getEmail());
        return response;
    }
}
