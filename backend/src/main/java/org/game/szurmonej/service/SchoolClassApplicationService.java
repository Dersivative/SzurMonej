package org.game.szurmonej.service;

import org.game.szurmonej.dto.SchoolClassApplicationRequest;
import org.game.szurmonej.dto.SchoolClassApplicationResponse;
import org.game.szurmonej.entity.EnrollmentStatus;
import org.game.szurmonej.entity.SchoolClass;
import org.game.szurmonej.entity.SchoolClassApplication;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.repository.SchoolClassApplicationRepository;
import org.game.szurmonej.repository.SchoolClassRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SchoolClassApplicationService {

    private final SchoolClassApplicationRepository applicationRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final CurrentUserService currentUserService;

    public SchoolClassApplicationService(SchoolClassApplicationRepository applicationRepository, SchoolClassRepository schoolClassRepository, CurrentUserService currentUserService) {
        this.applicationRepository = applicationRepository;
        this.schoolClassRepository = schoolClassRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public SchoolClassApplicationResponse createApplication(SchoolClassApplicationRequest request) {
        User currentUser = currentUserService.getCurrentUser();

        // Sprawdź, czy użytkownik nie ma już oczekującego wniosku
        applicationRepository.findByRequestingParent_IdAndStatus(currentUser.getId(), EnrollmentStatus.PENDING)
                .ifPresent(app -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Masz już jeden wniosek oczekujący na zatwierdzenie.");
                });

        // Sprawdź, czy nazwa nie jest już zajęta (w istniejących klasach lub wnioskach)
        if (schoolClassRepository.existsByLabel(request.getProposedName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Klasa o tej nazwie już istnieje.");
        }
        if (applicationRepository.existsByProposedNameAndStatus(request.getProposedName(), EnrollmentStatus.PENDING)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Wniosek o klasę o tej nazwie już oczekuje na zatwierdzenie.");
        }

        SchoolClassApplication application = new SchoolClassApplication();
        application.setProposedName(request.getProposedName());
        application.setRequestingParent(currentUser);
        application.setStatus(EnrollmentStatus.PENDING);
        application.setRequestedAt(Instant.now());

        return SchoolClassApplicationResponse.from(applicationRepository.save(application));
    }

    @Transactional(readOnly = true)
    public SchoolClassApplicationResponse findPendingApplicationForCurrentUser() {
        User currentUser = currentUserService.getCurrentUser();
        return applicationRepository.findByRequestingParent_IdAndStatus(currentUser.getId(), EnrollmentStatus.PENDING)
                .map(SchoolClassApplicationResponse::from)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<SchoolClassApplicationResponse> getApplicationsByStatus(EnrollmentStatus status) {
        return applicationRepository.findByStatus(status).stream()
                .map(SchoolClassApplicationResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public SchoolClassApplicationResponse approveApplication(Long applicationId) {
        SchoolClassApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono wniosku."));

        if (application.getStatus() != EnrollmentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wniosek został już rozpatrzony.");
        }

        // Stwórz nową klasę
        SchoolClass newClass = new SchoolClass();
        newClass.setLabel(application.getProposedName());
        newClass.setTreasurer(application.getRequestingParent());
        schoolClassRepository.save(newClass);

        // Zaktualizuj wniosek
        application.setStatus(EnrollmentStatus.APPROVED);
        application.setReviewedAt(Instant.now());
        application.setReviewedBy(currentUserService.getCurrentUser());

        return SchoolClassApplicationResponse.from(applicationRepository.save(application));
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public SchoolClassApplicationResponse rejectApplication(Long applicationId) {
        SchoolClassApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono wniosku."));

        if (application.getStatus() != EnrollmentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wniosek został już rozpatrzony.");
        }

        application.setStatus(EnrollmentStatus.REJECTED);
        application.setReviewedAt(Instant.now());
        application.setReviewedBy(currentUserService.getCurrentUser());

        return SchoolClassApplicationResponse.from(applicationRepository.save(application));
    }
}
