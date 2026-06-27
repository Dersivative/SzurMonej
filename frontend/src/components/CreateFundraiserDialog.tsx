import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { createFundraiserApplication } from "@/features/fundraisers/api/create-fundraiser-application";
import { createFundraiser } from "@/features/fundraisers/api/create-fundraiser";
import { fetchClassesForFundraiserCreation } from "@/features/fundraisers/api/get-classes-for-fundraiser-creation";
import type { FundraiserType } from "@/features/fundraisers/api/types";
import {
  getFundraiserDateRangeError,
  getTodayDateInputValue,
} from "@/features/fundraisers/lib/fundraiser-dates";

const fundraiserInputClassName =
  "h-10 border-0 bg-muted text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-base";

interface CreateFundraiserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFundraiserDialog({
  open,
  onOpenChange,
}: CreateFundraiserDialogProps) {
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fundraiserType, setFundraiserType] =
    useState<FundraiserType>("TOTAL_GOAL");
  const [goalAmount, setGoalAmount] = useState("");
  const [perChildAmount, setPerChildAmount] = useState("");
  const [startedAt, setStartedAt] = useState(getTodayDateInputValue);
  const [endsBy, setEndsBy] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: classes = [] } = useQuery({
    queryKey: ["classes-for-fundraiser-creation"],
    queryFn: fetchClassesForFundraiserCreation,
    enabled: open,
  });

  const selectedClass = useMemo(
    () => classes.find((schoolClass) => String(schoolClass.id) === classId),
    [classes, classId],
  );

  const isParentApplication = selectedClass?.mode === "parent";
  const dateRangeError = useMemo(
    () => getFundraiserDateRangeError(startedAt, endsBy),
    [startedAt, endsBy],
  );

  const resetForm = () => {
    setClassId("");
    setTitle("");
    setDescription("");
    setFundraiserType("TOTAL_GOAL");
    setGoalAmount("");
    setPerChildAmount("");
    setStartedAt(getTodayDateInputValue());
    setEndsBy("");
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const invalidateFundraisers = () => {
    queryClient.invalidateQueries({ queryKey: ["my-fundraisers"] });
    queryClient.invalidateQueries({
      queryKey: ["my-pending-fundraiser-applications"],
    });
    queryClient.invalidateQueries({
      queryKey: ["treasurer-pending-fundraiser-applications"],
    });
  };

  const { mutate: createAsTreasurer, isPending: isCreatingFundraiser } =
    useMutation({
      mutationFn: ({
        selectedClassId,
        request,
      }: {
        selectedClassId: number;
        request: Parameters<typeof createFundraiser>[1];
      }) => createFundraiser(selectedClassId, request),
      onSuccess: () => {
        invalidateFundraisers();
        resetForm();
        onOpenChange(false);
      },
      onError: (mutationError) => {
        setError(getErrorMessage(mutationError, "Nie udało się utworzyć zbiórki."));
      },
    });

  const { mutate: submitApplication, isPending: isSubmittingApplication } =
    useMutation({
      mutationFn: createFundraiserApplication,
      onSuccess: () => {
        invalidateFundraisers();
        resetForm();
        onOpenChange(false);
      },
      onError: (mutationError) => {
        setError(
          getErrorMessage(mutationError, "Nie udało się złożyć wniosku o zbiórkę."),
        );
      },
    });

  const isPending = isCreatingFundraiser || isSubmittingApplication;

  const handleSubmit = () => {
    const parsedClassId = Number(classId);
    const trimmedTitle = title.trim();

    if (!parsedClassId || Number.isNaN(parsedClassId)) {
      setError("Wybierz klasę.");
      return;
    }

    if (!trimmedTitle) {
      setError("Podaj cel zbiórki.");
      return;
    }

    if (dateRangeError) {
      setError(dateRangeError);
      return;
    }

    const endsByValue = endsBy.trim() || undefined;
    const startedAtValue = startedAt.trim() || undefined;

    if (fundraiserType === "TOTAL_GOAL") {
      const parsedGoal = Number(goalAmount.replace(",", "."));
      if (!goalAmount || Number.isNaN(parsedGoal) || parsedGoal <= 0) {
        setError("Podaj kwotę docelową większą od zera.");
        return;
      }

      setError(null);

      if (isParentApplication) {
        submitApplication({
          classId: parsedClassId,
          title: trimmedTitle,
          description: description.trim() || undefined,
          fundraiserType,
          goalAmount: parsedGoal,
        });
        return;
      }

      createAsTreasurer({
        selectedClassId: parsedClassId,
        request: {
          title: trimmedTitle,
          description: description.trim() || undefined,
          fundraiserType,
          goalAmount: parsedGoal,
          startedAt: startedAtValue,
          endsBy: endsByValue,
        },
      });
      return;
    }

    const parsedPerChild = Number(perChildAmount.replace(",", "."));
    if (!perChildAmount || Number.isNaN(parsedPerChild) || parsedPerChild <= 0) {
      setError("Podaj kwotę na dziecko większą od zera.");
      return;
    }

    setError(null);

    if (isParentApplication) {
      submitApplication({
        classId: parsedClassId,
        title: trimmedTitle,
        description: description.trim() || undefined,
        fundraiserType,
        perChildAmount: parsedPerChild,
      });
      return;
    }

    createAsTreasurer({
      selectedClassId: parsedClassId,
      request: {
        title: trimmedTitle,
        description: description.trim() || undefined,
        fundraiserType,
        perChildAmount: parsedPerChild,
        startedAt: startedAtValue,
        endsBy: endsByValue,
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isParentApplication ? "Zaproponuj zbiórkę" : "Utwórz zbiórkę"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2 text-left">
              <p className="text-sm text-muted-foreground">
                {isParentApplication
                  ? "Wniosek trafi do skarbnika klasy. Po zatwierdzeniu zbiórka pojawi się na liście jako aktywna."
                  : "Zbiórka zostanie przypisana do wybranej klasy. Wszyscy uczniowie klasy zostaną dodani automatycznie."}
              </p>

              <div className="space-y-2">
                <Label htmlFor="fundraiser-class">Klasa</Label>
                <select
                  id="fundraiser-class"
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                  disabled={isPending || classes.length === 0}
                  className={`${fundraiserInputClassName} w-full rounded-md px-3`}
                >
                  <option value="">Wybierz klasę</option>
                  {classes.map((schoolClass) => (
                    <option key={schoolClass.id} value={schoolClass.id}>
                      {schoolClass.label}
                      {schoolClass.mode === "parent" ? " (wniosek)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fundraiser-title">Cel zbiórki</Label>
                <Input
                  id="fundraiser-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="np. Wycieczka do muzeum"
                  className={fundraiserInputClassName}
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fundraiser-description">Opis</Label>
                <textarea
                  id="fundraiser-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  disabled={isPending}
                  className="w-full resize-none rounded-md border-0 bg-muted px-3 py-2 text-base shadow-none outline-none focus-visible:ring-0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fundraiser-type">Typ zbiórki</Label>
                <select
                  id="fundraiser-type"
                  value={fundraiserType}
                  onChange={(event) =>
                    setFundraiserType(event.target.value as FundraiserType)
                  }
                  disabled={isPending}
                  className={`${fundraiserInputClassName} w-full rounded-md px-3`}
                >
                  <option value="TOTAL_GOAL">Kwota całkowita</option>
                  <option value="PER_CHILD_GOAL">Kwota na dziecko</option>
                </select>
              </div>

              {fundraiserType === "TOTAL_GOAL" ? (
                <div className="space-y-2">
                  <Label htmlFor="fundraiser-goal">Kwota docelowa (PLN)</Label>
                  <Input
                    id="fundraiser-goal"
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
                  <Label htmlFor="fundraiser-per-child">
                    Kwota na dziecko (PLN)
                  </Label>
                  <Input
                    id="fundraiser-per-child"
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

              {!isParentApplication && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fundraiser-started-at">Data startu</Label>
                    <Input
                      id="fundraiser-started-at"
                      type="date"
                      value={startedAt}
                      max={endsBy || undefined}
                      onChange={(event) => setStartedAt(event.target.value)}
                      className={fundraiserInputClassName}
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fundraiser-ends-by">Data końca</Label>
                    <Input
                      id="fundraiser-ends-by"
                      type="date"
                      value={endsBy}
                      min={startedAt || undefined}
                      onChange={(event) => setEndsBy(event.target.value)}
                      className={fundraiserInputClassName}
                      disabled={isPending}
                    />
                  </div>
                </div>
              )}

              {dateRangeError && !isParentApplication && (
                <p className="text-sm text-destructive">{dateRangeError}</p>
              )}

              {classes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Możesz utworzyć zbiórkę jako skarbnik klasy lub złożyć wniosek
                  jako rodzic dziecka przypisanego do klasy.
                </p>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || classes.length === 0 || Boolean(dateRangeError)}
            onClick={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            {isPending
              ? "Zapisywanie..."
              : isParentApplication
                ? "Złóż wniosek"
                : "Utwórz"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.length > 0) {
      return data;
    }
    if (
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
    ) {
      return data.error;
    }
  }

  return fallback;
}
