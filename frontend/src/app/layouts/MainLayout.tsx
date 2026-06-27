import { Outlet } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { TopBar } from "@/components/TopBar";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-linear-to-br from-white via-emerald-50 to-emerald-100 pt-16">
      <TopBar />
      <Navigation />
      <div className="pl-76 pr-4 pt-4">
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
