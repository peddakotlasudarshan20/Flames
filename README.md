# Flames AI Compatibility System

A production-grade full-stack AI application that turns the classic FLAMES compatibility game into a polished relationship report generator with saved history, soft delete/restore, pagination, short-lived caching, and a recruiter-facing RAG portfolio assistant.

The project solves a common portfolio problem: showing more than a static UI. It demonstrates a complete request lifecycle across React, Express, Groq, MongoDB, caching, validation, deployment, and operational safeguards.

## Live Deployment

- Frontend: https://client-chi-ashen-67.vercel.app
- Backend: https://server-lilac-xi.vercel.app
- GitHub: https://github.com/peddakotlasudarshan20/Flames

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, Helmet, CORS, Zod, Morgan |
| AI | Groq LLM API through LangChain |
| Database | MongoDB Atlas, Mongoose |
| Cache | NodeCache for paginated results and RAG context |
| Deployment | Vercel frontend and Vercel serverless backend |

## Features

- FLAMES compatibility calculation with animated result presentation
- Groq-powered compatibility insights with safe fallback responses
- Floating RAG assistant for recruiters and portfolio reviewers
- MongoDB persistence for saved compatibility results
- Soft delete, deleted result view, and restore flow
- Paginated active/deleted history APIs
- Query optimization with `.lean()`, selected fields, and MongoDB indexes
- Short-lived response caching with mutation-based invalidation
- Strict input validation and MongoDB ObjectId validation
- Global rate limiting
- Request timeout handling and user-friendly errors
- Responsive UI with typing indicators, skeleton loading, and spam-click prevention
- Production builds with code splitting and cleaned dependencies

## Architecture Flow

1. User opens the React/Vite frontend deployed on Vercel.
2. The user submits names or asks the floating AI assistant a question.
3. The frontend validates empty input, prevents duplicate submits, and sends a JSON request to the Express backend.
4. Express applies Helmet, CORS, global rate limiting, JSON parsing, structured request logs, and route-level validation.
5. For compatibility reports, the backend runs the FLAMES algorithm, injects optional user context, and calls Groq through LangChain.
6. The generated report is stored in MongoDB through Mongoose.
7. History APIs query MongoDB using indexed filters such as `{ isDeleted: 1, createdAt: -1 }`.
8. Paginated results are cached in NodeCache for a short TTL.
9. Create, delete, restore, and clear operations invalidate result caches.
10. The frontend renders the response with animated UI, pagination, restore controls, and clean error states.

## How It Works Internally

### Frontend to Backend Flow

The frontend calls the backend through `VITE_API_URL`. API calls use timeout protection, JSON error parsing, and user-friendly fallback messages. Pagination keeps previous data visible while loading new pages and disables navigation buttons when loading or out of range.

### RAG Data Injection

The portfolio assistant uses a curated internal knowledge block describing the project, architecture, tech stack, caching, deployment, and database behavior. It also injects live MongoDB summary context such as active result count, deleted result count, and recent result categories. This context is cached briefly to avoid repeated database reads.

### Groq API Usage

Groq is used through LangChain's `ChatGroq` client. The compatibility report route uses Groq to generate relationship explanations, strengths, conflicts, advice, and insight cards. The chat route uses Groq to answer recruiter-style project questions using only the injected RAG context. Both paths have safe fallback responses.

### MongoDB Usage

MongoDB stores every compatibility result in a single `FlamesResult` collection. Deleted data is retained with:

```js
isDeleted: true
deletedAt: Date
```

Active data is always filtered with `isDeleted: false`. Deleted views use `isDeleted: true`. Restore resets `isDeleted` to `false` and `deletedAt` to `null`.

### Caching Layer

NodeCache stores short-lived API responses for:

- `GET /api/results`
- `GET /api/deleted-results`
- RAG assistant MongoDB summary context

Result caches are cleared when records are created, deleted, restored, or bulk-cleared.

## API Documentation

### Health

`GET /api/health`

Returns service status.

### Create Compatibility Report

`POST /api/flames`

```json
{
  "name1": "Aarav",
  "name2": "Meera",
  "personalityTraits": "Calm, ambitious",
  "interests": "Music, travel, startups",
  "communicationStyle": "Direct and expressive"
}
```

Returns the FLAMES result, Groq-generated insights, advice, strengths, possible conflicts, elimination path, and share id.

### Get Active Results

`GET /api/results?page=1&limit=10`

Returns:

```json
{
  "data": [],
  "items": [],
  "total": 0,
  "page": 1,
  "totalPages": 0
}
```

### Get Deleted Results

`GET /api/deleted-results?page=1&limit=10`

Returns paginated soft-deleted records.

### Get Shared Result

`GET /api/flames/:id`

Returns one active result by MongoDB ObjectId.

### Soft Delete Result

`DELETE /api/history/:id`

Sets `isDeleted: true` and writes `deletedAt`.

### Restore Result

`PATCH /api/results/:id/restore`

Sets `isDeleted: false` and clears `deletedAt`.

### Clear Active History

`DELETE /api/history`

Soft-deletes all active results.

### RAG Portfolio Assistant

`POST /api/chat`

```json
{
  "message": "How does the caching layer work?"
}
```

Returns:

```json
{
  "answer": "Short assistant response",
  "source": "groq"
}
```

## Security and Reliability

- Global rate limit: 100 requests per 15 minutes per IP
- Strict Zod validation for request bodies
- MongoDB ObjectId validation for id routes
- Message length limit for chat requests
- Input sanitization for form and chat data
- API timeout handling on frontend and backend AI calls
- User-friendly error messages
- Helmet security headers
- CORS allowlist
- Structured request and error logs

## Screenshots

Add screenshots here after capturing the deployed UI:

- Home and compatibility form
- Generated compatibility report
- Previous results pagination
- Deleted results and restore action
- Floating RAG assistant modal

## Local Development

Install dependencies:

```bash
npm run install:all
```

Create `server/.env`:

```bash
PORT=5000
MONGO_URI=mongodb+srv://app_user:secure_password@cluster0.example.mongodb.net/flames?retryWrites=true&w=majority&appName=Cluster0
MONGO_DB_NAME=flames
MONGO_TIMEOUT_MS=10000
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
CHAT_TIMEOUT_MS=12000
CLIENT_URL=http://localhost:5173
```

Create `client/.env`:

```bash
VITE_API_URL=http://localhost:5000
```

Run both apps:

```bash
npm run dev
```

Build client:

```bash
npm run build --prefix client
```

Start backend:

```bash
npm run start --prefix server
```

## Deployment

Frontend deploys from `/client` using `client/vercel.json`.

Backend deploys from `/server` using `server/vercel.json`.

Required production environment variables:

- `GROQ_API_KEY`
- `GROQ_MODEL`
- `MONGO_URI`
- `MONGO_DB_NAME`
- `MONGO_TIMEOUT_MS`
- `CHAT_TIMEOUT_MS`
- `CLIENT_URL`
- `VITE_API_URL`
