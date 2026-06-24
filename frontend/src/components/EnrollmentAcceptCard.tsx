import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { approveEnrollmentApplication } from "@/features/classes/api/approve-enrollment-application";
import type { TreasurerEnrollmentApplicationItem } from "@/features/classes/api/get-treasurer-pending-enrollment-applications";
import { rejectEnrollmentApplication } from "@/features/classes/api/reject-enrollment-application";

interface EnrollmentAcceptCardProps {
  item: TreasurerEnrollmentApplicationItem;
}

function formatDate(dateString: string): string {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

export function EnrollmentAcceptCard({ item }: EnrollmentAcceptCardProps) {
  const { classId, application } = item;
  const { child, classLabel, parent, requestedAt } = application;
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["treasurer-pending-enrollment-applications"],
    });
    queryClient.invalidateQueries({ queryKey: ["my-enrollment-applications"] });
    queryClient.invalidateQueries({ queryKey: ["enrollment-applications"] });
    queryClient.invalidateQueries({ queryKey: ["my-accessible-classes"] });
    queryClient.invalidateQueries({ queryKey: ["my-school-classes"] });
    queryClient.invalidateQueries({ queryKey: ["all-school-classes"] });
    queryClient.invalidateQueries({ queryKey: ["school-class", classId] });
    queryClient.invalidateQueries({ queryKey: ["my-children"] });
    queryClient.invalidateQueries({ queryKey: ["my-pending-removals"] });
    queryClient.invalidateQueries({ queryKey: ["treasurer-pending-removals"] });
  };

  const { mutate: approve, isPending: isApproving } = useMutation({
    mutationFn: () => approveEnrollmentApplication(classId, application.id),
    onSuccess: () => {
      setError(null);
      invalidateQueries();
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nie udało się dołączyć dziecka."));
    },
  });

  const { mutate: reject, isPending: isRejecting } = useMutation({
    mutationFn: () => rejectEnrollmentApplication(classId, application.id),
    onSuccess: () => {
      setError(null);
      invalidateQueries();
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nie udało się odrzucić wniosku."));
    },
  });

  const isPending = isApproving || isRejecting;

  return (
    <div className="h-full">
      <div className="flex h-full flex-col rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xl font-semibold leading-snug">
            {child.name} {child.surname}
          </p>
          <Badge variant="secondary" className="h-7 shrink-0 px-3 py-1 text-sm">
            Oczekuje na zatwierdzenie
          </Badge>
        </div>

        <div className="mt-3 flex flex-1 flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Klasa: <span className="text-foreground">{classLabel}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Rodzic: <span className="text-foreground">{parent.fullName}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Złożono: {formatDate(requestedAt)}
          </p>

          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() => approve()}
            >
              {isApproving ? "Akceptowanie..." : "Akceptuj"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => reject()}
            >
              {isRejecting ? "Odrzucanie..." : "Odrzuć"}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const message = error.response?.data;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
}
