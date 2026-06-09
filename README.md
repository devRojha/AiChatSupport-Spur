# SpurStore AI Chat Support

A full-stack AI-powered live chat widget for a fictional e-commerce store (SpurStore). Built as a take-home assignment for Spur's Founding Full-Stack Engineer role.

Users can open a chat widget, ask support questions, and get instant answers from an LLM — with full conversation history persisted across sessions.

---

## Demo

| Landing Page | Conversation List | Chat View |
|---|---|---|
| Floating widget button opens the modal | Past sessions with titles + timestamps | AI left, user right — iMessage style |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + TypeScript, Express 5 |
| Frontend | React 19 + TypeScript, Vite |
| Database | PostgreSQL via Prisma ORM |
| LLM | HuggingFace Inference API (`Qwen/Qwen2.5-7B-Instruct`) |
| Validation | Zod |
| Icons | Lucide React |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a hosted instance)
- A free [HuggingFace](https://huggingface.co) account with an API token

---

### 1. Clone the repo

```bash
git clone <repo-url>
cd AiChatSupport-Spur
```

---

### 2. Backend setup

```bash
cd backend
npm install
```

**Configure environment variables** — create a `.env` file in `backend/`:

```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/aidb"
PORT=3000
HUGGINGFACEHUB_API_KEY="hf_your_key_here"
REDIS_URL="redis://localhost:6379"
```

> Get your HuggingFace token at: https://huggingface.co/settings/tokens
> Make sure the token has **Inference** permission enabled.

**Run database migrations:**

```bash
npx prisma migrate dev
```

This creates the `Conversation` and `Message` tables.

**Start Redis** (requires Docker):

```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

**Start the backend:**

```bash
npm run dev
```

Server runs at `http://localhost:3000`.
Verify with: `curl http://localhost:3000/health`

---

### 3. Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

> The frontend assumes the backend is at `http://localhost:3000`. If you change the backend port, update `frontend/src/api/chat.ts`.

---

## API Reference

### `POST /api/v1/chat/message`
Send a user message and receive an AI reply.

**Request:**
```json
{ "query": "What is your return policy?", "sessionId": "optional-uuid" }
```

**Response:**
```json
{ "reply": "We offer a 30-day money-back guarantee...", "sessionId": "uuid" }
```

- Omit `sessionId` on first message — the backend creates a new session and returns its ID.
- Messages are capped at 1000 characters server-side.
- Returns `410 Gone` with `{ "error": "SESSION_EXPIRED" }` if the session is older than 2 hours.

---

### `GET /api/v1/chat/conversations`
Returns the 20 most recent conversations (for the sidebar).

**Response:**
```json
{ "conversations": [{ "id": "uuid", "title": "Return Policy Query", "createdAt": "..." }] }
```

---

### `GET /api/v1/chat/:sessionId/messages?page=1&limit=20`
Returns paginated messages for a session, newest page first. Each page is returned in chronological order so the frontend can prepend older chunks on scroll-up.

---

## Architecture

```
backend/src/
├── index.ts                    # Express app bootstrap, middleware, health check
├── routes/
│   ├── index.ts                # Root router — mounts feature routers
│   └── chat.routes.ts          # Chat endpoints (GET conversations, GET messages, POST message)
├── controllers/
│   └── chat.controller.ts      # HTTP layer — Zod validation, delegates to service, maps errors to status codes
├── services/
│   ├── chat.service.ts         # Business logic — session management, expiry check, LLM orchestration
│   └── llm.service.ts          # LLM abstraction — generateReply(), generateTitle() with Redis caching
├── repositories/
│   └── chat.repository.ts      # All Prisma/DB calls — find, create, update conversations & messages
├── db/
│   ├── prisma.ts               # Singleton Prisma client
│   └── redis.ts                # Redis client (createClient, auto-connect, error logging)
├── utils/
│   ├── constants.ts            # Shared constants — TTLs, cache keys, session expiry duration
│   ├── cache.ts                # Shared Redis helpers — redisGet(), redisSet(), normalise()
│   └── prompt.ts               # System prompt + title prompt templates
├── middleware/                 # Express middleware (cors, json, etc.)
└── types/
    └── zodSchema.ts            # Zod schemas for request validation
```

### Request lifecycle (POST /chat/message)

```
Frontend
  → Controller        Zod validation; catches SessionExpiredError → 410
  → chat.service      getOrCreateConversation()
      → chat.repository   findConversationById() or createConversation()
  → chat.service      session age check  (createdAt + 2h < now → throw SessionExpiredError)
  → chat.service      createMessage("user")
      → chat.repository   createMessage()
  → chat.service      getConversationHistory()  [last 10 msgs as LLM context]
      → chat.repository   findMessagesPaginated()
  → llm.service       generateReply(history, userMessage)
      → utils/cache       redisGet()  [cache check — first messages only]
      → HuggingFace       chatCompletion API (Qwen/Qwen2.5-7B-Instruct via Together)
      → utils/cache       redisSet()  [cache write, 1h TTL]
  → chat.service      createMessage("ai")
      → chat.repository   createMessage()
  → Response          { reply, sessionId }

  [background — non-blocking]
  → llm.service       generateTitle(userMessage)
      → utils/cache       redisGet() / redisSet()  [24h TTL]
      → HuggingFace       chatCompletion API
      → chat.repository   updateConversationTitle()
```

### Data Model

```
Conversation
  id          UUID (PK)
  title       String?     ← auto-generated by LLM on first message
  createdAt   DateTime

Message
  id          UUID (PK)
  text        String
  sender      "user" | "ai"
  timestamp   DateTime
  conversationId → Conversation
```

### Key Design Decisions

**Fire-and-forget title generation** — On the first message of a session, `generateTitle()` runs in the background (`.then().catch()`) so it doesn't block the reply. The title updates in the DB asynchronously.

**Zod at the boundary** — Validation happens only in the controller (system boundary). Internal services trust typed data and don't re-validate.

**LLM as a pure service** — `llm.service.ts` is completely decoupled from Express and Prisma. It takes plain strings in, returns a plain string out. Swapping LLM providers requires changes only in this file.

**Prompt-based knowledge** — Store FAQs are hardcoded in `prompt.ts`. This is intentional for simplicity; the architecture makes it trivial to swap to DB-driven knowledge later (see Enhancements).

**Session expiry (2-hour TTL)** — Sessions older than 2 hours are treated as expired. The check happens at two layers:
- *Backend*: `processChatMessage` computes `Date.now() - conversation.createdAt > 2h` and throws `SessionExpiredError`, which the controller catches and returns as HTTP `410 Gone` with `{ error: "SESSION_EXPIRED" }`. Using 410 (rather than 403/401) signals that the resource existed but is permanently gone.
- *Frontend*: `ChatView` computes `isExpired` from the `createdAt` timestamp passed down through `ChatModal → ConversationList`. The send button and textarea are disabled immediately on render — the user can't even attempt to send without a round-trip. A yellow warning banner is shown above the input area.

This dual-layer approach means even a client that bypasses the UI (e.g. cURL) is rejected at the API boundary.

---

## Caching (Redis)

The biggest performance bottleneck in this app is the LLM call — it takes 3–8 seconds on the free HuggingFace tier. Redis is used to eliminate that wait for repeated questions and to reduce unnecessary DB queries.

### What's cached

| Layer | Cache key | TTL | Why |
|---|---|---|---|
| LLM reply | `llm:reply:<normalised message>` | 1 hour | FAQ answers are stable — "return policy" always returns the same answer |
| Conversation title | `llm:title:<normalised message>` | 24 hours | Titles are generated once and never change |
| Conversations list | `conversations:list` | 30 seconds | Fetched every time the modal opens; changes infrequently |

### Why these specific choices

**LLM reply cache (biggest win)**
The LLM call is the only genuinely slow operation in the request lifecycle (~3–8s). Users frequently ask the same FAQ questions — "what's your return policy?", "do you ship to the USA?" — and the answer is always identical. Caching the reply for 1 hour means the second user to ask the same question gets an instant response instead of waiting for the LLM.

The cache key is derived from the **normalised** message text — lowercased, punctuation stripped, whitespace collapsed. This means `"What's your return policy?"` and `"what is return policy"` resolve to the same cache entry, maximising hit rate across slightly different phrasings.

**Only first messages are cached**
Follow-up messages in a conversation depend on the conversation history as context, so the same question can legitimately produce a different answer mid-conversation. Only first messages (no prior history) are cached — these are pure FAQ queries where context doesn't change the answer.

**Conversations list cache (reduce DB load)**
The list is fetched on every modal open. At moderate traffic, this is a wasteful repeated DB query — the list rarely changes. A 30-second TTL is short enough that a new conversation appears within half a minute without the user needing to refresh.

The cache is **explicitly invalidated** (not just expired) when a new conversation is created, so the list updates immediately after a new chat is started.

**Title cache (eliminate duplicate LLM calls)**
The title generation is a background LLM call. If two users start conversations with the same first message (common for FAQ entries), without caching this fires two identical LLM requests. The 24-hour TTL reflects that titles, once generated, never need to change.

### Fault tolerance

Redis failures are fully transparent — all cache operations are wrapped in `try/catch`. If Redis is down:
- Cache reads return `null` → code falls through to the LLM or DB
- Cache writes are skipped silently

The app works correctly without Redis; it just loses the performance benefit.

### Redis setup

```bash
# Docker (recommended)
docker run -d --name redis -p 6379:6379 redis:alpine

# Verify
docker exec -it redis redis-cli ping  # → PONG
```

---

## LLM Notes

**Provider:** HuggingFace Inference API (free tier)
**Model:** `Qwen/Qwen2.5-7B-Instruct` via Together inference provider

**Prompting approach:**
- A single user message is sent containing the full system context (store knowledge + conversation history + current user message).
- History is formatted as `User: ... / Assistant: ...` plain text and injected into the prompt template.
- The last 10 messages are included as context (configurable in `chat.service.ts` → `getConversationHistory` call).
- `max_tokens: 250`, `temperature: 0.2` — keeps replies short and factual.

**Out-of-scope guardrail:**
The system prompt explicitly instructs the model to respond with a fixed refusal message for any question not related to SpurStore. The LLM is told not to answer off-topic questions even partially.

**Token budget assumptions:**
- 250 output tokens ≈ ~3–4 sentences, sufficient for support answers.
- 10-message history window prevents unbounded context growth.

---

## Current Bottlenecks

**1. LLM latency (~3–8 seconds per reply)**
The free HuggingFace Together inference endpoint is slow and occasionally rate-limited. Redis caching eliminates this for repeated FAQ questions (cache hit = instant response), but the first user to ask any given question still waits the full duration. Follow-up messages within a conversation are never cached and always pay the full LLM cost.

**2. No streaming**
The entire reply is returned in one HTTP response. For longer answers, this creates a perceived dead period. Streaming (SSE or WebSockets) would make replies feel instant.

**3. Cold starts on the inference endpoint**
The Together provider may cold-start the model, adding several extra seconds on the first request after a period of inactivity.

**4. No connection pooling**
The Prisma client uses a single connection. Under concurrent load, DB queries will queue. PgBouncer or Prisma Accelerate would fix this.

**5. Prompt context window is static**
The last 10 messages are always fetched regardless of their length. Very long messages could push the context close to the model's token limit.

---

## Enhancements (If I Had More Time)

**Short-term:**
- [ ] **Streaming replies** — Switch to SSE (`chatCompletionStream`) so words appear as the model generates them, eliminating the perceived wait.
- [ ] **Rate limiting** — Add `express-rate-limit` on the POST endpoint to prevent abuse.
- [ ] **Input sanitisation** — Strip HTML/script tags from user input before persisting.
- [ ] **Cache follow-up messages** — Extend Redis caching to in-conversation messages using a hash of (sessionId + normalised message) as the key.

**Medium-term:**
- [ ] **DB-driven knowledge base** — Move store FAQs from the hardcoded prompt into a `KnowledgeEntry` table. Embed entries and do semantic search (pgvector) to inject only the most relevant context per query.
- [ ] **Conversation search** — Allow users to search past conversations by keyword.
- [ ] **Token-aware history truncation** — Count tokens in history and trim oldest messages first to stay within the model's context limit, instead of using a fixed message count.
- [ ] **Proper error taxonomy** — Distinguish between rate-limit errors, timeout errors, and invalid key errors, and surface different UI messages for each.

**Architectural:**
- [ ] **Swap LLM provider** — The `llm.service.ts` interface (`generateReply(history, message)`) is provider-agnostic. Switching to Claude or GPT-4o requires updating only this file and the env var.
- [ ] **WebSocket transport** — Replace polling with a persistent WebSocket connection for real-time, bidirectional chat — the natural step before adding WhatsApp/Instagram channels.
- [ ] **Auth** — Session tokens tied to a user ID rather than anonymous UUIDs, enabling cross-device history.

---

## Trade-offs Made

| Decision | Trade-off |
|---|---|
| HuggingFace free tier over OpenAI | Zero cost, but slower and less reliable than GPT-4o/Claude |
| Prompt-injected knowledge over RAG | Simpler to build, but doesn't scale past ~50 FAQs |
| REST over WebSockets | Simpler infra, but no streaming — every reply is a round-trip wait |
| Prisma over raw SQL | Faster to build + type-safe, but adds latency vs. pg directly |
| Plain CSS over Tailwind/shadcn | No build tooling overhead, but more verbose for component variants |

---

## Project Structure

```
AiChatSupport-Spur/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   │   └── chat.controller.ts
│   │   ├── services/
│   │   │   ├── chat.service.ts
│   │   │   └── llm.service.ts
│   │   ├── repositories/
│   │   │   └── chat.repository.ts
│   │   ├── routes/
│   │   │   ├── index.ts
│   │   │   └── chat.routes.ts
│   │   ├── db/
│   │   │   ├── prisma.ts
│   │   │   └── redis.ts
│   │   ├── utils/
│   │   │   ├── constants.ts
│   │   │   ├── cache.ts
│   │   │   └── prompt.ts
│   │   ├── middleware/
│   │   ├── types/
│   │   │   └── zodSchema.ts
│   │   └── index.ts
│   └── .env              ← not committed
└── frontend/
    └── src/
        ├── api/
        │   └── chat.ts
        ├── components/
        │   ├── ChatModal.tsx
        │   ├── ChatView.tsx
        │   └── ConversationList.tsx
        ├── types.ts
        ├── App.tsx
        └── main.tsx
```