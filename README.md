# ChatCRM – Unified Inbox MVP

Unified inbox for LINE and Facebook Messenger: one dashboard to chat with customers from both platforms in real time.

## Architecture

```
Customer (LINE / Facebook) → webhook → Node.js server → Supabase → Socket.io → Next.js dashboard
Agent reply: Dashboard → Socket emit + POST /send-message → Node.js → Supabase → LINE/Facebook API
```

## Project structure

```
/chatcrm
  /server          # Express + Socket.io backend
    server.js
    socket.js
    supabase.js
    lineWebhook.js
    facebookWebhook.js
    sendLineMessage.js
    sendFacebookMessage.js
    uploadHandler.js
  /dashboard       # Next.js App Router frontend
    /app
      page.js
      layout.js
      globals.css
    /components
      CustomerList.js
      ChatWindow.js
      MessageBubble.js
      MessageInput.js
      FilePreview.js
    /lib
      socket.js
      api.js
  /supabase
    schema.sql
  .env.example
  README.md
```

## Prerequisites

- Node.js 18+
- Supabase project
- LINE Messaging API channel (for LINE)
- Facebook App + Page (for Messenger)

## 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the contents of `supabase/schema.sql`.
3. In Storage, create a **public** bucket named `chatcrm-files` (used for images, videos, and file attachments).

## 2. Environment variables

Copy `.env.example` to `server/.env` and fill in:

```env
# Supabase (required)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LINE (optional for local UI; required for LINE webhook)
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...

# Facebook (optional for local UI; required for Messenger webhook)
FACEBOOK_PAGE_ACCESS_TOKEN=...
FACEBOOK_VERIFY_TOKEN=any-secret-string-you-choose

# Optional
PORT=4000
CORS_ORIGIN=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
```

For the dashboard, create `dashboard/.env.local` with:

- `NEXT_PUBLIC_SOCKET_URL=http://localhost:4000`
- `NEXT_PUBLIC_API_URL=http://localhost:4000`

## 3. Run locally

### Backend

```bash
cd server
npm install
npm run dev
```

Server runs at `http://localhost:4000`.

### Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Dashboard runs at `http://localhost:3000`. Open it and (after webhooks are set) you’ll see customers and chat.

### One-time: create bucket

In Supabase Dashboard → Storage → New bucket → name: `chatcrm-files` → set to **Public** so `file_url` works.

## 4. Webhooks (production / ngrok)

- **LINE**: Webhook URL `https://your-domain.com/webhook/line` (POST). In LINE Developers Console set this URL and ensure `LINE_CHANNEL_SECRET` is set for signature verification.
- **Facebook**: Webhook URL `https://your-domain.com/webhook/facebook`. Use GET for verify token (set `hub.verify_token` = `FACEBOOK_VERIFY_TOKEN`). Subscribe to `messages` for the Page.

For local testing, use [ngrok](https://ngrok.com): `ngrok http 4000` and use the HTTPS URL for both webhooks.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/webhook/line` | LINE webhook |
| GET/POST | `/webhook/facebook` | Facebook verify + webhook |
| POST | `/upload` | Upload file (multipart `file`) → returns `{ file_url }` |
| POST | `/send-message` | Send message: `{ customer_id, message_type, content?, file_url? }` |
| GET | `/customers` | List customers (by last_message_at desc) |
| GET | `/messages?customer_id=uuid` | Messages for a customer |

## Socket events

- `new_message` – new message from customer (payload: `{ message, customer }`)
- `agent_reply` – agent sent a message (payload: `{ message, customer }`)
- `customer_list_update` – list should be refetched

## Message types

`text` | `image` | `video` | `file`

Supported in both incoming (LINE/Facebook) and outgoing (agent reply with optional `file_url` from `/upload`).
