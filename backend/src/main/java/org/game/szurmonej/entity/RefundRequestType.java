package org.game.szurmonej.entity;

public enum RefundRequestType {
    /**
     * A parent requests a full refund for their child, intending to withdraw them from the fundraiser.
     * This will refund all contributions made for this child to their original payers.
     */
    FULL_WITHDRAWAL,

    /**
     * A user who paid for another child's contribution requests a refund of their specific payment.
     */
    PERSONAL_CONTRIBUTION
}