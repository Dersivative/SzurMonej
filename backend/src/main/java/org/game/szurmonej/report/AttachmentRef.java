package org.game.szurmonej.report;

public record AttachmentRef(
        int number,
        String description,
        byte[] content,
        String contentType,
        String filename
) {
}
