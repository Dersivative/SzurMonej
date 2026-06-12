package org.game.szurmonej.dto;

import lombok.Data;
import org.game.szurmonej.entity.Child;

import java.time.LocalDate;

@Data
public class ChildResponse {
    private Long id;
    private String name;
    private String surname;
    private LocalDate dateOfBirth;

    public static ChildResponse from(Child child) {
        ChildResponse response = new ChildResponse();
        response.setId(child.getId());
        response.setName(child.getName());
        response.setSurname(child.getSurname());
        response.setDateOfBirth(child.getDateOfBirth());
        return response;
    }
}
