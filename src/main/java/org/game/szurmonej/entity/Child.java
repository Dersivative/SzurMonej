package org.game.szurmonej.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "children")
@Getter
@Setter
@NoArgsConstructor
public class Child {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String surname;

    @ManyToMany(mappedBy = "children")
    @JsonIgnore
    private Set<User> parents;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Lob
    private byte[] avatar;

    @Column(name = "avatar_content_type")
    private String avatarContentType;

    @OneToMany(mappedBy = "child")
    @JsonIgnore
    private List<ClassMembership> classMemberships = new ArrayList<>();

    @OneToMany(mappedBy = "child")
    @JsonIgnore
    private List<FundraiserParticipant> fundraiserParticipations = new ArrayList<>();
}
