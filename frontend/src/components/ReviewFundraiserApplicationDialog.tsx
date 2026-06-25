import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchSchoolClass } from "@/features/classes/api/get-school-class";
import { approveFundraiserApplication } from "@/features/fundraisers/api/approve-fundraiser-application";
import { rejectFundraiserApplication } from "@/features/fundraisers/api/reject-fundraiser-application";
import type {
  FundraiserApplicationListItemDTO,
  FundraiserType,
} from "@/features/fundraisers/api/types";

const fundraiserInputClassName =
  "h-10 border-0 bg-muted text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-base";

interface ReviewFundraiserApplicationDialogProps {
  application: FundraiserApplicationListItemDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewFundraiserApplicationDialog({
  application,
  open,
  onOpenChange,
}: ReviewFundraiserApplicationDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(application.title);
  const [description, setDescription] = useState(application.description ?? "");
  const [fundraiserType, setFundraiserType] = useState<FundraiserType>(
    application.fundraiserType,
  );
  const [goalAmount, setGoalAmount] = useState(
    application.goalAmount != null ? String(application.goalAmount) : "",
  );
  const [perChildAmount, setPerChildAmount] = useState(
    application.perChildAmount != null ? String(application.perChildAmount) : "",
  );
  const [selectedChildren, setSelectedChildren] = useState<number[]>(
    application.participantIds ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const classId = application.classId;

  const { data: schoolClass, isLoading: isClassLoading } = useQuery({
    queryKey: ["school-class", classId],
    queryFn: () => fetchSchoolClass(classId!),
    enabled: open && classId != null,
  });

  const resetForm = () => {
    setTitle(application.title);
    setDescription(application.description ?? "");
    setFundraiserType(application.fundraiserType);
    setGoalAmount(
      application.goalAmount != null ? String(application.goalAmount) : "",
    );
    setPerChildAmount(
      application.perChildAmount != null
        ? String(application.perChildAmount)
        : "",
    );
    setSelectedChildren(application.participantIds ?? []);
    setError(null);
    setRejectOpen(false);
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

  const { mutate: approve, isPending: isApproving } = useMutation({
    mutationFn: () => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        throw new Error("Podaj cel zbiórki.");
      }

      if (fundraiserType === "TOTAL_GOAL") {
        const parsedGoal = Number(goalAmount.replace(",", "."));
        if (!goalAmount || Number.isNaN(parsedGoal) || parsedGoal <= 0) {
          throw new Error("Podaj kwotę docelową większą od zera.");
        }

        return approveFundraiserApplication(application.id, {
          title: trimmedTitle,
          description: description.trim() || undefined,
          fundraiserType,
          goalAmount: parsedGoal,
          participantIds:
            selectedChildren.length > 0 ? selectedChildren : undefined,
        });
      }

      const parsedPerChild = Number(perChildAmount.replace(",", "."));
      if (!perChildAmount || Number.isNaN(parsedPerChild) || parsedPerChild <= 0) {
        throw new Error("Podaj kwotę na dziecko większą od zera.");
      }

      return approveFundraiserApplication(application.id, {
        title: trimmedTitle,
        description: description.trim() || undefined,
        fundraiserType,
        perChildAmount: parsedPerChild,
        participantIds:
          selectedChildren.length > 0 ? selectedChildren : undefined,
      });
    },
    onSuccess: () => {
      invalidateFundraisers();
      handleOpenChange(false);
    },
    onError: (mutationError) => {
      if (mutationError instanceof Error && mutationError.message) {
        setError(mutationError.message);
        return;
      }
      setError(getErrorMessage(mutationError, "Nie udało się zatwierdzić wniosku."));
    },
  });

  const { mutate: reject, isPending: isRejecting } = useMutation({
    mutationFn: () => rejectFundraiserApplication(application.id),
    onSuccess: () => {
      invalidateFundraisers();
      setRejectOpen(false);
      handleOpenChange(false);
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(mutationError, "Nie udało się odrzucić wniosku."),
      );
      setRejectOpen(false);
    },
  });

  const isPending = isApproving || isRejecting;
  const parentName = application.requestingParent?.fullName;

  const toggleChild = (childId: number) => {
    setSelectedChildren((current) =>
      current.includes(childId)
        ? current.filter((id) => id !== childId)
        : [...current, childId],
    );
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Rozpatrz wniosek o zbiórkę</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2 text-left">
                {parentName && (
                  <p className="text-sm text-muted-foreground">
                    Wniosek od: <span className="text-foreground">{parentName}</span>
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="review-fundraiser-title">Cel zbiórki</Label>
                  <Input
                    id="review-fundraiser-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className={fundraiserInputClassName}
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-fundraiser-description">Opis</Label>
                  <textarea
                    id="review-fundraiser-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    disabled={isPending}
                    className="w-full resize-none rounded-md border-0 bg-muted px-3 py-2 text-base shadow-none outline-none focus-visible:ring-0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-fundraiser-type">Typ zbiórki</Label>
                  <select
                    id="review-fundraiser-type"
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
                    <Label htmlFor="review-fundraiser-goal">
                      Kwota docelowa (PLN)
                    </Label>
                    <Input
                      id="review-fundraiser-goal"
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
                    <Label htmlFor="review-fundraiser-per-child">
                      Kwota na dziecko (PLN)
                    </Label>
                    <Input
                      id="review-fundraiser-per-child"
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

                <div className="space-y-2">
                  <Label>Uczestnicy</Label>
                  <p className="text-sm text-muted-foreground">
                    Zaznacz uczniów lub zostaw puste, aby dodać wszystkich z klasy.
                  </p>
                  {isClassLoading && (
                    <p className="text-sm text-muted-foreground">
                      Ładowanie listy uczniów...
                    </p>
                  )}
                  {!isClassLoading && schoolClass && (
                    <div className="max-h-40 space-y-2 overflow-y-auto rounded-md bg-muted p-3">
                      {schoolClass.children.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Brak uczniów w klasie.
                        </p>
                      ) : (
                        schoolClass.children.map((child) => (
                          <label
                            key={child.id}
                            className="flex cursor-pointer items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={selectedChildren.includes(child.id)}
                              onChange={() => toggleChild(child.id)}
                              disabled={isPending}
                              className="size-4 rounded border-input"
                            />
                            <span>
                              {child.name} {child.surname}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel disabled={isPending}>Anuluj</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                setError(null);
                setRejectOpen(true);
              }}
            >
              Odrzuć
            </Button>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                setError(null);
                approve();
              }}
            >
              {isApproving ? "Zatwierdzanie..." : "Zatwierdź i utwórz"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odrzucić wniosek?</AlertDialogTitle>
            <AlertDialogDescription>
              Wniosek „{application.title}” zostanie odrzucony i zniknie z listy
              oczekujących.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                reject();
              }}
            >
              {isRejecting ? "Odrzucanie..." : "Odrzuć wniosek"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
