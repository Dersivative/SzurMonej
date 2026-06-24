package org.game.szurmonej.repository;

import org.game.szurmonej.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByChat_IdAndIdGreaterThanOrderByIdAsc(Long chatId, Long afterId, Pageable pageable);

    List<ChatMessage> findByChat_IdAndIdLessThanOrderByIdDesc(Long chatId, Long beforeId, Pageable pageable);

    List<ChatMessage> findByChat_IdOrderByIdDesc(Long chatId, Pageable pageable);

    Optional<ChatMessage> findTopByChat_IdOrderByIdDesc(Long chatId);
}
