# FLAMES AI Compatibility System

An AI-powered compatibility analysis system combining algorithmic FLAMES logic with LLM-based relationship insights, MongoDB history, animated React UI, Framer Motion transitions, and React Three Fiber visuals.

## Live

- Frontend: https://flames-compatibility-ai.vercel.app
- Backend: https://flames-ai-api.vercel.app
- GitHub: https://github.com/peddakotlasudarshan20/Flames

## Stack

- React + Vite
- Tailwind CSS
- Framer Motion
- React Three Fiber / Three.js
- Node.js + Express
- MongoDB + Mongoose
- Groq API through LangChain

## Local Setup

```bash
npm run install:all
```

Create `server/.env`:

```bash
PORT=5000
MONGO_URI=mongodb+srv://app_user:secure_password@cluster.mongodb.net/flames-ai?retryWrites=true&w=majority
GROQ_API_KEY=your_groq_api_key
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

## API

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

Returns the FLAMES base result, relationship type, AI compatibility reasoning, strengths, possible conflicts, advice, insight cards, elimination path, and share id.

## Deployment

Frontend can deploy to Vercel from `/client`.

Backend can deploy to Render from `/server` using `render.yaml`.

Backend can also deploy to Vercel from `/server` using `server/vercel.json`.

Required production environment variables:

- `GROQ_API_KEY`
- `MONGO_URI`
- `CLIENT_URL`
- `VITE_API_URL`
