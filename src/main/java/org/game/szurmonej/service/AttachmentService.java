package org.game.szurmonej.service;

import org.game.szurmonej.entity.AccountHistoryEntry;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.repository.AccountHistoryEntryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

@Service
public class AttachmentService {

    private final AccountHistoryEntryRepository historyRepository;
    private final CurrentUserService currentUserService;

    public AttachmentService(AccountHistoryEntryRepository historyRepository, CurrentUserService currentUserService) {
        this.historyRepository = historyRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public void uploadAttachment(Long historyId, MultipartFile file) throws IOException {
        var currentUser = currentUserService.getCurrentUser();
        var historyEntry = historyRepository.findById(historyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "History entry not found"));

        var fundraiser = historyEntry.getAccount().getFundraiser();
        if (fundraiser == null || !fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Only the treasurer of this fundraiser can upload attachments.");
        }

        historyEntry.setAttachment(file.getBytes());
        historyEntry.setAttachmentFilename(file.getOriginalFilename());
        historyEntry.setAttachmentContentType(file.getContentType());
        historyRepository.save(historyEntry);
    }

    @Transactional(readOnly = true)
    public AccountHistoryEntry getAttachment(Long historyId) {
        var currentUser = currentUserService.getCurrentUser();
        var historyEntry = historyRepository.findById(historyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "History entry not found"));
        
        var fundraiser = historyEntry.getAccount().getFundraiser();
        if (fundraiser != null) {
            boolean isParent = fundraiser.getParticipants().stream()
                .anyMatch(p -> p.getChild().getParents().contains(currentUser));
            boolean isTreasurer = fundraiser.getSchoolClass().getTreasurer().getId().equals(currentUser.getId());

            if (!isTreasurer && !isParent && !currentUser.isAdmin()) {
                throw new ForbiddenOperationException("You do not have permission to view this attachment.");
            }
        } else {
            // If it's not a fundraiser account, only the account owner can see it.
            if (!historyEntry.getAccount().getUser().getId().equals(currentUser.getId())) {
                throw new ForbiddenOperationException("You do not have permission to view this attachment.");
            }
        }
        
        return historyEntry;
    }
}
