import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";

export function AdminRoute() {
  const user = useAuthStore((state) => state.user);

  if (user?.role !== "ADMIN") {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <Outlet />;
}
