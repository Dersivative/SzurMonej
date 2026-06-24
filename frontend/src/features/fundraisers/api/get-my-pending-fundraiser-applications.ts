import { fetchFundraisersForChild } from "@/features/fundraisers/api/get-fundraisers-for-child";
import type { FundraiserApplicationListItemDTO } from "@/features/fundraisers/api/types";
import { fetchMyChildren } from "@/features/users/api/get-my-children";

export async function fetchMyPendingFundraiserApplications(
  userId: number,
): Promise<FundraiserApplicationListItemDTO[]> {
  const children = await fetchMyChildren();
  const views = await Promise.all(
    children.map((child) => fetchFundraisersForChild(child.id)),
  );

  const applicationsById = new Map<number, FundraiserApplicationListItemDTO>();

  for (const [index, child] of children.entries()) {
    for (const application of views[index]?.pendingApplications ?? []) {
      if (
        application.status !== "PENDING" ||
        application.requestingParent?.id !== userId
      ) {
        continue;
      }

      applicationsById.set(application.id, {
        ...application,
        classId: child.schoolClassId ?? null,
        classLabel: child.schoolClassName ?? null,
      });
    }
  }

  return Array.from(applicationsById.values()).sort((left, right) =>
    (right.requestedAt ?? "").localeCompare(left.requestedAt ?? ""),
  );
}
