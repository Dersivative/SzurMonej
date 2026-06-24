## Instruction for building frontend:

- Use shadcn components
- Use tailwind to style
- User should specify shadcn components that should be used, if not ask the user
- Do not edit anything in backed directory, if something is missing tell me what it is

## Backend API

Spring Boot REST API — zbiórki klasowe (skarbnik, rodzice, admin).

**Docs (gdy backend działa):**

- Swagger UI: http://localhost:8080/swagger-ui/index.html
- OpenAPI JSON: http://localhost:8080/v3/api-docs — `curl -s http://localhost:8080/v3/api-docs` gdy potrzebujesz pełnej listy endpointów
- Kontrolery: `src/main/java/org/game/szurmonej/controller/`

**Uruchomienie:** `./mvnw spring-boot:run` (port 8080). Postgres z `compose.yaml` (`5432:5432`). Jeśli port 5432 zajęty lokalnie: profil `local` — `./mvnw spring-boot:run -Dspring-boot.run.profiles=local` (Postgres na hoście **5433**). Frontend proxy: `/api` → `http://localhost:8080`.

**Auth:** sesja cookie (`SESSION`). Najpierw `POST /api/auth/login` z `{ "email", "password" }`, potem żądania z `credentials: 'include'`. Publiczne: `POST /api/users` (rejestracja), `GET /api/enrollment-links/{token}`.

**Seed (domyślnie włączony):** hasło testowe `rodzic` — `skarbnik1@example.com`, `rodzic1@example.com`, admin `admin@example.com` (hasło w logu startu, jeśli generowane).

**Główne grupy endpointów:**
| Prefix | Opis |
|--------|------|
| `/api/auth/*` | login, logout, me |
| `/api/users/*`, `/api/children/*` | profil, dzieci, avatary |
| `/api/school-classes/*` | klasy, enrollment link/applications |
| `/api/school-class-applications/*` | wnioski o nową klasę (admin) |
| `/api/school-classes/{classId}/fundraisers` | lista/tworzenie zbiórek |
| `/api/fundraisers/{id}/*` | szczegóły, uczestnicy, wpłaty, wypłaty, rozliczenie |
| `/api/account/*` | wpłata rodzica, przelew na zbiórkę |
| `/api/refund-requests/*` | prośby o zwrot |
| `/api/chats/*` | czat REST (polling wiadomości) |
| `/api/attachments/*` | upload/download załączników do historii |

**Modele:** `Fundraiser` (status: ACTIVE → RECONCILING → FINISHED; typ: TOTAL_GOAL | PER_CHILD_GOAL), `FundraiserParticipant` (debt/credit), `SchoolClass`, `Child`, `User`.
