package org.game.szurmonej.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChildFundraisersView {
    private List<FundraiserResponse> activeFundraisers;
    private List<FundraiserApplicationResponse> pendingApplications;
}