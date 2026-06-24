package org.game.szurmonej.repository;

import org.game.szurmonej.entity.ChatParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatParticipantRepository extends JpaRepository<ChatParticipant, Long> {

    List<ChatParticipant> findByChat_Id(Long chatId);

    List<ChatParticipant> findByUser_Id(Long userId);

    boolean existsByChat_IdAndUser_Id(Long chatId, Long userId);

    Optional<ChatParticipant> findByChat_IdAndUser_Id(Long chatId, Long userId);
}
