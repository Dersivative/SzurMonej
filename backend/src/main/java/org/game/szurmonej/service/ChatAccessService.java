package org.game.szurmonej.service;

import org.game.szurmonej.entity.Chat;
import org.game.szurmonej.entity.ClassMembership;
import org.game.szurmonej.entity.Fundraiser;
import org.game.szurmonej.entity.FundraiserParticipant;
import org.game.szurmonej.entity.SchoolClass;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.exception.ResourceNotFoundException;
import org.game.szurmonej.repository.ChatParticipantRepository;
import org.game.szurmonej.repository.ClassMembershipRepository;
import org.game.szurmonej.repository.FundraiserParticipantRepository;
import org.game.szurmonej.repository.FundraiserRepository;
import org.game.szurmonej.repository.SchoolClassRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ChatAccessService {

    private final SchoolClassRepository schoolClassRepository;
    private final ClassMembershipRepository classMembershipRepository;
    private final FundraiserRepository fundraiserRepository;
    private final FundraiserParticipantRepository fundraiserParticipantRepository;
    private final ChatParticipantRepository chatParticipantRepository;

    public ChatAccessService(
            SchoolClassRepository schoolClassRepository,
            ClassMembershipRepository classMembershipRepository,
            FundraiserRepository fundraiserRepository,
            FundraiserParticipantRepository fundraiserParticipantRepository,
            ChatParticipantRepository chatParticipantRepository
    ) {
        this.schoolClassRepository = schoolClassRepository;
        this.classMembershipRepository = classMembershipRepository;
        this.fundraiserRepository = fundraiserRepository;
        this.fundraiserParticipantRepository = fundraiserParticipantRepository;
        this.chatParticipantRepository = chatParticipantRepository;
    }

    @Transactional(readOnly = true)
    public Set<Long> resolveRelatedClassIds(User user) {
        Set<Long> classIds = new HashSet<>();

        schoolClassRepository.findByTreasurer(user)
                .forEach(schoolClass -> classIds.add(schoolClass.getId()));

        if (user.getChildren() != null) {
            user.getChildren().forEach(child ->
                    classMembershipRepository.findByChild_IdAndLeftAtIsNull(child.getId())
                            .forEach(membership -> classIds.add(membership.getSchoolClass().getId()))
            );
        }

        return classIds;
    }

    @Transactional(readOnly = true)
    public boolean areUsersRelated(User userA, User userB) {
        if (userA.getId().equals(userB.getId())) {
            return false;
        }
        Set<Long> classIdsA = resolveRelatedClassIds(userA);
        Set<Long> classIdsB = resolveRelatedClassIds(userB);
        classIdsA.retainAll(classIdsB);
        return !classIdsA.isEmpty();
    }

    @Transactional(readOnly = true)
    public Set<User> findRelatedUsers(User user) {
        Set<Long> classIds = resolveRelatedClassIds(user);
        Set<User> related = new HashSet<>();

        for (Long classId : classIds) {
            related.addAll(resolveUsersForClass(classId));
        }

        related.remove(user);
        return related;
    }

    @Transactional(readOnly = true)
    public List<User> searchRelatedUsers(User currentUser, String query, Long excludeChatId) {
        String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        Set<Long> excludeUserIds = new HashSet<>();
        if (excludeChatId != null) {
            chatParticipantRepository.findByChat_Id(excludeChatId)
                    .forEach(participant -> excludeUserIds.add(participant.getUser().getId()));
        }

        return findRelatedUsers(currentUser).stream()
                .filter(user -> !excludeUserIds.contains(user.getId()))
                .filter(user -> normalizedQuery.isEmpty() || matchesQuery(user, normalizedQuery))
                .sorted((a, b) -> a.getFullName().compareToIgnoreCase(b.getFullName()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public void assertCanAccessChat(Chat chat, User user) {
        if (user.isAdmin()) {
            return;
        }

        boolean allowed = switch (chat.getType()) {
            case DIRECT -> canAccessDirectChat(chat, user);
            case CLASS -> canAccessClassChat(chat.getSchoolClass(), user);
            case FUNDRAISER -> canAccessFundraiserChat(chat.getFundraiser(), user);
            case GROUP -> chatParticipantRepository.existsByChat_IdAndUser_Id(chat.getId(), user.getId());
        };

        if (!allowed) {
            throw new ForbiddenOperationException("You do not have access to this chat");
        }
    }

    @Transactional(readOnly = true)
    public void assertCanAccessClass(Long classId, User user) {
        SchoolClass schoolClass = schoolClassRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("School class not found: " + classId));
        if (user.isAdmin() || canAccessClassChat(schoolClass, user)) {
            return;
        }
        throw new ForbiddenOperationException("You do not have access to this class chat");
    }

    @Transactional(readOnly = true)
    public void assertCanAccessFundraiser(Long fundraiserId, User user) {
        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResourceNotFoundException("Fundraiser not found: " + fundraiserId));
        if (user.isAdmin() || canAccessFundraiserChat(fundraiser, user)) {
            return;
        }
        throw new ForbiddenOperationException("You do not have access to this fundraiser chat");
    }

    @Transactional(readOnly = true)
    public void assertUsersRelated(User currentUser, User otherUser) {
        if (!areUsersRelated(currentUser, otherUser)) {
            throw new ForbiddenOperationException("You can only chat with users related through shared classes");
        }
    }

    @Transactional(readOnly = true)
    public boolean hasAccessToChat(Chat chat, User user) {
        if (user.isAdmin()) {
            return true;
        }
        return switch (chat.getType()) {
            case DIRECT -> canAccessDirectChat(chat, user);
            case CLASS -> canAccessClassChat(chat.getSchoolClass(), user);
            case FUNDRAISER -> canAccessFundraiserChat(chat.getFundraiser(), user);
            case GROUP -> chatParticipantRepository.existsByChat_IdAndUser_Id(chat.getId(), user.getId());
        };
    }

    private boolean canAccessDirectChat(Chat chat, User user) {
        boolean isParticipant = (chat.getParticipantOne() != null && chat.getParticipantOne().getId().equals(user.getId()))
                || (chat.getParticipantTwo() != null && chat.getParticipantTwo().getId().equals(user.getId()));
        if (!isParticipant) {
            return false;
        }
        User other = chat.getParticipantOne().getId().equals(user.getId())
                ? chat.getParticipantTwo()
                : chat.getParticipantOne();
        return areUsersRelated(user, other);
    }

    private boolean canAccessClassChat(SchoolClass schoolClass, User user) {
        if (schoolClass == null) {
            return false;
        }
        if (schoolClass.getTreasurer().getId().equals(user.getId())) {
            return true;
        }
        return isParentInClass(schoolClass.getId(), user);
    }

    private boolean canAccessFundraiserChat(Fundraiser fundraiser, User user) {
        if (fundraiser == null) {
            return false;
        }
        if (fundraiser.getSchoolClass().getTreasurer().getId().equals(user.getId())) {
            return true;
        }
        return fundraiserParticipantRepository.findByFundraiser_IdAndRemovedAtIsNull(fundraiser.getId()).stream()
                .map(FundraiserParticipant::getChild)
                .filter(Objects::nonNull)
                .anyMatch(child -> child.getParents() != null && child.getParents().contains(user));
    }

    private boolean isParentInClass(Long classId, User user) {
        return classMembershipRepository.findBySchoolClass_Id(classId).stream()
                .filter(membership -> membership.getLeftAt() == null)
                .map(ClassMembership::getChild)
                .filter(Objects::nonNull)
                .anyMatch(child -> child.getParents() != null && child.getParents().contains(user));
    }

    private Set<User> resolveUsersForClass(Long classId) {
        Set<User> users = new HashSet<>();
        SchoolClass schoolClass = schoolClassRepository.findById(classId).orElse(null);
        if (schoolClass == null) {
            return users;
        }
        users.add(schoolClass.getTreasurer());
        classMembershipRepository.findBySchoolClass_Id(classId).stream()
                .filter(membership -> membership.getLeftAt() == null)
                .map(ClassMembership::getChild)
                .filter(Objects::nonNull)
                .forEach(child -> {
                    if (child.getParents() != null) {
                        users.addAll(child.getParents());
                    }
                });
        return users;
    }

    private boolean matchesQuery(User user, String query) {
        return containsIgnoreCase(user.getEmail(), query)
                || containsIgnoreCase(user.getFirstName(), query)
                || containsIgnoreCase(user.getLastName(), query)
                || containsIgnoreCase(user.getFullName(), query);
    }

    private boolean containsIgnoreCase(String value, String query) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(query);
    }
}
