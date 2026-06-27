import { create } from "zustand";

export type UserRole = "ADMIN" | "USER";

export interface User {
  id: number;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  balance: number | null;
  avatar?: string;
}

interface AuthState {
  isAuthenticated: boolean | null;
  user: User | null;
  setAuth: (user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: null,
  user: null,
  setAuth: (user) => set({ isAuthenticated: true, user }),
  clearAuth: () => set({ isAuthenticated: false, user: null }),
}));
