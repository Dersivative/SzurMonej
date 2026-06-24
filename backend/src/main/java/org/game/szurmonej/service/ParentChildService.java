package org.game.szurmonej.service;

import org.game.szurmonej.dto.ChildCreateRequest;
import org.game.szurmonej.entity.Child;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.repository.ChildRepository;
import org.game.szurmonej.repository.UserRepository;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StreamUtils;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.HashSet;

@Service
public class ParentChildService {

    private final ChildRepository childRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final ResourceLoader resourceLoader;
    private byte[] defaultAvatarBytes;

    public ParentChildService(
            ChildRepository childRepository,
            UserRepository userRepository,
            CurrentUserService currentUserService,
            ResourceLoader resourceLoader
    ) {
        this.childRepository = childRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.resourceLoader = resourceLoader;
        loadDefaultAvatar();
    }

    @Transactional
    public Child addChildToCurrentUser(ChildCreateRequest request) {
        validateChildCreateRequest(request);

        User parent = currentUserService.getCurrentUser();

        Child child = new Child();
        child.setName(request.getName().trim());
        child.setSurname(request.getSurname().trim());
        child.setDateOfBirth(request.getDateOfBirth());

        // Ustaw domyślny awatar
        if (defaultAvatarBytes != null) {
            child.setAvatar(defaultAvatarBytes);
            child.setAvatarContentType("image/png");
        }

        child = childRepository.save(child);

        if (parent.getChildren() == null) {
            parent.setChildren(new HashSet<>());
        }
        parent.getChildren().add(child);

        if (child.getParents() == null) {
            child.setParents(new HashSet<>());
        }
        child.getParents().add(parent);

        userRepository.save(parent);
        childRepository.save(child);

        return child;
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

    private void validateChildCreateRequest(ChildCreateRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Imię dziecka jest wymagane");
        }
        if (request.getSurname() == null || request.getSurname().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nazwisko dziecka jest wymagane");
        }
        if (request.getDateOfBirth() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data urodzenia jest wymagana");
        }
        if (request.getDateOfBirth().isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data urodzenia nie może być z przyszłości");
        }
    }
}