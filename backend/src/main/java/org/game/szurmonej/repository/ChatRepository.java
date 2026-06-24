package org.game.szurmonej.repository;

import org.game.szurmonej.entity.Chat;
import org.game.szurmonej.entity.ChatType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRepository extends JpaRepository<Chat, Long> {

    Optional<Chat> findBySchoolClass_IdAndType(Long schoolClassId, ChatType type);

    Optional<Chat> findByFundraiser_IdAndType(Long fundraiserId, ChatType type);

    Optional<Chat> findByTypeAndParticipantOne_IdAndParticipantTwo_Id(ChatType type, Long participantOneId, Long participantTwoId);

    @Query("""
            SELECT DISTINCT c FROM Chat c
            LEFT JOIN c.participants p
            WHERE c.type = org.game.szurmonej.entity.ChatType.DIRECT
              AND (c.participantOne.id = :userId OR c.participantTwo.id = :userId)
            """)
    List<Chat> findDirectChatsForUser(@Param("userId") Long userId);

    @Query("""
            SELECT c FROM Chat c
            WHERE c.type = org.game.szurmonej.entity.ChatType.GROUP
              AND EXISTS (
                  SELECT p FROM ChatParticipant p
                  WHERE p.chat = c AND p.user.id = :userId
              )
            """)
    List<Chat> findGroupChatsForUser(@Param("userId") Long userId);
}
