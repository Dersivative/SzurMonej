package org.game.szurmonej.service;

import org.game.szurmonej.dto.RefundRequestResponse;
import org.game.szurmonej.entity.*;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RefundRequestService {

    private final RefundRequestRepository refundRequestRepository;
    private final FundraiserParticipantRepository participantRepository;
    private final ContributionRepository contributionRepository;
    private final RefundRepository refundRepository;
    private final CurrentUserService currentUserService;
    private final AccountService accountService;
    private final ClassMembershipRepository classMembershipRepository;

    public RefundRequestService(
            RefundRequestRepository refundRequestRepository,
            FundraiserParticipantRepository participantRepository,
            ContributionRepository contributionRepository,
            RefundRepository refundRepository,
            CurrentUserService currentUserService,
            AccountService accountService,
            ClassMembershipRepository classMembershipRepository
    ) {
        this.refundRequestRepository = refundRequestRepository;
        this.participantRepository = participantRepository;
        this.contributionRepository = contributionRepository;
        this.refundRepository = refundRepository;
        this.currentUserService = currentUserService;
        this.accountService = accountService;
        this.classMembershipRepository = classMembershipRepository;
    }

    @Transactional
    public RefundRequestResponse createRefundRequest(Long fundraiserId, Long childId) {
        User currentUser = currentUserService.getCurrentUser();
        FundraiserParticipant participant = participantRepository.findByFundraiser_IdAndChild_Id(fundraiserId, childId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Participant not found."));

        if (participant.getFundraiser().getStatus() != FundraiserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refunds can only be requested for active fundraisers.");
        }

        List<Contribution> contributions = contributionRepository.findByParticipant_Id(participant.getId());
        List<Refund> refunds = refundRepository.findByContribution_Participant_Fundraiser_Id(fundraiserId);

        BigDecimal totalContributed = contributions.stream()
                .map(Contribution::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalRefunded = refunds.stream()
                .filter(refund -> refund.getContribution() != null && refund.getContribution().getParticipant().getId().equals(participant.getId()))
                .map(Refund::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netContribution = totalContributed.subtract(totalRefunded);

        if (netContribution.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No funds to refund for this participant.");
        }

        RefundRequest refundRequest = new RefundRequest();
        refundRequest.setParticipant(participant);
        refundRequest.setRequester(currentUser);
        refundRequest.setAmount(netContribution);
        refundRequest.setRequestedAt(LocalDateTime.now());
        refundRequest.setStatus(EnrollmentStatus.PENDING);

        return RefundRequestResponse.from(refundRequestRepository.save(refundRequest));
    }

    @Transactional
    public void approveRefundRequest(Long requestId) {
        User currentUser = currentUserService.getCurrentUser();
        RefundRequest refundRequest = refundRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Refund request not found."));

        Fundraiser fundraiser = refundRequest.getParticipant().getFundraiser();
        if (!fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Only the treasurer can approve refund requests.");
        }

        if (refundRequest.getStatus() != EnrollmentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request is not pending.");
        }

        String note = String.format("Zwrot na prośbę %s za dziecko: %s %s",
                refundRequest.getRequester().getFullName(),
                refundRequest.getParticipant().getChild().getName(),
                refundRequest.getParticipant().getChild().getSurname());

        accountService.refundFromFundraiser(
                fundraiser.getId(),
                refundRequest.getRequester().getId(),
                refundRequest.getAmount(),
                note
        );

        refundRequest.setStatus(EnrollmentStatus.APPROVED);
        refundRequest.setReviewedAt(LocalDateTime.now());
        refundRequestRepository.save(refundRequest);

        FundraiserParticipant participant = refundRequest.getParticipant();
        participant.setRemovedAt(LocalDate.now());
        participantRepository.save(participant);

        // Check if the child can be fully removed from the class
        checkAndFinalizeClassRemoval(participant.getChild());
    }

    @Transactional
    public void rejectRefundRequest(Long requestId) {
        User currentUser = currentUserService.getCurrentUser();
        RefundRequest refundRequest = refundRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Refund request not found."));

        if (!refundRequest.getParticipant().getFundraiser().getSchoolClass().getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Only the treasurer can reject refund requests.");
        }

        if (refundRequest.getStatus() != EnrollmentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request is not pending.");
        }

        refundRequest.setStatus(EnrollmentStatus.REJECTED);
        refundRequest.setReviewedAt(LocalDateTime.now());
        refundRequestRepository.save(refundRequest);

        // Since the refund was rejected, the child's removal from the class might need to be reverted.
        FundraiserParticipant participant = refundRequest.getParticipant();
        participant.setStatus(EnrollmentStatus.APPROVED); // Revert status
        participantRepository.save(participant);

        // Also revert the class membership status if it was pending removal
        classMembershipRepository.findByChild_IdAndStatus(participant.getChild().getId(), EnrollmentStatus.REMOVAL_PENDING)
                .ifPresent(membership -> {
                    membership.setStatus(EnrollmentStatus.APPROVED);
                    classMembershipRepository.save(membership);
                });
    }

    private void checkAndFinalizeClassRemoval(Child child) {
        // Check if there are any other active participations for this child
        boolean hasOtherActiveParticipations = participantRepository.findByChild_Id(child.getId())
                .stream()
                .anyMatch(p -> p.getRemovedAt() == null);

        if (!hasOtherActiveParticipations) {
            // No other active participations, find the class membership and finalize removal
            classMembershipRepository.findByChild_IdAndStatus(child.getId(), EnrollmentStatus.REMOVAL_PENDING)
                    .ifPresent(membership -> {
                        membership.setLeftAt(LocalDate.now());
                        membership.setStatus(EnrollmentStatus.REJECTED); // Or another final status
                        classMembershipRepository.save(membership);
                    });
        }
    }

    @Transactional(readOnly = true)
    public List<RefundRequestResponse> getPendingRefundRequests(Long fundraiserId) {
        return refundRequestRepository.findByParticipant_Fundraiser_IdAndStatus(fundraiserId, EnrollmentStatus.PENDING)
                .stream()
                .map(RefundRequestResponse::from)
                .collect(Collectors.toList());
    }
}