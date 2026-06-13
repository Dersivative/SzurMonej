package org.game.szurmonej.controller;

import org.game.szurmonej.entity.ClassMembership;
import org.game.szurmonej.repository.ClassMembershipRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/class-memberships")
public class ClassMembershipController {

    private final ClassMembershipRepository classMembershipRepository;

    public ClassMembershipController(ClassMembershipRepository classMembershipRepository) {
        this.classMembershipRepository = classMembershipRepository;
    }

    @GetMapping
    public List<ClassMembership> getAllMemberships() {
        return classMembershipRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClassMembership> getMembership(@PathVariable Long id) {
        Optional<ClassMembership> membership = classMembershipRepository.findById(id);
        return membership.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ClassMembership createMembership(@RequestBody ClassMembership membership) {
        return classMembershipRepository.save(membership);
    }
}
