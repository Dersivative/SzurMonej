import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecipientLookupFields } from "@/components/RecipientLookupFields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mapUserResponse } from "@/features/auth/lib/map-user";
import { useAuthStore } from "@/features/auth/store/authStore";
import { transferToFundraiser } from "@/features/finance/api/transfer-to-fundraiser";
import { transferToUser } from "@/features/finance/api/transfer-to-user";
import type { RecipientValue } from "@/features/finance/api/types";
import { formatMoney } from "@/features/finance/lib/format-money";
import {
  getMyChildIdsInFundraiser,
  getParticipantRemainingAmount,
  getUnpaidParticipants,
} from "@/features/finance/lib/fundraiser-payment";
import { parseAmount, validateAmount } from "@/features/finance/lib/parse-amount";
import { validateRecipient } from "@/features/finance/lib/validate-recipient";
import { fetchFundraiserDetails } from "@/features/fundraisers/api/get-fundraiser-details";
import { fetchMyFundraisers } from "@/features/fundraisers/api/get-my-fundraisers";
import type { ParticipantResponseDTO } from "@/features/fundraisers/api/types";
import { fetchUserMe } from "@/features/users/api/get-me";
import { fetchMyChildren } from "@/features/users/api/get-my-children";
import { fetchUsers } from "@/features/users/api/get-users";
import { cn } from "@/lib/utils";

const inputClassName =
  "h-10 border-0 bg-muted text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-base";

type PaymentTarget = "user" | "fundraiser";

const emptyRecipient: RecipientValue = {
  userId: null,
  fullName: "",
  accountNumber: "",
};

interface FundraiserPaymentSummary {
  childId: number;
  childName: string;
  amount: number;
}

export function MakePaymentCard() {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const queryClient = useQueryClient();

  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget>("fundraiser");
  const [recipient, setRecipient] = useState<RecipientValue>(emptyRecipient);
  const [userAmount, setUserAmount] = useState("");
  const [selectedFundraiserId, setSelectedFundraiserId] = useState("");
  const [selectedChildIds, setSelectedChildIds] = useState<number[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [raceWarning, setRaceWarning] = useState<string | null>(null);
  const [pendingFundraiserSummary, setPendingFundraiserSummary] = useState<
    FundraiserPaymentSummary[]
  >([]);
  const [pendingUserSummary, setPendingUserSummary] = useState<{
    fullName: string;
    accountNumber: string;
    userId: number;
    amount: number;
  } | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: paymentTarget === "user",
  });

  const { data: myChildren = [] } = useQuery({
    queryKey: ["my-children"],
    queryFn: fetchMyChildren,
  });

  const { data: fundraisersData, isLoading: fundraisersLoading } = useQuery({
    queryKey: ["my-fundraisers", user?.id],
    queryFn: () => fetchMyFundraisers(user!.id),
    enabled: Boolean(user),
  });

  const activeFundraisers = useMemo(
    () =>
      (fundraisersData?.fundraisers ?? []).filter(
        (fundraiser) => fundraiser.status === "ACTIVE",
      ),
    [fundraisersData],
  );

  const selectedFundraiserListItem = useMemo(
    () =>
      activeFundraisers.find(
        (fundraiser) => String(fundraiser.id) === selectedFundraiserId,
      ),
    [activeFundraisers, selectedFundraiserId],
  );

  const { data: fundraiserDetails, isLoading: fundraiserDetailsLoading } =
    useQuery({
      queryKey: ["fundraiser-details", selectedFundraiserId],
      queryFn: () => fetchFundraiserDetails(Number(selectedFundraiserId)),
      enabled: paymentTarget === "fundraiser" && Boolean(selectedFundraiserId),
    });

  const myChildIds = useMemo(
    () => myChildren.map((child) => child.id),
    [myChildren],
  );

  const myUnpaidParticipants = useMemo(() => {
    if (!fundraiserDetails) {
      return [] as ParticipantResponseDTO[];
    }

    const myParticipants = getUnpaidParticipants(
      fundraiserDetails,
      getMyChildIdsInFundraiser(fundraiserDetails, myChildIds),
    );

    return myParticipants;
  }, [fundraiserDetails, myChildIds]);

  const recipientUsers = useMemo(
    () => users.filter((candidate) => candidate.id !== user?.id),
    [users, user?.id],
  );

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (paymentTarget === "user") {
        if (!pendingUserSummary) {
          throw new Error("Brak danych przelewu.");
        }

        await transferToUser({
          targetUserId: pendingUserSummary.userId,
          targetAccountNumber: pendingUserSummary.accountNumber,
          amount: pendingUserSummary.amount,
        });
        return;
      }

      if (!fundraiserDetails || pendingFundraiserSummary.length === 0) {
        throw new Error("Brak danych wpłaty na zbiórkę.");
      }

      const refreshed = await fetchFundraiserDetails(fundraiserDetails.id);
      const childIdsToPay = pendingFundraiserSummary.map((item) => item.childId);
      const stillUnpaid = getUnpaidParticipants(refreshed, childIdsToPay);

      if (stillUnpaid.length === 0) {
        throw new Error(
          "Wybrane dzieci zostały już opłacone przez kogoś innego. Odśwież formularz i spróbuj ponownie.",
        );
      }

      if (stillUnpaid.length < childIdsToPay.length) {
        const droppedNames = pendingFundraiserSummary
          .filter(
            (item) =>
              !stillUnpaid.some(
                (participant) => participant.childId === item.childId,
              ),
          )
          .map((item) => item.childName)
          .join(", ");
        setRaceWarning(
          `Pominięto już opłacone dzieci: ${droppedNames}. Wpłata zostanie wykonana tylko za pozostałe.`,
        );
      } else {
        setRaceWarning(null);
      }

      for (const participant of stillUnpaid) {
        await transferToFundraiser({
          fundraiserId: refreshed.id,
          childId: participant.childId,
        });
      }
    },
    onSuccess: async () => {
      const refreshedUser = await fetchUserMe();
      setAuth(mapUserResponse(refreshedUser));
      queryClient.invalidateQueries({ queryKey: ["user-me"] });
      queryClient.invalidateQueries({ queryKey: ["my-fundraisers", user?.id] });
      queryClient.invalidateQueries({
        queryKey: ["fundraiser-details", selectedFundraiserId],
      });

      if (paymentTarget === "user") {
        setSuccessMessage("Przelew do użytkownika został wykonany.");
        setRecipient(emptyRecipient);
      } else {
        setSuccessMessage("Wpłata na zbiórkę została wykonana.");
        setSelectedChildIds([]);
      }

      setConfirmOpen(false);
      setConfirmError(null);
      setFormError(null);
      setPendingFundraiserSummary([]);
      setPendingUserSummary(null);
    },
    onError: (error) => {
      setConfirmError(getErrorMessage(error, "Nie udało się wykonać operacji."));
    },
  });

  const toggleChildSelection = (childId: number) => {
    setSelectedChildIds((current) =>
      current.includes(childId)
        ? current.filter((id) => id !== childId)
        : [...current, childId],
    );
  };

  const buildFundraiserSummary = (): FundraiserPaymentSummary[] | null => {
    if (!fundraiserDetails) {
      setFormError("Wybierz zbiórkę.");
      return null;
    }

    if (selectedChildIds.length === 0) {
      setFormError("Wybierz co najmniej jedno nieopłacone dziecko.");
      return null;
    }

    return selectedChildIds
      .map((childId) => {
        const participant = myUnpaidParticipants.find(
          (item) => item.childId === childId,
        );
        if (!participant) {
          return null;
        }

        return {
          childId,
          childName: participant.childName,
          amount: getParticipantRemainingAmount(fundraiserDetails, participant),
        };
      })
      .filter((item): item is FundraiserPaymentSummary => item != null);
  };

  const handleOpenConfirm = () => {
    setFormError(null);
    setConfirmError(null);
    setRaceWarning(null);
    setSuccessMessage(null);

    if (paymentTarget === "user") {
      const amountError = validateAmount(userAmount);
      if (amountError) {
        setFormError(amountError);
        return;
      }

      const parsedAmount = parseAmount(userAmount);
      if (parsedAmount == null) {
        setFormError("Nieprawidłowa kwota.");
        return;
      }

      const recipientError = validateRecipient(recipient, recipientUsers);
      if (recipientError) {
        setFormError(recipientError);
        return;
      }

      if (recipient.userId == null) {
        setFormError("Wybierz odbiorcę z listy lub zweryfikuj numer konta.");
        return;
      }

      setPendingUserSummary({
        fullName: recipient.fullName.trim(),
        accountNumber: recipient.accountNumber.trim(),
        userId: recipient.userId,
        amount: parsedAmount,
      });

      setPendingFundraiserSummary([]);
      setConfirmOpen(true);
      return;
    }

    const summary = buildFundraiserSummary();
    if (!summary || summary.length === 0) {
      if (!formError) {
        setFormError("Nie udało się przygotować podsumowania wpłaty.");
      }
      return;
    }

    setPendingFundraiserSummary(summary);
    setPendingUserSummary(null);
    setConfirmOpen(true);
  };

  const totalFundraiserAmount = pendingFundraiserSummary.reduce(
    (sum, item) => sum + item.amount,
    0,
  );

  if (!user) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Wykonaj wpłatę</CardTitle>
          <CardDescription>
            Przelej środki do innego użytkownika lub na zbiórkę
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={paymentTarget === "user" ? "default" : "outline"}
              onClick={() => setPaymentTarget("user")}
            >
              Do użytkownika
            </Button>
            <Button
              type="button"
              variant={paymentTarget === "fundraiser" ? "default" : "outline"}
              onClick={() => setPaymentTarget("fundraiser")}
            >
              Na zbiórkę
            </Button>
          </div>

          {paymentTarget === "user" ? (
            <div className="space-y-4">
              <RecipientLookupFields
                users={recipientUsers}
                value={recipient}
                onChange={(nextRecipient) => {
                  setRecipient(nextRecipient);
                  setFormError(null);
                }}
              />

              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="payment-user-amount">Kwota (PLN)</Label>
                <Input
                  id="payment-user-amount"
                  type="text"
                  inputMode="decimal"
                  value={userAmount}
                  onChange={(event) => setUserAmount(event.target.value)}
                  placeholder="np. 50.00"
                  className={inputClassName}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-fundraiser">Zbiórka</Label>
                <select
                  id="payment-fundraiser"
                  value={selectedFundraiserId}
                  onChange={(event) => {
                    setSelectedFundraiserId(event.target.value);
                    setSelectedChildIds([]);
                  }}
                  disabled={fundraisersLoading}
                  className={cn(inputClassName, "w-full rounded-md px-3")}
                >
                  <option value="">Wybierz zbiórkę</option>
                  {activeFundraisers.map((fundraiser) => (
                    <option key={fundraiser.id} value={fundraiser.id}>
                      {fundraiser.title}
                      {fundraiser.classLabel ? ` (${fundraiser.classLabel})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {fundraisersLoading && (
                <p className="text-sm text-muted-foreground">
                  Ładowanie zbiórek...
                </p>
              )}

              {!fundraisersLoading && activeFundraisers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Brak aktywnych zbiórek do opłacenia.
                </p>
              )}

              {selectedFundraiserListItem && fundraiserDetailsLoading && (
                <p className="text-sm text-muted-foreground">
                  Ładowanie szczegółów zbiórki...
                </p>
              )}

              {fundraiserDetails && (
                <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{fundraiserDetails.title}</p>
                    <Badge variant="outline">
                      {fundraiserDetails.fundraiserType === "PER_CHILD_GOAL"
                        ? "Na dziecko"
                        : "Ogólna"}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Wybierz nieopłacone dzieci (możesz zaznaczyć kilka).
                      Kwotę naliczy system na podstawie zbiórki.
                    </p>
                    {myUnpaidParticipants.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Wszystkie Twoje dzieci w tej zbiórce są już opłacone.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {myUnpaidParticipants.map((participant) => {
                          const remaining = getParticipantRemainingAmount(
                            fundraiserDetails,
                            participant,
                          );
                          const checked = selectedChildIds.includes(
                            participant.childId,
                          );

                          return (
                            <label
                              key={participant.childId}
                              className="flex cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                            >
                              <span className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    toggleChildSelection(participant.childId)
                                  }
                                />
                                {participant.childName}
                              </span>
                              <span className="text-sm font-medium">
                                {formatMoney(remaining)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {formError && paymentTarget !== "user" && (
            <p className="text-sm text-destructive">{formError}</p>
          )}
          {successMessage && (
            <p className="text-sm text-emerald-600">{successMessage}</p>
          )}

          <Button type="button" size="lg" onClick={handleOpenConfirm}>
            Wpłać
          </Button>
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!transferMutation.isPending) {
            setConfirmOpen(open);
            if (!open) {
              setConfirmError(null);
            }
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdź przelew</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-left">
                {paymentTarget === "user" && pendingUserSummary ? (
                  <ul className="space-y-2 text-sm">
                    <li className="rounded-md bg-muted px-3 py-2">
                      <span className="font-medium">Odbiorca:</span>{" "}
                      {pendingUserSummary.fullName}
                    </li>
                    <li className="rounded-md bg-muted px-3 py-2">
                      <span className="font-medium">Numer konta:</span>{" "}
                      <span className="font-mono">
                        {pendingUserSummary.accountNumber}
                      </span>
                    </li>
                    <li className="rounded-md bg-muted px-3 py-2">
                      <span className="font-medium">Kwota:</span>{" "}
                      {formatMoney(pendingUserSummary.amount)}
                    </li>
                  </ul>
                ) : (
                  <ul className="space-y-2 text-sm">
                    <li className="rounded-md bg-muted px-3 py-2">
                      <span className="font-medium">Zbiórka:</span>{" "}
                      {fundraiserDetails?.title ?? "—"}
                    </li>
                    {pendingFundraiserSummary.map((item) => (
                      <li
                        key={item.childId}
                        className="rounded-md bg-muted px-3 py-2"
                      >
                        <span className="font-medium">{item.childName}:</span>{" "}
                        {formatMoney(item.amount)}
                      </li>
                    ))}
                    <li className="rounded-md bg-muted px-3 py-2 font-medium">
                      Razem: {formatMoney(totalFundraiserAmount)}
                    </li>
                  </ul>
                )}

                {raceWarning && (
                  <p className="text-sm text-amber-600">{raceWarning}</p>
                )}
                {confirmError && (
                  <p className="text-sm text-destructive">{confirmError}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={transferMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={transferMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                transferMutation.mutate();
              }}
            >
              {transferMutation.isPending ? "Wykonywanie..." : "Potwierdź"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 404) {
      return "Brak wymaganego endpointu backendowego. Zobacz sekcję „Braki API” na dole strony.";
    }

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

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
