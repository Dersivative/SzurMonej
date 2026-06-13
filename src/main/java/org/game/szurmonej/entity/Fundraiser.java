package org.game.szurmonej.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
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

    @Column(name = "ended_at")
    private LocalDate endedAt;

    @OneToMany(mappedBy = "fundraiser", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FundraiserParticipant> participants = new ArrayList<>();
}