package org.game.szurmonej.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

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

    @OneToMany(mappedBy = "participant", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RefundRequest> refundRequests = new ArrayList<>();

    @Column(nullable = false)
    private LocalDate addedAt;

    private LocalDate removedAt;

    @Enumerated(EnumType.STRING)
    private EnrollmentStatus status = EnrollmentStatus.APPROVED; // APPROVED, REMOVAL_PENDING

    @Column(precision = 19, scale = 2)
    private BigDecimal debt = BigDecimal.ZERO;

    @Column(precision = 19, scale = 2)
    private BigDecimal credit = BigDecimal.ZERO;
}