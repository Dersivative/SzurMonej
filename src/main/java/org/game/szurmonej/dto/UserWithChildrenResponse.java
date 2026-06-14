package org.game.szurmonej.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.game.szurmonej.entity.User;

import java.util.List;
import java.util.stream.Collectors;

@Getter
@AllArgsConstructor
public class UserWithChildrenResponse {
    private Long id;
    private String fullName;
    private String email;
    private List<ChildResponse> children;

    public static UserWithChildrenResponse from(User user) {
        List<ChildResponse> children = user.getChildren().stream()
                .map(ChildResponse::from)
                .collect(Collectors.toList());
        return new UserWithChildrenResponse(user.getId(), user.getFullName(), user.getEmail(), children);
    }
}
