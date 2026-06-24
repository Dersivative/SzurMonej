import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserResponseDTO } from "@/features/auth/api/types";
import { lookupAccountByNumber } from "@/features/finance/api/lookup-account-by-number";
import type { RecipientValue } from "@/features/finance/api/types";
import { cn } from "@/lib/utils";

const inputClassName =
  "h-10 border-0 bg-muted text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-base";

const MIN_NAME_QUERY_LENGTH = 2;
const MIN_ACCOUNT_NUMBER_LENGTH = 8;

interface RecipientLookupFieldsProps {
  users: UserResponseDTO[];
  value: RecipientValue;
  onChange: (value: RecipientValue) => void;
  error?: string | null;
}

export function RecipientLookupFields({
  users,
  value,
  onChange,
  error,
}: RecipientLookupFieldsProps) {
  const [nameQuery, setNameQuery] = useState(value.fullName);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [isLookingUpAccount, setIsLookingUpAccount] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    const query = nameQuery.trim().toLowerCase();
    if (query.length < MIN_NAME_QUERY_LENGTH) {
      return [];
    }

    return users.filter((user) => {
      return (
        user.fullName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    });
  }, [nameQuery, users]);

  const handleSelectUser = (user: UserResponseDTO) => {
    const nextValue: RecipientValue = {
      userId: user.id,
      fullName: user.fullName,
      accountNumber: user.accountNumber ?? "",
    };
    setNameQuery(user.fullName);
    setSuggestionsOpen(false);
    setLocalError(null);
    onChange(nextValue);
  };

  const handleNameChange = (nextName: string) => {
    setNameQuery(nextName);
    setSuggestionsOpen(true);
    setLocalError(null);

    const exactMatch = users.find(
      (user) => user.fullName.toLowerCase() === nextName.trim().toLowerCase(),
    );

    if (exactMatch) {
      onChange({
        userId: exactMatch.id,
        fullName: exactMatch.fullName,
        accountNumber: exactMatch.accountNumber ?? value.accountNumber,
      });
      return;
    }

    onChange({
      userId: null,
      fullName: nextName,
      accountNumber: value.accountNumber,
    });
  };

  const handleAccountNumberChange = (nextAccountNumber: string) => {
    setLocalError(null);
    onChange({
      userId: null,
      fullName: value.fullName,
      accountNumber: nextAccountNumber,
    });
  };

  const handleAccountLookup = async () => {
    const trimmed = value.accountNumber.trim();
    if (trimmed.length < MIN_ACCOUNT_NUMBER_LENGTH) {
      return;
    }

    setIsLookingUpAccount(true);
    setLocalError(null);

    try {
      const result = await lookupAccountByNumber(trimmed);
      setNameQuery(result.fullName);
      onChange({
        userId: result.userId,
        fullName: result.fullName,
        accountNumber: result.accountNumber,
      });
    } catch (lookupError) {
      onChange({
        userId: null,
        fullName: value.fullName,
        accountNumber: trimmed,
      });
      setLocalError(getLookupErrorMessage(lookupError));
    } finally {
      setIsLookingUpAccount(false);
    }
  };

  const displayError = error ?? localError;

  return (
    <div className="space-y-4">
      <div className="relative space-y-2">
        <Label htmlFor="payment-recipient-name">Imię i nazwisko</Label>
        <Input
          id="payment-recipient-name"
          type="text"
          value={nameQuery}
          onChange={(event) => handleNameChange(event.target.value)}
          onFocus={() => setSuggestionsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setSuggestionsOpen(false), 150);
          }}
          placeholder="Wpisz imię i nazwisko"
          className={inputClassName}
          autoComplete="off"
        />

        {suggestionsOpen && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
            {suggestions.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-muted"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelectUser(user)}
                >
                  <span className="text-sm font-medium">{user.fullName}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {user.accountNumber ?? "Brak numeru konta w API"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment-account-number">Numer konta</Label>
        <Input
          id="payment-account-number"
          type="text"
          value={value.accountNumber}
          onChange={(event) => handleAccountNumberChange(event.target.value)}
          onBlur={() => {
            void handleAccountLookup();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleAccountLookup();
            }
          }}
          placeholder="Wpisz pełny numer konta"
          className={cn(inputClassName, "font-mono")}
          disabled={isLookingUpAccount}
        />
        <p className="text-xs text-muted-foreground">
          Po wpisaniu pełnego numeru konta imię i nazwisko uzupełnią się
          automatycznie.
        </p>
      </div>

      {displayError && (
        <p className="text-sm text-destructive">{displayError}</p>
      )}
    </div>
  );
}

function getLookupErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 404) {
      return "Nie znaleziono konta o podanym numerze.";
    }
    if (error.response?.status === 501 || error.response?.status === 405) {
      return "Weryfikacja numeru konta wymaga endpointu backendowego.";
    }
  }

  return "Nie udało się zweryfikować numeru konta.";
}
