import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { createUser } from "@/features/users/api/create-user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const message = error.response?.data;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
}

export function RegistrationPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      navigate("/login", {
        replace: true,
        state: {
          registrationSuccess:
            "Konto zostało utworzone. Poczekaj na akceptację przez administratora, a następnie zaloguj się.",
        },
      });
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    if (password !== confirmPassword) {
      setValidationError("Hasła nie są zgodne.");
      return;
    }

    if (password.length < 6) {
      setValidationError("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }

    mutate({ email, firstName, lastName, password });
  }

  return (
    <Card className="w-full max-w-sm bg-transparent shadow-sm ring-0 p-8">
      <CardHeader className="px-0">
        <CardTitle>Zarejestruj się</CardTitle>
        <CardDescription>
          Utwórz konto rodzica. Po rejestracji administrator musi je zaakceptować.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="px-0">
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                autoComplete="email"
                required
                disabled={isPending}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="firstName">Imię</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                disabled={isPending}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Nazwisko</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                disabled={isPending}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                disabled={isPending}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Powtórz hasło</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                disabled={isPending}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
            {isError && (
              <p className="text-sm text-destructive">
                {getErrorMessage(error, "Nie udało się zarejestrować konta.")}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3 border-0 bg-transparent px-0">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Rejestrowanie..." : "Zarejestruj się"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Masz już konto?{" "}
            <Link to="/login" className="text-foreground hover:underline">
              Zaloguj się
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
