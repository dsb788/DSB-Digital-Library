# DSB Digital Library

**Your Knowledge, Your Digital Library.**

A production-shaped eBook storefront, secure online reader, Razorpay checkout and admin console built with Next.js 15, React 19, libSQL and private object storage. The interface uses a white / navy / gold design system with a fully responsive layout.

---

## 1. Feature overview

### Storefront
- Home page with hero search, featured books, latest arrivals, popular titles, subject categories, offers, how it works, testimonials, FAQ.
- Catalogue with search, category/subject filters, price sorting and pagination.
- Book detail pages: cover, metadata, description, rating, reviews, sample preview, wishlist, Buy Now / Read button.
- Static pages: About, Contact, Privacy, Terms, Refund policy, FAQ.
- Contact form writes to the database and appears in the admin inbox.

### Accounts
- Register / login with name, email, mobile and password (scrypt hashing, HttpOnly cookie sessions, hashed session tokens).
- Optional Google sign-in (OAuth 2.0 / OpenID Connect) with verified-email account linking.
- Reader dashboard: purchased books, continue reading, reading history, transactions and downloadable receipts, wishlist, account settings, change password, sign out.
- Access is always re-checked on the server — owning a URL is never enough.

### Payments (Razorpay, INR)
- Server-created Razorpay orders; amounts are calculated from the database, never accepted from the browser.
- Checkout supports UPI, cards, net banking and wallets through Razorpay Checkout.
- Server-side HMAC signature verification **and** a fetch of the payment from Razorpay before access is granted.
- Authorized payments are captured server-side; amount and currency must match the order.
- Unique order references (`ORD-…`), payment IDs, receipt numbers (`DSB-…`) and a PDF receipt endpoint.
- Pending / failed / paid states; webhook fallback (`/api/payments/webhook`) for `payment.captured`, `order.paid`, `payment.failed`.
- Optional email confirmation with a receipt link (SMTP).
- Coupons: percent or fixed discount, minimum order, expiry, usage limits, all validated server-side.
- Free books can be claimed without payment.

### Secure reader
- PDFs are never exposed as public URLs. The reader asks the backend for a stamped copy using an 8-minute, book-scoped HMAC token.
- Every request verifies session, purchase, token subject and book.
- Every delivered page carries repeated low-contrast PDF stamps: email, library name, member ID, timestamp, `Not for distribution`.
- On-screen repeated diagonal email watermark (18 cells on desktop, adaptive on mobile, 8–13% opacity) sits above the page; an identity reminder appears periodically.
- Right-click, copy/cut, text selection, drag, print, Ctrl/Cmd+S/P/C/X/A/U and common DevTools shortcuts are intercepted; PrintScreen and macOS screenshot shortcuts pause the reader and show a warning. Tab visibility loss and focus loss also trigger a reminder. All pages are rendered to canvas with text selection disabled.
- Reading progress is saved continuously (debounced + on page hide), so "Continue reading" opens the last page.
- Sample preview mode uses a separate sample PDF and never requires a purchase.

### Admin console (`/admin`)
- Overview analytics: revenue, readers, catalogue, paid units, 12-month revenue chart, most purchased books, recent payments.
- Books: create/edit, cover + PDF upload, sample generation, pricing, discounts, visibility, activation/deactivation, archive (preserves orders and receipts).
- Categories: create, rename, reorder, delete (blocked while books are attached).
- Readers: search, purchase history, reading activity, block/unblock (revokes sessions), grant/revoke access.
- Transactions: revenue stats, filters, Razorpay verification for pending orders, CSV export (formula-injection safe).
- Coupons: create, activate/deactivate, delete or auto-deactivate used coupons.
- Messages: read/resolve/reopen/delete contact enquiries with a mailto reply link.
- Audit log for administrative actions.

---

## 2. Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15.5 App Router, React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4 with CSS-first design tokens |
| Database | libSQL / Turso (SQLite compatible), runtime schema bootstrap |
| Private storage | Local filesystem (dev) or Netlify Blobs (production) |
| Auth | scrypt password hashing, server sessions, HttpOnly cookie |
| Payments | Razorpay Orders API + Checkout + webhooks (server secrets only) |
| PDF | pdf-lib (stamping, samples, receipts), pdf.js (canvas reader) |
| Email | Nodemailer (optional SMTP) |

The application is fully dynamic (`force-dynamic`) because all data is user- and database-dependent.

---

## 3. Local setup

Requirements: Node.js 22+ and npm.

```bash
npm install
cp .env.example .env.local   # edit values
npm run seed                 # creates schema, categories, 19 demo books, admin user
npm run dev
```

Open <http://localhost:3000>.

### Demo accounts (only when seeded)

| Role | Email | Password |
| --- | --- | --- |
| Admin | value of `ADMIN_EMAIL` (default `admin@dsbdigitallibrary.com`) | value of `ADMIN_PASSWORD` |
| Reader | `reader@dsbdigitallibrary.com` | `Reader@DSBLibrary2026` |

The demo reader is created only when `SEED_DEMO_USER=true`. It comes with paid, free and pending/failed demo orders so the dashboard, receipts and admin screens are populated.

Useful seed flags:

- `SEED_REBUILD=1` regenerates the demo PDFs (needed after changing sample generation).
- `SEED_RESET_ADMIN=true` resets the admin password to `ADMIN_PASSWORD`.

Other commands: `npm run typecheck`, `npm run build`, `npm start`.

---

## 4. Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public origin used in emails, receipts and links |
| `SITE_NAME` | Display name |
| `SESSION_SECRET` | HMAC key for sessions and reader tokens — 32+ random chars |
| `DATABASE_URL` | `file:.data/dsb.db` locally, `libsql://…turso.io` in production |
| `TURSO_AUTH_TOKEN` | Turso token (production) |
| `STORAGE_DRIVER` | `local` or `netlify` |
| `NETLIFY_BLOBS_SITE_ID` / `NETLIFY_BLOBS_TOKEN` | Optional; set when calling Blobs outside a Netlify function |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin bootstrap used by `npm run seed` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Server-side Razorpay credentials |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature secret |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional Google OAuth client for "Continue with Google" |
| `GOOGLE_CALLBACK_URL` | Exact Google callback URL, e.g. `http://localhost:3000/api/auth/google/callback` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | Optional email delivery |
| `MAIL_FROM` | From header for transactional email |

**Never** put Razorpay secrets, the session secret or admin credentials in client code or `NEXT_PUBLIC_*` variables. `.env.local` must not be committed.

Without Razorpay keys the store still works for free books, but paid checkout returns a clear "payments not configured" message and admin verification returns HTTP 503 — there is no fake success path. Without SMTP, email sending is skipped and logged; the contact form and receipts still work in-app.

---

## 5. Razorpay configuration

1. Create a Razorpay account and complete KYC for live payments. Test mode works immediately with test keys.
2. Put `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the server environment.
3. Add a webhook pointing to `https://<your-site>/api/payments/webhook` with a strong secret, subscribing to:
   - `payment.captured`
   - `order.paid`
   - `payment.failed`
4. Set `RAZORPAY_WEBHOOK_SECRET` to the same secret.

Verification logic (`src/lib/checkout.ts`): the browser callback signature is verified with HMAC-SHA256; the payment is then fetched from Razorpay, captured if only authorized, checked for INR currency and exact amount, and only then is access granted. Webhooks and the admin "Verify" button follow the same server-side path. Orders are idempotent, so repeated callbacks cannot double-grant.

---

## 6. Google sign-in (optional)

The app implements Google's Authorization Code flow directly against Google's OAuth 2.0 / OpenID Connect endpoints. It does not use Firebase, Supabase Auth or another authentication backend. No Google access token or ID token is stored in the browser or database.

1. **Create the project.** Open [Google Cloud Console](https://console.cloud.google.com/), create or select a project, then configure the OAuth consent screen under **Google Auth Platform**. Choose External (or Internal for a Workspace-only site), add the app name and support email.
2. **Create the client.** Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**, choose **Web application**.
3. **Authorised JavaScript origins** (used by browser clients; optional for this server-side flow):
   - `http://localhost:3000`
   - `https://<your-domain>`
4. **Authorised redirect URIs** must match exactly:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://<your-domain>/api/auth/google/callback`
5. Put `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_CALLBACK_URL` in the server environment. Restart the app.
6. While the consent screen is in Testing, add your Google account under **Test users**.

Flow security: a random state and nonce are stored in short-lived HttpOnly cookies and checked on callback. The server exchanges the code, verifies the ID token signature against Google's published JWKS, and checks issuer, audience, expiry, nonce and `email_verified` before reading `sub`, name, email and picture. A user is linked by verified email without overwriting their password or any purchases/orders. Google-only accounts receive a random unusable password hash. Provider, Google subject, picture and last-login time are stored in the existing `users` table. New sign-ins create a fresh server-side session; logout invalidates it.

Endpoints: `GET /api/auth/google/start`, `GET /api/auth/google/callback`, `POST /api/auth/logout`, `GET /api/auth/me` (returns the session user and provider metadata, never tokens or password hashes).

---

## 7. Deployment (free tier)

### Recommended: Netlify + Turso + Netlify Blobs

1. **Database** — create a free Turso database:
   ```bash
   turso db create dsb-digital-library
   turso db show dsb-digital-library --url
   turso db tokens create dsb-digital-library
   ```
   Set `DATABASE_URL` and `TURSO_AUTH_TOKEN`.
2. **Storage** — set `STORAGE_DRIVER=netlify`. On Netlify, Blobs is available automatically inside functions; site ID/token are only needed for out-of-function access.
3. **Netlify site** — import the repository. `netlify.toml` already applies `@netlify/plugin-nextjs`, Node 22 and basic security headers.
4. **Environment** — add all variables from section 4 in Site configuration → Environment variables. Set `NEXT_PUBLIC_SITE_URL=https://<site>.netlify.app` (or your custom domain).
5. **Seed** — run the seed against production **once** from your machine:
   ```bash
   DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… STORAGE_DRIVER=netlify \
   NETLIFY_BLOBS_SITE_ID=… NETLIFY_BLOBS_TOKEN=… \
   ADMIN_EMAIL=… ADMIN_PASSWORD=… SEED_DEMO_USER=false npm run seed
   ```
   Use an admin password different from local development.
6. Deploy. Netlify provides a free `*.netlify.app` subdomain with automatic HTTPS.

### Why not InfinityFree or Cloudflare Pages?

- **InfinityFree** (`*.infinityfreeapp.com`) only runs PHP/MySQL. This app uses Node.js, Next.js server routes, libSQL, scrypt, pdf-lib and private storage, so it cannot be hosted there without a full rewrite. Use the free Netlify subdomain instead.
- **Cloudflare Pages** can host a subset of Next.js, but this app depends on Node runtime APIs (scrypt, nodemailer, pdf-lib/libSQL), server-side PDF stamping and private object storage. Running it on Pages/Workers would require moving to D1 + R2 + a different auth/PDF pipeline. Netlify is the recommended free target.
- For books larger than the free function payload limits (section 7), a small VPS or Render/Fly Node service is a better fit than a static-edge host.

---

## 8. Free-hosting limitations (important)

- **Function payload limit:** Netlify Functions accept/return roughly 6 MB per synchronous request on the free tier. The app accepts PDFs up to 40 MB locally, but on Netlify free a large PDF upload or a stamped PDF response can fail. Keep book PDFs under ~5 MB for the free tier (text-based PDFs usually qualify), or upgrade the plan / use a Node host with higher limits. The reader streams the whole stamped PDF in one response.
- **In-memory rate limiting:** limits are per server instance and best-effort on serverless. For serious abuse protection add a shared store (Upstash Redis) in `src/lib/rate-limit.ts`.
- **Cold starts:** free Netlify functions and free Turso databases may add latency after idle periods.
- **Email:** Netlify does not provide SMTP. Use a free SMTP tier (for example Brevo or Resend SMTP) or leave email disabled; confirmations are always visible in the app.
- **Razorpay:** live payments require an activated Razorpay account; test mode can be used for a demo.
- **Storage quotas:** free Blobs/Turso tiers have usage limits; monitor them as the catalogue grows.
- **Backups are your responsibility on free tiers.** See section 9.

---

## 9. Security model — what is real and what is not

Implemented:

- Passwords hashed with scrypt + per-user salt; session tokens stored hashed; cookies `HttpOnly`, `SameSite=Lax`, `Secure` in production.
- Server-side authorization on every purchase, download, progress update, review, wishlist and admin route. IDs in URLs never grant access.
- Payment amounts computed server-side; HMAC signatures, gateway status fetch, amount/currency verification, idempotent grants, audit records.
- PDFs live in private storage and are served only through an authenticated endpoint with a short-lived, book-scoped token. No public PDF URL is ever returned; range requests and caching are disabled; `noindex`, `no-store` and `nosniff` headers are set.
- Per-user PDF stamping plus a moving on-screen watermark, copy/print/selection/shortcut blocking and a full-screen reader.
- Same-origin checks on mutating APIs, rate limits on login/registration/checkout/reader/contact, Zod validation, parameterised SQL, CSV formula-injection escaping.
- Admin credentials and gateway secrets stay in server environment variables and are never shipped to the browser.
- Audit log for admin and payment-sensitive actions.

Honest limitations:

- **A website cannot guarantee prevention of screenshots, screen recording, external-camera photos or determined browser-based copying.** The reader raises the cost of casual copying and makes leaked copies traceable through personalised watermarks, but it is not DRM and it is not unbreakable.
- Screenshot-key detection only works while the page has focus and JavaScript is running; an operating-system capture tool can still succeed.
- Rate limiting without a shared store is per instance. Serverless cold starts reset in-memory counters.
- Free hosting payload limits can affect large PDFs (section 7).
- No system can stop a reader from photographing their own screen; the terms of use and watermarking are the practical deterrents.

---

## 10. Backups and operations

- **Local:** copy `.data/dsb.db` and `.data/storage/` together; a receipt is useless without its order and book records.
- **Turso:** use the Turso CLI/dashboard export (`turso db shell <db> .dump > backup.sql`) on a schedule. Turso also offers point-in-time restore on paid plans.
- **Blobs:** download or mirror the `dsb-library-private` store; PDFs and covers are not in the database.
- **Receipts:** orders/payments are append-only in normal operation. Archiving a book never deletes historical orders, payments or receipts.
- **Admin recovery:** set `SEED_RESET_ADMIN=true` and rerun `npm run seed` with the desired `ADMIN_PASSWORD` (only the configured admin account is reset).
- **Audit table:** administrative actions are recorded via `logAudit` and should be retained for dispute handling.

---

## 11. Project structure

```
src/
  app/
    (site)/          storefront, catalogue, book detail, static pages
    (auth)/          login, register
    (app)/dashboard/ reader library, history, transactions, settings, wishlist
    (reader)/read/   full-screen secure reader
    (admin)/admin/   overview, books, categories, readers, transactions, coupons, messages
    api/             auth, checkout, webhook, reader, receipts, reviews, wishlist,
                     covers, contact, admin/*
  components/        UI primitives, reader, dashboard and admin widgets
  lib/               db, auth, access, books, checkout, razorpay, reader, admin,
                     storage, email, rate-limit, validation helpers
scripts/             seed data and generated demo PDFs/covers
public/              pdf.js worker
.data/               local database + private storage (development only)
```

Book files and covers are stored under private object keys (`books/…`, `samples/…`, `covers/…`). Covers are served through `/api/covers/[id]`; full PDFs only through `/api/reader/[id]` with a valid token.

### Admin quick guide

1. Sign in with an admin account → you land on `/admin`.
2. Add a category if needed, then **Books → Add a book**. Upload a cover and PDF; sample pages are generated automatically from the first N pages.
3. Set price in rupees; an optional discount price must be lower than the list price.
4. Publish (active) and optionally feature/bestseller flags.
5. Create coupons under **Coupons**; they are enforced at checkout, including expiry and usage caps.
6. Reader questions appear under **Messages**; pending payments can be re-checked under **Transactions → Verify**.
7. Blocking a reader signs them out immediately; granting access adds the book to their library instantly.

---

## 12. Routes

Public: `/`, `/books`, `/books/[slug]`, `/categories`, `/about`, `/contact`, `/faq`, `/privacy`, `/terms`, `/refund`.

Accounts: `/login`, `/register`, `/dashboard`, `/dashboard/books`, `/dashboard/history`, `/dashboard/transactions`, `/dashboard/wishlist`, `/dashboard/settings`, `/read/[slug]`.

Admin: `/admin`, `/admin/books`, `/admin/books/new`, `/admin/books/[id]/edit`, `/admin/categories`, `/admin/users`, `/admin/users/[id]`, `/admin/transactions`, `/admin/coupons`, `/admin/messages`.

APIs: auth (`register`, `login`, `logout`, `change-password`, `me`, `google/start`, `google/callback`), checkout (`quote`, `create`, `verify`, `claim`), `payments/webhook`, `reader/[id]`, `reader/progress`, `receipts/[id]`, `reviews`, `wishlist`, `covers/[id]`, `contact`, and the `admin/*` endpoints. All mutating endpoints validate origin, session and input; admin endpoints additionally require an active admin role.

---

## 13. Testing notes

Verified during development:

- Registration/login/logout, free claim, paid-book access, reader token enforcement, progress persistence.
- Reader watermarking: 18 on-page email tiles at 8.5% opacity, −25° rotation, plus repeated email stamps embedded into every PDF page (verified on the stamped PDF) and in sample previews.
- Receipt PDF download and dashboard transaction history.
- Admin login guard (readers are redirected), analytics, book CRUD, category CRUD, coupon create/deactivate/delete, reader block/unblock, access grant/revoke, message read/resolve/delete, transaction verification failure path when keys are absent, CSV export.
- Credit/debit capture cannot be automated without a human in Razorpay Checkout; no live charge was made during setup. Live credentials were verified with a read-only Razorpay API request (HTTP 200). Test keys previously verified order creation, missing-field 400, and tampered-signature 400 with the order left pending and no access granted.
- Google OAuth: start redirect, state + nonce cookies, configured/unconfigured UI, callback rejection paths and session cookie creation across the redirect. The ID token is verified with Google JWKS (issuer, audience, expiry, nonce, verified email); a real Google sign-in needs your own OAuth client (section 6).
- `npm run typecheck` and `npm run build` succeed.

Actual payment capture (entering card/UPI details in Razorpay Checkout) and OS-level screenshot prevention cannot be automated here — the first needs a human at the checkout, the second is not technically possible (see section 9).

---

## 14. License

Private project for DSB Digital Library. Replace the demo content, admin credentials and Razorpay keys before going live.
