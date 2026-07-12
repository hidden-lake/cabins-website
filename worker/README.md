# cabins-checkout worker

A tiny Cloudflare Worker that creates Stripe Checkout sessions for enhancement
orders placed on the guest guidebook (`guidebook.html`). Prices come from
`data/enhancements.json`, which is bundled into the worker at deploy time — the
browser only sends item ids and quantities, so prices can't be tampered with.

## One-time setup

1. **Get a Stripe key.** In the Stripe dashboard → Developers → API keys →
   *Create restricted key* with these permissions (all others "None"):
   - Checkout Sessions: **Write**
   - Products: **Write** and Prices: **Write** (Checkout creates ad-hoc prices
     from `price_data` under the hood)
   - Customers: **Write** (Checkout may create a customer record for receipts)
   - Payment Intents: **Read** (powers the guidebook's "already ordered"
     panel via GET /orders, which searches paid orders by stay metadata)

   A standard secret key also works, but a restricted key is safer.
   Start with a **test mode** key first (`rk_test_...` / `sk_test_...`).

2. **Deploy the worker** (needs a free Cloudflare account; the domain's DNS is
   already on Cloudflare):

   ```bash
   cd worker
   npx wrangler login          # interactive, opens browser
   npx wrangler deploy
   npx wrangler secret put STRIPE_SECRET_KEY   # paste the key when prompted
   ```

   `deploy` prints the worker URL, e.g. `https://cabins-checkout.<account>.workers.dev`.

3. **Point the site at it.** In `js/guidebook.js`, set `CHECKOUT_ENDPOINT` to
   that URL (replacing the `CHANGE-ME` placeholder) and deploy the site.

4. **Test in test mode.** Open the guidebook, add items, check out with card
   `4242 4242 4242 4242`, any future expiry/CVC. Confirm the payment appears in
   the Stripe test dashboard with the guest name / cabin / delivery date in the
   payment's metadata. Then swap the secret to the live key
   (`npx wrangler secret put STRIPE_SECRET_KEY` again) — no redeploy needed.

5. **Stripe email settings** (Settings → Emails): turn on *Successful payments*
   receipts for customers, and enable payment notifications for yourselves so
   orders don't go unnoticed. Each payment's metadata shows guest name, cabin,
   stay dates, delivery date, special request, and an order summary.

## Updating the catalog

Edit `data/enhancements.json` (names, prices, items) and:

- deploy the site (updates both `enhancements.html` and the guidebook), and
- redeploy the worker: `cd worker && npx wrangler deploy` (updates the prices
  Stripe charges).

Both read the same file, so keep them in step — if only the site is deployed,
orders still charge the old worker-side price.

## Notes

- Validation enforced server-side: known item ids, quantity 1–10, ≤20 line
  items, and the 24-hour-notice rule (delivery date must be at least a day out,
  America/Denver).
- CORS/Origin is locked to thecabinsatcountryroad.com (plus localhost for
  development).
- Optional: give the worker a custom domain (e.g.
  `checkout.thecabinsatcountryroad.com`) in the Cloudflare dashboard → Worker →
  Settings → Domains & Routes, then update `CHECKOUT_ENDPOINT` to match.
