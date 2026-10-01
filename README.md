# Yalla Market

A responsive full-stack e-commerce project for a Lebanese storefront, built with Next.js, React, TypeScript, MongoDB and ImageKit. It combines product discovery, persistent shopping bags and wishlists, guest checkout, and a merchant admin panel.

**Existing live storefront:** [yalla-market-lebanon-43.netlify.app](https://yalla-market-lebanon-43.netlify.app/). This repository is a sanitized portfolio snapshot. It has its own generic configuration and sample catalog; publishing this source does not update that live deployment.

## Implemented features

- Search, category and price filters, sale filtering, sorting, product galleries, color/size selection and related products.
- Browser-persisted bag and wishlist; the selected color photo carries through the bag, checkout and saved order.
- Guest checkout with cash on delivery or a **manual** Whish Money transfer workflow. The app does not transfer money or verify receipts automatically.
- Optional configured WhatsApp contact and product/order message links.
- Admin sign-in, product create/edit/hide, stock and price management, ImageKit image upload, color-to-photo assignment and order/payment status management.
- Server-calculated prices, transaction-based stock reservation, idempotent checkout retries and once-only stock restoration on cancellation.
- Private order links, signed HTTP-only admin cookies, origin checks, input validation and database-backed request limits.

## Stack and structure

| Area | Implementation |
| --- | --- |
| App and UI | Next.js App Router, React 19, TypeScript, CSS, Lucide icons |
| Data | MongoDB Node driver; replica-set transactions for orders |
| Images | ImageKit uploads and original SVG sample illustrations |
| Hosting | Node.js server, Dockerfile and Netlify configuration |
| Validation | Node test runner, TypeScript and production build |

`app/` contains pages and the API handler. `components/` holds the storefront and admin interfaces. `lib/` contains types, server/data helpers, delivery rules and the demo catalog. `scripts/` contains catalog seeding, local admin setup and Netlify packaging helpers.

## Run locally

Use **Node.js 22.13 or newer** and npm. The native TypeScript test runner requires this minimum version; CI installs the latest Node.js 22 release.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`. Open [localhost:3000](http://localhost:3000).

With database credentials left blank, the server renders the bundled demo catalog. Checkout and database-backed admin operations remain unavailable until you configure your own backend. This makes the storefront browsable without using any live store credentials.

## Enable checkout and admin operations

1. Configure `MONGODB_URI` for your own MongoDB replica set, and `MONGODB_DB` for an isolated development database. Use an account and network rules appropriate to your host. Orders require transaction support.
2. Set `ADMIN_EMAIL` in `.env.local`, then run `npm run admin:password` locally to generate the password hash and session secret. The generated password is saved to the ignored `admin-access.txt`; restart the server after changes. This script replaces local admin credentials, so run it deliberately.
3. Run `npm run seed` to insert the 120 demonstration products. It inserts missing products and does not overwrite existing product edits. The bundled products are marked as samples and are not evidence of real inventory.
4. Configure `IMAGEKIT_PRIVATE_KEY` and `IMAGEKIT_URL_ENDPOINT` for your own ImageKit account to enable uploads and product editing. Uploaded product URLs are restricted to that endpoint. Replace sample SVG illustrations with your own uploads when editing a sample product or operating a real store.
5. Set `NEXT_PUBLIC_WHATSAPP_NUMBER` to your store's international digits and `NEXT_PUBLIC_PAYMENT_PHONE` to the payment recipient you want displayed. Blank WhatsApp settings send support links to `/help`.

Sign in at `/login`, then use `/admin`. Image uploads accept JPEG, PNG, WebP or AVIF up to 10 MB. Each color in a published multi-color product needs a matching gallery image. Stock edits reject stale forms. Cancellation restores stock once; cancelled orders cannot be reopened, and delivered orders cannot be cancelled.

Set `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to the correct origin. `NEXT_PUBLIC_*` settings are embedded in browser bundles during the build and require a rebuild when changed. Keep database credentials, password hashes, session secrets and private image keys in server-only environment settings.

## Check and build

```sh
npm test
npm run check
npm run build
npm start
```

The domain tests cover the strict delivery boundary, unique product routes, sample/variant/gallery integrity and ImageKit account restrictions. GitHub Actions runs installation, tests, TypeScript and build checks without production credentials. It does not deploy the storefront.

Delivery uses integer USD cents: $3 per order, with free delivery only for subtotals **over $50**. Exactly $50 still pays $3. The storefront displays a two-day Lebanon delivery policy; actual fulfillment remains a merchant responsibility.

## Portfolio scope and limits

- This is a web application; no native Android client is included in this repository.
- The local demo displays synthetic sample products and geometric illustrations, not a connected live store or verified inventory.
- Manual Whish payments and order fulfillment require human confirmation. There is no payment gateway, automatic receipt verification or shipping-provider integration.
- The project uses a single admin role. It does not include multi-merchant access, customer accounts, automated email/SMS notifications or a complete production observability setup.
- Validation of this snapshot is documented in [VALIDATION.md](VALIDATION.md). Historical live-store reports are excluded because they are not reproducible tests of this sanitized copy.
- Before accepting real orders, review operational security, backups, privacy/retention and monitoring for your deployment. Browser-based end-to-end and live backend testing are separate from the credential-free checks in this repository.

## Sample imagery and rights

The 120 demo entries and 18 geometric SVG category/color illustrations were created for this portfolio snapshot. They contain no original store photographs, recolored brand images or external image links. Color previews are labeled in the product UI. See [ATTRIBUTION.md](ATTRIBUTION.md).

No project-wide open-source license is granted by this repository.
