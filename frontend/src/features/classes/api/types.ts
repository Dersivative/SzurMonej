import type { ChildResponseDTO } from "@/features/users/api/types";
import type { UserResponseDTO } from "@/features/auth/api/types";

export interface TreasurerResponseDTO {
  id: number;
  fullName: string;
}

export interface SchoolClassResponseDTO {
  id: number;
  label: string;
  treasurer: TreasurerResponseDTO | null;
  children: ChildResponseDTO[];
}

export interface SchoolClassApplicationResponseDTO {
  id: number;
  proposedName: string;
  status: string;
  requestedAt: string;
  reviewedAt?: string | null;
}

export interface SchoolClassApplicationRequestDTO {
  proposedName: string;
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

export interface EnrollmentLinkResponseDTO {
  token: string;
  url: string;
  active: boolean;
  createdAt: string;
}

export interface EnrollmentLinkPreviewResponseDTO {
  schoolClassId: number;
  schoolClassName: string;
  treasurerName: string;
}
