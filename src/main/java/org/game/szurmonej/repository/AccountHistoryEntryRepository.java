package org.game.szurmonej.repository;

import org.game.szurmonej.entity.AccountHistoryEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccountHistoryEntryRepository extends JpaRepository<AccountHistoryEntry, Long> {
    List<AccountHistoryEntry> findByAccount_Fundraiser_Id(Long fundraiserId);
}
