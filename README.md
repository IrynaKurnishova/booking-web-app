# Salon Booking App with an AI Assistant

A booking web app for beauty salons, barbershops and spas. Clients can book through a step-by-step flow or simply chat with an AI assistant that checks availability and creates the booking on its own. The salon owner gets a Telegram notification for every new booking.

The UI and the assistant are in Ukrainian.

## Features

- **Step-by-step booking:** service → specialist → date → time → confirmation.
- **Per-specialist availability:** free slots are calculated for each specialist separately, based on working hours, service duration and existing bookings.
- **Overlap check:** the conflict check and the insert run in a single Postgres transaction (an exclusion constraint is the next step for full race safety).
- **AI assistant (Claude, tool use):** the model calls `get_available_slots` and `book_appointment` itself, knows the current date in the salon's timezone, and answers FAQ from the salon config.
- **Telegram notifications:** the owner is notified about every new booking, whether it came from the form or the chat.
- **Config-driven:** services, specialists, hours and FAQ live in one file, `data/salon-config.json`.

## Tech stack

- Next.js 15 (App Router), React 19, Tailwind CSS
- PostgreSQL (hosted on Supabase, accessed through `pg`)
- Anthropic Claude API (`@anthropic-ai/sdk`)
- Telegram Bot API
- Deployed on Vercel

## Getting started

Requires Node.js 18+.

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string (Supabase or Neon, pooled URI) |
| `ANTHROPIC_API_KEY` | for `/chat` | Key from https://console.anthropic.com |
| `TELEGRAM_BOT_TOKEN` | optional | Bot token from @BotFather |
| `TELEGRAM_OWNER_CHAT_ID` | optional | Chat ID that receives booking notifications |

The `bookings` table is created automatically on the first request, so no manual migration is needed.

### Telegram notifications

1. Create a bot with @BotFather and copy the token.
2. Send any message to the bot from the owner's account.
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `chat.id`.
4. Set both variables in `.env.local` (and in your hosting provider's settings).

Without these variables the app works as usual, just without notifications.

## Project structure

- `app/` — pages (`/`, `/services`, `/booking`, `/chat`, `/profile`) and API routes (`/api/availability`, `/api/book`, `/api/chat`)
- `components/` — `BookingClient.jsx` (booking flow), `ChatClient.jsx` (chat UI)
- `lib/db.js` — slot calculation and bookings in Postgres
- `lib/llmAgent.js` — Claude agent with tool use
- `lib/telegram.js` — owner notifications
- `data/salon-config.json` — per-salon configuration

## Notes

- Each salon currently runs as its own deployment with its own database and config. Multi-tenancy is not implemented.
- Row Level Security is enabled on `bookings` as a lockdown for Supabase's public REST API. The app itself connects directly through `DATABASE_URL`.
- Written in plain JavaScript.
