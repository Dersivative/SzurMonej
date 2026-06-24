import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/features/finance/lib/format-money";
import { createRefundRequest } from "@/features/fundraisers/api/create-refund-request";
import type { FundraiserResponseDTO } from "@/features/fundraisers/api/types";
import type { RefundRequestResponseDTO } from "@/features/fundraisers/api/types-refund";
import {
  getRefundableChildrenForParent,
  type RefundableChildOption,
} from "@/features/fundraisers/lib/refund-request";
import type { ChildResponseDTO } from "@/features/users/api/types";

const fundraiserInputClassName =
  "h-10 w-full rounded-md border-0 bg-muted px-3 text-base shadow-none outline-none focus-visible:ring-0 md:text-base";

interface CreateRefundRequestDialogProps {
  fundraiser: FundraiserResponseDTO;
  myChildren: ChildResponseDTO[];
  pendingRefundRequests?: RefundRequestResponseDTO[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.length > 0) {
      return data;
    }
  }
  return fallback;
}

function invalidateRefundQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ["my-fundraisers"] });
  queryClient.invalidateQueries({ queryKey: ["my-pending-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["treasurer-pending-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["class-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["fundraiser-refund-requests"] });
}

export function CreateRefundRequestDialog({
  fundraiser,
  myChildren,
  pendingRefundRequests = [],
  open,
  onOpenChange,
}: CreateRefundRequestDialogProps) {
  const queryClient = useQueryClient();
  const refundableChildren = getRefundableChildrenForParent(
    fundraiser,
    myChildren,
    pendingRefundRequests,
  );
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (refundableChildren.length === 1) {
      setSelectedChildId(String(refundableChildren[0].childId));
      return;
    }

    setSelectedChildId("");
  }, [open, refundableChildren]);

  const resetForm = () => {
    setSelectedChildId("");
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: (childId: number) =>
      createRefundRequest(fundraiser.id, childId),
    onSuccess: () => {
      invalidateRefundQueries(queryClient);
      handleOpenChange(false);
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(mutationError, "Nie udało się złożyć prośby o zwrot."),
      );
    },
  });

  const handleSubmit = () => {
    const parsedChildId = Number(selectedChildId);
    if (!parsedChildId || Number.isNaN(parsedChildId)) {
      setError("Wybierz dziecko.");
      return;
    }

    setError(null);
    mutate(parsedChildId);
  };

  const selectedChild: RefundableChildOption | undefined =
    refundableChildren.find(
      (child) => child.childId === Number(selectedChildId),
    );

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Prośba o zwrot</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2 text-left">
              <p className="text-sm text-muted-foreground">
                Złóż wniosek o zwrot wpłat ze zbiórki „{fundraiser.title}”.
                Skarbnik musi go zatwierdzić.
              </p>

              <div className="space-y-2">
                <Label htmlFor="refund-child">Dziecko</Label>
                <select
                  id="refund-child"
                  value={selectedChildId}
                  onChange={(event) => setSelectedChildId(event.target.value)}
                  disabled={isPending || refundableChildren.length === 0}
                  className={fundraiserInputClassName}
                >
                  <option value="">Wybierz dziecko</option>
                  {refundableChildren.map((child) => (
                    <option key={child.childId} value={child.childId}>
                      {child.childName} {child.childSurname} (
                      {formatMoney(child.netContribution)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedChild && (
                <p className="text-sm text-muted-foreground">
                  Kwota do zwrotu:{" "}
                  <span className="text-foreground">
                    {formatMoney(selectedChild.netContribution)}
                  </span>
                </p>
              )}

              {refundableChildren.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Brak dzieci z wpłatami w tej zbiórce.
                </p>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || refundableChildren.length === 0}
            onClick={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            {isPending ? "Wysyłanie..." : "Wyślij prośbę"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
