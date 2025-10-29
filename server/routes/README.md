# Routes Modularization - Структура на маршрутите

## 📁 Нова файлова структура

Оригиналният `routes.ts` файл (6162 реда, ~50K токена) беше разделен на по-малки, логически групирани модули:

```
routes/
├── utils.ts                     # Helper функции (refundEntryFee)
├── auth.routes.ts               # Автентикация (register, login, logout)
├── users.routes.ts              # Потребителски профили, wallet, payments
├── contests.routes.ts           # Конкурси (CRUD операции)
├── submissions-crud.routes.ts   # Submissions CRUD операции ⭐ НОВО
├── voting.routes.ts             # Voting система ⭐ НОВО
├── prompts.routes.ts            # Prompt marketplace ⭐ НОВО
├── uploads.routes.ts            # File uploads ⭐ НОВО
├── cashouts.routes.ts           # Cashout заявки
├── admin.routes.ts              # Admin панел операции
├── subscriptions.routes.ts      # Абонаменти и pricing
├── edits.routes.ts              # AI image editing (Replicate)
├── webhooks.routes.ts           # Webhooks (Replicate callback)
├── settings.routes.ts           # Системни настройки и AI models
└── SUBMISSIONS_BREAKDOWN.md     # Submissions модул документация ⭐ НОВО
```

## 🚀 Как да приложите промените

### Стъпка 1: Backup на оригиналния файл
```bash
cp routes.ts routes.ts.backup
```

### Стъпка 2: Заменете routes.ts
```bash
mv routes.ts.new routes.ts
```

### Стъпка 3: Завършете имплементацията

Някои файлове съдържат коментари `NOTE:` с указания къде да копирате код от оригиналния `routes.ts.backup`:

**submissions.routes.ts:**
- Ред 1617-1950: POST /api/submissions - пълна имплементация
- Ред 1953-2063: POST /api/submissions/save-from-ai
- Ред 2066-2149: GET /api/submissions/:id

**tiers.routes.ts + subscriptions-user.routes.ts + subscriptions-crypto.routes.ts:**
- Разделени на 3 модула (95 + 180 + 355 реда)
- Ред 4982-5061: POST /api/subscription/subscribe
- Ред 5070-5409: POST /api/subscription/purchase-crypto (Solana Pay)

**edits.routes.ts:**
- Ред 5591-5900+: POST /api/edits - пълна имплементация с Replicate

**webhooks.routes.ts:**
- Ред 6006-6157: POST /api/replicate-webhook - пълна имплементация

### Стъпка 4: Добавете липсващи маршрути

В новия `routes.ts` има TODO коментари за маршрути, които не са модуларизирани:

- **Voting маршрути** (`/api/votes/*`) - приблизително редове 2589-2835
- **Prompt purchase** (`/api/prompts/*`) - приблизително редове 3794-4093
- **AI generation** (`/api/ai/*`) - приблизително редове 4230-5590

Можете да ги добавите в съществуващи файлове или да създадете нови:
- `routes/voting.routes.ts`
- `routes/prompts.routes.ts`
- `routes/ai-generation.routes.ts`

## 📊 Структура на модулите

### auth.routes.ts
```typescript
- POST /api/auth/register    # Регистрация
- POST /api/auth/login       # Вход
- POST /api/auth/logout      # Изход
```

### users.routes.ts
```typescript
- GET    /api/me                           # Текущ потребител
- PATCH  /api/me                           # Обнови профил
- POST   /api/me/avatar                    # Качи аватар
- DELETE /api/me                           # Изтрий профил
- PATCH  /api/users/withdrawal-address     # Обнови адрес
- POST   /api/wallet/connect               # Свържи wallet
- GET    /api/wallet/me                    # Wallet инфо
- POST   /api/payment/verify-solana        # Верифицирай Solana плащане
- POST   /api/payment/find-by-reference    # Намери плащане по reference
```

### contests.routes.ts
```typescript
- GET    /api/contests                     # Всички конкурси
- GET    /api/contests/by-slug/:slug       # Конкурс по slug
- GET    /api/contests/featured            # Featured конкурс
- GET    /api/contests/:id                 # Конкретен конкурс
- POST   /api/admin/contests               # Създай конкурс (admin)
- PATCH  /api/admin/contests/:id           # Обнови конкурс (admin)
- DELETE /api/admin/contests/:id           # Изтрий конкурс (admin)
- PATCH  /api/admin/contests/:id/activate  # Активирай конкурс (admin)
- POST   /api/admin/contests/:id/end       # Приключи конкурс (admin)
- PATCH  /api/admin/contests/bulk/activate # Bulk активация (admin)
- POST   /api/admin/contests/bulk/end      # Bulk приключване (admin)
- DELETE /api/admin/contests/bulk          # Bulk изтриване (admin)
```

### submissions-crud.routes.ts ⭐
```typescript
- GET    /api/submissions              # Всички submissions
- POST   /api/submissions              # Създай submission
- POST   /api/submissions/save-from-ai # Запази AI изображение
- GET    /api/submissions/:id          # Конкретен submission
- PATCH  /api/submissions/:id          # Обнови submission
- DELETE /api/submissions/:id          # Изтрий submission
```

### voting.routes.ts ⭐
```typescript
- POST /api/votes        # Създай vote
- GET  /api/votes/status # Voting статус
```

### prompts.routes.ts ⭐
```typescript
- POST /api/prompts/purchase/:submissionId      # Купи prompt (GLORY)
- GET  /api/prompts/purchased                   # Купени prompts
- POST /api/prompts/purchase-with-solana        # Купи със Solana/USDC
- GET  /api/prompts/purchased/submissions       # Full submissions data
```

### uploads.routes.ts ⭐
```typescript
- POST /api/upload  # Upload файл
```

### admin.routes.ts
```typescript
- GET    /api/admin/users                          # Всички потребители
- PATCH  /api/admin/users/:id/status              # Обнови статус
- GET    /api/admin/submissions                    # Всички submissions
- PATCH  /api/admin/submissions/:id               # Обнови статус
- DELETE /api/admin/submissions/:id               # Изтрий submission
- PATCH  /api/admin/submissions/bulk/approve      # Bulk одобрение
- PATCH  /api/admin/submissions/bulk/reject       # Bulk отхвърляне
- DELETE /api/admin/submissions/bulk              # Bulk изтриване
- POST   /api/admin/cleanup-broken-submissions    # Cleanup
- GET    /api/admin/cashouts                      # Всички cashouts
- PATCH  /api/admin/cashouts/:id/status           # Обнови cashout
- GET    /api/admin/audit-logs                    # Audit logs
- GET    /api/admin/glory-transactions            # Glory транзакции
- GET    /api/admin/settings                      # Настройки
- POST   /api/admin/settings                      # Обнови настройки
```

## ✅ Предимства на новата структура

1. **По-лесна поддръжка** - всеки файл е фокусиран върху една функционалност
2. **По-добра организация** - логическото групиране улеснява намирането на код
3. **По-бързо зареждане** - файловете са по-малки и по-бързи за обработка
4. **По-добра тестваемост** - всеки модул може да се тества отделно
5. **Лесно добавяне на нови функции** - създайте нов route файл и го регистрирайте
6. **Намалено усложнение** - вместо 6000+ реда, всеки файл е 100-500 реда

## 🔧 Как да добавите нов route модул

1. Създайте нов файл в `routes/`:
```typescript
// routes/my-feature.routes.ts
import type { Express } from "express";

export function registerMyFeatureRoutes(app: Express): void {
  app.get("/api/my-feature", async (req, res) => {
    // вашата логика
  });
}
```

2. Импортирайте и регистрирайте в `routes.ts`:
```typescript
import { registerMyFeatureRoutes } from "./routes/my-feature.routes";

// ... в registerRoutes функцията:
registerMyFeatureRoutes(app);
```

## ⚠️ Важни бележки

- Някои файлове са със **скелетна структура** и изискват копиране на имплементация от оригиналния файл
- Проверете всички `NOTE:` коментари в кода
- Тествайте всяка група маршрути след имплементация
- Оригиналният `routes.ts.backup` е запазен за референция

## 📝 TODO

След като завършите основната имплементация, обмислете:

1. Създаване на `routes/voting.routes.ts` за voting функционалност
2. Създаване на `routes/prompts.routes.ts` за prompt marketplace
3. Създаване на `routes/ai-generation.routes.ts` за AI image generation
4. Добавяне на unit тестове за всеки route модул
5. Документиране на API endpoints (Swagger/OpenAPI)

## 🤝 Съдействие

При добавяне на нови маршрути, следвайте същата структура:
- Export функция `register{Feature}Routes(app: Express)`
- Групирайте свързани маршрути заедно
- Добавяйте коментари за сложна логика
- Използвайте middleware функции (authenticateToken, requireAdmin, и т.н.)

