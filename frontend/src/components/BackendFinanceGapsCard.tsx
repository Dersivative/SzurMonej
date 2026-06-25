import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BACKEND_FINANCE_GAPS } from "@/features/finance/lib/backend-gaps";

export function BackendFinanceGapsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Braki API (dla backendu)</CardTitle>
        <CardDescription>
          Endpointy wymagane do pełnej obsługi finansów na tej stronie
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {BACKEND_FINANCE_GAPS.map((gap) => (
          <div
            key={`${gap.method}-${gap.path}`}
            className="space-y-2 rounded-lg border bg-muted/30 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{gap.method}</Badge>
              <code className="text-sm font-mono">{gap.path}</code>
            </div>
            <p className="text-sm text-muted-foreground">{gap.gap}</p>
            <p className="text-sm">
              <span className="font-medium">Propozycja:</span> {gap.proposal}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
