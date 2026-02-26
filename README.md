# CleanMail

A production-ready web app for organizing your Microsoft Outlook inbox using custom rules.

## Features

- 🔐 Login with Microsoft account (OAuth 2.0 / Entra ID)
- 📋 CRUD rules: sender, subject keywords, read status, source/target folders
- 🔍 Scan emails in preview mode before committing
- 📁 Move emails to target folders in batch
- 🏷️ Apply category policies (add / replace / remove)
- 📊 Execution logs + statistics dashboard
- 🔄 Automatic token refresh (no re-login required)

## Tech Stack

- **Next.js 16** App Router + TypeScript strict
- **MongoDB Atlas** via Mongoose
- **Auth.js v5 (NextAuth)** with Microsoft Entra ID provider, JWT session
- **shadcn/ui** + Tailwind CSS
- **Zod** for validation
- **Deployment**: Vercel

---

## Setup from Zero

### Prerequisites

- Node.js 18+
- A [MongoDB Atlas](https://cloud.mongodb.com) account
- A [Microsoft Azure](https://portal.azure.com) account

---

### 1. Clone & Install

```bash
git clone https://github.com/yourname/cleanmail.git
cd cleanmail
npm install
```

### 2. Azure App Registration

1. Go to [portal.azure.com](https://portal.azure.com) → **Azure Active Directory** → **App registrations** → **New registration**
2. Set **Name**: `CleanMail`
3. Set **Supported account types**: `Accounts in any organizational directory and personal Microsoft accounts`
4. Set **Redirect URI**: `http://localhost:3000/api/auth/callback/microsoft-entra-id` (Web type)
5. After creating, note the **Application (client) ID** and **Directory (tenant) ID**
6. Go to **Certificates & secrets** → **New client secret** → copy the value
7. Go to **API permissions** → **Add permission** → **Microsoft Graph** → **Delegated**:
   - `Mail.ReadWrite`
   - `MailboxSettings.Read`
   - `offline_access` (already included)
8. **Grant admin consent** (or ask your tenant admin)

### 3. MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user with read/write access
3. Whitelist your IP (or `0.0.0.0/0` for development)
4. Copy the connection string (replace `<password>`)

### 4. Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
AUTH_SECRET=<run: openssl rand -base64 32>
MICROSOFT_CLIENT_ID=<from Azure>
MICROSOFT_CLIENT_SECRET=<from Azure>
MICROSOFT_TENANT_ID=common
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/cleanmail?retryWrites=true&w=majority
NEXTAUTH_URL=http://localhost:3000
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. (Optional) Seed Demo Rules

```bash
MONGODB_URI=<your_uri> USER_MICROSOFT_ID=<your_ms_id> npx ts-node scripts/seed.ts
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/login/       # Login page
│   ├── (dashboard)/        # Protected dashboard pages
│   │   ├── dashboard/      # Overview + stats
│   │   ├── rules/          # CRUD rules
│   │   ├── scan/           # Preview + organize
│   │   └── logs/           # Execution logs
│   └── api/auth/           # NextAuth route
├── actions/                # Server Actions (scan, organize, rules)
├── domain/                 # Pure business logic (rule-engine, organizer)
├── infra/                  # External integrations (graph-client, token-refresh, db)
├── models/                 # Mongoose models
├── repositories/           # DB access layer
├── schemas/                # Zod validation schemas
├── components/             # React components + shadcn UI
├── types/                  # Shared TypeScript types
└── lib/                    # Auth config, utils
```

---

## Architecture

```
UI → Server Actions → Domain Logic → Repositories → MongoDB
                   ↘ Infra (Graph API, Token Refresh)
```

- **Domain layer** is pure TypeScript, no I/O — fully unit-testable
- **Infra layer** handles Microsoft Graph API calls and token management
- **Repository layer** abstracts MongoDB operations
- **Server Actions** are the use-case layer connecting UI to domain/infra

---

## Deployment on Vercel

1. Push to GitHub
2. Import repository in [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.local.example`
4. Update Azure redirect URI to your production URL:
   `https://yourapp.vercel.app/api/auth/callback/microsoft-entra-id`
5. Deploy!

---

## Known Limitations

1. **Folder resolution**: Source folders must be specified by their Graph API folder ID or well-known name (`inbox`, `drafts`, etc.). Display names are resolved lazily for the target folder only.
2. **Pagination**: The scan/organize loop follows `@odata.nextLink` but may be slow for very large mailboxes. Consider adding a `maxMessages` cap for production.
3. **No cron/scheduled runs**: Organize must be triggered manually from the dashboard. Cron support can be added via Vercel Cron + a `/api/cron/organize` route.
4. **Token scope**: The app requests `Mail.ReadWrite` which requires user consent. Some enterprise tenants may require admin consent.
5. **Single-user-per-session**: Each user sees only their own rules/logs. No multi-tenancy admin panel.
6. **No email preview**: The scan shows subject/sender but not full email body.
7. **Category support**: Microsoft categories are user-specific colored tags. The app manages category names but does not create/validate them against the user's master list.
