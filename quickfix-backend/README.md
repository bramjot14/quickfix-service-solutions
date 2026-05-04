# QuickFix — Setup Instructions

## What Was Built

**QuickFix** is a full-stack local home services marketplace with:
- Real-time bidding via Socket.io
- Document-based worker verification (Cloudinary)
- Smart matching algorithm (category + city + availability + rating + recency)
- Pricing benchmarks by city + category
- Live chat (unlocked after job assignment)
- Admin verification workflow with signed document URLs
- JWT auth with role-based access (CUSTOMER / WORKER / ADMIN)
- Payment request / confirm flow with 10% admin commission notice

---

## Prerequisites

- Node.js 18+ (https://nodejs.org)
- PostgreSQL 14+ (https://www.postgresql.org/download/)
- Cloudinary account (https://cloudinary.com — free tier works)
- Git

---

## Step 1 — PostgreSQL Setup (Windows)

1. Download and install PostgreSQL from postgresql.org
2. During install, set password for `postgres` user (remember it)
3. Open pgAdmin or psql and run:

```sql
CREATE DATABASE quickfix;
```

---

## Step 2 — Cloudinary Setup

1. Sign up at cloudinary.com (free)
2. Go to Dashboard → copy:
   - Cloud Name
   - API Key
   - API Secret

---

## Step 3 — Backend Setup

```bash
cd quickfix-backend

# Install dependencies
npm install

# Copy and edit environment file
copy .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/quickfix?schema=public"
JWT_SECRET=any_random_32_char_string_here_change_this
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:5173
```

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed the database (admin + workers + benchmarks)
node prisma/seed.js

# Start the backend server
npm run dev
```

Backend runs at: http://localhost:5000

---

## Step 4 — Frontend Setup

```bash
cd quickfix-frontend

# Install dependencies
npm install

# Copy and edit environment file
copy .env.example .env
```

Edit `.env`:
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

```bash
# Start the frontend dev server
npm run dev
```

Frontend runs at: http://localhost:5173

---

## Step 5 — Open in Browser

Go to: **http://localhost:5173**

### Demo Credentials (from seed)

| Role     | Email                        | Password      |
|----------|------------------------------|---------------|
| Admin    | admin@quickfix.ca            | Password123!  |
| Customer | customer@quickfix.ca         | Password123!  |
| Worker   | marcus.chen@quickfix.dev     | Password123!  |
| Worker   | aisha.t@quickfix.dev         | Password123!  |
| Worker   | roberto.v@quickfix.dev       | Password123!  |

---

## Core User Flows to Test

### As Customer (customer@quickfix.ca)
1. Browse `/services` → click a category → see verified pros
2. Click a pro profile → see reviews, badges, hire CTA
3. Go to `/post` → fill out job form → see pricing benchmark → submit → see Top 3 matched pros
4. Open the job at `/customer/jobs/:id` → wait for live bids (or open worker tab)
5. Click "Hire This Pro" → chat unlocks → send messages
6. Mark job complete → leave a verified review → confirm payment

### As Worker (marcus.chen@quickfix.dev)
1. Go to `/worker/dashboard` → see stats
2. Go to `/worker/verification` → already approved
3. Set availability at `/worker/availability`
4. Browse jobs at `/jobs/browse`
5. Click a job → go to "Place Bid" tab → submit bid
6. After assigned → chat in real-time → mark in progress → complete → request payment

### As Admin (admin@quickfix.ca)
1. Go to `/admin/verifications` → see Pending/Approved/Rejected tabs
2. Click "Review" on a pending worker
3. See signed document URLs → approve or reject with notes

---

## API Endpoints Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | — | Register |
| POST | /api/auth/login | — | Login |
| GET | /api/auth/me | JWT | Current user |
| GET | /api/public/categories | — | All categories |
| GET | /api/public/pros | — | Pro list with filters |
| GET | /api/public/pros/:id | — | Pro profile + reviews |
| PATCH | /api/workers/me/profile | WORKER | Update profile |
| POST | /api/workers/me/verification/request | WORKER | Request verification |
| POST | /api/workers/documents/upload | WORKER | Upload doc to Cloudinary |
| PATCH | /api/workers/me/availability | WORKER | Set availability |
| GET | /api/admin/verifications | ADMIN | List workers by status |
| GET | /api/admin/documents/worker/:id | ADMIN | Get signed doc URLs |
| PATCH | /api/admin/workers/:id/verification | ADMIN | Approve/reject |
| POST | /api/jobs | CUSTOMER | Post a job (+ media) |
| GET | /api/jobs/mine | CUSTOMER | Customer's jobs |
| GET | /api/jobs/open | WORKER | Open jobs (verified only) |
| POST | /api/jobs/:id/bid | WORKER | Place bid |
| GET | /api/jobs/:id/bids | CUSTOMER | Get bids for job |
| POST | /api/jobs/:id/assign/:workerId | CUSTOMER | Assign worker |
| PATCH | /api/jobs/:id/status | WORKER/CUSTOMER | Update status |
| POST | /api/jobs/:id/review | CUSTOMER | Post verified review |
| GET | /api/jobs/:id/messages | Auth | Chat messages |
| POST | /api/jobs/:id/messages | Auth | Send message |
| POST | /api/jobs/:id/payment-request | WORKER | Request payment |
| POST | /api/jobs/:id/payment-confirm | CUSTOMER | Confirm payment |
| GET | /api/match/top-workers | — | Matching algorithm |
| GET | /api/pricing/benchmark | — | Pricing data |

---

## Socket.io Events

| Event (emit) | Description |
|---|---|
| `join_job` | Join job room for real-time updates |
| `leave_job` | Leave job room |
| `send_bid` | Worker sends a bid |
| `send_message` | Send chat message |
| `typing` | Typing indicator |

| Event (receive) | Description |
|---|---|
| `new_bid` | New bid received |
| `current_bids` | All current bids when joining |
| `new_message` | New chat message |
| `message_history` | Past messages when joining |
| `job_assigned` | Worker was assigned |
| `job_status_updated` | Status changed |
| `payment_requested` | Worker requests payment |
| `commission_due` | Admin notified of 10% commission |

---

## Database Schema Overview

```
User (CUSTOMER | WORKER | ADMIN)
  └── WorkerProfile (verification_status, availability, rating, geo)
        └── WorkerDocument (GOVERNMENT_ID | CERTIFICATE | INSURANCE)

Job (OPEN → ASSIGNED → IN_PROGRESS → COMPLETED)
  ├── JobBid (price, etaMins, message, status)
  ├── Message (chat, locked until assigned)
  └── Review (only on COMPLETED jobs, verified)

PricingBenchmark (city + category → min/max/median)
AnalyticsEvent (event tracking)
```

---

## Production Deployment Notes

- Set `NODE_ENV=production` in backend `.env`
- Use a strong random `JWT_SECRET` (32+ chars)
- Set `CLIENT_URL` to your frontend domain
- Enable Cloudinary signed URLs in production (already configured)
- Run `npx prisma migrate deploy` (not dev) in production
- Use `npm run build` for frontend, serve with nginx or Vercel
- Add logs directory: `mkdir logs` in backend root

---

## Architecture

```
quickfix-backend/
├── prisma/
│   ├── schema.prisma        # Full data model
│   └── seed.js              # Admin + workers + benchmarks
├── src/
│   ├── server.js            # Express + Socket.io entry
│   ├── middleware/auth.js   # JWT authenticate/authorize
│   ├── routes/
│   │   ├── auth.js          # Register, login, /me
│   │   ├── public.js        # Categories, pros, pro profile
│   │   ├── workers.js       # Worker profile + docs + verification
│   │   ├── admin.js         # Verification management + commission
│   │   ├── jobs.js          # Full job lifecycle
│   │   └── match.js         # Matching algorithm + pricing
│   ├── socket/index.js      # Real-time bidding + chat
│   └── utils/logger.js      # Winston logger
└── .env.example

quickfix-frontend/
├── src/
│   ├── pages/
│   │   ├── Landing.jsx           # Hero + categories + trust
│   │   ├── Services.jsx          # All categories
│   │   ├── CategoryPros.jsx      # Filtered pro listing
│   │   ├── ProProfile.jsx        # Pro detail + reviews + CTA
│   │   ├── PostJob.jsx           # Multi-step job post form
│   │   ├── Auth.jsx              # Register + Login
│   │   ├── customer/
│   │   │   ├── Jobs.jsx          # Customer job list
│   │   │   └── JobDetail.jsx     # Live bids + chat + assign
│   │   ├── worker/
│   │   │   ├── Verification.jsx  # Doc upload + verification
│   │   │   └── WorkerPages.jsx   # Dashboard + Browse + JobDetail + Availability
│   │   └── admin/
│   │       └── Verifications.jsx # Admin review dashboard
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   └── ui.jsx           # StarRating, ProCard, badges, etc.
│   ├── context/AuthContext.jsx
│   ├── hooks/useSocket.js
│   ├── lib/api.js           # Axios + all API calls
│   └── styles/index.css     # Tailwind + design tokens
└── .env.example
```
