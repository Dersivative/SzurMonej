package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.service.ClassMembershipService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Class Memberships", description = "Zarządzanie przynależnością dzieci do klas")
@RestController
@RequestMapping("/api/class-memberships")
public class ClassMembershipController {

    private final ClassMembershipService classMembershipService;

    public ClassMembershipController(ClassMembershipService classMembershipService) {
        this.classMembershipService = classMembershipService;
    }

    @Operation(summary = "Usuń dziecko z klasy (tylko skarbnik/admin)")
    @DeleteMapping("/{membershipId}")
    public ResponseEntity<Void> removeChildFromClass(@PathVariable Long membershipId) {
        classMembershipService.removeChildFromClass(membershipId);
        return ResponseEntity.noContent().build();
    }
}
