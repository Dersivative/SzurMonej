package org.game.szurmonej.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import jakarta.validation.constraints.Email;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Email
    @Column(unique = true, nullable = false)
    private String email;

    private String firstName;
    private String lastName;

    @JsonIgnore
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    private boolean isAdmin;

    @Column(columnDefinition = "BYTEA")
    @Basic(fetch = FetchType.EAGER)
    private byte[] avatar;

    @ManyToMany
    @JoinTable(
            name = "user_children",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "child_id")
    )
    private Set<Child> children;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private Account account;

    @OneToMany(mappedBy = "treasurer")
    @JsonIgnore
    private List<SchoolClass> treasurerOfClasses = new ArrayList<>();
    
    // Helper method for display name
    public String getFullName() {
        return firstName + " " + lastName;
    }
}