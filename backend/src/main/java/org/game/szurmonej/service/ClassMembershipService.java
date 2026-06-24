package org.game.szurmonej.service;

import org.game.szurmonej.entity.ClassMembership;
import org.game.szurmonej.entity.EnrollmentStatus;
import org.game.szurmonej.entity.FundraiserParticipant;
import org.game.szurmonej.entity.FundraiserStatus;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.repository.ClassMembershipRepository;
import org.game.szurmonej.repository.FundraiserParticipantRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ClassMembershipService {

    private final ClassMembershipRepository classMembershipRepository;
    private final FundraiserParticipantRepository fundraiserParticipantRepository;
    private final CurrentUserService currentUserService;
    private final FundraiserService fundraiserService;

    public ClassMembershipService(ClassMembershipRepository classMembershipRepository,
                                  FundraiserParticipantRepository fundraiserParticipantRepository,
                                  CurrentUserService currentUserService,
                                  @Lazy FundraiserService fundraiserService) {
        this.classMembershipRepository = classMembershipRepository;
        this.fundraiserParticipantRepository = fundraiserParticipantRepository;
        this.currentUserService = currentUserService;
        this.fundraiserService = fundraiserService;
    }

    @Transactional
    public void removeChildFromClass(Long membershipId) {
        User currentUser = currentUserService.getCurrentUser();
        ClassMembership membership = classMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membership not found"));

        boolean isParent = membership.getChild().getParents().stream()
                .anyMatch(parent -> parent.getId().equals(currentUser.getId()));
        boolean isTreasurer = membership.getSchoolClass().getTreasurer().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.isAdmin();

        if (!isParent && !isTreasurer && !isAdmin) {
            throw new ForbiddenOperationException("Only the parent, class treasurer, or an admin can remove this child from the class.");
        }

        List<FundraiserParticipant> activeParticipations = fundraiserParticipantRepository.findByChild_Id(membership.getChild().getId())
                .stream()
                .filter(p -> p.getRemovedAt() == null && (p.getFundraiser().getStatus() == FundraiserStatus.ACTIVE || p.getFundraiser().getStatus() == FundraiserStatus.RECONCILING))
                .collect(Collectors.toList());

        if (activeParticipations.isEmpty()) {
            membership.setLeftAt(LocalDate.now());
            membership.setStatus(EnrollmentStatus.REJECTED);
            classMembershipRepository.save(membership);
        } else {
            membership.setStatus(EnrollmentStatus.REMOVAL_PENDING);
            classMembershipRepository.save(membership);
            
            for (FundraiserParticipant participation : activeParticipations) {
                fundraiserService.removeParticipant(participation.getFundraiser().getId(), participation.getChild().getId());
            }
        }
    }
}