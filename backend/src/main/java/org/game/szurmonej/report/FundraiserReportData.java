package org.game.szurmonej.report;

import org.game.szurmonej.entity.FundraiserStatus;
import org.game.szurmonej.entity.FundraiserType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class FundraiserReportData {

    private Long id;
    private String title;
    private String description;
    private String classLabel;
    private String treasurerName;
    private FundraiserStatus status;
    private FundraiserType fundraiserType;
    private BigDecimal goalAmount;
    private BigDecimal perChildAmount;
    private BigDecimal currentAmount;
    private LocalDate startedAt;
    private LocalDate finishedAt;
    private LocalDate endsBy;
    private LocalDateTime generatedAt;
    private List<ParticipantRow> participants = new ArrayList<>();
    private List<HistoryRow> history = new ArrayList<>();
    private List<AttachmentRef> attachments = new ArrayList<>();

    public record ParticipantRow(
            String name,
            BigDecimal totalContribution,
            BigDecimal debt,
            BigDecimal credit
    ) {
    }

    public record HistoryRow(
            LocalDateTime date,
            String type,
            String description,
            BigDecimal amount,
            Integer attachmentNumber
    ) {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

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

    public FundraiserStatus getStatus() {
        return status;
    }

    public void setStatus(FundraiserStatus status) {
        this.status = status;
    }

    public FundraiserType getFundraiserType() {
        return fundraiserType;
    }

    public void setFundraiserType(FundraiserType fundraiserType) {
        this.fundraiserType = fundraiserType;
    }

    public BigDecimal getGoalAmount() {
        return goalAmount;
    }

    public void setGoalAmount(BigDecimal goalAmount) {
        this.goalAmount = goalAmount;
    }

    public BigDecimal getPerChildAmount() {
        return perChildAmount;
    }

    public void setPerChildAmount(BigDecimal perChildAmount) {
        this.perChildAmount = perChildAmount;
    }

    public BigDecimal getCurrentAmount() {
        return currentAmount;
    }

    public void setCurrentAmount(BigDecimal currentAmount) {
        this.currentAmount = currentAmount;
    }

    public LocalDate getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDate startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDate getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(LocalDate finishedAt) {
        this.finishedAt = finishedAt;
    }

    public LocalDate getEndsBy() {
        return endsBy;
    }

    public void setEndsBy(LocalDate endsBy) {
        this.endsBy = endsBy;
    }

    public LocalDateTime getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(LocalDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }

    public List<ParticipantRow> getParticipants() {
        return participants;
    }

    public void setParticipants(List<ParticipantRow> participants) {
        this.participants = participants;
    }

    public List<HistoryRow> getHistory() {
        return history;
    }

    public void setHistory(List<HistoryRow> history) {
        this.history = history;
    }

    public List<AttachmentRef> getAttachments() {
        return attachments;
    }

    public void setAttachments(List<AttachmentRef> attachments) {
        this.attachments = attachments;
    }
}
