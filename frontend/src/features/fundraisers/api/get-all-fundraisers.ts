import { fetchAllSchoolClasses } from "@/features/classes/api/get-all-school-classes";
import { fetchFundraisersForClass } from "@/features/fundraisers/api/get-fundraisers-for-class";
import type { FundraiserResponseDTO } from "@/features/fundraisers/api/types";

export async function fetchAllFundraisers(): Promise<FundraiserResponseDTO[]> {
  const classes = await fetchAllSchoolClasses();
  const fundraisersByClass = await Promise.all(
    classes.map((schoolClass) => fetchFundraisersForClass(schoolClass.id)),
  );

  const fundraisersById = new Map<number, FundraiserResponseDTO>();

  for (const fundraisers of fundraisersByClass) {
    for (const fundraiser of fundraisers) {
      fundraisersById.set(fundraiser.id, fundraiser);
    }
  }

  return Array.from(fundraisersById.values()).sort((left, right) =>
    right.startedAt.localeCompare(left.startedAt),
  );
}
