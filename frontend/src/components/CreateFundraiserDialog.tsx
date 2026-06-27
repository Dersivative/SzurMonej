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
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "./ui/calendar";

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
  const [endsBy, setEndsBy] = useState<Date | undefined>();
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

  const resetForm = () => {
    setClassId("");
    setTitle("");
    setDescription("");
    setFundraiserType("TOTAL_GOAL");
    setGoalAmount("");
    setPerChildAmount("");
    setEndsBy(undefined);
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
          endsBy: endsBy ? format(endsBy, "yyyy-MM-dd") : undefined,
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
        endsBy: endsBy ? format(endsBy, "yyyy-MM-dd") : undefined,
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
                  : "Zbiórka zostanie przypisana do wybranej klasy. Wszyscy uczniowie klasy zostaną dodani automatycznie. Data startu ustawiana jest przy tworzeniu."}
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
                <Label>Data Zakończenia</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endsBy && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endsBy ? format(endsBy, "PPP") : <span>Wybierz datę</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endsBy}
                      onSelect={setEndsBy}
                    />
                  </PopoverContent>
                </Popover>
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
            disabled={isPending || classes.length === 0}
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