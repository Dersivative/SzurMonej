import type { UserResponseDTO } from "@/features/auth/api/types";
import type { RecipientValue } from "@/features/finance/api/types";

export function validateRecipient(
  value: RecipientValue,
  users: UserResponseDTO[],
): string | null {
  if (!value.fullName.trim()) {
    return "Podaj imię i nazwisko odbiorcy.";
  }

  if (!value.accountNumber.trim()) {
    return "Podaj numer konta odbiorcy.";
  }

  if (value.userId == null) {
    return "Wybierz odbiorcę z listy lub zweryfikuj numer konta.";
  }

  const matchedUser = users.find((user) => user.id === value.userId);
  if (
    matchedUser?.accountNumber &&
    matchedUser.accountNumber !== value.accountNumber.trim()
  ) {
    return "Imię i numer konta nie pasują do siebie.";
  }

  if (
    matchedUser &&
    matchedUser.fullName.trim().toLowerCase() !==
      value.fullName.trim().toLowerCase()
  ) {
    return "Imię i numer konta nie pasują do siebie.";
  }

  return null;
}
