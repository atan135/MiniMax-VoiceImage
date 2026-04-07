# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Voice and image generation platform using MiniMax API with Express.js backend and Vue 3 frontend.

## Commands

```bash
# Install all dependencies
npm run install:all

# Start backend (server on port 3000)
npm run dev

# Start frontend dev server (Vite on port 5173)
cd client && npm run dev

# Build frontend for production
cd client && npm run build
```

## Architecture

### Backend (Express.js)

- Routes in `server/routes/` handle HTTP requests and responses
- Services in `server/services/` contain business logic
- `voiceService.js` and `imageService.js` call MiniMax API
- `voiceInventoryService.js` syncs voices API → MySQL database
- `historyService.js` manages generation history in MySQL
- Database tables auto-create on server startup via `initDatabase()` in `db.js`

### Frontend (Vue 3 + Element Plus)

- Views in `client/src/views/` correspond to pages
- API calls centralized in `client/src/api/index.js`
- Vite proxies `/api/*` to backend port 3000 and `/output/*` to static files

### Data Flow

1. Voice/Image generation requests → route → service → MiniMax API
2. Successful generation → `historyService.addRecord()` stores to MySQL
3. Voice options → `voiceInventoryService` reads from MySQL (cached)
4. Refresh voices → syncs from MiniMax API to MySQL, then reads back

### Key Patterns

- Routes use `maskSensitiveData()` from logger to sanitize logs (hides API_KEY)
- Voice deletion: API call + local MySQL delete (even if API fails)
- History records store masked params JSON, not raw sensitive data

## Database

Two MySQL tables: `generation_history` (all generations) and `voice_inventory` (cached voices).
Tables created automatically on `npm run dev`.

## Environment

Create `.env` with `API_KEY`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT`.
