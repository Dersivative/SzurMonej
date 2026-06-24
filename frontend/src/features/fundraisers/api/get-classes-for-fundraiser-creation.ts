import { fetchMySchoolClasses } from "@/features/classes/api/get-my-school-classes";
import { fetchMyChildren } from "@/features/users/api/get-my-children";

export type FundraiserClassMode = "treasurer" | "parent";

export interface FundraiserClassOptionDTO {
  id: number;
  label: string;
  mode: FundraiserClassMode;
}

export async function fetchClassesForFundraiserCreation(): Promise<
  FundraiserClassOptionDTO[]
> {
  const [treasurerClasses, children] = await Promise.all([
    fetchMySchoolClasses(),
    fetchMyChildren(),
  ]);

  const classMap = new Map<number, FundraiserClassOptionDTO>();

  for (const schoolClass of treasurerClasses) {
    classMap.set(schoolClass.id, {
      id: schoolClass.id,
      label: schoolClass.label,
      mode: "treasurer",
    });
  }

  for (const child of children) {
    if (!child.schoolClassId || !child.schoolClassName) {
      continue;
    }

    if (!classMap.has(child.schoolClassId)) {
      classMap.set(child.schoolClassId, {
        id: child.schoolClassId,
        label: child.schoolClassName,
        mode: "parent",
      });
    }
  }

  return Array.from(classMap.values()).sort((left, right) =>
    left.label.localeCompare(right.label, "pl"),
  );
}
