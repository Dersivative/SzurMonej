package org.game.szurmonej.repository;

import org.game.szurmonej.entity.Refund;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RefundRepository extends JpaRepository<Refund, Long> {
    List<Refund> findByContribution_Participant_Fundraiser_Id(Long fundraiserId);
    List<Refund> findByAccountHistoryEntry_Account_Fundraiser_Id(Long fundraiserId);
    List<Refund> findByContribution_Participant_Id(Long participantId);
    List<Refund> findByContribution_Participant_IdAndContribution_Payer_Id(Long participantId, Long payerId);
}