import { useState } from "react";
import { AccountChildGroup } from "@/components/AccountChildGroup";
import { MyBankAccountCard } from "@/components/MyBankAccountCard";
import { ProfileCard } from "@/components/ProfileCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  navLinkInactiveClassName,
} from "@/lib/nav-link";
import { cn } from "@/lib/utils";

type AccountTab = "profil" | "dzieci" | "finanse";

const accountTabs = [
  { id: "profil" as const, label: "Profil" },
  { id: "dzieci" as const, label: "Dzieci" },
  { id: "finanse" as const, label: "Finanse" },
];

export function AccountPage() {
  const [activeTab, setActiveTab] = useState<AccountTab>("profil");

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Moje konto</h1>
        <p className="text-muted-foreground">
          Zarządzaj profilem, dziećmi i saldem konta
        </p>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as AccountTab)}
        className="gap-0"
      >
        <TabsList className="h-auto w-fit gap-1 bg-transparent p-0">
        {accountTabs.map(({ id, label }) => {
          return (
              <TabsTrigger
                key={id}
                value={id}
                className={cn(
                  navLinkInactiveClassName,
                  "h-auto transition-none data-[state=active]:bg-emerald-500 data-[state=active]:font-medium data-[state=active]:text-white data-[state=active]:hover:bg-emerald-600",
                )}
              >
                {label}
              </TabsTrigger>
          );
        })}
        </TabsList>

        <TabsContent value="profil" className="mt-4">
          <ProfileCard />
        </TabsContent>
        <TabsContent value="dzieci" className="mt-4">
          <AccountChildGroup />
        </TabsContent>
        <TabsContent value="finanse" className="mt-4">
          <MyBankAccountCard />
        </TabsContent>
      </Tabs>
    </section>
  );
}