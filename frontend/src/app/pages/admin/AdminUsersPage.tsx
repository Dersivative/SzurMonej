import { AdminUsersSection } from "@/components/AdminUsersSection";

export function AdminUsersPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Użytkownicy</h1>
        <p className="text-muted-foreground">
          Przeglądaj rodziców, dzieci i wykonuj operacje moderacyjne
        </p>
      </header>

      <AdminUsersSection />
    </section>
  );
}
