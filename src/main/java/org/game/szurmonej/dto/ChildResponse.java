package org.game.szurmonej.dto;

import lombok.Data;
import org.game.szurmonej.entity.Child;

@Data
public class ChildResponse {
    private Long id;
    private String name;

    public static ChildResponse from(Child child) {
        ChildResponse response = new ChildResponse();
        response.setId(child.getId());
        response.setName(child.getName());
        return response;
    }
}
