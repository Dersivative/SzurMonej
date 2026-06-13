package org.game.szurmonej.repository;

import org.game.szurmonej.entity.ClassEnrollmentApplication;
import org.game.szurmonej.entity.EnrollmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClassEnrollmentApplicationRepository extends JpaRepository<ClassEnrollmentApplication, Long> {

    List<ClassEnrollmentApplication> findBySchoolClass_Id(Long schoolClassId);

    List<ClassEnrollmentApplication> findBySchoolClass_IdAndStatus(Long schoolClassId, EnrollmentStatus status);

    List<ClassEnrollmentApplication> findByParent_Id(Long parentId);

    boolean existsBySchoolClass_IdAndChild_IdAndStatus(Long schoolClassId, Long childId, EnrollmentStatus status);
}
