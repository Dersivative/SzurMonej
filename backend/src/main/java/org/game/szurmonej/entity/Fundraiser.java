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
@Table(name = "fundraisers")
@Getter
@Setter
@NoArgsConstructor
public class Fundraiser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(nullable = false)
    private BigDecimal goalAmount;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private FundraiserType fundraiserType;

    private BigDecimal perChildAmount;

    @Column(nullable = false)
    private LocalDate startedAt;

    private LocalDate finishedAt;
    
    private LocalDate endsBy;

    @Enumerated(EnumType.STRING)
    private FundraiserStatus status = FundraiserStatus.ACTIVE;

    @ManyToOne(optional = false)
    @JoinColumn(name = "class_id")
    private SchoolClass schoolClass;

    @OneToMany(mappedBy = "fundraiser", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FundraiserParticipant> participants = new ArrayList<>();

    @OneToOne(mappedBy = "fundraiser", cascade = CascadeType.ALL, orphanRemoval = true)
    private Account account;
}