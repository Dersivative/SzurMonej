package org.game.szurmonej.repository;

import org.game.szurmonej.entity.EnrollmentStatus;
import org.game.szurmonej.entity.RefundRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {
    List<RefundRequest> findByParticipant_Fundraiser_IdAndStatus(Long fundraiserId, EnrollmentStatus status);
    List<RefundRequest> findByParticipant_Child_Id(Long childId);
    boolean existsByParticipant_IdAndStatus(Long participantId, EnrollmentStatus status);
}