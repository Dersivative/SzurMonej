import { Badge } from "@/components/ui/badge";
import type { MyPendingRemovalItem } from "@/features/classes/api/get-my-pending-removals";

interface PendingRemovalCardProps {
  item: MyPendingRemovalItem;
}

export function PendingRemovalCard({ item }: PendingRemovalCardProps) {
  const { child, classLabel } = item;

  return (
    <div className="h-full">
      <div className="flex h-full flex-col rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xl font-semibold leading-snug">
            {child.name} {child.surname}
          </p>
          <Badge variant="secondary" className="h-7 shrink-0 px-3 py-1 text-sm">
            W trakcie wypisywania
          </Badge>
        </div>

        <div className="mt-3 flex flex-1 flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Klasa: <span className="text-foreground">{classLabel}</span>
          </p>
          <p className="mt-auto text-sm text-muted-foreground">
            Skarbnik musi rozliczyć ewentualne zwroty i zakończyć wypisanie.
          </p>
        </div>
      </div>
    </div>
  );
}
