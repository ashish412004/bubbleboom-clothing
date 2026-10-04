# BUBBLE BOOM — Premium Indian Streetwear E-Commerce Platform

Official production-grade full-stack e-commerce platform engineered for Indian fashion brand **BUBBLE BOOM**. Built with Next.js App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL with Row Level Security, and Cashfree Payments.

---

## 1. Brand Identity & Visual System

* **Brand Wordmark & Monogram:** Approved rounded wordmark and signature star monogram extracted directly from the official Bubble Boom brand board (`public/images/brand/`).
* **Strict Color Override:** Strict monochrome palette:
  * **Black:** `#000000`
  * **White:** `#FFFFFF`
  * **Off-White (Canvas):** `#F8F8F6`
  * **Neutral Greys:** Borders, dividers, and secondary text.
  * *No colorful UI accents (no blues, greens, lime, or beige). Product photography retains its real natural colors.*
* **Typography:** Inter ExtraBold / Black for headlines, Inter Regular / Medium for body text, monospace for identifiers, SKUs, and monetary totals.
* **Brand Voice:**
  * Tagline: *"WEAR THE BOOM."*
  * Description: *"Every style. Every mood. Make it yours."*
  * Brand Statement: *"YOUR STYLE. YOUR RULES."*
* **Ethics & Honesty:** Zero fabricated reviews, counts, or false urgency timers. Real stock status backed by atomic variant holds.

---

## 2. Architecture & Technology Stack

| Layer | Technology | Specification / Role |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | Server Components, Route Handlers, Streaming SSR |
| **Language** | TypeScript | 100% strict typechecking, typed database schemas |
| **Styling** | Tailwind CSS | Strict B&W design system, high-contrast borders |
| **Database** | Supabase (PostgreSQL) | RLS policies, atomic inventory reservation RPCs |
| **Auth** | Supabase Auth | Email/Password, Google OAuth, Session SSR cookies |
| **Payments** | Cashfree Payments | v2023-08-01 PG API, timing-safe HMAC-SHA256, COD |
| **Media** | Cloudinary | Product gallery and banner image transformations |
| **Email** | Resend | Transactional order confirmation & dispatch emails |
| **State** | Zustand | Client cart & wishlist counter synchronization |
| **Tests** | Vitest | 36 unit/integration tests covering 8 critical edge cases |

---

## 3. Financial Precision & Indian E-Commerce Compliance

* **Integer Paise Precision:** All cart lines, coupons, shipping charges, and order totals are calculated internally in integer paise (₹1.00 = 100 paise) to eliminate floating-point rounding errors.
* **Free Shipping Ceiling:** Authoritatively configured from store settings (Default: ₹1,499 / 149900 paise). Carts below this threshold incur standard shipping of ₹99.
* **Cash on Delivery (COD):** Configurable ₹50 handling fee; max COD cart ceiling of ₹5,000.
* **Indian Address Standards:** Strict validation for 10-digit Indian mobile numbers (`^[6-9]\d{9}$`) and 6-digit postal PIN codes (`^[1-9][0-9]{5}$`).
* **Return & Inspection Workflow:** 7-day post-delivery return window with administrative quality inspection and atomic restock decisions.
* **Refund Ceiling Safety:** Cumulative refunds can never exceed captured order amount.

---

## 4. Complete Route Map

### Storefront & Catalog
* `/` — Homepage (Marquee announcement bar, editorial hero, shop by category, new drops, capsule featured, brand statement, newsletter signup, footer)
* `/shop` — Catalog with multi-facet filters (categories, sizing S–XXL, price, color, availability, sorting)
* `/products/[slug]` — Product detail with interactive gallery, zoom, variant matrix, stock counter, PIN serviceability, size guide modal, JSON-LD Schema
* `/collections` — Curated capsule collections directory
* `/collections/[slug]` — Capsule drop showcase
* `/search` — Live catalog search with trending keywords
* `/wishlist` — Persistent guest & customer wishlist with 1-click Move to Bag

### Checkout & Ordering
* `/cart` — Cart line items, quantity adjustment, coupon applicator, free shipping threshold indicator
* `/checkout` — Indian shipping form, Cashfree Payment Gateway launcher, COD option
* `/payment-return` — Authoritative server-side payment verification and receipt
* `/track-order` — Secure public order tracker requiring order number + phone/email verifier

### Customer Account & Authentication
* `/login` — Email/password & Google Sign-In with open-redirect protection
* `/signup` — Customer registration with Terms of Service consent
* `/forgot-password` — Password reset link dispatch
* `/auth/callback` — Server-side code exchange, guest cart & wishlist auto-merging
* `/account` — Member dashboard with quick stats and recent orders
* `/account/orders` — Complete order archive with live delivery states
* `/account/orders/[id]` — Detailed order breakdown, printable tax invoice receipt (`window.print()`), order cancellation, and 7-day return request modal
* `/account/addresses` — Saved shipping address management
* `/account/profile` — Name, phone, and password security management

### Policy & Legal (Clearly Marked Drafts)
* `/about` — Brand manifesto and textile standards
* `/contact` — Support SLA, operational hours, grievance officer contact
* `/size-guide` — Interactive size matrix with Inch / Centimeter switcher
* `/shipping-policy` — Pan-India delivery timelines and courier partnerships
* `/returns-refunds` — 7-day return policy and Cashfree refund timelines
* `/privacy-policy` — DPDP Act 2023 compliant data policy
* `/terms` — Terms of service, ordering, and Mumbai jurisdiction

### Protected Operations Terminal (`/admin/*`)
* `/admin` — Metrics dashboard (revenue, total orders, AOV, low stock alerts, pipeline)
* `/admin/orders` & `/admin/orders/[id]` — Fulfillment state machine, courier partner assignment (AWB), Cashfree payment lookup, and refund execution
* `/admin/products` & `/admin/products/new` — Catalog management, variant matrix generator (Color, Size, SKU, Stock)
* `/admin/inventory` — Stock on hand vs reserved holds, manual adjustments with audit reason notes
* `/admin/coupons` — Coupon code creator (% vs flat ₹), min spend, max discount caps, active toggles
* `/admin/returns` — Quality inspection manager with atomic restock decision
* `/admin/categories` — Catalog taxonomy and category manager
* `/admin/collections` — Capsule release curator
* `/admin/banners` — Announcement bar and homepage typography editor
* `/admin/settings` — Free shipping thresholds, COD fees, policy windows
* `/admin/audit-logs` — Immutable audit trail of administrative actions

---

## 5. Getting Started & Installation

### Prerequisites
* Node.js 18.17+ or Node.js 20+
* Git
* Supabase account (or local Supabase CLI)
* Cashfree Merchant account (Sandbox credentials)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/bubbleboom-clothing.git
cd bubbleboom-clothing
npm install --legacy-peer-deps
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

CASHFREE_API_URL=https://sandbox.cashfree.com/pg
CASHFREE_APP_ID=TEST_your_app_id
CASHFREE_SECRET_KEY=TEST_your_secret_key
CASHFREE_ENVIRONMENT=SANDBOX
CASHFREE_WEBHOOK_SECRET=your_webhook_secret_key
NEXT_PUBLIC_CASHFREE_APP_ID=TEST_your_app_id

NEXT_PUBLIC_SITE_URL=http://localhost:3000
ADMIN_EMAIL=admin@bubbleboom.in
```

### 3. Run Database Migrations & Seeds
Execute the SQL migrations in order within the Supabase SQL Editor:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_inventory_functions.sql`
4. `supabase/migrations/004_coupon_functions.sql`
5. `supabase/migrations/005_bubbleboom_complete_schema.sql`
6. `supabase/seed.sql` (Populates initial categories, capsules, 6 product styles with variants, settings, and discount coupons `BOOM10` and `FIRSTBOOM`).

### 4. Create the First Admin User
1. Register an account on the storefront via `/signup`.
2. In Supabase SQL Editor, grant admin role to your user:
```sql
-- Grant admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'your-email@example.com';

-- Update profile role
UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```
*(Alternatively, set `ADMIN_EMAIL=your-email@example.com` in `.env.local` for automatic administrative bootstrap).*

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Cashfree Payments Integration Guide

### Sandbox Onboarding
1. Sign up at [https://merchant.cashfree.com](https://merchant.cashfree.com) and switch to **Sandbox Mode**.
2. Navigate to **Payment Gateway -> Developers -> API Keys**.
3. Generate **App ID** and **Secret Key**. Add them to `.env.local`.
4. Navigate to **Developers -> Webhooks**. Set your webhook endpoint URL:
   * Local testing: Use ngrok (`https://your-ngrok.ngrok-free.app/api/webhooks/cashfree`)
   * Production: `https://bubbleboom.in/api/webhooks/cashfree`
5. Copy the **Webhook Secret** into `CASHFREE_WEBHOOK_SECRET`.

### Webhook Verification Workflow
When Cashfree dispatches an event:
1. Signature is verified using timing-safe HMAC-SHA256 (`crypto.timingSafeEqual`).
2. The payload is checked against `payment_events` table for idempotency. Duplicate delivery attempts are safely ignored.
3. Out-of-order check guarantees a delayed failure webhook cannot overwrite a successfully confirmed payment.
4. Active stock reservation is transitioned to confirmed sale, and fulfillment status updates to `confirmed`.

### Transitioning to Production
1. Complete merchant KYC verification on the Cashfree dashboard.
2. In `.env.local`, change:
   ```env
   CASHFREE_API_URL=https://api.cashfree.com/pg
   CASHFREE_ENVIRONMENT=PRODUCTION
   CASHFREE_APP_ID=your_production_app_id
   CASHFREE_SECRET_KEY=your_production_secret_key
   ```
3. Test end-to-end checkout with a live ₹1 payment.

---

## 7. Automated Test Suite

Run the full automated test suite:
```bash
npm test
```

### Coverage (8 Suites / 36 Passing Tests)
1. `tests/pricing.test.ts` — Integer paise math, free shipping threshold (₹1,499), standard shipping fee (₹99), COD fee (₹50), non-negative floor.
2. `tests/coupons.test.ts` — Percentage & fixed discounts, maximum discount caps, minimum cart spend rejection.
3. `tests/orders.test.ts` — Indian mobile format validation, 6-digit PIN validation, fulfillment state machine transitions.
4. `tests/cashfree.test.ts` — Timing-safe HMAC-SHA256 verification (Hex & Base64), body tampering rejection, timestamp replay protection, buffer length overflow protection.
5. `tests/webhooks.test.ts` — Idempotency duplicate event handling, protection against out-of-order webhook delivery.
6. `tests/refunds.test.ts` — Cumulative refund ceiling constraints, partial refund calculation, zero/negative rejection.
7. `tests/concurrency.test.ts` — Race conditions on final stock item, atomic hold expiration restoring availability.
8. `tests/auth.test.ts` — Customer ownership verification, admin authorization bypass, secure guest order access verification.

---

## 8. Feature Status Matrix

| Module / Feature | Status | Notes |
| :--- | :---: | :--- |
| **Brand Identity (B&W Wordmark & Monogram)** | Verified Working | Extracted from approved brand board to `public/images/brand/` |
| **All 18 Storefront & Account Routes** | Verified Working | Tested, responsive, server & client components |
| **Multi-Facet Catalog Filters & Sorting** | Verified Working | Real-time category, size, price, availability filters |
| **Paise-Accurate Cart & Wishlist** | Verified Working | Persistent guest sessions, database merge on login |
| **Cashfree Sandbox Checkout** | Verified Working | Official JS SDK v3 session launcher & backend verification |
| **Cashfree Webhook Handler** | Verified Working | HMAC-SHA256 signature verification, idempotency protection |
| **Cash on Delivery (COD)** | Verified Working | Configurable ₹50 fee, ₹5,000 ceiling, status management |
| **Atomic Inventory Reservations** | Verified Working | 15-minute hold RPC, concurrency verified, zero overselling |
| **Public Order Tracking** | Verified Working | Verified lookup by order number + phone/email |
| **Customer Returns & Receipts** | Verified Working | 7-day return request modal, printable tax invoice receipt |
| **Admin Operations Terminal** | Verified Working | Dashboard, Orders, Products, Inventory, Coupons, Returns |
| **Automated Test Suite** | Verified Working | 36 automated unit & integration tests passing (`vitest`) |
| **Cashfree Production Activation** | External Dependency | Requires merchant KYC approval on Cashfree Dashboard |
| **Cloudinary Production Storage** | External Dependency | Add credentials in `.env.local` for custom image uploads |
| **Resend Domain Verification** | External Dependency | Add verified sending domain DNS records on Resend |
