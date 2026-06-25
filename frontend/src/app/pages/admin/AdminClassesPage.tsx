import { useQuery } from "@tanstack/react-query";
import { AdminClassCard } from "@/components/admin/AdminClassCard";
import { Card, CardContent } from "@/components/ui/card";
import { fetchAllSchoolClasses } from "@/features/classes/api/get-all-school-classes";
import { cn } from "@/lib/utils";

export function AdminClassesPage() {
  const {
    data: classes = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["all-school-classes"],
    queryFn: fetchAllSchoolClasses,
  });

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Klasy</h1>
        <p className="text-muted-foreground">
          Przegląd wszystkich klas, uczniów i czatów klasowych
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Ładowanie klas...</p>
          )}

          {isError && (
            <p className="text-sm text-destructive">Nie udało się pobrać listy klas.</p>
          )}

          {!isLoading && !isError && classes.length === 0 && (
            <p className="text-sm text-muted-foreground">Brak klas w systemie.</p>
          )}

          {!isLoading && !isError && classes.length > 0 && (
            <div
              className={cn(
                "grid grid-cols-1 gap-4",
                classes.length > 1 && "lg:grid-cols-2",
              )}
            >
              {classes.map((schoolClass) => (
                <AdminClassCard key={schoolClass.id} schoolClass={schoolClass} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
