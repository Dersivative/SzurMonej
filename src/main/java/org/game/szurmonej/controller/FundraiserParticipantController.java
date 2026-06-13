package org.game.szurmonej.controller;

import org.game.szurmonej.entity.FundraiserParticipant;
import org.game.szurmonej.repository.FundraiserParticipantRepository;
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
@RequestMapping("/api/fundraiser-participants")
public class FundraiserParticipantController {

    private final FundraiserParticipantRepository participantRepository;

    public FundraiserParticipantController(FundraiserParticipantRepository participantRepository) {
        this.participantRepository = participantRepository;
    }

    @GetMapping
    public List<FundraiserParticipant> getAllParticipants() {
        return participantRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<FundraiserParticipant> getParticipant(@PathVariable Long id) {
        Optional<FundraiserParticipant> participant = participantRepository.findById(id);
        return participant.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public FundraiserParticipant createParticipant(@RequestBody FundraiserParticipant participant) {
        return participantRepository.save(participant);
    }
}
