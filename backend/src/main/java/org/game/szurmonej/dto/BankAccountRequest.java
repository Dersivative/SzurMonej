package org.game.szurmonej.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class BankAccountRequest {
    @Pattern(regexp = "^(PL)?[0-9]{26}$", message = "Nieprawidłowy format numeru konta. Oczekiwano 26 cyfr lub PL i 26 cyfr.")
    private String bankAccountNumber;
}