package org.game.szurmonej.report;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class ClassReportData {

    private String classLabel;
    private String treasurerName;
    private LocalDateTime generatedAt;
    private List<FundraiserReportData> fundraisers = new ArrayList<>();

    public String getClassLabel() {
        return classLabel;
    }

    public void setClassLabel(String classLabel) {
        this.classLabel = classLabel;
    }

    public String getTreasurerName() {
        return treasurerName;
    }

    public void setTreasurerName(String treasurerName) {
        this.treasurerName = treasurerName;
    }

    public LocalDateTime getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(LocalDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }

    public List<FundraiserReportData> getFundraisers() {
        return fundraisers;
    }

    public void setFundraisers(List<FundraiserReportData> fundraisers) {
        this.fundraisers = fundraisers;
    }
}
