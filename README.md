# Daybook — Personal Reminders

A calm, notebook-inspired reminder app built with **Next.js 15 (App Router)**,
**MongoDB**, and **Google sign-in via NextAuth (Auth.js v5)**.

## Features

- **Google sign-in / sign-out** — every reminder is private to the signed-in account
- **Full CRUD** — create, read, update, delete reminders
- **Search** — instant search across title, notes, and category
- **Filters & sort** — by status (active/completed), category, and sort order
  (due date, priority, newest, title)
- **Priority levels** (low / medium / high) with color coding
- **Categories/tags** you define yourself, with autocomplete
- **Due dates** with overdue and due-soon highlighting
- **Recurring reminders** (daily/weekly/monthly) — completing one automatically
  schedules the next occurrence
- **Pin to top** for the things you don't want to lose in the list
- **Stats strip** — active, due soon, overdue, and completed counts at a glance
- **Dark mode**, persisted across visits
- Fully responsive, from small phones up to desktop
- Async route params (Next.js 15 requirement handled throughout the API)

## 1. Prerequisites

- Node.js 18.18+ (20+ recommended)
- A MongoDB database — [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
  free tier works well
- A Google Cloud project for OAuth credentials

## 2. Install dependencies

```bash
npm install
```

## 3. Set up MongoDB

1. Create a free cluster at MongoDB Atlas (or use a local `mongod`).
2. Create a database user and allow network access (0.0.0.0/0 is fine for
   development).
3. Copy your connection string, e.g.
   `mongodb+srv://user:password@cluster0.mongodb.net/daybook`

## 4. Set up Google sign-in

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth client ID** of type **Web application**.
3. Add these **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-production-domain.com/api/auth/callback/google` (production)
4. Copy the generated **Client ID** and **Client Secret**.

## 5. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
MONGODB_URI=mongodb+srv://user:password@cluster0.mongodb.net/daybook
AUTH_SECRET=paste_a_generated_secret_here
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
```

Generate `AUTH_SECRET` with:

```bash
npx auth secret
```

## 6. Run it

```bash
npm run dev
```

Visit `http://localhost:3000` — you'll land on the sign-in page, authenticate
with Google, and land on your dashboard.

## 7. Deploying

This app deploys cleanly to any Next.js-friendly host (Vercel is the path of
least resistance):

1. Push the project to a Git repository.
2. Import it into Vercel (or your host of choice).
3. Add the same four environment variables in your host's dashboard.
4. Add your production callback URL to the Google OAuth client
   (`https://your-domain.com/api/auth/callback/google`).

## Project structure

```
src/
  app/
    api/
      auth/[...nextauth]/route.js   Google sign-in handled by NextAuth
      reminders/route.js            List + create
      reminders/[id]/route.js       Read, update, delete a single reminder
    login/page.js                   Sign-in screen
    page.js                         Dashboard (redirects to /login if signed out)
    layout.js / globals.css         Fonts, theme, base styles
  components/                       UI: Navbar, Toolbar, ReminderCard, etc.
  lib/
    auth.js                        NextAuth configuration
    mongodb.js                     Cached Mongoose connection
    dateUtils.js                   Due-date formatting/overdue logic
  models/Reminder.js               Mongoose schema + text index for search
```

## Notes on the design

The interface borrows the visual language of a bound paper daybook: a soft
paper background, a left-hand margin rule with hole-punch dots on each
reminder card, a serif display face (Fraunces) paired with a clean body face
(Public Sans) and a monospace face for dates and tags (IBM Plex Mono). Dark
mode swaps the paper for a deep ink page while keeping the same structure.
