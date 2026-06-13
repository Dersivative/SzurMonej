package org.game.szurmonej.repository;

import org.game.szurmonej.entity.Child;
import org.game.szurmonej.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChildRepository extends JpaRepository<Child, Long> {
    List<Child> findByParents(User parent);
}
