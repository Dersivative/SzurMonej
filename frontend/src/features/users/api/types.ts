import type { UserResponseDTO } from "@/features/auth/api/types";

export interface ChildResponseDTO {
  id: number;
  name: string;
  surname: string;
  dateOfBirth: string;
  schoolClassName?: string | null;
  schoolClassId?: number | null;
  membershipId?: number | null;
  status?: string | null;
}

export interface UserWithChildrenResponseDTO {
  id: number;
  fullName: string;
  email: string;
  children: ChildResponseDTO[];
}

export interface UserCreateRequestDTO {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface ChildCreateRequestDTO {
  name: string;
  surname: string;
  dateOfBirth: string;
}

export interface EnrollmentApplicationResponseDTO {
  id: number;
  status: string;
  classLabel: string;
  child: ChildResponseDTO;
  parent: UserResponseDTO;
  requestedAt: string;
  reviewedAt?: string | null;
}
