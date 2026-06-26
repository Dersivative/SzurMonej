package org.game.szurmonej.service;

import org.apache.commons.validator.routines.IBANValidator;
import org.game.szurmonej.dto.BankAccountRequest;
import org.game.szurmonej.dto.EmailChangeRequest;
import org.game.szurmonej.dto.PasswordChangeRequest;
import org.game.szurmonej.dto.UserResponse;
import org.game.szurmonej.entity.Child;
import org.game.szurmonej.entity.ClassMembership;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.exception.EmailAlreadyExistsException;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.exception.ResourceNotFoundException;
import org.game.szurmonej.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, CurrentUserService currentUserService, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponse updateEmail(EmailChangeRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        Optional<User> userWithNewEmail = userRepository.findByEmail(request.getEmail());

        if (userWithNewEmail.isPresent() && !userWithNewEmail.get().getId().equals(currentUser.getId())) {
            throw new EmailAlreadyExistsException("Użytkownik o tym adresie email już istnieje.");
        }

        currentUser.setEmail(request.getEmail());
        return UserResponse.from(userRepository.save(currentUser));
    }

    @Transactional
    public void updatePassword(PasswordChangeRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        if (!passwordEncoder.matches(request.getOldPassword(), currentUser.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Aktualne hasło jest nieprawidłowe.");
        }
        currentUser.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(currentUser);
    }

    @Transactional
    public UserResponse updateAvatar(MultipartFile avatar) throws IOException {
        User currentUser = currentUserService.getCurrentUser();
        currentUser.setAvatar(avatar.getBytes());
        return UserResponse.from(userRepository.save(currentUser));
    }

    @Transactional
    public void deleteCurrentUser() {
        User currentUser = currentUserService.getCurrentUser();
        for (Child child : currentUser.getChildren()) {
            for (ClassMembership membership : child.getClassMemberships()) {
                if (membership.getLeftAt() == null) {
                    throw new ForbiddenOperationException("Nie można usunąć konta, ponieważ co najmniej jedno z Twoich dzieci jest aktywnie zapisane do klasy. Najpierw wypisz dziecko z klasy.");
                }
            }
        }
        userRepository.delete(currentUser);
    }

    @Transactional
    public UserResponse updateBankAccount(BankAccountRequest request) {
        String bankAccountNumber = request.getBankAccountNumber();
        if (!IBANValidator.getInstance().isValid(bankAccountNumber)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Podany numer konta bankowego jest nieprawidłowy.");
        }
        User currentUser = currentUserService.getCurrentUser();
        currentUser.setBankAccountNumber(bankAccountNumber);
        return UserResponse.from(userRepository.save(currentUser));
    }

    @Transactional(readOnly = true)
    public List<User> getUnapprovedUsers() {
        return userRepository.findByEnabled(false);
    }

    @Transactional
    public void approveUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        user.setEnabled(true);
        userRepository.save(user);
    }
}