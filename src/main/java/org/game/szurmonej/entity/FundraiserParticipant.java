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
@Table(
        name = "fundraiser_participants",
        uniqueConstraints = @UniqueConstraint(columnNames = {"fundraiser_id", "child_id"})
)
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

    @Column(name = "added_at", nullable = false)
    private LocalDate addedAt;

    @Column(name = "removed_at")
    private LocalDate removedAt;

    @Column(precision = 19, scale = 2)
    private BigDecimal debt;

    @Column(precision = 19, scale = 2)
    private BigDecimal credit;

    @OneToMany(mappedBy = "participant", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Contribution> contributions = new ArrayList<>();
}
