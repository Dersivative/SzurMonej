package org.game.szurmonej.repository;

import org.game.szurmonej.entity.Fundraiser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FundraiserRepository extends JpaRepository<Fundraiser, Long> {
    List<Fundraiser> findBySchoolClass_Id(Long schoolClassId);
    
    @Query("SELECT f FROM Fundraiser f JOIN f.participants p WHERE p.child.id = :childId AND p.removedAt IS NULL")
    List<Fundraiser> findActiveFundraisersByChildId(@Param("childId") Long childId);
    
    List<Fundraiser> findByParticipants_Child_Id(Long childId);
}