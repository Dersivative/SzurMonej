import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-white via-emerald-50 to-emerald-100 p-4">
      <div className="w-full max-w-lg">
        <Outlet />
      </div>
    </div>
  );
}
