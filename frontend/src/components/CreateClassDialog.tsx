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
import { createClassApplication } from "@/features/classes/api/create-class-application";

const classInputClassName =
  "h-10 border-0 bg-muted text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-base";

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateClassDialog({
  open,
  onOpenChange,
}: CreateClassDialogProps) {
  const queryClient = useQueryClient();
  const [proposedName, setProposedName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setProposedName("");
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: createClassApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-school-classes"] });
      queryClient.invalidateQueries({ queryKey: ["my-accessible-classes"] });
      queryClient.invalidateQueries({
        queryKey: ["my-pending-class-application"],
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (mutationError) => {
      if (isAxiosError(mutationError)) {
        const message = mutationError.response?.data;
        if (typeof message === "string" && message.length > 0) {
          setError(message);
          return;
        }
      }

      setError("Nie udało się utworzyć wniosku o klasę.");
    },
  });

  const handleSubmit = () => {
    const trimmedName = proposedName.trim();

    if (!trimmedName) {
      setError("Podaj nazwę klasy.");
      return;
    }

    setError(null);
    mutate({ proposedName: trimmedName });
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Utwórz klasę</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2 text-left">
              <p className="text-sm text-muted-foreground">
                Wniosek o utworzenie klasy wymaga zatwierdzenia przez
                administratora. Po akceptacji zostaniesz skarbnikiem klasy.
              </p>

              <div className="space-y-2">
                <Label htmlFor="class-proposed-name">Nazwa klasy</Label>
                <Input
                  id="class-proposed-name"
                  value={proposedName}
                  onChange={(event) => setProposedName(event.target.value)}
                  placeholder="np. 3B"
                  className={classInputClassName}
                  disabled={isPending}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            {isPending ? "Wysyłanie..." : "Wyślij wniosek"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
