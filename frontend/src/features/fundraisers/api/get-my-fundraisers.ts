import { fetchMySchoolClasses } from "@/features/classes/api/get-my-school-classes";
import { fetchFundraisersForClass } from "@/features/fundraisers/api/get-fundraisers-for-class";
import { fetchFundraisersForChild } from "@/features/fundraisers/api/get-fundraisers-for-child";
import { fetchPendingFundraiserApplications } from "@/features/fundraisers/api/get-pending-fundraiser-applications";
import type {
  FundraiserApplicationListItemDTO,
  FundraiserResponseDTO,
  MyFundraisersResult,
} from "@/features/fundraisers/api/types";
import { fetchMyChildren } from "@/features/users/api/get-my-children";

export async function fetchMyFundraisers(
  userId: number,
): Promise<MyFundraisersResult> {
  const [classes, children] = await Promise.all([
    fetchMySchoolClasses(),
    fetchMyChildren(),
  ]);

  const treasurerClassIds = new Set(classes.map((schoolClass) => schoolClass.id));

  const [classFundraisers, childFundraiserViews, treasurerPendingLists] =
    await Promise.all([
      Promise.all(classes.map((schoolClass) => fetchFundraisersForClass(schoolClass.id))),
      Promise.all(children.map((child) => fetchFundraisersForChild(child.id))),
      Promise.all(
        classes.map(async (schoolClass) => ({
          classId: schoolClass.id,
          classLabel: schoolClass.label,
          applications: await fetchPendingFundraiserApplications(schoolClass.id),
        })),
      ),
    ]);

  const fundraisersById = new Map<number, FundraiserResponseDTO>();

  for (const fundraiser of classFundraisers.flat()) {
    fundraisersById.set(fundraiser.id, fundraiser);
  }

  for (const view of childFundraiserViews) {
    for (const fundraiser of view.activeFundraisers) {
      fundraisersById.set(fundraiser.id, fundraiser);
    }
  }

  const applicationsById = new Map<number, FundraiserApplicationListItemDTO>();

  for (const { classId, classLabel, applications } of treasurerPendingLists) {
    for (const application of applications) {
      applicationsById.set(application.id, {
        ...application,
        classId,
        classLabel,
      });
    }
  }

  for (const [index, child] of children.entries()) {
    if (!child.schoolClassId || treasurerClassIds.has(child.schoolClassId)) {
      continue;
    }

    for (const application of childFundraiserViews[index]?.pendingApplications ??
      []) {
      if (application.requestingParent?.id !== userId) {
        continue;
      }

      if (!applicationsById.has(application.id)) {
        applicationsById.set(application.id, {
          ...application,
          classId: child.schoolClassId,
          classLabel: child.schoolClassName ?? null,
        });
      }
    }
  }

  const fundraisers = Array.from(fundraisersById.values()).sort((left, right) =>
    right.startedAt.localeCompare(left.startedAt),
  );

  const pendingApplications = Array.from(applicationsById.values()).sort(
    (left, right) =>
      (right.requestedAt ?? "").localeCompare(left.requestedAt ?? ""),
  );

  return { fundraisers, pendingApplications };
}
