package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.dto.UserCreateRequest;
import org.game.szurmonej.dto.UserResponse;
import org.game.szurmonej.entity.Account;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.repository.UserRepository;
import org.game.szurmonej.service.CurrentUserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Tag(name = "Users", description = "Użytkownicy (rodzice)")
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserService currentUserService;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder, CurrentUserService currentUserService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me() {
        return ResponseEntity.ok(UserResponse.from(currentUserService.getCurrentUser()));
    }

    @SecurityRequirements
    @PostMapping
    public ResponseEntity<UserResponse> createUser(@RequestBody UserCreateRequest request) {
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(request.getPassword());
        user.setAdmin(false);

        user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
        if (user.getAccount() == null) {
            Account account = new Account();
            account.setAccountNumber(UUID.randomUUID().toString());
            account.setUser(user);
            user.setAccount(account);
        }
        return ResponseEntity.ok(UserResponse.from(userRepository.save(user)));
    }
}
