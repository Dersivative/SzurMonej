package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.entity.ClassMembership;
import org.game.szurmonej.entity.FundraiserParticipant;
import org.game.szurmonej.entity.FundraiserStatus;
import org.game.szurmonej.repository.ClassMembershipRepository;
import org.game.szurmonej.repository.FundraiserParticipantRepository;
import org.game.szurmonej.service.ClassMembershipService;
import org.game.szurmonej.service.FundraiserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Tag(name = "Class Memberships", description = "Zarządzanie przynależnością dzieci do klas")
@RestController
@RequestMapping("/api/class-memberships")
public class ClassMembershipController {

    private final ClassMembershipService classMembershipService;
    private final FundraiserService fundraiserService;
    private final FundraiserParticipantRepository fundraiserParticipantRepository;
    private final ClassMembershipRepository classMembershipRepository;

    public ClassMembershipController(ClassMembershipService classMembershipService,
                                     FundraiserService fundraiserService,
                                     FundraiserParticipantRepository fundraiserParticipantRepository,
                                     ClassMembershipRepository classMembershipRepository) {
        this.classMembershipService = classMembershipService;
        this.fundraiserService = fundraiserService;
        this.fundraiserParticipantRepository = fundraiserParticipantRepository;
        this.classMembershipRepository = classMembershipRepository;
    }

    @Operation(summary = "Usuń dziecko z klasy (rodzic/skarbnik/admin)")
    @DeleteMapping("/{membershipId}")
    @Transactional
    public ResponseEntity<Void> removeChildFromClass(@PathVariable Long membershipId) {
        ClassMembership membership = classMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membership not found"));

        List<FundraiserParticipant> activeParticipations = fundraiserParticipantRepository.findByChild_Id(membership.getChild().getId())
                .stream()
                .filter(p -> p.getRemovedAt() == null && (p.getFundraiser().getStatus() == FundraiserStatus.ACTIVE || p.getFundraiser().getStatus() == FundraiserStatus.RECONCILING))
                .collect(Collectors.toList());

        if (!activeParticipations.isEmpty()) {
            for (FundraiserParticipant participation : activeParticipations) {
                fundraiserService.removeParticipant(participation.getFundraiser().getId(), participation.getChild().getId());
            }
        }
        
        classMembershipService.removeChildFromClass(membershipId);
        
        return ResponseEntity.noContent().build();
    }
}