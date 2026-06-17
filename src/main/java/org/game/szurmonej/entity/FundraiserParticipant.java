package org.game.szurmonej.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "fundraiser_participants")
@Getter
@Setter
@NoArgsConstructor
public class FundraiserParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "fundraiser_id")
    private Fundraiser fundraiser;

    @ManyToOne(optional = false)
    @JoinColumn(name = "child_id")
    private Child child;

    @Column(nullable = false)
    private LocalDate addedAt;

    private LocalDate removedAt;

    @Enumerated(EnumType.STRING)
    private EnrollmentStatus status = EnrollmentStatus.APPROVED; // APPROVED, REMOVAL_PENDING

    @Column(precision = 19, scale = 2)
    private java.math.BigDecimal debt;

    @Column(precision = 19, scale = 2)
    private java.math.BigDecimal credit;
}
