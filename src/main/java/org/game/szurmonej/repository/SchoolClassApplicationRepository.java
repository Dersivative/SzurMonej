package org.game.szurmonej.repository;

import org.game.szurmonej.entity.EnrollmentStatus;
import org.game.szurmonej.entity.SchoolClassApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SchoolClassApplicationRepository extends JpaRepository<SchoolClassApplication, Long> {

    boolean existsByProposedNameAndStatus(String proposedName, EnrollmentStatus status);

    Optional<SchoolClassApplication> findByRequestingParent_IdAndStatus(Long userId, EnrollmentStatus status);

    List<SchoolClassApplication> findByStatus(EnrollmentStatus status);
}
