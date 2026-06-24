import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/features/finance/lib/format-money";
import { parseAmount, validateAmount } from "@/features/finance/lib/parse-amount";
import { withdrawFromFundraiser } from "@/features/fundraisers/api/withdraw-from-fundraiser";
import type { FundraiserResponseDTO } from "@/features/fundraisers/api/types";

const fundraiserInputClassName =
  "h-10 border-0 bg-muted text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-base";

interface WithdrawFromFundraiserDialogProps {
  fundraiser: FundraiserResponseDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (fundraiser: FundraiserResponseDTO) => void;
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

function invalidateFundraiserQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  fundraiserId: number,
) {
  queryClient.invalidateQueries({ queryKey: ["my-fundraisers"] });
  queryClient.invalidateQueries({ queryKey: ["class-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["treasurer-pending-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["my-pending-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["auth-me"] });
  queryClient.invalidateQueries({ queryKey: ["fundraiser-details", fundraiserId] });
}

export function WithdrawFromFundraiserDialog({
  fundraiser,
  open,
  onOpenChange,
  onSuccess,
}: WithdrawFromFundraiserDialogProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const resetForm = () => {
    setAmount("");
    setNote("");
    setFormError(null);
    setConfirmError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
      setConfirmOpen(false);
    }
    onOpenChange(nextOpen);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const parsedAmount = parseAmount(amount);
      if (parsedAmount == null) {
        throw new Error("Podaj prawidłową kwotę.");
      }

      return withdrawFromFundraiser(fundraiser.id, {
        amount: parsedAmount,
        note: note.trim() || "Wypłata ze zbiórki",
      });
    },
    onSuccess: () => {
      invalidateFundraiserQueries(queryClient, fundraiser.id);
      setConfirmOpen(false);
      handleOpenChange(false);
      onSuccess?.(fundraiser);
    },
    onError: (mutationError) => {
      setConfirmError(
        getErrorMessage(mutationError, "Nie udało się wypłacić środków ze zbiórki."),
      );
    },
  });

  const handleSubmitClick = () => {
    const amountError = validateAmount(amount);
    if (amountError) {
      setFormError(amountError);
      return;
    }

    setFormError(null);
    setConfirmError(null);
    setConfirmOpen(true);
  };

  const parsedAmount = parseAmount(amount);

  return (
    <>
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Wypłata ze zbiórki</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2 text-left">
                <p className="text-sm text-muted-foreground">
                  Środki trafią na Twoje konto skarbnika. Zebrana kwota na karcie
                  zbiórki nie zmieni się — maleje tylko saldo konta zbiórki.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="withdraw-amount">Kwota (PLN)</Label>
                  <Input
                    id="withdraw-amount"
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className={fundraiserInputClassName}
                    disabled={isPending}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="withdraw-note">Opis (opcjonalnie)</Label>
                  <Input
                    id="withdraw-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className={fundraiserInputClassName}
                    disabled={isPending}
                    placeholder="np. Zakup materiałów"
                  />
                </div>

                {formError && (
                  <p className="text-sm text-destructive">{formError}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                handleSubmitClick();
              }}
            >
              Dalej
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdzić wypłatę?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p className="text-sm text-muted-foreground">
                  Wypłacisz {formatMoney(parsedAmount ?? 0)} ze zbiórki „
                  {fundraiser.title}”.
                </p>
                {note.trim() && (
                  <p className="text-sm text-muted-foreground">
                    Opis: <span className="text-foreground">{note.trim()}</span>
                  </p>
                )}
                {confirmError && (
                  <p className="text-sm text-destructive">{confirmError}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                mutate();
              }}
            >
              {isPending ? "Wypłacanie..." : "Wypłać"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
