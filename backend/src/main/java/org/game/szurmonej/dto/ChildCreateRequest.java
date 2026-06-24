package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
public class ChildCreateRequest {

    private String name;
    private String surname;
    private LocalDate dateOfBirth;
}
