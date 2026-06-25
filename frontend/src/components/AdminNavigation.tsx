import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import {
  navLinkActiveClassName,
  navLinkInactiveClassName,
} from "@/lib/nav-link";

const adminNavItems = [
  { label: "Pulpit", to: "/admin" },
  { label: "Wnioski o klasy", to: "/admin/class-applications" },
  { label: "Użytkownicy", to: "/admin/users" },
  { label: "Klasy", to: "/admin/classes" },
  { label: "Zbiórki", to: "/admin/fundraisers" },
  { label: "Czaty", to: "/admin/chats", matchPrefix: true },
] as const;

export function AdminNavigation() {
  const { pathname } = useLocation();

  return (
    <aside className="fixed left-4 top-18 z-40">
      <Card className="w-64 gap-1 border-border bg-card p-3">
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Panel admina
        </p>
        <nav className="flex flex-col gap-1">
          {adminNavItems.map(({ label, to, ...item }) => {
            const active =
              to === "/admin"
                ? pathname === "/admin"
                : "matchPrefix" in item && item.matchPrefix
                  ? pathname.startsWith(to)
                  : pathname === to;

            return (
              <Link
                key={to}
                to={to}
                className={
                  active ? navLinkActiveClassName : navLinkInactiveClassName
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </Card>
    </aside>
  );
}
