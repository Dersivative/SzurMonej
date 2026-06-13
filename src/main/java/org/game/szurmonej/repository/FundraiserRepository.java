package org.game.szurmonej.repository;

import org.game.szurmonej.entity.Fundraiser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FundraiserRepository extends JpaRepository<Fundraiser, Long> {
}
