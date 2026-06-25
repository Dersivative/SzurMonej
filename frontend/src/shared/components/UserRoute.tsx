import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";

export function UserRoute() {
  const user = useAuthStore((state) => state.user);

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
