package org.game.szurmonej.service;

import org.game.szurmonej.entity.Child;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.repository.ChildRepository;
import org.game.szurmonej.repository.ClassMembershipRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ChildService {

    private final ChildRepository childRepository;
    private final ClassMembershipRepository classMembershipRepository;
    private final CurrentUserService currentUserService;

    public ChildService(ChildRepository childRepository,
                        ClassMembershipRepository classMembershipRepository,
                        CurrentUserService currentUserService) {
        this.childRepository = childRepository;
        this.classMembershipRepository = classMembershipRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public void archiveChild(Long childId) {
        User currentUser = currentUserService.getCurrentUser();
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Child not found."));

        // Authorization
        boolean isParent = child.getParents().stream()
                .anyMatch(parent -> parent.getId().equals(currentUser.getId()));
        boolean isAdmin = currentUser.isAdmin();

        if (!isParent && !isAdmin) {
            throw new ForbiddenOperationException("You are not authorized to archive this child.");
        }

        // Business Rule: Check if the child is a member of any class.
        boolean isMemberOfAnyClass = classMembershipRepository.existsByChild_IdAndLeftAtIsNull(childId);
        if (isMemberOfAnyClass) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot archive child. Please remove the child from their class first.");
        }

        child.setArchived(true);
        childRepository.save(child);
    }
}