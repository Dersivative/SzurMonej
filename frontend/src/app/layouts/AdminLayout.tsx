import { Outlet } from "react-router-dom";
import { AdminNavigation } from "@/components/AdminNavigation";
import { AdminTopBar } from "@/components/AdminTopBar";

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-muted/30 pt-16">
      <AdminTopBar />
      <AdminNavigation />
      <div className="pl-76 pr-4 pt-4">
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
