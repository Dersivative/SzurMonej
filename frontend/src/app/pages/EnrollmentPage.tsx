import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { type FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { fetchEnrollmentLinkPreview } from "@/features/classes/api/get-enrollment-link-preview";
import { submitEnrollmentApplication } from "@/features/classes/api/submit-enrollment-application";
import { useAuthStore } from "@/features/auth/store/authStore";
import { fetchMyChildren } from "@/features/users/api/get-my-children";
import type { ChildResponseDTO } from "@/features/users/api/types";
import { cn } from "@/lib/utils";

const selectClassName =
  "h-10 w-full rounded-md border-0 bg-muted px-3 text-base shadow-none focus-visible:ring-0";

function getEligibleChildren(children: ChildResponseDTO[]): ChildResponseDTO[] {
  return children.filter((child) => child.schoolClassId == null);
}

export function EnrollmentPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    data: preview,
    isLoading: isPreviewLoading,
    isError: isPreviewError,
  } = useQuery({
    queryKey: ["enrollment-link-preview", token],
    queryFn: () => fetchEnrollmentLinkPreview(token!),
    enabled: Boolean(token),
    retry: false,
  });

  const { data: children = [], isLoading: isChildrenLoading } = useQuery({
    queryKey: ["my-children"],
    queryFn: fetchMyChildren,
    enabled: Boolean(isAuthenticated && token),
  });

  const eligibleChildren = getEligibleChildren(children);

  const { mutate, isPending } = useMutation({
    mutationFn: (childId: number) =>
      submitEnrollmentApplication(token!, { childId }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["my-children"] });
      queryClient.invalidateQueries({ queryKey: ["my-enrollment-applications"] });
      queryClient.invalidateQueries({ queryKey: ["enrollment-applications"] });
      queryClient.invalidateQueries({
        queryKey: ["treasurer-pending-enrollment-applications"],
      });
      if (preview?.schoolClassId != null) {
        queryClient.invalidateQueries({
          queryKey: ["enrollment-applications", preview.schoolClassId],
        });
        queryClient.invalidateQueries({
          queryKey: ["school-class", preview.schoolClassId],
        });
      }
      setSuccessMessage(
        `Prośba o zapisanie dziecka do klasy „${preview?.schoolClassName}” została wysłana do skarbnika.`,
      );
    },
    onError: (mutationError) => {
      setSuccessMessage(null);
      setError(getErrorMessage(mutationError));
    },
  });

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated === null) {
    return (
      <Card className="w-full bg-transparent shadow-sm ring-0 p-8">
        <CardContent className="px-0">
          <p className="text-sm text-muted-foreground">Ładowanie...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedChildId) {
      setError("Wybierz dziecko do zapisu.");
      return;
    }

    setError(null);
    mutate(Number(selectedChildId));
  }

  const isLoading = isPreviewLoading || isChildrenLoading;

  return (
    <Card className="w-full max-w-lg bg-transparent shadow-sm ring-0 p-8">
      <CardHeader className="px-0">
        <CardTitle>Zapisy do klasy</CardTitle>
        <CardDescription>
          Wyślij prośbę o zapisanie dziecka. Skarbnik musi ją zatwierdzić.
        </CardDescription>
      </CardHeader>

      {isLoading && (
        <CardContent className="px-0">
          <p className="text-sm text-muted-foreground">Ładowanie...</p>
        </CardContent>
      )}

      {!isLoading && isPreviewError && (
        <CardContent className="px-0">
          <p className="text-sm text-destructive">
            Nieprawidłowy lub wygasły link zapisu.
          </p>
        </CardContent>
      )}

      {!isLoading && preview && successMessage && (
        <CardContent className="space-y-4 px-0">
          <p className="text-sm text-foreground">{successMessage}</p>
          <Button
            type="button"
            className="w-full"
            onClick={() => navigate("/app/dashboard", { replace: true })}
          >
            Zakończ
          </Button>
        </CardContent>
      )}

      {!isLoading && preview && !successMessage && (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 px-0">
            <div className="rounded-xl border bg-muted/40 p-4 space-y-1">
              <p className="text-lg font-semibold">{preview.schoolClassName}</p>
              <p className="text-sm text-muted-foreground">
                Skarbnik: {preview.treasurerName}
              </p>
            </div>

            {eligibleChildren.length > 0 ? (
              <div className="grid gap-2">
                <Label htmlFor="enrollment-child">Wybierz dziecko</Label>
                <select
                  id="enrollment-child"
                  value={selectedChildId}
                  onChange={(event) => setSelectedChildId(event.target.value)}
                  className={cn(selectClassName)}
                  disabled={isPending}
                  required
                >
                  <option value="">— wybierz dziecko —</option>
                  {eligibleChildren.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name} {child.surname}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nie masz dzieci dostępnych do zapisu. Dodaj dziecko na koncie
                lub wypisz je z innej klasy.
              </p>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>

          <CardFooter className="flex-col gap-3 border-0 bg-transparent px-0">
            {eligibleChildren.length > 0 && (
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Wysyłanie..." : "Wyślij prośbę o zapis"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              asChild
            >
              <Link to="/app/account">Dodaj dziecko na koncie</Link>
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}

function getErrorMessage(error: unknown): string {
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

  return "Nie udało się wysłać prośby o zapis.";
}
