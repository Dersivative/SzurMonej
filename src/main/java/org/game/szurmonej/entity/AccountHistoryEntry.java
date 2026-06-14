package org.game.szurmonej.entity;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "account_history")
@Getter
@Setter
@NoArgsConstructor
public class AccountHistoryEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "account_id")
    private Account account;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDateTime date;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private String type;

    @Lob
    @Basic(fetch = FetchType.LAZY)
    private byte[] attachment;

    @Column(name = "attachment_filename")
    private String attachmentFilename;

    @Column(name = "attachment_content_type")
    private String attachmentContentType;
}
