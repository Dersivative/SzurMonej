package org.game.szurmonej.controller;

import org.game.szurmonej.dto.SchoolClassResponse;
import org.game.szurmonej.entity.SchoolClass;
import org.game.szurmonej.repository.SchoolClassRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/school-classes")
public class SchoolClassController {

    private final SchoolClassRepository schoolClassRepository;

    public SchoolClassController(SchoolClassRepository schoolClassRepository) {
        this.schoolClassRepository = schoolClassRepository;
    }

    @GetMapping
    public List<SchoolClassResponse> getAllSchoolClasses() {
        return schoolClassRepository.findAll().stream()
                .map(SchoolClassResponse::from)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SchoolClassResponse> getSchoolClass(@PathVariable Long id) {
        Optional<SchoolClass> schoolClass = schoolClassRepository.findById(id);
        return schoolClass.map(sc -> ResponseEntity.ok(SchoolClassResponse.from(sc)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Keep create endpoint returning entity for now to not break tests, ideally it should also be changed
    @PostMapping
    public SchoolClass createSchoolClass(@RequestBody SchoolClass schoolClass) {
        return schoolClassRepository.save(schoolClass);
    }
}