import type { SchoolClassResponseDTO } from "@/features/classes/api/types";
import { fetchMySchoolClasses } from "@/features/classes/api/get-my-school-classes";
import { fetchSchoolClass } from "@/features/classes/api/get-school-class";
import { fetchMyChildren } from "@/features/users/api/get-my-children";

export async function fetchMyAccessibleClasses(): Promise<
  SchoolClassResponseDTO[]
> {
  const [treasurerClasses, children] = await Promise.all([
    fetchMySchoolClasses(),
    fetchMyChildren(),
  ]);

  const classMap = new Map<number, SchoolClassResponseDTO>();
  for (const schoolClass of treasurerClasses) {
    classMap.set(schoolClass.id, schoolClass);
  }

  const parentClassIds = [
    ...new Set(
      children
        .map((child) => child.schoolClassId)
        .filter((id): id is number => id != null),
    ),
  ];

  const missingIds = parentClassIds.filter((id) => !classMap.has(id));
  if (missingIds.length > 0) {
    const parentClasses = await Promise.all(
      missingIds.map((id) => fetchSchoolClass(id)),
    );
    for (const schoolClass of parentClasses) {
      classMap.set(schoolClass.id, schoolClass);
    }
  }

  return [...classMap.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "pl"),
  );
}
