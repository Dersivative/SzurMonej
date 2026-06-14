package org.game.szurmonej.service;

import org.game.szurmonej.entity.ClassMembership;
import org.game.szurmonej.entity.FundraiserStatus;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.repository.ClassMembershipRepository;
import org.game.szurmonej.repository.FundraiserParticipantRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;

@Service
public class ClassMembershipService {

    private final ClassMembershipRepository classMembershipRepository;
    private final FundraiserParticipantRepository fundraiserParticipantRepository;
    private final CurrentUserService currentUserService;

    public ClassMembershipService(ClassMembershipRepository classMembershipRepository,
                                  FundraiserParticipantRepository fundraiserParticipantRepository,
                                  CurrentUserService currentUserService) {
        this.classMembershipRepository = classMembershipRepository;
        this.fundraiserParticipantRepository = fundraiserParticipantRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public void removeChildFromClass(Long membershipId) {
        var currentUser = currentUserService.getCurrentUser();
        var membership = classMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membership not found"));

        if (!membership.getSchoolClass().getTreasurer().getId().equals(currentUser.getId()) && !currentUser.isAdmin()) {
            throw new ForbiddenOperationException("Only the class treasurer or an admin can remove a child from the class.");
        }

        boolean hasActiveFundraisers = fundraiserParticipantRepository.findByChild_Id(membership.getChild().getId())
                .stream()
                .anyMatch(p -> p.getFundraiser().getStatus() == FundraiserStatus.ACTIVE || p.getFundraiser().getStatus() == FundraiserStatus.RECONCILING);

        if (hasActiveFundraisers) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot remove child. The child is a participant in one or more active or reconciling fundraisers. Please resolve them first.");
        }

        membership.setLeftAt(LocalDate.now());
        classMembershipRepository.save(membership);
    }
}
