package org.game.szurmonej.repository;

import org.game.szurmonej.entity.ClassMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClassMembershipRepository extends JpaRepository<ClassMembership, Long> {

    List<ClassMembership> findBySchoolClass_Id(Long schoolClassId);
}
