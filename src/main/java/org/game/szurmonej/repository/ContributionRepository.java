package org.game.szurmonej.repository;

import org.game.szurmonej.entity.Contribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContributionRepository extends JpaRepository<Contribution, Long> {
    List<Contribution> findByParticipant_Fundraiser_Id(Long fundraiserId);
    List<Contribution> findByParticipant_Id(Long participantId);
    List<Contribution> findByParticipant_Fundraiser_IdAndPayer_Id(Long fundraiserId, Long payerId);
}
