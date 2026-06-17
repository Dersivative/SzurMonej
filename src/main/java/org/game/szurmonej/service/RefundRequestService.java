package org.game.szurmonej.service;

import org.game.szurmonej.dto.RefundRequestResponse;
import org.game.szurmonej.entity.*;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.repository.ContributionRepository;
import org.game.szurmonej.repository.FundraiserParticipantRepository;
import org.game.szurmonej.repository.RefundRepository;
import org.game.szurmonej.repository.RefundRequestRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
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

    public RefundRequestService(
            RefundRequestRepository refundRequestRepository,
            FundraiserParticipantRepository participantRepository,
            ContributionRepository contributionRepository,
            RefundRepository refundRepository,
            CurrentUserService currentUserService,
            AccountService accountService
    ) {
        this.refundRequestRepository = refundRequestRepository;
        this.participantRepository = participantRepository;
        this.contributionRepository = contributionRepository;
        this.refundRepository = refundRepository;
        this.currentUserService = currentUserService;
        this.accountService = accountService;
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

        accountService.refundFromFundraiser(
                fundraiser.getId(),
                refundRequest.getRequester().getId(),
                refundRequest.getAmount(),
                "Zwrot składki na prośbę"
        );

        refundRequest.setStatus(EnrollmentStatus.APPROVED);
        refundRequest.setReviewedAt(LocalDateTime.now());
        refundRequestRepository.save(refundRequest);
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
    }

    @Transactional(readOnly = true)
    public List<RefundRequestResponse> getPendingRefundRequests(Long fundraiserId) {
        return refundRequestRepository.findByParticipant_Fundraiser_IdAndStatus(fundraiserId, EnrollmentStatus.PENDING)
                .stream()
                .map(RefundRequestResponse::from)
                .collect(Collectors.toList());
    }
}
