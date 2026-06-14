package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.entity.AccountHistoryEntry;
import org.game.szurmonej.service.AttachmentService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Tag(name = "Attachments", description = "Zarządzanie załącznikami do transakcji")
@RestController
@RequestMapping("/api/attachments")
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @Operation(summary = "Wgraj załącznik do wpisu w historii konta")
    @PostMapping("/upload/{historyId}")
    public ResponseEntity<Void> uploadAttachment(@PathVariable Long historyId, @RequestParam("file") MultipartFile file) throws IOException {
        attachmentService.uploadAttachment(historyId, file);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Pobierz załącznik dla wpisu w historii konta")
    @GetMapping("/download/{historyId}")
    public ResponseEntity<byte[]> downloadAttachment(@PathVariable Long historyId) {
        AccountHistoryEntry historyEntry = attachmentService.getAttachment(historyId);

        if (historyEntry.getAttachment() == null) {
            return ResponseEntity.notFound().build();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(historyEntry.getAttachmentContentType()));
        headers.setContentDispositionFormData("attachment", historyEntry.getAttachmentFilename());

        return ResponseEntity.ok()
                .headers(headers)
                .body(historyEntry.getAttachment());
    }
}
