package org.game.szurmonej.repository;

import org.game.szurmonej.entity.ClassMembership;
import org.game.szurmonej.entity.EnrollmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassMembershipRepository extends JpaRepository<ClassMembership, Long> {

    List<ClassMembership> findBySchoolClass_Id(Long schoolClassId);

    List<ClassMembership> findByChild_IdAndLeftAtIsNull(Long childId);

    Optional<ClassMembership> findBySchoolClass_IdAndChild_IdAndLeftAtIsNull(Long schoolClassId, Long childId);

    boolean existsByChild_IdAndLeftAtIsNull(Long childId);

    Optional<ClassMembership> findByChild_IdAndStatus(Long childId, EnrollmentStatus status);

    List<ClassMembership> findAllByChild_Id(Long childId);

    boolean existsBySchoolClassIdAndChild_Parents_Id(Long schoolClassId, Long parentId);
}