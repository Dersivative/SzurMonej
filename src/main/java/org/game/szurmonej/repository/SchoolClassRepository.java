package org.game.szurmonej.repository;

import org.game.szurmonej.entity.SchoolClass;
import org.game.szurmonej.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SchoolClassRepository extends JpaRepository<SchoolClass, Long> {
    List<SchoolClass> findByTreasurer(User treasurer);
    boolean existsByLabel(String label);
}
