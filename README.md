# Book Ralf

A home-visit barber booking app: customers pick an area, date, services, and
time slot; the barber (admin) approves/declines requests and manages the
schedule. Everyone gets notified (in-app + email) when a booking's status
changes.

Built with Next.js (App Router), Prisma, and Tailwind. Fully responsive —
same codebase works on phone and desktop.

## 1. Local setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the new project: **Project Settings → Database → Connection string.**
   Use the **pooler host** (`aws-0-[region].pooler.supabase.com`) for both
   values below — not "Direct connection" (`db.[ref].supabase.co`), which
   is IPv6-only on most projects and will time out on most home networks:
   - **Transaction pooler** (port 6543) → `DATABASE_URL`
   - **Session pooler** (port 5432) → `DIRECT_URL`
3. Then:

```bash
npm install
cp .env.example .env      # paste your two Supabase URLs in, see below
npx prisma migrate dev --name init
npm run seed               # adds the 4 locations + 5 services
npm run dev
```

Visit `http://localhost:3000` for the landing page (booking is at `/book`), and
`http://localhost:3000/staff` for the admin side (password = whatever you
set as `NEXT_PUBLIC_ADMIN_PASSWORD` in `.env`).

Using a real hosted database from the start (instead of a local SQLite
file) sidesteps a whole class of local file-permission headaches — no
file for iCloud, macOS lock flags, or extraction ownership issues to
interfere with.

## 2. Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase's **Transaction pooler** connection string (port 6543). Used for normal app queries. |
| `DIRECT_URL` | Supabase's **Session pooler** connection string (port 5432). Used only for migrations — the transaction pooler doesn't support the prepared statements `prisma migrate` needs. Both should use the `aws-0-...pooler.supabase.com` host, not `db.[ref].supabase.co` — see note above. |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | Gate for `/staff/*`. Simple by design — see "Before you launch" below. |
| `RESEND_API_KEY` | From [resend.com](https://resend.com). Leave blank to skip email (in-app notifications still work). |
| `EMAIL_FROM` | Sender address. Resend's sandbox domain works until you verify your own. |
| `ADMIN_EMAIL` | Where "new request" / "customer cancelled" emails go. |


## 3. Notification rules (as specified)

- **Customer** gets an email + in-app notification when their booking is
  **confirmed**, **declined**, or **cancelled** — including when a scheduled
  day they're booked on gets deleted in Schedule Manager (every affected
  booking is cancelled and each customer notified individually).
- **Admin** gets an email + in-app notification when a booking is
  **requested**, or when a **customer cancels their own booking**.
- Nobody gets notified about their own action (admin doesn't self-notify
  when declining/cancelling; a customer doesn't self-notify when cancelling).

This logic lives in `lib/notifications.js` — it's the one place to look if
you want to change who gets told what.

## 4. One barber, shared time across locations

If Clanton and South are both scheduled for the same day, booking 9:30 at
Clanton removes 9:30 as an option at South too (and every other location
scheduled that day). Availability is calculated per-location for working
*hours*, but per-day across *all* locations for busy time — Ralf is one
person and can't be in two places at once. This lives in
`app/api/availability/route.js` and `app/api/bookings/route.js` — both
query existing bookings by `date` alone, not by a specific location's
schedule entry.

## 5. Multiple of the same service

The services step supports quantity, not just add/remove — tap "+" again on
a service already in the cart to add another unit (e.g. 3x Haircut). Total
quantity across all services is capped at 5 per appointment, matching the
"up to 5 services" rule from the original flow. Total price, duration, and
required consecutive 30-minute slots are all computed from quantities.

## 6. Deploying it for real

You're already on the right database (Supabase Postgres) from local setup —
deploying just means putting the app itself somewhere public:

1. **Hosting:** [Vercel](https://vercel.com) — connect the GitHub repo, add
   the same `DATABASE_URL` / `DIRECT_URL` / other env vars in the Vercel
   dashboard, deploy.
2. **Database:** already done — same Supabase project. If you outgrow the
   free tier later, Supabase's paid tiers scale up without changing any code.
3. **Email:** [Resend](https://resend.com) — verify your own sending domain
   once you're past their sandbox limits.
4. **Domain:** point any registrar's domain at Vercel (free SSL included).

### Rough monthly cost at low-moderate volume
| Item | Cost |
|---|---|
| Vercel hosting | $0 (Hobby tier) |
| Neon/Supabase Postgres | $0 (free tier, plenty for one barber) |
| Resend email | $0 (3,000 emails/mo free) |
| Domain | ~$1/mo amortized |
| **Total** | **~$0–1/mo** until you outgrow free tiers |

## 7. Before you launch — things worth upgrading

- **Staff auth is intentionally simple**: one shared password checked in
  the browser, stored in `sessionStorage`. It keeps casual visitors out but
  a technically determined person could call the `/api/*` routes directly.
  Fine for a single-operator MVP; if this business grows, swap in real
  auth (e.g. NextAuth with a proper login) and move the admin checks into
  the API routes themselves, not just the page gate.
- **Customer identity** is just a phone number (no login/password) —
  matching how the original flow worked. Good enough for a home-visit
  barber's regulars; if that ever becomes a problem, add a verification
  step (e.g. SMS code) before showing someone's bookings.
- **Email address**: the original flow only captured phone number, but
  since you asked for email notifications, I added an email field to the
  booking form — flagging that as a deliberate addition, not something
  pulled from the walkthrough.
- **Duplicate schedule days**: if you accidentally add the same
  location + date twice, the app uses the first one for availability
  math. Worth a "prevent duplicates" check later if it comes up.

## 8. Project structure

```
app/
  page.js                 landing page (dark editorial, "/")
  book/page.js            customer booking wizard (5 steps), "/book"
  my-bookings/page.js     customer bookings + cancel
  staff/
    layout.js             password gate
    page.js                dashboard
    schedule/page.js       schedule manager (add/delete days)
    pending/page.js        approve/decline requests
    bookings/page.js       all bookings, mark completed/cancel
    notifications/page.js  admin notification feed
  api/
    locations, services, schedule, schedule/[id],
    availability, bookings, bookings/[id],
    notifications, staff-notifications
lib/
  prisma.js       DB client
  slots.js        30-min slot math (the interesting logic)
  email.js        Resend wrapper + templates
  notifications.js  who gets notified for which status change
prisma/
  schema.prisma   data model
  seed.js         starter locations + services
```
