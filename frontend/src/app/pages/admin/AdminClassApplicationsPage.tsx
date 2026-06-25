import { useQuery } from "@tanstack/react-query";
import { SchoolClassApplicationCard } from "@/components/SchoolClassApplicationCard";
import { Card, CardContent } from "@/components/ui/card";
import { fetchPendingClassApplications } from "@/features/classes/api/get-pending-class-applications";
import { cn } from "@/lib/utils";

export function AdminClassApplicationsPage() {
  const {
    data: applications = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["pending-class-applications"],
    queryFn: fetchPendingClassApplications,
  });

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Wnioski o klasy</h1>
        <p className="text-muted-foreground">
          Zatwierdzaj lub odrzucaj wnioski o utworzenie nowych klas
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Ładowanie wniosków...</p>
          )}

          {isError && (
            <p className="text-sm text-destructive">
              Nie udało się pobrać wniosków o utworzenie klasy.
            </p>
          )}

          {!isLoading && !isError && applications.length === 0 && (
            <p className="text-sm text-muted-foreground">Brak oczekujących wniosków.</p>
          )}

          {!isLoading && !isError && applications.length > 0 && (
            <div
              className={cn(
                "grid grid-cols-1 gap-4",
                applications.length > 1 && "lg:grid-cols-2",
              )}
            >
              {applications.map((application) => (
                <SchoolClassApplicationCard
                  key={application.id}
                  application={application}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
