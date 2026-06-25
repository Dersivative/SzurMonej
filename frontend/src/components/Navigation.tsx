import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import {
  navLinkActiveClassName,
  navLinkInactiveClassName,
} from "@/lib/nav-link";

const navItems = [
  { label: "Pulpit", to: "/app/dashboard" },
  { label: "Wnioski", to: "/app/applications" },
  { label: "Klasy", to: "/app/classes" },
  { label: "Zbiórki", to: "/app/fundraisers" },
  { label: "Czaty", to: "/app/chats", matchPrefix: true },
  { label: "Moje konto", to: "/app/account" },
] as const;

export function Navigation() {
  const { pathname } = useLocation();

  return (
    <aside className="fixed left-4 top-18 z-40">
      <Card className="w-64 gap-1 p-3">
        <nav className="flex flex-col gap-1">
          {navItems.map(({ label, to, ...item }) => {
            const active =
              "matchPrefix" in item && item.matchPrefix
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
