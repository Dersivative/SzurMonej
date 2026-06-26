package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.dto.*;
import org.game.szurmonej.entity.Account;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.repository.ChildRepository;
import org.game.szurmonej.repository.UserRepository;
import org.game.szurmonej.service.*;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;
import java.io.IOException;
import java.io.InputStream;
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
    private final ChildRepository childRepository;
    private final ParentChildService parentChildService;
    private final ClassEnrollmentService classEnrollmentService;
    private final FundraiserService fundraiserService;
    private final UserService userService;
    private final ResourceLoader resourceLoader;
    private byte[] defaultAvatarBytes;

    public UserController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            CurrentUserService currentUserService,
            ChildRepository childRepository,
            ParentChildService parentChildService,
            ClassEnrollmentService classEnrollmentService,
            FundraiserService fundraiserService,
            UserService userService,
            ResourceLoader resourceLoader
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.currentUserService = currentUserService;
        this.childRepository = childRepository;
        this.parentChildService = parentChildService;
        this.classEnrollmentService = classEnrollmentService;
        this.fundraiserService = fundraiserService;
        this.userService = userService;
        this.resourceLoader = resourceLoader;
        loadDefaultAvatar();
    }

    @Transactional(readOnly = true)
    @GetMapping
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserWithChildrenResponse>> getAllUsersWithChildren() {
        List<UserWithChildrenResponse> users = userRepository.findAllWithChildren().stream()
                .map(UserWithChildrenResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @GetMapping("/unapproved")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getUnapprovedUsers() {
        List<UserResponse> users = userService.getUnapprovedUsers().stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> approveUser(@PathVariable Long id) {
        userService.approveUser(id);
        return ResponseEntity.ok().build();
    }

    @Transactional(readOnly = true)
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me() {
        return ResponseEntity.ok(UserResponse.from(currentUserService.getCurrentUser()));
    }

    @PatchMapping("/me/email")
    public ResponseEntity<UserResponse> updateEmail(@RequestBody EmailChangeRequest request) {
        return ResponseEntity.ok(userService.updateEmail(request));
    }

    @PatchMapping("/me/password")
    public ResponseEntity<Void> updatePassword(@RequestBody PasswordChangeRequest request) {
        userService.updatePassword(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<UserResponse> updateAvatar(@RequestParam("avatar") MultipartFile avatar) throws IOException {
        return ResponseEntity.ok(userService.updateAvatar(avatar));
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount() {
        userService.deleteCurrentUser();
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/me/bank-account")
    public ResponseEntity<UserResponse> updateBankAccount(@RequestBody BankAccountRequest request) {
        return ResponseEntity.ok(userService.updateBankAccount(request));
    }

    @Transactional(readOnly = true)
    @GetMapping("/me/children")
    public ResponseEntity<List<ChildResponse>> getChildrenForCurrentUser() {
        User currentUser = currentUserService.getCurrentUser();
        List<ChildResponse> children = childRepository.findByParents(currentUser).stream()
                .map(ChildResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(children);
    }

    @Operation(summary = "Pobierz wszystkie zbiórki i wnioski dla danego dziecka")
    @GetMapping("/me/children/{childId}/fundraisers")
    public ResponseEntity<ChildFundraisersView> getFundraisersForChild(@PathVariable Long childId) {
        return ResponseEntity.ok(fundraiserService.getFundraisersForChild(childId));
    }

    @PostMapping("/me/children")
    public ResponseEntity<ChildResponse> addChildForCurrentUser(@RequestBody ChildCreateRequest request) {
        return ResponseEntity.ok(ChildResponse.from(parentChildService.addChildToCurrentUser(request)));
    }

    @Transactional(readOnly = true)
    @GetMapping("/me/enrollment-applications")
    public ResponseEntity<List<EnrollmentApplicationResponse>> getEnrollmentApplicationsForCurrentUser() {
        return ResponseEntity.ok(classEnrollmentService.getApplicationsForCurrentParent());
    }

    @SecurityRequirements
    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserCreateRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Użytkownik o tym adresie email już istnieje.");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setAdmin(false);

        if (defaultAvatarBytes != null) {
            user.setAvatar(defaultAvatarBytes);
        }

        if (user.getAccount() == null) {
            Account account = new Account();
            account.setAccountNumber(UUID.randomUUID().toString());
            account.setUser(user);
            user.setAccount(account);
        }
        return ResponseEntity.ok(UserResponse.from(userRepository.save(user)));
    }

    private void loadDefaultAvatar() {
        try {
            Resource resource = resourceLoader.getResource("classpath:avatar.png");
            try (InputStream inputStream = resource.getInputStream()) {
                this.defaultAvatarBytes = StreamUtils.copyToByteArray(inputStream);
            }
        } catch (IOException e) {
            System.err.println("Could not load default avatar from classpath:avatar.png. Default avatar will not be set. " + e.getMessage());
            this.defaultAvatarBytes = null;
        }
    }
}