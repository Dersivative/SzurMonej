package org.game.szurmonej.service;

import org.game.szurmonej.entity.Child;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.repository.ChildRepository;
import org.game.szurmonej.repository.ClassMembershipRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ChildService {

    private final ChildRepository childRepository;
    private final ClassMembershipRepository classMembershipRepository;
    private final CurrentUserService currentUserService;
    private final ClassMembershipService classMembershipService;

    public ChildService(ChildRepository childRepository,
                        ClassMembershipRepository classMembershipRepository,
                        CurrentUserService currentUserService,
                        @Lazy ClassMembershipService classMembershipService) {
        this.childRepository = childRepository;
        this.classMembershipRepository = classMembershipRepository;
        this.currentUserService = currentUserService;
        this.classMembershipService = classMembershipService;
    }

    @Transactional
    public void deleteChild(Long childId) {
        User currentUser = currentUserService.getCurrentUser();
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Child not found."));

        // Authorization
        boolean isParent = child.getParents().stream()
                .anyMatch(parent -> parent.getId().equals(currentUser.getId()));
        boolean isAdmin = currentUser.isAdmin();

        if (!isParent && !isAdmin) {
            throw new ForbiddenOperationException("You are not authorized to perform this action.");
        }

        // Find active class membership and initiate removal.
        // This will trigger the fundraiser removal process.
        // If the child is not in a class, this does nothing.
        classMembershipRepository.findByChild_IdAndLeftAtIsNull(childId)
                .forEach(membership -> classMembershipService.removeChildFromClass(membership.getId()));
    }
}