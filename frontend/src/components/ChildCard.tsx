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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChildResponseDTO } from "@/features/users/api/types";

const childInputClassName =
  "h-10 border-0 bg-muted text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-base";

type ChildForm = {
  name: string;
  surname: string;
  dateOfBirth: string;
};

const fieldLabels: Record<keyof ChildForm, string> = {
  name: "Imię",
  surname: "Nazwisko",
  dateOfBirth: "Data urodzenia",
};

interface ChildCardProps {
  child: ChildResponseDTO;
  onUpdate: (child: ChildResponseDTO) => void;
}

function getInitials(name: string, surname: string): string {
  return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
}

function formatDateOfBirth(dateOfBirth: string): string {
  const [year, month, day] = dateOfBirth.split("-");
  if (!year || !month || !day) {
    return dateOfBirth;
  }

  return `${day}.${month}.${year}`;
}

function getChangedFields(values: ChildForm, child: ChildResponseDTO) {
  return (Object.keys(fieldLabels) as (keyof ChildForm)[])
    .filter((field) => values[field] !== child[field])
    .map((field) => ({
      field,
      label: fieldLabels[field],
      from:
        field === "dateOfBirth"
          ? formatDateOfBirth(child[field])
          : child[field],
      to:
        field === "dateOfBirth"
          ? formatDateOfBirth(values[field])
          : values[field],
    }));
}

export function ChildCard({ child, onUpdate }: ChildCardProps) {
  const [draft, setDraft] = useState<Partial<ChildForm>>({});
  const [dialogOpen, setDialogOpen] = useState(false);

  const values: ChildForm = {
    name: draft.name ?? child.name,
    surname: draft.surname ?? child.surname,
    dateOfBirth: draft.dateOfBirth ?? child.dateOfBirth,
  };

  const changedFields = getChangedFields(values, child);
  const hasChanges = changedFields.length > 0;

  const updateField = <K extends keyof ChildForm>(
    field: K,
    value: ChildForm[K],
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleConfirm = () => {
    onUpdate({
      ...child,
      name: values.name.trim(),
      surname: values.surname.trim(),
      dateOfBirth: values.dateOfBirth,
    });
    setDraft({});
  };

  const fieldId = (field: keyof ChildForm) => `child-${child.id}-${field}`;

  return (
    <>
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex shrink-0 items-center gap-3 lg:w-44">
            <Avatar className="size-12 after:border-0">
              <AvatarFallback className="bg-violet-600 text-sm font-semibold text-white">
                {getInitials(values.name, values.surname)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold">
                {values.name} {values.surname}
              </p>
              {child.schoolClassName ? (
                <Badge variant="secondary">{child.schoolClassName}</Badge>
              ) : (
                <Badge variant="outline">Brak klasy</Badge>
              )}
            </div>
          </div>

          <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor={fieldId("name")}>Imię</Label>
              <Input
                id={fieldId("name")}
                value={values.name}
                onChange={(event) => updateField("name", event.target.value)}
                className={childInputClassName}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={fieldId("surname")}>Nazwisko</Label>
              <Input
                id={fieldId("surname")}
                value={values.surname}
                onChange={(event) => updateField("surname", event.target.value)}
                className={childInputClassName}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={fieldId("dateOfBirth")}>Data urodzenia</Label>
              <Input
                id={fieldId("dateOfBirth")}
                type="date"
                value={values.dateOfBirth}
                onChange={(event) =>
                  updateField("dateOfBirth", event.target.value)
                }
                className={childInputClassName}
              />
            </div>

            <div className="space-y-2">
              <Label className="invisible" aria-hidden="true">
                Akcja
              </Label>
              <Button
                type="button"
                className="h-10 w-full"
                disabled={!hasChanges}
                onClick={() => setDialogOpen(true)}
              >
                Zapisz zmiany
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz zmienić dane?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p className="text-sm text-muted-foreground">
                  Zmiany dla {child.name} {child.surname}:
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
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Potwierdź
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
