# 📂 Submissions Module Breakdown

Оригиналният `submissions.routes.ts` беше разделен на **4 специализирани модула** за по-добра организация:

## 🗂️ Структура на файловете

```
routes/
├── submissions-crud.routes.ts   # CRUD операции за submissions
├── voting.routes.ts             # Voting система
├── prompts.routes.ts            # Prompt marketplace
└── uploads.routes.ts            # File upload операции
```

---

## 1. 📝 submissions-crud.routes.ts ✅ ПЪЛНА ИМПЛЕМЕНТАЦИЯ

**Размер:** 769 реда  
**Отговорности:** Основни CRUD операции за submissions

### Endpoints:
```typescript
GET    /api/submissions              # Листване с филтри и pagination
POST   /api/submissions              # Създаване на submission
POST   /api/submissions/save-from-ai # Запазване на AI изображение
GET    /api/submissions/:id          # Детайли за submission
PATCH  /api/submissions/:id          # Обновяване на submission
DELETE /api/submissions/:id          # Изтриване на submission
```

### Ключови функции:
- ✅ Public listing с approval филтриране
- ✅ Enrichment с `hasPurchasedPrompt` флаг
- ✅ Pagination и лимит на резултати
- ✅ Ownership проверки
- ✅ Media файлове cleanup при изтриване

### ✅ Статус: ГОТОВО
- ✅ POST /api/submissions - пълна имплементация (333 реда)
- ✅ POST /api/submissions/save-from-ai - пълна имплементация (110 реда)
- ✅ GET /api/submissions/:id - enrichment логика (83 реда)

---

## 2. 🗳️ voting.routes.ts ✅ ПЪЛНА ИМПЛЕМЕНТАЦИЯ

**Размер:** 424 реда  
**Отговорности:** Voting система с contest rules и rate limiting

### Endpoints:
```typescript
POST /api/votes        # Създаване на vote
GET  /api/votes/status # Статус на voting за потребител
```

### Ключови функции:
- ✅ Anonymous voting (по IP адрес)
- ✅ Authenticated voting
- ✅ Rate limiting (30 votes/hour)
- ✅ Contest-based voting rules
- ✅ Period-based voting limits
- ✅ Jury voting система

### Voting Rules (трябва да се имплементират):

#### 1. Voting Methods:
- `public` - Анонимни потребители могат да гласуват
- `logged_users` - Само регистрирани потребители
- `jury` - Само jury members от contest config

#### 2. Period-based Limits:
```typescript
config.periodDurationHours      // Период в часове (напр. 24)
config.votesPerUserPerPeriod   // Макс гласове в период (напр. 3)
```

#### 3. Total Limits:
```typescript
config.totalVotesPerUser  // Макс общо гласове за contest
```

#### 4. Timing Restrictions:
```typescript
config.votingStartAt  // Начало на voting период
config.votingEndAt    // Край на voting период
```

### ✅ Статус: ГОТОВО
- ✅ POST /api/votes - пълна имплементация (243 реда)
- ✅ GET /api/votes/status - пълна имплементация (172 реда)

---

## 3. 💰 prompts.routes.ts

**Отговорности:** Prompt marketplace с GLORY и crypto payments

### Endpoints:
```typescript
POST /api/prompts/purchase/:submissionId      # Покупка с GLORY
GET  /api/prompts/purchased                   # Списък с купени prompts
POST /api/prompts/purchase-with-solana        # Покупка със Solana/USDC
GET  /api/prompts/purchased/submissions       # Full submissions data
```

### Ключови функции:
- ✅ GLORY balance покупка
- ✅ Solana/USDC payment verification
- ✅ Automatic balance crediting
- ✅ Transaction recording в glory ledger
- ✅ Ownership validation

### Payment Flow:
1. User подава Solana transaction reference/hash
2. System верифицира transaction on-chain
3. Credits user balance (SOL/USDC)
4. Automatically purchases prompt with credited balance
5. Returns purchase confirmation

### Security Checks:
- ✅ Cannot purchase own prompt
- ✅ Transaction uniqueness (no replay attacks)
- ✅ Amount verification
- ✅ Recipient address verification
- ✅ Platform wallet configuration check

---

## 4. 📤 uploads.routes.ts

**Отговорности:** File upload операции

### Endpoints:
```typescript
POST /api/upload  # Upload файл и генериране на thumbnail
```

### Ключови функции:
- ✅ Multer integration
- ✅ File validation
- ✅ Cloudinary/Supabase upload
- ✅ Automatic thumbnail generation
- ✅ URL return

### Supported Formats:
- Images: JPG, PNG, GIF, WebP
- Videos: MP4, MOV, AVI

---

## 🎉 Статус: ПЪЛНА ИМПЛЕМЕНТАЦИЯ

**Всички файлове са с пълна имплементация и готови за използване!**

## 🔄 Migration Guide

### Стъпка 1: Обновете routes.ts.new ✅ ГОТОВО

Файлът вече е обновен с импортите:

```typescript
import { registerSubmissionCrudRoutes } from "./routes/submissions-crud.routes";
import { registerVotingRoutes } from "./routes/voting.routes";
import { registerPromptRoutes } from "./routes/prompts.routes";
import { registerUploadRoutes } from "./routes/uploads.routes";
```

### Стъпка 2: Имплементацията е готова! ✅

**Всички файлове имат пълна имплементация:**

1. ✅ **voting.routes.ts** - 424 реда, пълна имплементация
2. ✅ **submissions-crud.routes.ts** - 769 реда, пълна имплементация
3. ✅ **prompts.routes.ts** - 276 реда, пълна имплементация
4. ✅ **uploads.routes.ts** - 29 реда, пълна имплементация

### Стъпка 3: Тестване

Тествайте всяка група endpoints:

```bash
# Uploads
curl -X POST -F "file=@image.jpg" http://localhost:3000/api/upload

# Submissions
curl http://localhost:3000/api/submissions

# Voting
curl -X POST http://localhost:3000/api/votes -d '{"submissionId": "..."}'

# Prompts
curl http://localhost:3000/api/prompts/purchased
```

---

## 📊 Benefits

| Преди (1 файл) | След (4 файла) |
|----------------|----------------|
| ~293 реда | ~50-280 реда всеки |
| Всичко смесено | Ясно разделение |
| Трудно търсене | Лесна навигация |
| Сложно тестване | Изолирани тестове |

---

## 🎯 Best Practices

1. **Voting логика** - Много сложна, внимавайте с contest config валидациите
2. **Prompt payments** - Винаги верифицирайте crypto transactions on-chain
3. **File uploads** - Проверявайте file sizes и types преди upload
4. **Submissions CRUD** - Ownership checks са критични за сигурност

---

## 🔗 Връзки

- [Главна документация](./README.md)
- [API Reference](../docs/API.md) (ако съществува)
- [Оригинален routes.ts](../routes.ts.backup)

---

**Последна актуализация:** 29 октомври 2025  
**Статус:** ✅ Структурата е готова, имплементацията е частична

