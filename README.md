# FLAMES AI Compatibility System

A premium MERN + AI compatibility app with a clean FLAMES engine, Groq-powered relationship insights, MongoDB history, animated React UI, Framer Motion transitions, and React Three Fiber visuals.

## Live

- Frontend: https://client-chi-ashen-67.vercel.app
- Backend: https://server-lilac-xi.vercel.app
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
MONGO_URI=your_mongodb_connection_string
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
  "name2": "Meera"
}
```

Returns the FLAMES result, AI explanation, insight cards, elimination path, and share id.

## Deployment

Frontend can deploy to Vercel from `/client`.

Backend can deploy to Render from `/server` using `render.yaml`.

Backend can also deploy to Vercel from `/server` using `server/vercel.json`.

Required production environment variables:

- `GROQ_API_KEY`
- `MONGO_URI`
- `CLIENT_URL`
- `VITE_API_URL`
