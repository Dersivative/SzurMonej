package org.game.szurmonej.dto;

import lombok.Data;
import org.game.szurmonej.entity.Account;
import org.game.szurmonej.entity.User;

@Data
public class AccountLookupResponse {
    private Long userId;
    private String fullName;
    private String accountNumber;

    public static AccountLookupResponse from(User user, Account account) {
        AccountLookupResponse response = new AccountLookupResponse();
        response.setUserId(user.getId());
        response.setFullName(user.getFullName());
        response.setAccountNumber(account.getAccountNumber());
        return response;
    }
}
