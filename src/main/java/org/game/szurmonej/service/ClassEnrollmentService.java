package org.game.szurmonej.service;

import org.game.szurmonej.dto.EnrollmentApplicationRequest;
import org.game.szurmonej.dto.EnrollmentLinkPreviewResponse;
import org.game.szurmonej.dto.EnrollmentLinkResponse;
import org.game.szurmonej.entity.Child;
import org.game.szurmonej.entity.ClassEnrollmentApplication;
import org.game.szurmonej.entity.ClassEnrollmentLink;
import org.game.szurmonej.entity.ClassMembership;
import org.game.szurmonej.entity.EnrollmentStatus;
import org.game.szurmonej.entity.SchoolClass;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.exception.ResourceNotFoundException;
import org.game.szurmonej.repository.ChildRepository;
import org.game.szurmonej.repository.ClassEnrollmentApplicationRepository;
import org.game.szurmonej.repository.ClassEnrollmentLinkRepository;
import org.game.szurmonej.repository.ClassMembershipRepository;
import org.game.szurmonej.repository.SchoolClassRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class ClassEnrollmentService {

    private final ClassEnrollmentLinkRepository linkRepository;
    private final ClassEnrollmentApplicationRepository applicationRepository;
    private final ClassMembershipRepository membershipRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final ChildRepository childRepository;
    private final CurrentUserService currentUserService;
    private final String frontendBaseUrl;

    public ClassEnrollmentService(
            ClassEnrollmentLinkRepository linkRepository,
            ClassEnrollmentApplicationRepository applicationRepository,
            ClassMembershipRepository membershipRepository,
            SchoolClassRepository schoolClassRepository,
            ChildRepository childRepository,
            CurrentUserService currentUserService,
            @Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl
    ) {
        this.linkRepository = linkRepository;
        this.applicationRepository = applicationRepository;
        this.membershipRepository = membershipRepository;
        this.schoolClassRepository = schoolClassRepository;
        this.childRepository = childRepository;
        this.currentUserService = currentUserService;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Transactional
    public EnrollmentLinkResponse generateEnrollmentLink(Long classId) {
        SchoolClass schoolClass = getSchoolClass(classId);
        User treasurer = currentUserService.getCurrentUser();
        assertTreasurer(schoolClass, treasurer);

        linkRepository.findBySchoolClass_IdAndActiveTrue(classId).ifPresent(existing -> {
            existing.setActive(false);
            linkRepository.save(existing);
        });

        ClassEnrollmentLink link = new ClassEnrollmentLink();
        link.setSchoolClass(schoolClass);
        link.setToken(UUID.randomUUID());
        link.setActive(true);
        link.setCreatedAt(Instant.now());
        link.setCreatedBy(treasurer);

        return EnrollmentLinkResponse.from(linkRepository.save(link), frontendBaseUrl);
    }

    @Transactional(readOnly = true)
    public EnrollmentLinkResponse getActiveEnrollmentLink(Long classId) {
        SchoolClass schoolClass = getSchoolClass(classId);
        assertTreasurer(schoolClass, currentUserService.getCurrentUser());

        ClassEnrollmentLink link = linkRepository.findBySchoolClass_IdAndActiveTrue(classId)
                .orElseThrow(() -> new ResourceNotFoundException("No active enrollment link for this class"));

        return EnrollmentLinkResponse.from(link, frontendBaseUrl);
    }

    @Transactional
    public void deactivateEnrollmentLink(Long classId) {
        SchoolClass schoolClass = getSchoolClass(classId);
        assertTreasurer(schoolClass, currentUserService.getCurrentUser());

        ClassEnrollmentLink link = linkRepository.findBySchoolClass_IdAndActiveTrue(classId)
                .orElseThrow(() -> new ResourceNotFoundException("No active enrollment link for this class"));

        link.setActive(false);
        linkRepository.save(link);
    }

    @Transactional(readOnly = true)
    public EnrollmentLinkPreviewResponse previewEnrollmentLink(String token) {
        ClassEnrollmentLink link = getActiveLinkByToken(token);
        return EnrollmentLinkPreviewResponse.from(link);
    }

    @Transactional
    public ClassEnrollmentApplication submitApplication(String token, EnrollmentApplicationRequest request) {
        if (request.getChildId() == null) {
            throw new IllegalArgumentException("childId is required");
        }

        ClassEnrollmentLink link = getActiveLinkByToken(token);
        User parent = currentUserService.getCurrentUser();
        Child child = getChildOwnedByParent(request.getChildId(), parent);
        SchoolClass schoolClass = link.getSchoolClass();

        assertNoActiveMembership(schoolClass.getId(), child.getId());
        assertNoPendingApplication(schoolClass.getId(), child.getId());

        ClassEnrollmentApplication application = new ClassEnrollmentApplication();
        application.setSchoolClass(schoolClass);
        application.setChild(child);
        application.setParent(parent);
        application.setEnrollmentLink(link);
        application.setStatus(EnrollmentStatus.PENDING);
        application.setRequestedAt(Instant.now());

        // Deactivate the link after successful submission
        link.setActive(false);
        linkRepository.save(link);

        return applicationRepository.save(application);
    }

    @Transactional(readOnly = true)
    public List<ClassEnrollmentApplication> getApplicationsForCurrentParent() {
        User parent = currentUserService.getCurrentUser();
        return applicationRepository.findByParent_Id(parent.getId());
    }

    @Transactional(readOnly = true)
    public List<ClassEnrollmentApplication> getApplicationsForClass(Long classId, EnrollmentStatus status) {
        SchoolClass schoolClass = getSchoolClass(classId);
        assertTreasurer(schoolClass, currentUserService.getCurrentUser());

        if (status != null) {
            return applicationRepository.findBySchoolClass_IdAndStatus(classId, status);
        }
        return applicationRepository.findBySchoolClass_Id(classId);
    }

    @Transactional
    public ClassEnrollmentApplication approveApplication(Long classId, Long applicationId) {
        SchoolClass schoolClass = getSchoolClass(classId);
        User treasurer = currentUserService.getCurrentUser();
        assertTreasurer(schoolClass, treasurer);

        ClassEnrollmentApplication application = getApplicationForClass(classId, applicationId);
        assertPending(application);

        assertNoActiveMembership(classId, application.getChild().getId());

        ClassMembership membership = new ClassMembership();
        membership.setSchoolClass(schoolClass);
        membership.setChild(application.getChild());
        membership.setJoinedAt(LocalDate.now());
        membershipRepository.save(membership);

        application.setStatus(EnrollmentStatus.APPROVED);
        application.setReviewedAt(Instant.now());
        application.setReviewedBy(treasurer);

        return applicationRepository.save(application);
    }

    @Transactional
    public ClassEnrollmentApplication rejectApplication(Long classId, Long applicationId) {
        SchoolClass schoolClass = getSchoolClass(classId);
        User treasurer = currentUserService.getCurrentUser();
        assertTreasurer(schoolClass, treasurer);

        ClassEnrollmentApplication application = getApplicationForClass(classId, applicationId);
        assertPending(application);

        application.setStatus(EnrollmentStatus.REJECTED);
        application.setReviewedAt(Instant.now());
        application.setReviewedBy(treasurer);

        return applicationRepository.save(application);
    }

    private SchoolClass getSchoolClass(Long classId) {
        return schoolClassRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("School class not found: " + classId));
    }

    private ClassEnrollmentLink getActiveLinkByToken(String token) {
        UUID parsedToken;
        try {
            parsedToken = UUID.fromString(token);
        } catch (IllegalArgumentException e) {
            throw new ResourceNotFoundException("Enrollment link not found");
        }

        return linkRepository.findByTokenAndActiveTrue(parsedToken)
                .orElseThrow(() -> new ResourceNotFoundException("Enrollment link not found"));
    }

    private ClassEnrollmentApplication getApplicationForClass(Long classId, Long applicationId) {
        ClassEnrollmentApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Enrollment application not found: " + applicationId));

        if (!application.getSchoolClass().getId().equals(classId)) {
            throw new ResourceNotFoundException("Enrollment application not found for this class");
        }

        return application;
    }

    private Child getChildOwnedByParent(Long childId, User parent) {
        return childRepository.findByParents(parent).stream()
                .filter(child -> child.getId().equals(childId))
                .findFirst()
                .orElseThrow(() -> new ForbiddenOperationException("Child does not belong to the current user"));
    }

    private void assertTreasurer(SchoolClass schoolClass, User user) {
        if (!schoolClass.getTreasurer().getId().equals(user.getId())) {
            throw new ForbiddenOperationException("Only the class treasurer can manage enrollment for this class");
        }
    }

    private void assertNoActiveMembership(Long classId, Long childId) {
        if (membershipRepository.findBySchoolClass_IdAndChild_IdAndLeftAtIsNull(classId, childId).isPresent()) {
            throw new IllegalArgumentException("Child is already an active member of this class");
        }
    }

    private void assertNoPendingApplication(Long classId, Long childId) {
        if (applicationRepository.existsBySchoolClass_IdAndChild_IdAndStatus(classId, childId, EnrollmentStatus.PENDING)) {
            throw new IllegalArgumentException("A pending enrollment application already exists for this child and class");
        }
    }

    private void assertPending(ClassEnrollmentApplication application) {
        if (application.getStatus() != EnrollmentStatus.PENDING) {
            throw new IllegalArgumentException("Only pending applications can be reviewed");
        }
    }
}