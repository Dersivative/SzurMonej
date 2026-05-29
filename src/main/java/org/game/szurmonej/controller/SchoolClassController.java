package org.game.szurmonej.controller;

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

@RestController
@RequestMapping("/api/school-classes")
public class SchoolClassController {

    private final SchoolClassRepository schoolClassRepository;

    public SchoolClassController(SchoolClassRepository schoolClassRepository) {
        this.schoolClassRepository = schoolClassRepository;
    }

    @GetMapping
    public List<SchoolClass> getAllSchoolClasses() {
        return schoolClassRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SchoolClass> getSchoolClass(@PathVariable Long id) {
        Optional<SchoolClass> schoolClass = schoolClassRepository.findById(id);
        return schoolClass.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public SchoolClass createSchoolClass(@RequestBody SchoolClass schoolClass) {
        return schoolClassRepository.save(schoolClass);
    }
}
