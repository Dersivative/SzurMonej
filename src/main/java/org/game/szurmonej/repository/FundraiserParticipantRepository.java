package org.game.szurmonej.repository;

import org.game.szurmonej.entity.FundraiserParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FundraiserParticipantRepository extends JpaRepository<FundraiserParticipant, Long> {

    Optional<FundraiserParticipant> findByFundraiser_IdAndChild_Id(Long fundraiserId, Long childId);

    List<FundraiserParticipant> findByFundraiser_IdAndRemovedAtIsNull(Long fundraiserId);

    List<FundraiserParticipant> findByChild_Id(Long childId);

    long countByFundraiser_IdAndRemovedAtIsNull(Long fundraiserId);
}
