package org.game.szurmonej.dto;

import lombok.Data;
import org.game.szurmonej.entity.User;

import java.math.BigDecimal;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Data
public class UserResponse {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String fullName;
    private boolean isAdmin;
    private BigDecimal balance;
    private List<ChildResponse> children;
    private String avatar; // Base64 encoded avatar

    public static UserResponse from(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setFullName(user.getFullName());
        response.setAdmin(user.isAdmin());
        if (user.getAccount() != null) {
            response.setBalance(user.getAccount().getBalance());
        }
        if (user.getChildren() != null) {
            response.setChildren(user.getChildren().stream().map(ChildResponse::from).collect(Collectors.toList()));
        } else {
            response.setChildren(Collections.emptyList());
        }
        if (user.getAvatar() != null) {
            response.setAvatar("data:image/png;base64," + Base64.getEncoder().encodeToString(user.getAvatar()));
        }
        return response;
    }
}