import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mapUserResponse } from "@/features/auth/lib/map-user";
import {
  useAuthStore,
  type User,
  type UserRole,
} from "@/features/auth/store/authStore";
import { uploadUserAvatar } from "@/features/users/api/upload-avatar";

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getRoleLabel(role: UserRole): string {
  return role === "ADMIN" ? "Admin" : "Rodzic";
}

const profileInputClassName =
  "h-10 border-0 bg-muted text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-base";

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
};

const fieldLabels: Record<keyof ProfileForm, string> = {
  firstName: "Imię",
  lastName: "Nazwisko",
  email: "Email",
};

function getChangedFields(values: ProfileForm, user: User) {
  return (Object.keys(fieldLabels) as (keyof ProfileForm)[])
    .filter((field) => values[field] !== user[field])
    .map((field) => ({
      field,
      label: fieldLabels[field],
      from: user[field],
      to: values[field],
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

export function ProfileCard() {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Partial<ProfileForm>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const avatarMutation = useMutation({
    mutationFn: uploadUserAvatar,
    onSuccess: (response) => {
      setAuth(mapUserResponse(response));
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      queryClient.invalidateQueries({ queryKey: ["user-me"] });
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

  if (!user) {
    return null;
  }

  const values: ProfileForm = {
    firstName: draft.firstName ?? user.firstName,
    lastName: draft.lastName ?? user.lastName,
    email: draft.email ?? user.email,
  };

  const changedFields = getChangedFields(values, user);
  const hasChanges = changedFields.length > 0;

  const updateField = <K extends keyof ProfileForm>(
    field: K,
    value: ProfileForm[K],
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleConfirm = () => {
    setAuth({
      ...user,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      fullName: `${values.firstName} ${values.lastName}`,
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Dane osobowe</CardTitle>
          <CardDescription>Twoje podstawowe informacje</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="cursor-pointer rounded-full outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Zmień avatar"
              onClick={() => setAvatarDialogOpen(true)}
            >
              <UserAvatar
                src={user.avatar}
                alt={user.fullName}
                initials={getInitials(user.firstName, user.lastName)}
              />
            </button>

            <div className="space-y-1.5">
              <p className="text-base font-semibold">{user.fullName}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge>{getRoleLabel(user.role)}</Badge>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-first-name">Imię</Label>
              <Input
                id="profile-first-name"
                value={values.firstName}
                onChange={(event) =>
                  updateField("firstName", event.target.value)
                }
                className={profileInputClassName}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-last-name">Nazwisko</Label>
              <Input
                id="profile-last-name"
                value={values.lastName}
                onChange={(event) =>
                  updateField("lastName", event.target.value)
                }
                className={profileInputClassName}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={values.email}
                onChange={(event) => updateField("email", event.target.value)}
                className={profileInputClassName}
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
        </CardContent>
      </Card>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz zmienić dane?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
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
                  Wybierz zdjęcie profilowe. Obsługiwane formaty: JPG, PNG, GIF.
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
