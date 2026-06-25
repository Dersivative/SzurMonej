import type { UserRole } from "@/features/auth/store/authStore";
import { useAuthStore } from "@/features/auth/store/authStore";

export function isAdminRole(role: UserRole | undefined): boolean {
  return role === "ADMIN";
}

export function useIsAdmin(): boolean {
  return useAuthStore((state) => isAdminRole(state.user?.role));
}
