import { BackendFinanceGapsCard } from "@/components/BackendFinanceGapsCard";
import { MakePaymentCard } from "@/components/MakePaymentCard";
import { MyBankAccountCard } from "@/components/MyBankAccountCard";

export function FinancesPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Finanse</h1>
        <p className="text-muted-foreground">
          Zarządzaj saldem konta i wykonuj przelewy
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <MyBankAccountCard />
        <MakePaymentCard />
      </div>

      <BackendFinanceGapsCard />
    </section>
  );
}
