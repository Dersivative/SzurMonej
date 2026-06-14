package org.game.szurmonej.entity;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import jakarta.persistence.*;
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

    @ManyToOne(optional = false)
    @JoinColumn(name = "school_class_id")
    private SchoolClass schoolClass;

    @OneToOne(mappedBy = "fundraiser", cascade = CascadeType.ALL, orphanRemoval = true)
    private Account account;

    private String title;

    private String description;

    @Column(nullable = false)
    private BigDecimal goalAmount;

    @Column(name = "started_at")
    private LocalDate startedAt;

    @Column(name = "finished_at")
    private LocalDate finishedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FundraiserStatus status = FundraiserStatus.ACTIVE;

    @OneToMany(mappedBy = "fundraiser", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FundraiserParticipant> participants = new ArrayList<>();
}
