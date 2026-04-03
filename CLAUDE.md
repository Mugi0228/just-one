# Just One - Party Word Game

## Project Overview

"Just One" is a cooperative party word game. Players submit one-word hints to help a guesser identify a secret word. Duplicate hints are eliminated before the guesser sees them.

**Stack:**
- Frontend: React 19 + TypeScript + Vite 6, Tailwind CSS 4
- Backend: Express 5 + Socket.io 4, in-memory state (no database)
- Shared types between client and server via `shared/`

## Key Commands

```bash
npm run dev          # Start both client (port 5173) and server (port 3001) concurrently
npm run dev:client   # Vite dev server only
npm run dev:server   # tsx watch server/index.ts only
npm run build        # vite build + tsc for server
npm start            # Run compiled server (dist-server/index.js)
npm test             # vitest run
npm run test:watch   # vitest watch mode
```

Type check: `npx tsc --noEmit`

## Architecture

```
server/        Express + Socket.io backend (port 3001)
src/           React frontend
shared/        Types shared between client and server
  types/
    events.ts  All Socket.io event definitions (source of truth)
```

**Path aliases:** `@/*` → `src/`, `@shared/*` → `shared/`

**Vite proxy:** `/socket.io` proxied to `http://localhost:3001` (WebSocket)

### Game Model

- Host = first player to create the room (unified view, no separate host pages)
- `ProgressionMode`: `'auto'` (timer-driven) | `'manual'` (MC/host controls transitions)
- All game state lives in server memory; no persistence across restarts

## Tech Conventions

- **Immutability:** Use `readonly` types and spread operators. Never mutate state in-place.
- **UI language:** Japanese throughout
- **Design system:** Duolingo-inspired — Nunito font, CSS custom properties defined in `src/index.css`
- **Socket events:** All event names and payloads typed in `shared/types/events.ts`. Add new events there first.
- **TypeScript strict mode** is enabled; avoid `any`.

## Known Issues

- No auth on host-only socket events (any client can trigger host actions)
- No reconnection or session recovery after disconnect
- Mobile drag-and-drop not supported (touch events not handled)
- Guesser can see topic card during `TOPIC_REVEAL` phase (information leak)
- Hiragana/Katakana duplicate detection gap (normalized comparison incomplete)
- Topic pool too small (~75 words); repetition occurs in long sessions
- `HINT_CHECKING` phase timeout is 5 s — too short for larger groups
