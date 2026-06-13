package org.game.szurmonej.service;

import org.game.szurmonej.dto.ChildCreateRequest;
import org.game.szurmonej.entity.Child;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.repository.ChildRepository;
import org.game.szurmonej.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.HashSet;

@Service
public class ParentChildService {

    private final ChildRepository childRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    public ParentChildService(
            ChildRepository childRepository,
            UserRepository userRepository,
            CurrentUserService currentUserService
    ) {
        this.childRepository = childRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public Child addChildToCurrentUser(ChildCreateRequest request) {
        validateChildCreateRequest(request);

        User parent = currentUserService.getCurrentUser();

        Child child = new Child();
        child.setName(request.getName().trim());
        child.setSurname(request.getSurname().trim());
        child.setDateOfBirth(request.getDateOfBirth());
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