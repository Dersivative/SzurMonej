import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deactivateEnrollmentLink } from "@/features/classes/api/deactivate-enrollment-link";
import { generateEnrollmentLink } from "@/features/classes/api/generate-enrollment-link";
import { fetchEnrollmentLink } from "@/features/classes/api/get-enrollment-link";

interface ClassEnrollmentLinkDialogProps {
  classId: number;
  classLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClassEnrollmentLinkDialog({
  classId,
  classLabel,
  open,
  onOpenChange,
}: ClassEnrollmentLinkDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    data: enrollmentLink,
    isLoading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: ["enrollment-link", classId],
    queryFn: () => fetchEnrollmentLink(classId),
    enabled: open,
    retry: false,
  });

  const noActiveLink =
    isError &&
    isAxiosError(queryError) &&
    queryError.response?.status === 404;

  const invalidateLink = () => {
    queryClient.invalidateQueries({ queryKey: ["enrollment-link", classId] });
  };

  const { mutate: generateLink, isPending: isGenerating } = useMutation({
    mutationFn: () => generateEnrollmentLink(classId),
    onSuccess: (data) => {
      setError(null);
      queryClient.setQueryData(["enrollment-link", classId], data);
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nie udało się wygenerować linku."));
    },
  });

  const { mutate: deactivateLink, isPending: isDeactivating } = useMutation({
    mutationFn: () => deactivateEnrollmentLink(classId),
    onSuccess: () => {
      setError(null);
      invalidateLink();
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(mutationError, "Nie udało się dezaktywować linku."),
      );
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null);
      setCopied(false);
    }
    onOpenChange(nextOpen);
  };

  const handleCopy = async () => {
    if (!enrollmentLink?.url) {
      return;
    }
    try {
      await navigator.clipboard.writeText(enrollmentLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Nie udało się skopiować linku do schowka.");
    }
  };

  const isActionPending = isGenerating || isDeactivating;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Link do zapisów — {classLabel}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2 text-left">
              <p className="text-sm text-muted-foreground">
                Udostępnij link rodzicom, aby mogli zgłosić dziecko do tej
                klasy. Każdy link działa dla jednego wniosku — po użyciu
                wygeneruj nowy.
              </p>

              {isLoading && (
                <p className="text-sm text-muted-foreground">Ładowanie...</p>
              )}

              {!isLoading && noActiveLink && (
                <p className="text-sm text-muted-foreground">
                  Brak aktywnego linku do zapisów.
                </p>
              )}

              {!isLoading && enrollmentLink && (
                <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
                  <p className="text-sm font-medium">Aktywny link</p>
                  <a
                    href={enrollmentLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {enrollmentLink.url}
                  </a>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isActionPending}
                      onClick={handleCopy}
                    >
                      {copied ? "Skopiowano" : "Kopiuj link"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isActionPending}
                      onClick={() => deactivateLink()}
                    >
                      Dezaktywuj
                    </Button>
                  </div>
                </div>
              )}

              {!isLoading && isError && !noActiveLink && (
                <p className="text-sm text-destructive">
                  Nie udało się pobrać linku do zapisów.
                </p>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isActionPending}>Zamknij</AlertDialogCancel>
          <Button
            type="button"
            disabled={isActionPending}
            onClick={() => generateLink()}
          >
            {isGenerating
              ? "Generowanie..."
              : enrollmentLink
                ? "Wygeneruj nowy link"
                : "Generuj link"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const message = error.response?.data;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
}
