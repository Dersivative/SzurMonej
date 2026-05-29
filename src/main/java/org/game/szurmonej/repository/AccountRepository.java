package org.game.szurmonej.repository;

import org.game.szurmonej.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {

    Optional<Account> findByUser_Id(Long userId);

    Optional<Account> findByFundraiser_Id(Long fundraiserId);
}
