package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.User;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
public class UserResponse {

    private Long id;
    private String username;
    private String email;
    private boolean admin; // Dodano pole admin
    private List<ChildResponse> children = new ArrayList<>();

    public static UserResponse from(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setAdmin(user.isAdmin()); // Ustawienie wartości z encji
        if (user.getChildren() != null) {
            response.setChildren(user.getChildren().stream()
                    .map(ChildResponse::from)
                    .collect(Collectors.toList()));
        }
        return response;
    }
}
