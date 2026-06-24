package org.game.szurmonej.controller;

import org.game.szurmonej.dto.ChildCreateRequest;
import org.game.szurmonej.entity.Child;
import org.game.szurmonej.repository.ChildRepository;
import org.game.szurmonej.service.ChildService;
import org.game.szurmonej.service.ParentChildService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Optional;

@RestController
@RequestMapping("/api/children")
public class ChildController {

    private final ChildRepository childRepository; // Keep for avatar logic for now
    private final ChildService childService;
    private final ParentChildService parentChildService;

    public ChildController(ChildRepository childRepository, ChildService childService, ParentChildService parentChildService) {
        this.childRepository = childRepository;
        this.childService = childService;
        this.parentChildService = parentChildService;
    }

    @PostMapping
    public Child createChild(@RequestBody ChildCreateRequest request) {
        return parentChildService.addChildToCurrentUser(request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChild(@PathVariable Long id) {
        childService.deleteChild(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/avatar")
    public ResponseEntity<String> uploadAvatar(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        Optional<Child> childOptional = childRepository.findById(id);
        if (childOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        try {
            Child child = childOptional.get();
            child.setAvatar(file.getBytes());
            child.setAvatarContentType(file.getContentType());
            childRepository.save(child);
            return ResponseEntity.ok("Avatar uploaded successfully");
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to upload avatar");
        }
    }

    @GetMapping("/{id}/avatar")
    public ResponseEntity<byte[]> getAvatar(@PathVariable Long id) {
        Optional<Child> childOptional = childRepository.findById(id);
        if (childOptional.isEmpty() || childOptional.get().getAvatar() == null) {
            return ResponseEntity.notFound().build();
        }

        Child child = childOptional.get();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, child.getAvatarContentType())
                .body(child.getAvatar());
    }
}