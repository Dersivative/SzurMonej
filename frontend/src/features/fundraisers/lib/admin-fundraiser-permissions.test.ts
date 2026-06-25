import { describe, expect, it } from "vitest";
import { canRemoveParticipant } from "@/features/fundraisers/lib/admin-fundraiser-permissions";
import type { ParticipantResponseDTO } from "@/features/fundraisers/api/types";

const participant: ParticipantResponseDTO = {
  childId: 10,
  childName: "Jan Kowalski",
  childFirstName: "Jan",
  childSurname: "Kowalski",
  status: "ACTIVE",
  totalContribution: 0,
};

describe("canRemoveParticipant", () => {
  it("allows admin to remove participants", () => {
    expect(
      canRemoveParticipant(participant, false, true, new Set()),
    ).toBe(true);
  });

  it("blocks removal when participant is pending removal", () => {
    expect(
      canRemoveParticipant(
        { ...participant, status: "REMOVAL_PENDING" },
        false,
        true,
        new Set(),
      ),
    ).toBe(false);
  });
});
