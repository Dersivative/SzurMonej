import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChildResponseDTO } from "@/features/users/api/types";
import { uploadChildAvatar } from "@/features/users/api/upload-child-avatar";

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

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.length > 0) {
      return data;
    }
    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  }

  return fallback;
}

export function ChildCard({ child, onUpdate }: ChildCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Partial<ChildForm>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);

  const fieldId = (field: keyof ChildForm) => `child-${child.id}-${field}`;
  const childAvatarSrc = `/api/children/${child.id}/avatar?v=${avatarVersion}`;

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadChildAvatar(child.id, file),
    onSuccess: () => {
      setAvatarVersion((current) => current + 1);
      setSelectedFile(null);
      setAvatarError(null);
      setAvatarDialogOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error) => {
      setAvatarError(
        getErrorMessage(error, "Nie udało się zaktualizować avatara."),
      );
    },
  });

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

  const handleAvatarDialogChange = (open: boolean) => {
    setAvatarDialogOpen(open);
    if (!open) {
      setSelectedFile(null);
      setAvatarError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setAvatarError(null);
  };

  const handleAvatarUpload = () => {
    if (!selectedFile) {
      setAvatarError("Wybierz plik avatara.");
      return;
    }

    avatarMutation.mutate(selectedFile);
  };

  return (
    <>
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex shrink-0 items-center gap-3 lg:w-44">
            <button
              type="button"
              className="cursor-pointer rounded-full outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={`Zmień avatar dla ${values.name} ${values.surname}`}
              onClick={() => setAvatarDialogOpen(true)}
            >
              <UserAvatar
                src={childAvatarSrc}
                alt={`${values.name} ${values.surname}`}
                initials={getInitials(values.name, values.surname)}
                sizeClassName="size-12"
                fallbackClassName="text-sm"
              />
            </button>
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

      <AlertDialog open={avatarDialogOpen} onOpenChange={handleAvatarDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zmień avatar</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2 text-left">
                <p className="text-sm text-muted-foreground">
                  Wybierz zdjęcie dla {child.name} {child.surname}. Obsługiwane
                  formaty: JPG, PNG, GIF.
                </p>
                <div className="space-y-2">
                  <Label>Plik avatara</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Wybierz plik
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      {selectedFile ? selectedFile.name : "Nie wybrano pliku"}
                    </p>
                  </div>
                </div>
                {avatarError && (
                  <p className="text-sm text-destructive">{avatarError}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={avatarMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={avatarMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleAvatarUpload();
              }}
            >
              {avatarMutation.isPending ? "Zapisywanie..." : "Zapisz avatar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
