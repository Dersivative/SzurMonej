import { fetchPendingEnrollmentApplications } from "@/features/classes/api/get-pending-enrollment-applications";
import { fetchMySchoolClasses } from "@/features/classes/api/get-my-school-classes";
import type { EnrollmentApplicationResponseDTO } from "@/features/classes/api/types";

export interface TreasurerEnrollmentApplicationItem {
  classId: number;
  application: EnrollmentApplicationResponseDTO;
}

export async function fetchTreasurerPendingEnrollmentApplications(): Promise<
  TreasurerEnrollmentApplicationItem[]
> {
  const classes = await fetchMySchoolClasses();

  const items = await Promise.all(
    classes.map(async (schoolClass) => {
      const applications = await fetchPendingEnrollmentApplications(
        schoolClass.id,
      );
      return applications.map((application) => ({
        classId: schoolClass.id,
        application,
      }));
    }),
  );

  return items
    .flat()
    .sort(
      (a, b) =>
        new Date(b.application.requestedAt).getTime() -
        new Date(a.application.requestedAt).getTime(),
    );
}
