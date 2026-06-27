import { Link, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  FileText,
  HandCoins,
  LayoutDashboard,
  MessageCircle,
  User,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  navLinkActiveClassName,
  navLinkInactiveClassName,
} from "@/lib/nav-link";

const navItems = [
  { label: "Pulpit", to: "/app/dashboard", icon: LayoutDashboard },
  { label: "Wnioski", to: "/app/applications", icon: FileText },
  { label: "Klasy", to: "/app/classes", icon: Users },
  { label: "Zbiórki", to: "/app/fundraisers", icon: HandCoins },
  { label: "Czaty", to: "/app/chats", matchPrefix: true, icon: MessageCircle },
  { label: "Moje konto", to: "/app/account", icon: User },
] as const satisfies ReadonlyArray<{
  label: string;
  to: string;
  icon: LucideIcon;
  matchPrefix?: boolean;
}>;

export function Navigation() {
  const { pathname } = useLocation();

  return (
    <aside className="fixed left-4 top-18 z-40">
      <Card className="w-64 gap-1 p-3">
        <nav className="flex flex-col gap-1">
          {navItems.map(({ label, to, icon: Icon, ...item }) => {
            const active =
              "matchPrefix" in item && item.matchPrefix
                ? pathname.startsWith(to)
                : pathname === to;

            return (
              <Link
                key={to}
                to={to}
                className={
                  `${active ? navLinkActiveClassName : navLinkInactiveClassName} flex items-center gap-2`
                }
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
      </Card>
    </aside>
  );
}
