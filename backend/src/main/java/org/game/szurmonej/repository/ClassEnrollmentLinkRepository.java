package org.game.szurmonej.repository;

import org.game.szurmonej.entity.ClassEnrollmentLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassEnrollmentLinkRepository extends JpaRepository<ClassEnrollmentLink, Long> {

    Optional<ClassEnrollmentLink> findByTokenAndActiveTrue(UUID token);

    Optional<ClassEnrollmentLink> findBySchoolClass_IdAndActiveTrue(Long schoolClassId);
}
