import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminFundraisingCard } from "@/components/admin/AdminFundraisingCard";
import { Card, CardContent } from "@/components/ui/card";
import { fetchAllFundraisers } from "@/features/fundraisers/api/get-all-fundraisers";
import type { FundraiserResponseDTO } from "@/features/fundraisers/api/types";
import { cn } from "@/lib/utils";

export function AdminFundraisersPage() {
  const queryClient = useQueryClient();

  const {
    data: fundraisers = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["all-fundraisers"],
    queryFn: fetchAllFundraisers,
  });

  const handleUpdate = (updatedFundraiser: FundraiserResponseDTO) => {
    queryClient.setQueryData<FundraiserResponseDTO[]>(
      ["all-fundraisers"],
      (current) =>
        current?.map((fundraiser) =>
          fundraiser.id === updatedFundraiser.id ? updatedFundraiser : fundraiser,
        ) ?? current,
    );
    queryClient.invalidateQueries({ queryKey: ["all-fundraisers"] });
  };

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Zbiórki</h1>
        <p className="text-muted-foreground">
          Podgląd wszystkich zbiórek i dozwolonych interwencji administratora
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Ładowanie zbiórek...</p>
          )}

          {isError && (
            <p className="text-sm text-destructive">Nie udało się pobrać listy zbiórek.</p>
          )}

          {!isLoading && !isError && fundraisers.length === 0 && (
            <p className="text-sm text-muted-foreground">Brak zbiórek w systemie.</p>
          )}

          {!isLoading && !isError && fundraisers.length > 0 && (
            <div
              className={cn(
                "grid grid-cols-1 gap-4",
                fundraisers.length > 1 && "xl:grid-cols-2",
              )}
            >
              {fundraisers.map((fundraiser) => (
                <AdminFundraisingCard
                  key={fundraiser.id}
                  fundraiser={fundraiser}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
