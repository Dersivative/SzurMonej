import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { login } from "@/features/auth/api/login";
import { useAuthStore } from "@/features/auth/store/authStore";
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

const TEST_ACCOUNTS = [
  { email: "rodzic1@example.com", label: "rodzic1@example.com", password: "rodzic" },
  { email: "skarbnik1@example.com", label: "skarbnik1@example.com", password: "rodzic" },
  { email: "admin@example.com", label: "admin@example.com (admin)", password: "admin" },
] as const;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const locationState = location.state as {
    from?: { pathname?: string };
    registrationSuccess?: string;
  } | null;

  const defaultRedirect = locationState?.from?.pathname ?? "/app/dashboard";
  const registrationSuccess = locationState?.registrationSuccess;

  const { mutate, isPending, isError } = useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      setAuth(user);
      queryClient.setQueryData(["auth-me"], user);
      const redirectPath =
        user.role === "ADMIN" ? "/admin" : defaultRedirect;
      navigate(redirectPath, { replace: true });
    },
  });

  if (isAuthenticated) {
    const user = useAuthStore.getState().user;
    const redirectPath = user?.role === "ADMIN" ? "/admin" : defaultRedirect;
    return <Navigate to={redirectPath} replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    mutate({ email, password });
  }

  function fillTestAccount(testEmail: string, testPassword: string) {
    setEmail(testEmail);
    setPassword(testPassword);
  }

  return (
    <Card className="w-full max-w-sm bg-transparent shadow-sm ring-0 p-8">
      <CardHeader className="px-0">
        <CardTitle>Zaloguj się</CardTitle>
        <CardDescription>
          Wpisz e-mail i hasło, aby zalogować się na konto
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
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={isPending}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {registrationSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">
                {registrationSuccess}
              </p>
            )}
            {isError && (
              <p className="text-sm text-destructive">
                Nieprawidłowy e-mail lub hasło.
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3 border-0 bg-transparent">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Logowanie..." : "Zaloguj się"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Nie masz konta?{" "}
            <Link to="/register" className="text-foreground hover:underline">
              Zarejestruj się
            </Link>
          </p>
          <div className="w-full space-y-1 pt-3 text-center text-xs text-muted-foreground">
            <p>Konta testowe</p>
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className="block w-full hover:text-foreground hover:underline"
                disabled={isPending}
                onClick={() => fillTestAccount(account.email, account.password)}
              >
                {account.label} (hasło: {account.password})
              </button>
            ))}
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
