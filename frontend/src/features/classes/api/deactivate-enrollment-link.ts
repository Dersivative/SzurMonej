import { api } from "@/lib/api";

export async function deactivateEnrollmentLink(classId: number): Promise<void> {
  await api.delete(`/school-classes/${classId}/enrollment-link`);
}
