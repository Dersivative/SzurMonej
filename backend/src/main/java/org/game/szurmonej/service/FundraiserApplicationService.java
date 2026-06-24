package org.game.szurmonej.service;

import org.game.szurmonej.dto.FundraiserApplicationRequest;
import org.game.szurmonej.dto.FundraiserApplicationResponse;
import org.game.szurmonej.dto.FundraiserCreateRequest;
import org.game.szurmonej.entity.*;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.repository.FundraiserApplicationRepository;
import org.game.szurmonej.repository.SchoolClassRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class FundraiserApplicationService {

    private final FundraiserApplicationRepository applicationRepository;
    private final FundraiserService fundraiserService;
    private final CurrentUserService currentUserService;
    private final SchoolClassRepository schoolClassRepository;

    public FundraiserApplicationService(FundraiserApplicationRepository applicationRepository, FundraiserService fundraiserService, CurrentUserService currentUserService, SchoolClassRepository schoolClassRepository) {
        this.applicationRepository = applicationRepository;
        this.fundraiserService = fundraiserService;
        this.currentUserService = currentUserService;
        this.schoolClassRepository = schoolClassRepository;
    }

    @Transactional
    public FundraiserApplicationResponse createApplication(FundraiserApplicationRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        SchoolClass schoolClass = schoolClassRepository.findById(request.getClassId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "School class not found"));

        FundraiserApplication application = new FundraiserApplication();
        application.setRequestingParent(currentUser);
        application.setSchoolClass(schoolClass);
        application.setTitle(request.getTitle());
        application.setDescription(request.getDescription());
        application.setFundraiserType(request.getFundraiserType());
        application.setGoalAmount(request.getGoalAmount());
        application.setPerChildAmount(request.getPerChildAmount());
        application.setParticipantIds(request.getParticipantIds());
        application.setStatus(EnrollmentStatus.PENDING);
        application.setRequestedAt(Instant.now());

        return FundraiserApplicationResponse.from(applicationRepository.save(application));
    }

    @Transactional(readOnly = true)
    public List<FundraiserApplicationResponse> getPendingApplications(Long classId) {
        return applicationRepository.findBySchoolClass_IdAndStatus(classId, EnrollmentStatus.PENDING).stream()
                .map(FundraiserApplicationResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void approveApplication(Long applicationId, FundraiserApplicationRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        FundraiserApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));

        if (!application.getSchoolClass().getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Only the class treasurer can approve applications.");
        }

        FundraiserCreateRequest createRequest = new FundraiserCreateRequest();
        createRequest.setTitle(request.getTitle());
        createRequest.setDescription(request.getDescription());
        createRequest.setFundraiserType(request.getFundraiserType());
        createRequest.setGoalAmount(request.getGoalAmount());
        createRequest.setPerChildAmount(request.getPerChildAmount());
        createRequest.setParticipantIds(request.getParticipantIds());

        fundraiserService.createFundraiser(createRequest, application.getSchoolClass().getId());

        application.setStatus(EnrollmentStatus.APPROVED);
        application.setReviewedBy(currentUser);
        application.setReviewedAt(Instant.now());
        applicationRepository.save(application);
    }

    @Transactional
    public void rejectApplication(Long applicationId) {
        User currentUser = currentUserService.getCurrentUser();
        FundraiserApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));

        if (!application.getSchoolClass().getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Only the class treasurer can reject applications.");
        }

        application.setStatus(EnrollmentStatus.REJECTED);
        application.setReviewedBy(currentUser);
        application.setReviewedAt(Instant.now());
        applicationRepository.save(application);
    }
}