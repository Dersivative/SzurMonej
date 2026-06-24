package org.game.szurmonej.service;

import org.game.szurmonej.dto.EmailChangeRequest;
import org.game.szurmonej.dto.PasswordChangeRequest;
import org.game.szurmonej.entity.Child;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CurrentUserService currentUserService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash("encodedPassword");
        testUser.setChildren(new HashSet<>());
    }

    @Test
    void testUpdateEmail_Success() {
        when(currentUserService.getCurrentUser()).thenReturn(testUser);
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        EmailChangeRequest request = new EmailChangeRequest();
        request.setEmail("new@example.com");

        userService.updateEmail(request);

        assertEquals("new@example.com", testUser.getEmail());
        verify(userRepository, times(1)).save(testUser);
    }

    @Test
    void testUpdateEmail_EmailAlreadyExists() {
        when(currentUserService.getCurrentUser()).thenReturn(testUser);
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.of(new User()));

        EmailChangeRequest request = new EmailChangeRequest();
        request.setEmail("new@example.com");

        assertThrows(ResponseStatusException.class, () -> userService.updateEmail(request));
    }

    @Test
    void testUpdatePassword_Success() {
        when(currentUserService.getCurrentUser()).thenReturn(testUser);
        when(passwordEncoder.matches("oldPassword", "encodedPassword")).thenReturn(true);
        when(passwordEncoder.encode("newPassword")).thenReturn("newEncodedPassword");

        PasswordChangeRequest request = new PasswordChangeRequest();
        request.setOldPassword("oldPassword");
        request.setNewPassword("newPassword");

        userService.updatePassword(request);

        assertEquals("newEncodedPassword", testUser.getPasswordHash());
        verify(userRepository, times(1)).save(testUser);
    }

    @Test
    void testUpdatePassword_InvalidOldPassword() {
        when(currentUserService.getCurrentUser()).thenReturn(testUser);
        when(passwordEncoder.matches("wrongOldPassword", "encodedPassword")).thenReturn(false);

        PasswordChangeRequest request = new PasswordChangeRequest();
        request.setOldPassword("wrongOldPassword");
        request.setNewPassword("newPassword");

        assertThrows(ResponseStatusException.class, () -> userService.updatePassword(request));
    }

    @Test
    void testUpdateAvatar_Success() throws IOException {
        when(currentUserService.getCurrentUser()).thenReturn(testUser);
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        MockMultipartFile avatarFile = new MockMultipartFile("avatar", "avatar.png", "image/png", "some-image-bytes".getBytes());

        userService.updateAvatar(avatarFile);

        assertArrayEquals("some-image-bytes".getBytes(), testUser.getAvatar());
        verify(userRepository, times(1)).save(testUser);
    }

    @Test
    void testDeleteCurrentUser_Success() {
        when(currentUserService.getCurrentUser()).thenReturn(testUser);

        userService.deleteCurrentUser();

        verify(userRepository, times(1)).delete(testUser);
    }

    @Test
    void testDeleteCurrentUser_WithChildren() {
        when(currentUserService.getCurrentUser()).thenReturn(testUser);
        testUser.getChildren().add(new Child());

        assertThrows(ForbiddenOperationException.class, () -> userService.deleteCurrentUser());
    }
}