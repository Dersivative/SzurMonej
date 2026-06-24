import { useState } from "react";
import { AccountChildGroup } from "@/components/AccountChildGroup";
import { ProfileCard } from "@/components/ProfileCard";
import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import {
  navLinkActiveClassName,
  navLinkInactiveClassName,
} from "@/lib/nav-link";
import { cn } from "@/lib/utils";

type AccountTab = "profil" | "dzieci";

const accountTabs = [
  { id: "profil" as const, label: "Profil" },
  { id: "dzieci" as const, label: "Dzieci" },
];

export function AccountPage() {
  const [activeTab, setActiveTab] = useState<AccountTab>("profil");

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Moje konto</h1>
        <p className="text-muted-foreground">Zarządzaj swoimi danymi i dziećmi</p>
      </header>

      <Menubar className="h-auto w-fit gap-1 border-0 p-0">
        {accountTabs.map(({ id, label }) => {
          const active = activeTab === id;

          return (
            <MenubarMenu key={id}>
              <MenubarTrigger
                className={cn(
                  active ? navLinkActiveClassName : navLinkInactiveClassName,
                  active ? "aria-expanded:bg-active" : "aria-expanded:bg-hover",
                )}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </MenubarTrigger>
            </MenubarMenu>
          );
        })}
      </Menubar>

      {activeTab === "profil" && <ProfileCard />}
      {activeTab === "dzieci" && <AccountChildGroup />}
    </section>
  );
}