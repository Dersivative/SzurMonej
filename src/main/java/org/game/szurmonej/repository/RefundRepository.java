package org.game.szurmonej.repository;

import org.game.szurmonej.entity.Refund;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RefundRepository extends JpaRepository<Refund, Long> {
    List<Refund> findByContribution_Participant_Fundraiser_Id(Long fundraiserId);
}
