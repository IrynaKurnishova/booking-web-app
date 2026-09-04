# Prototype: Booking Website with AI Assistant

A web version based on the example you showed (velvet-app-tau.vercel.app): homepage with a list of services → booking flow (specialist + date + time) → AI assistant chat → profile page (placeholder). The Telegram bot from the first prototype remains a separate additional channel and does not replace this web application.

**Tech stack:** Next.js (App Router) + Tailwind + Claude API. Built so that my wife, as a frontend developer, can continue working on it immediately — it is a standard React/Next.js project with no unusual dependencies or architecture.

Built and tested: `npm run build` completes without errors, and the backend logic (available slots, booking creation, conflict detection) has been tested and works correctly.

## Requirements

Node.js 18+ (https://nodejs.org, click the LTS version).

## Setup

1. Run `npm install`
2. Copy `.env.example` to `.env.local`:

   * `ANTHROPIC_API_KEY` (get it at https://console.anthropic.com → API Keys). Without it, everything works except the `/chat` page.
   * `DATABASE_URL` — PostgreSQL connection string (see the section below). Without it, `/booking` and `/chat` (booking creation) will not work.
3. Edit `data/salon-config.json` for your salon: business name, services, specialists (each specialist has their own list of services they can perform), business hours, and FAQ.
4. Run `npm run dev` and open http://localhost:3000

## Database (PostgreSQL)

Bookings are stored in PostgreSQL, not in a file, so the application works correctly after a serverless deployment.

The fastest way to get a free database:

1. Sign up at https://supabase.com (or https://neon.tech) and create a project.
2. Copy the connection string (Connection String, URI/pooling mode).
3. Paste it into `DATABASE_URL` in `.env.local`.

The `bookings` table is created automatically on the first request to `/api/availability` or `/api/book` — no manual migrations are required.

For local development, you can use the same cloud database project; a separate local database is optional.

## Project Structure (Quick Overview)

* `app/page.js` — homepage (services + “Book Now” / “Ask the AI Assistant” buttons)
* `app/services/page.js` — services list
* `app/booking/page.js` + `components/BookingClient.jsx` — service → specialist → date → time selection → confirmation form
* `app/chat/page.js` + `components/ChatClient.jsx` — AI assistant chat
* `app/api/availability`, `app/api/book`, `app/api/chat` — server-side logic (Route Handlers)
* `lib/db.js` — available slot calculation and booking storage
* `lib/llmAgent.js` — Claude API conversation engine with function calling (same two tools: check available slots and create a booking)
* `lib/telegram.js` — Telegram notification for salon owners when a new booking is created
* `data/salon-config.json` — the only place that needs customization for a specific salon

## Telegram Notifications for the Salon Owner

For every new booking (whether made through the booking form or via chat), the salon owner can receive a Telegram notification.

Bookings will still be created normally without Telegram integration — notifications are optional. Without them, the only way to see new bookings is by checking the database manually.

### Setup

1. In Telegram, find **@BotFather**, send `/newbot`, and create a bot name and username (for example, `MySalonNotifyBot`). BotFather will return a token such as:

   `123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

   This is your `TELEGRAM_BOT_TOKEN`.

2. The salon owner (or you, for testing) should open a chat with the bot and send any message, such as `/start`.

3. Get your `chat_id`:

   * Open the following URL in your browser:

     `https://api.telegram.org/bot<TOKEN>/getUpdates`

     (replace `<TOKEN>` with your bot token).

   * In the response, find:

     `"chat":{"id": ...}`

   * The number shown is your `TELEGRAM_OWNER_CHAT_ID`.

4. Add both values to `.env.local` (and to Vercel Environment Variables when deploying).

Done. From that point on, every new booking will generate a Telegram message containing the booking details (service, specialist, customer, date, and time).

## Storage Status — Updated

Previously, bookings were stored in a JSON file, which did not work on serverless hosting platforms (Vercel/Netlify) because the filesystem is ephemeral and changes do not persist between requests.

Now `lib/db.js` uses PostgreSQL (see the “Database” section above). The functions `getAvailableSlots()` and `createBooking()` have been converted to asynchronous functions (`await`), while their signatures and the rest of the codebase (API routes and components) remain unchanged.

The old `data/bookings.json` file is no longer used and can be deleted manually if desired.

## Next Steps

This is a milestone from the MVP phase of the roadmap (`roadmap_booking_ai_sng.md`):

* Validate the workflow with 2–3 real pilot customers.
* Add database deployment infrastructure.
* Integrate local payments (LiqPay).
* Implement multi-tenancy (multiple salons running on a single codebase instead of maintaining separate project copies for each salon).

## Known Security Note

When running `npm audit`, you may see high-severity warnings related to internal Next.js dependencies such as `sharp` or `postcss` (used for image optimization, although this prototype does not currently use images).

These are relatively recent CVEs in the ecosystem at the time of development. Before deploying to production, review the results of `npm audit` and upgrade Next.js to the latest stable version.
