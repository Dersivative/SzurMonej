package org.game.szurmonej.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "fundraiser_applications")
@Getter
@Setter
@NoArgsConstructor
public class FundraiserApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "requesting_parent_id")
    private User requestingParent;

    @ManyToOne(optional = false)
    @JoinColumn(name = "school_class_id")
    private SchoolClass schoolClass;

    @Column(nullable = false)
    private String title;

    @Lob
    private String description;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private FundraiserType fundraiserType;

    private BigDecimal goalAmount;

    private BigDecimal perChildAmount;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "fundraiser_application_participants", joinColumns = @JoinColumn(name = "application_id"))
    @Column(name = "child_id")
    private List<Long> participantIds;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private EnrollmentStatus status;

    @Column(nullable = false)
    private Instant requestedAt;

    private Instant reviewedAt;

    @ManyToOne
    @JoinColumn(name = "reviewed_by_id")
    private User reviewedBy;
}