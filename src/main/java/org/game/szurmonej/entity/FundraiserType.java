package org.game.szurmonej.entity;

public enum FundraiserType {
    /**
     * A fundraiser with a fixed total goal amount.
     * The cost per child is calculated dynamically.
     */
    TOTAL_GOAL,

    /**
     * A fundraiser with a fixed amount per child.
     * The total goal is calculated dynamically based on the number of participants.
     */
    PER_CHILD_GOAL
}
