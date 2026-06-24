import { Outlet } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { TopBar } from "@/components/TopBar";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-background">
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
