package org.game.szurmonej.repository;

import org.game.szurmonej.entity.EnrollmentStatus;
import org.game.szurmonej.entity.FundraiserApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FundraiserApplicationRepository extends JpaRepository<FundraiserApplication, Long> {
    List<FundraiserApplication> findBySchoolClass_IdAndStatus(Long schoolClassId, EnrollmentStatus status);
}