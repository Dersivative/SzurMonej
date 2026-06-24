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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAuthStore,
  type User,
  type UserRole,
} from "@/features/auth/store/authStore";

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

export function ProfileCard() {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [draft, setDraft] = useState<Partial<ProfileForm>>({});
  const [dialogOpen, setDialogOpen] = useState(false);

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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Dane osobowe</CardTitle>
          <CardDescription>Twoje podstawowe informacje</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-14 after:border-0">
              <AvatarFallback className="bg-violet-600 text-base font-semibold text-white">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>

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
    </>
  );
}
