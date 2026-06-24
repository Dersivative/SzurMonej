import { fetchMySchoolClasses } from "@/features/classes/api/get-my-school-classes";
import { fetchPendingFundraiserApplications } from "@/features/fundraisers/api/get-pending-fundraiser-applications";
import type { FundraiserApplicationListItemDTO } from "@/features/fundraisers/api/types";

export interface TreasurerFundraiserApplicationItem {
  classId: number;
  classLabel: string;
  application: FundraiserApplicationListItemDTO;
}

export async function fetchTreasurerPendingFundraiserApplications(): Promise<
  TreasurerFundraiserApplicationItem[]
> {
  const classes = await fetchMySchoolClasses();

  const items = await Promise.all(
    classes.map(async (schoolClass) => {
      const applications = await fetchPendingFundraiserApplications(
        schoolClass.id,
      );
      return applications.map((application) => ({
        classId: schoolClass.id,
        classLabel: schoolClass.label,
        application: {
          ...application,
          classId: schoolClass.id,
          classLabel: schoolClass.label,
        },
      }));
    }),
  );

  return items
    .flat()
    .sort(
      (left, right) =>
        new Date(right.application.requestedAt ?? 0).getTime() -
        new Date(left.application.requestedAt ?? 0).getTime(),
    );
}
