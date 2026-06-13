package org.game.szurmonej.repository;

import org.game.szurmonej.entity.Child;
import org.game.szurmonej.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
public class EntityRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChildRepository childRepository;

    @BeforeEach
    public void seedDatabase() {
        // Zasiwanie (seeding) bazy danych przed każdym uruchomieniem testu
        userRepository.deleteAll(); // najpierw usuwamy użytkowników ze względu na klucze obce
        childRepository.deleteAll();

        Child child1 = new Child();
        child1.setName("Adam");
        child1.setSurname("Kowalski");
        child1.setDateOfBirth(LocalDate.of(2015, 6, 1));

        Child child2 = new Child();
        child2.setName("Ewa");
        child2.setSurname("Kowalska");
        child2.setDateOfBirth(LocalDate.of(2018, 3, 14));

        childRepository.save(child1);
        childRepository.save(child2);

        User parent = new User();
        parent.setUsername("rodzic1");
        parent.setEmail("rodzic1@example.com");
        parent.setPasswordHash("tajnehaslo");
        parent.setAdmin(false);
        parent.setChildren(Set.of(child1, child2));

        userRepository.save(parent);
    }

    @Test
    public void testUserExistsAndHasChildren() {
        long count = userRepository.count();
        assertThat(count).isEqualTo(1);

        User savedParent = userRepository.findAll().get(0);
        assertThat(savedParent.getUsername()).isEqualTo("rodzic1");
        assertThat(savedParent.getChildren()).hasSize(2);
    }

    @Test
    public void testChildrenAreSaved() {
        long count = childRepository.count();
        assertThat(count).isEqualTo(2);

        Child child = childRepository.findAll().get(0);
        assertThat(child.getName()).isIn("Adam", "Ewa");
    }
}
