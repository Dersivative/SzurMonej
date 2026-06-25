import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { FundraisingCard } from "@/components/FundraisingCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/features/auth/store/authStore";
import { fetchFundraisersForChild } from "@/features/fundraisers/api/get-fundraisers-for-child";
import type {
  ChildFundraisersViewDTO,
  FundraiserResponseDTO,
} from "@/features/fundraisers/api/types";
import { fetchMyChildren } from "@/features/users/api/get-my-children";
import type { ChildResponseDTO } from "@/features/users/api/types";
import { cn } from "@/lib/utils";

function isFundraiserTreasurer(
  fundraiser: FundraiserResponseDTO,
  userId?: number,
): boolean {
  if (!userId) {
    return false;
  }

  return fundraiser.treasurer?.id === userId;
}

function getChildInitials(child: ChildResponseDTO): string {
  return `${child.name.charAt(0)}${child.surname.charAt(0)}`.toUpperCase();
}

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const {
    data: children = [],
    isLoading: isChildrenLoading,
    isError: isChildrenError,
  } = useQuery({
    queryKey: ["my-children"],
    queryFn: fetchMyChildren,
  });

  const childFundraiserQueries = useQueries({
    queries: children.map((child) => ({
      queryKey: ["child-fundraisers", child.id],
      queryFn: () => fetchFundraisersForChild(child.id),
      enabled: children.length > 0,
    })),
  });

  const isChildFundraisersLoading = childFundraiserQueries.some(
    (query) => query.isLoading,
  );
  const isChildFundraisersError = childFundraiserQueries.some(
    (query) => query.isError,
  );

  const handleChildFundraiserUpdate = (
    childId: number,
    updatedFundraiser: FundraiserResponseDTO,
  ) => {
    queryClient.setQueryData<ChildFundraisersViewDTO>(
      ["child-fundraisers", childId],
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          activeFundraisers: current.activeFundraisers.map((fundraiser) =>
            fundraiser.id === updatedFundraiser.id
              ? updatedFundraiser
              : fundraiser,
          ),
        };
      },
    );
  };

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Pulpit</h1>
        <p className="text-muted-foreground">
          Twoje dzieci i ich zbiórki
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">
              Dzieci i ich zbiórki
            </CardTitle>
            <CardDescription>
              Zbiórki, w których uczestniczą Twoje dzieci
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isChildrenLoading && (
            <p className="text-sm text-muted-foreground">Ładowanie dzieci...</p>
          )}

          {isChildrenError && (
            <p className="text-sm text-destructive">
              Nie udało się pobrać listy dzieci.
            </p>
          )}

          {!isChildrenLoading && !isChildrenError && children.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nie masz jeszcze dodanych dzieci.
            </p>
          )}

          {!isChildrenLoading &&
            !isChildrenError &&
            children.length > 0 &&
            isChildFundraisersLoading && (
              <p className="text-sm text-muted-foreground">
                Ładowanie zbiórek...
              </p>
            )}

          {!isChildrenLoading &&
            !isChildrenError &&
            children.length > 0 &&
            isChildFundraisersError && (
              <p className="text-sm text-destructive">
                Nie udało się pobrać zbiórek dla dzieci.
              </p>
            )}

          {!isChildrenLoading &&
            !isChildrenError &&
            children.length > 0 &&
            !isChildFundraisersLoading &&
            !isChildFundraisersError && (
              <Accordion
                type="multiple"
                defaultValue={children.map((child) => String(child.id))}
                className="w-full"
              >
                {children.map((child, index) => {
                  const fundraisers =
                    childFundraiserQueries[index]?.data?.activeFundraisers ??
                    [];
                  const fundraiserCount = fundraisers.length;

                  return (
                    <AccordionItem key={child.id} value={String(child.id)}>
                      <AccordionTrigger className="py-4 hover:no-underline">
                        <span className="flex flex-1 items-center justify-between gap-4 pr-2">
                          <span className="flex items-center gap-4">
                            <Avatar className="size-14 after:border-0">
                              <AvatarFallback className="bg-violet-600 text-lg font-semibold text-white">
                                {getChildInitials(child)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="space-y-1 text-left">
                              <span className="block text-xl font-semibold leading-tight">
                                {child.name} {child.surname}
                              </span>
                              {child.schoolClassName ? (
                                <Badge variant="secondary" className="text-sm">
                                  {child.schoolClassName}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-sm">
                                  Brak klasy
                                </Badge>
                              )}
                            </span>
                          </span>
                          <span className="text-sm font-normal text-muted-foreground">
                            {fundraiserCount === 1
                              ? "1 zbiórka"
                              : `${fundraiserCount} zbiórek`}
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        {fundraiserCount === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Brak aktywnych zbiórek.
                          </p>
                        ) : (
                          <div
                            className={cn(
                              "grid grid-cols-1 gap-4",
                              fundraiserCount > 1 && "lg:grid-cols-2",
                            )}
                          >
                            {fundraisers.map((fundraiser) => (
                              <FundraisingCard
                                key={fundraiser.id}
                                fundraiser={fundraiser}
                                isTreasurer={isFundraiserTreasurer(
                                  fundraiser,
                                  user?.id,
                                )}
                                onUpdate={(updatedFundraiser) =>
                                  handleChildFundraiserUpdate(
                                    child.id,
                                    updatedFundraiser,
                                  )
                                }
                              />
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
        </CardContent>
      </Card>
    </section>
  );
}
