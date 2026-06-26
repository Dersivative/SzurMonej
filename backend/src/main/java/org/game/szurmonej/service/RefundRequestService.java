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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RefundRequestService {

    private final RefundRequestRepository refundRequestRepository;
    private final FundraiserParticipantRepository participantRepository;
    private final ContributionRepository contributionRepository;
    private final RefundRepository refundRepository;
    private final CurrentUserService currentUserService;
    private final AccountService accountService;
    private final ChildRepository childRepository;

    public RefundRequestService(
            RefundRequestRepository refundRequestRepository,
            FundraiserParticipantRepository participantRepository,
            ContributionRepository contributionRepository,
            RefundRepository refundRepository,
            CurrentUserService currentUserService,
            AccountService accountService,
            ChildRepository childRepository
    ) {
        this.refundRequestRepository = refundRequestRepository;
        this.participantRepository = participantRepository;
        this.contributionRepository = contributionRepository;
        this.refundRepository = refundRepository;
        this.currentUserService = currentUserService;
        this.accountService = accountService;
        this.childRepository = childRepository;
    }

    @Transactional
    public RefundRequestResponse createRefundRequest(Long fundraiserId, Long childId) {
        User currentUser = currentUserService.getCurrentUser();
        FundraiserParticipant participant = participantRepository.findByFundraiser_IdAndChild_Id(fundraiserId, childId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Participant not found."));
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Child not found."));

        if (participant.getFundraiser().getStatus() != FundraiserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refunds can only be requested for active fundraisers.");
        }
        if (refundRequestRepository.existsByParticipant_IdAndStatus(participant.getId(), EnrollmentStatus.PENDING)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A refund request for this participant is already pending.");
        }

        boolean isParent = child.getParents().stream().anyMatch(parent -> parent.getId().equals(currentUser.getId()));
        BigDecimal amountToRefund;
        RefundRequestType type;

        if (isParent) {
            // Parent requests a full withdrawal for their child.
            type = RefundRequestType.FULL_WITHDRAWAL;
            BigDecimal totalContributed = contributionRepository.findByParticipant_Id(participant.getId()).stream()
                    .map(Contribution::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalRefunded = refundRepository.findByContribution_Participant_Id(participant.getId()).stream()
                    .map(Refund::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            amountToRefund = totalContributed.subtract(totalRefunded);
        } else {
            // Non-parent requests a refund of their personal contribution.
            type = RefundRequestType.PERSONAL_CONTRIBUTION;
            List<Contribution> contributionsByUser = contributionRepository.findByParticipant_IdAndPayer_Id(participant.getId(), currentUser.getId());
            List<Refund> refundsForUser = refundRepository.findByContribution_Participant_IdAndContribution_Payer_Id(participant.getId(), currentUser.getId());
            BigDecimal totalContributedByUser = contributionsByUser.stream().map(Contribution::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalRefundedForUser = refundsForUser.stream().map(Refund::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            amountToRefund = totalContributedByUser.subtract(totalRefundedForUser);
        }

        if (amountToRefund.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No funds to refund.");
        }

        RefundRequest refundRequest = new RefundRequest();
        refundRequest.setParticipant(participant);
        refundRequest.setRequester(currentUser);
        refundRequest.setAmount(amountToRefund);
        refundRequest.setType(type);
        refundRequest.setRequestedAt(LocalDateTime.now());
        refundRequest.setStatus(EnrollmentStatus.PENDING);

        return RefundRequestResponse.from(refundRequestRepository.save(refundRequest));
    }

    @Transactional
    public void approveRefundRequest(Long requestId) {
        User currentUser = currentUserService.getCurrentUser();
        RefundRequest refundRequest = refundRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Refund request not found."));

        FundraiserParticipant participant = refundRequest.getParticipant();
        Fundraiser fundraiser = participant.getFundraiser();

        if (!fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Only the treasurer can approve refund requests.");
        }
        if (refundRequest.getStatus() != EnrollmentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request is not pending.");
        }

        if (refundRequest.getType() == RefundRequestType.FULL_WITHDRAWAL) {
            processFullWithdrawal(refundRequest, participant, fundraiser);
        } else { // PERSONAL_CONTRIBUTION
            processPersonalContributionRefund(refundRequest, fundraiser);
        }

        refundRequest.setStatus(EnrollmentStatus.APPROVED);
        refundRequest.setReviewedAt(LocalDateTime.now());
        refundRequestRepository.save(refundRequest);
    }

    private void processFullWithdrawal(RefundRequest refundRequest, FundraiserParticipant participant, Fundraiser fundraiser) {
        // Smart refund: find all original payers and refund them proportionally.
        Map<User, BigDecimal> contributionsByPayer = contributionRepository.findByParticipant_Id(participant.getId()).stream()
                .collect(Collectors.groupingBy(Contribution::getPayer, Collectors.mapping(Contribution::getAmount, Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))));
        Map<User, BigDecimal> refundsByPayer = refundRepository.findByContribution_Participant_Id(participant.getId()).stream()
                .filter(refund -> refund.getContribution() != null)
                .collect(Collectors.groupingBy(refund -> refund.getContribution().getPayer(), Collectors.mapping(Refund::getAmount, Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))));

        contributionsByPayer.forEach((payer, totalPaid) -> {
            BigDecimal totalRefunded = refundsByPayer.getOrDefault(payer, BigDecimal.ZERO);
            BigDecimal netToRefund = totalPaid.subtract(totalRefunded);
            if (netToRefund.compareTo(BigDecimal.ZERO) > 0) {
                validateFundraiserBalance(fundraiser, netToRefund);
                String note = String.format("Zwrot za dziecko: %s %s (pełne wycofanie na wniosek rodzica: %s)",
                        participant.getChild().getName(), participant.getChild().getSurname(), refundRequest.getRequester().getFullName());
                accountService.refundFromFundraiser(fundraiser.getId(), participant.getId(), payer.getId(), netToRefund, note);
            }
        });

        // Reset participant's financial state after a full withdrawal.
        participant.setDebt(participant.getDebt().add(refundRequest.getAmount()));
        participant.setCredit(BigDecimal.ZERO);
        participantRepository.save(participant);
    }

    private void processPersonalContributionRefund(RefundRequest refundRequest, Fundraiser fundraiser) {
        // Simple refund: return the requested amount to the user who made the request.
        validateFundraiserBalance(fundraiser, refundRequest.getAmount());
        FundraiserParticipant participant = refundRequest.getParticipant();
        String note = String.format("Zwrot własnej wpłaty za dziecko: %s %s",
                participant.getChild().getName(), participant.getChild().getSurname());
        accountService.refundFromFundraiser(fundraiser.getId(), participant.getId(), refundRequest.getRequester().getId(), refundRequest.getAmount(), note);

        // Restore debt for the participant for the refunded amount.
        participant.setDebt(participant.getDebt().add(refundRequest.getAmount()));
        participantRepository.save(participant);
    }

    private void validateFundraiserBalance(Fundraiser fundraiser, BigDecimal amount) {
        if (fundraiser.getAccount().getBalance().compareTo(amount) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fundraiser has insufficient funds for this refund operation.");
        }
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