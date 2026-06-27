import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
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
import { updateFundraiserDetails } from "@/features/fundraisers/api/update-fundraiser-details";
import { updateFundraiserGoal } from "@/features/fundraisers/api/update-fundraiser-goal";
import type { FundraiserResponseDTO } from "@/features/fundraisers/api/types";
import {
  formatPolishDate,
  getFundraiserDateRangeError,
  toDateInputValue,
} from "@/features/fundraisers/lib/fundraiser-dates";

const fundraiserInputClassName =
  "h-10 border-0 bg-muted text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-base";

type FundraiserForm = {
  title: string;
  description: string;
  goalAmount: string;
  perChildAmount: string;
  startedAt: string;
  endsBy: string;
};

const fieldLabels: Record<keyof FundraiserForm, string> = {
  title: "Cel zbiórki",
  description: "Opis",
  goalAmount: "Kwota docelowa",
  perChildAmount: "Kwota na dziecko",
  startedAt: "Data startu",
  endsBy: "Data końca",
};

interface EditFundraiserDialogProps {
  fundraiser: FundraiserResponseDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (fundraiser: FundraiserResponseDTO) => void;
}

function formatMoney(amount: number | null | undefined): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(amount ?? 0);
}

function buildInitialForm(fundraiser: FundraiserResponseDTO): FundraiserForm {
  return {
    title: fundraiser.title,
    description: fundraiser.description ?? "",
    goalAmount: String(fundraiser.goalAmount),
    perChildAmount: String(fundraiser.perChildAmount ?? ""),
    startedAt: toDateInputValue(fundraiser.startedAt),
    endsBy: toDateInputValue(fundraiser.endsBy),
  };
}

function getChangedFields(
  values: FundraiserForm,
  fundraiser: FundraiserResponseDTO,
) {
  return (Object.keys(fieldLabels) as (keyof FundraiserForm)[])
    .filter((field) => {
      if (field === "goalAmount") {
        return (
          fundraiser.fundraiserType === "TOTAL_GOAL" &&
          values.goalAmount !== String(fundraiser.goalAmount)
        );
      }

      if (field === "perChildAmount") {
        return (
          fundraiser.fundraiserType === "PER_CHILD_GOAL" &&
          values.perChildAmount !== String(fundraiser.perChildAmount ?? "")
        );
      }

      if (field === "description") {
        return values.description !== (fundraiser.description ?? "");
      }

      if (field === "startedAt") {
        return values.startedAt !== toDateInputValue(fundraiser.startedAt);
      }

      if (field === "endsBy") {
        return values.endsBy !== toDateInputValue(fundraiser.endsBy);
      }

      return values[field] !== fundraiser[field];
    })
    .map((field) => ({
      field,
      label: fieldLabels[field],
      from:
        field === "goalAmount"
          ? formatMoney(fundraiser.goalAmount)
          : field === "perChildAmount"
            ? formatMoney(fundraiser.perChildAmount)
            : field === "description"
              ? fundraiser.description || "—"
              : field === "startedAt" || field === "endsBy"
                ? formatPolishDate(
                    field === "startedAt"
                      ? fundraiser.startedAt
                      : fundraiser.endsBy,
                  )
                : fundraiser.title,
      to:
        field === "goalAmount"
          ? formatMoney(Number(values.goalAmount))
          : field === "perChildAmount"
            ? formatMoney(Number(values.perChildAmount))
            : field === "startedAt" || field === "endsBy"
              ? formatPolishDate(values[field] || null)
              : values[field] || "—",
    }));
}

export function EditFundraiserDialog({
  fundraiser,
  open,
  onOpenChange,
  onUpdate,
}: EditFundraiserDialogProps) {
  const initialForm = buildInitialForm(fundraiser);
  const [title, setTitle] = useState(initialForm.title);
  const [description, setDescription] = useState(initialForm.description);
  const [goalAmount, setGoalAmount] = useState(initialForm.goalAmount);
  const [perChildAmount, setPerChildAmount] = useState(initialForm.perChildAmount);
  const [startedAt, setStartedAt] = useState(initialForm.startedAt);
  const [endsBy, setEndsBy] = useState(initialForm.endsBy);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const values: FundraiserForm = {
    title,
    description,
    goalAmount,
    perChildAmount,
    startedAt,
    endsBy,
  };
  const changedFields = getChangedFields(values, fundraiser);
  const hasChanges = changedFields.length > 0;
  const dateRangeError = useMemo(
    () => getFundraiserDateRangeError(startedAt, endsBy),
    [startedAt, endsBy],
  );

  const resetForm = () => {
    const nextForm = buildInitialForm(fundraiser);
    setTitle(nextForm.title);
    setDescription(nextForm.description);
    setGoalAmount(nextForm.goalAmount);
    setPerChildAmount(nextForm.perChildAmount);
    setStartedAt(nextForm.startedAt);
    setEndsBy(nextForm.endsBy);
    setFormError(null);
    setConfirmError(null);
  };

  const handleEditOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
      setConfirmOpen(false);
    }
    onOpenChange(nextOpen);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const rangeError = getFundraiserDateRangeError(startedAt, endsBy);
      if (rangeError) {
        throw new Error(rangeError);
      }

      let updated = fundraiser;
      const detailsChanged =
        title.trim() !== fundraiser.title ||
        description.trim() !== (fundraiser.description ?? "") ||
        startedAt !== toDateInputValue(fundraiser.startedAt) ||
        endsBy !== toDateInputValue(fundraiser.endsBy);
      const goalChanged =
        fundraiser.fundraiserType === "TOTAL_GOAL" &&
        goalAmount !== String(fundraiser.goalAmount);
      const perChildChanged =
        fundraiser.fundraiserType === "PER_CHILD_GOAL" &&
        perChildAmount !== String(fundraiser.perChildAmount ?? "");

      if (detailsChanged) {
        updated = await updateFundraiserDetails(fundraiser.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          startedAt: startedAt || undefined,
          endsBy: endsBy || undefined,
        });
      }

      if (goalChanged || perChildChanged) {
        const amountValue =
          fundraiser.fundraiserType === "TOTAL_GOAL"
            ? goalAmount
            : perChildAmount;
        const parsedAmount = Number(amountValue.replace(",", "."));
        if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
          throw new Error("Podaj prawidłową kwotę.");
        }

        updated = await updateFundraiserGoal(fundraiser.id, {
          newGoalAmount: parsedAmount,
        });
      }

      return updated;
    },
    onSuccess: (updatedFundraiser) => {
      onUpdate(updatedFundraiser);
      setConfirmOpen(false);
      onOpenChange(false);
      resetForm();
    },
    onError: (mutationError) => {
      if (mutationError instanceof Error && mutationError.message) {
        setConfirmError(mutationError.message);
        return;
      }

      if (isAxiosError(mutationError)) {
        const data = mutationError.response?.data;
        if (typeof data === "string" && data.length > 0) {
          setConfirmError(data);
          return;
        }
        if (
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof data.error === "string"
        ) {
          setConfirmError(data.error);
          return;
        }
      }

      setConfirmError("Nie udało się zapisać zmian.");
    },
  });

  const handleSubmitClick = () => {
    if (!title.trim()) {
      setFormError("Podaj cel zbiórki.");
      return;
    }

    if (dateRangeError) {
      setFormError(dateRangeError);
      return;
    }

    if (!hasChanges) {
      setFormError("Nie wprowadzono żadnych zmian.");
      return;
    }

    setFormError(null);
    setConfirmError(null);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    mutate();
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={handleEditOpenChange}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Edytuj zbiórkę</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2 text-left">
                <div className="space-y-2">
                  <Label htmlFor="edit-fundraiser-title">Cel zbiórki</Label>
                  <Input
                    id="edit-fundraiser-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className={fundraiserInputClassName}
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-fundraiser-description">Opis</Label>
                  <textarea
                    id="edit-fundraiser-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    disabled={isPending}
                    className="w-full resize-none rounded-md border-0 bg-muted px-3 py-2 text-base shadow-none outline-none focus-visible:ring-0"
                  />
                </div>

                {fundraiser.fundraiserType === "TOTAL_GOAL" ? (
                  <div className="space-y-2">
                    <Label htmlFor="edit-fundraiser-goal">
                      Kwota docelowa (PLN)
                    </Label>
                    <Input
                      id="edit-fundraiser-goal"
                      type="number"
                      min="0"
                      step="0.01"
                      value={goalAmount}
                      onChange={(event) => setGoalAmount(event.target.value)}
                      className={fundraiserInputClassName}
                      disabled={isPending}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="edit-fundraiser-per-child">
                      Kwota na dziecko (PLN)
                    </Label>
                    <Input
                      id="edit-fundraiser-per-child"
                      type="number"
                      min="0"
                      step="0.01"
                      value={perChildAmount}
                      onChange={(event) => setPerChildAmount(event.target.value)}
                      className={fundraiserInputClassName}
                      disabled={isPending}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-fundraiser-started-at">
                      Data startu
                    </Label>
                    <Input
                      id="edit-fundraiser-started-at"
                      type="date"
                      value={startedAt}
                      max={endsBy || undefined}
                      onChange={(event) => setStartedAt(event.target.value)}
                      className={fundraiserInputClassName}
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-fundraiser-ends-by">Data końca</Label>
                    <Input
                      id="edit-fundraiser-ends-by"
                      type="date"
                      value={endsBy}
                      min={startedAt || undefined}
                      onChange={(event) => setEndsBy(event.target.value)}
                      className={fundraiserInputClassName}
                      disabled={isPending}
                    />
                  </div>
                </div>

                {dateRangeError && (
                  <p className="text-sm text-destructive">{dateRangeError}</p>
                )}

                {formError && !dateRangeError && (
                  <p className="text-sm text-destructive">{formError}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending || Boolean(dateRangeError)}
              onClick={(event) => {
                event.preventDefault();
                handleSubmitClick();
              }}
            >
              Zatwierdź
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz zmienić dane?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p className="text-sm text-muted-foreground">
                  Zmiany dla zbiórki „{fundraiser.title}”:
                </p>
                <ul className="space-y-2 text-sm">
                  {changedFields.map(({ field, label, from, to }) => (
                    <li
                      key={field}
                      className="rounded-md bg-muted px-3 py-2 text-foreground"
                    >
                      <span className="font-medium">{label}:</span>{" "}
                      <span className="text-muted-foreground line-through">
                        {from}
                      </span>{" "}
                      → <span>{to}</span>
                    </li>
                  ))}
                </ul>
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
                handleConfirm();
              }}
            >
              {isPending ? "Zapisywanie..." : "Potwierdź"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
