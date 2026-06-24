package org.game.szurmonej.controller;

import org.game.szurmonej.entity.Contribution;
import org.game.szurmonej.repository.ContributionRepository;
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
@RequestMapping("/api/contributions")
public class ContributionController {

    private final ContributionRepository contributionRepository;

    public ContributionController(ContributionRepository contributionRepository) {
        this.contributionRepository = contributionRepository;
    }

    @GetMapping
    public List<Contribution> getAllContributions() {
        return contributionRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Contribution> getContribution(@PathVariable Long id) {
        Optional<Contribution> contribution = contributionRepository.findById(id);
        return contribution.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public Contribution createContribution(@RequestBody Contribution contribution) {
        return contributionRepository.save(contribution);
    }
}
