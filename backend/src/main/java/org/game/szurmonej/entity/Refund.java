package org.game.szurmonej.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "refunds")
@Getter
@Setter
@NoArgsConstructor
public class Refund {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // This field is unreliable and should not be used for financial calculations.
    // A refund might not correspond to a single contribution.
    @ManyToOne(optional = true)
    @JoinColumn(name = "contribution_id")
    private Contribution contribution;

    @OneToOne
    @JoinColumn(name = "history_entry_id", nullable = false)
    private AccountHistoryEntry accountHistoryEntry;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDateTime refundedAt;

    private String note;
}