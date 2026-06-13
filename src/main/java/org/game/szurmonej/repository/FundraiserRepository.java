package org.game.szurmonej.repository;

import org.game.szurmonej.entity.Fundraiser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FundraiserRepository extends JpaRepository<Fundraiser, Long> {
    List<Fundraiser> findBySchoolClass_Id(Long schoolClassId);
    List<Fundraiser> findBySchoolClass_Memberships_Child_Id(Long childId);
}
