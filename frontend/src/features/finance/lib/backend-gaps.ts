export const BACKEND_FINANCE_GAPS = [
  {
    method: "GET",
    path: "/api/users/me",
    gap: "Brak pola accountNumber w odpowiedzi użytkownika.",
    proposal:
      'Rozszerzyć UserResponse o accountNumber (np. "accountNumber": "uuid").',
  },
  {
    method: "GET",
    path: "/api/users",
    gap: "Lista użytkowników nie zawiera accountNumber — wymagane do autouzupełniania numeru konta po wyborze imienia.",
    proposal:
      'Rozszerzyć UserResponse o accountNumber dla każdego użytkownika na liście (alternatywnie: GET /api/chats/related-users z accountNumber).',
  },
  {
    method: "GET",
    path: "/api/account/by-number/{accountNumber}",
    gap: "Brak wyszukiwania odbiorcy po numerze konta.",
    proposal:
      'Zwracać { "userId", "fullName", "accountNumber" } lub 404 gdy konto nie istnieje.',
  },
  {
    method: "POST",
    path: "/api/account/transfer-to-user",
    gap: "Brak przelewu między kontami użytkowników.",
    proposal:
      'Body: { "targetUserId"?: number, "targetAccountNumber"?: string, "amount": number, "note"?: string }. Odpowiedź: MoneyOperationResponse.',
  },
] as const;
