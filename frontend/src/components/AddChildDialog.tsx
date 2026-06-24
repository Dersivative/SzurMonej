import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { createMyChild } from "@/features/users/api/create-my-child";

const childInputClassName =
  "h-10 border-0 bg-muted text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-base";

interface AddChildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddChildDialog({ open, onOpenChange }: AddChildDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setSurname("");
    setDateOfBirth("");
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: createMyChild,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-children"] });
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      setError("Nie udało się dodać dziecka. Sprawdź wprowadzone dane.");
    },
  });

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedSurname = surname.trim();

    if (!trimmedName || !trimmedSurname || !dateOfBirth) {
      setError("Wypełnij wszystkie pola.");
      return;
    }

    if (dateOfBirth > new Date().toISOString().slice(0, 10)) {
      setError("Data urodzenia nie może być z przyszłości.");
      return;
    }

    setError(null);
    mutate({
      name: trimmedName,
      surname: trimmedSurname,
      dateOfBirth,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dodaj dziecko</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2 text-left">
              <p className="text-sm text-muted-foreground">
                Podaj dane nowego dziecka powiązanego z Twoim kontem.
              </p>

              <div className="space-y-2">
                <Label htmlFor="child-name">Imię</Label>
                <Input
                  id="child-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={childInputClassName}
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="child-surname">Nazwisko</Label>
                <Input
                  id="child-surname"
                  value={surname}
                  onChange={(event) => setSurname(event.target.value)}
                  className={childInputClassName}
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="child-date-of-birth">Data urodzenia</Label>
                <Input
                  id="child-date-of-birth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  className={childInputClassName}
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
            {isPending ? "Dodawanie..." : "Dodaj"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
