/**
 * cabins-checkout — Stripe Checkout session creator for guidebook.html
 *
 * The enhancement catalog (names + prices) is bundled from
 * data/enhancements.json at deploy time, so the client can only reference
 * items by id — prices can't be tampered with in the browser.
 *
 * POST body (JSON):
 * {
 *   items: [{ id: "mimosa-flight", qty: 2 }],
 *   guest: { name, cabin, checkin, checkout },   // strings; dates YYYY-MM-DD or ""
 *   deliveryDate: "2026-08-02",
 *   note: "optional special request"
 * }
 * → { url: "https://checkout.stripe.com/..." }  or  { error: "..." }
 */
import catalog from '../../data/enhancements.json';

const SITE = 'https://thecabinsatcountryroad.com';
const ALLOWED_ORIGINS = [
  'https://thecabinsatcountryroad.com',
  'https://www.thecabinsatcountryroad.com',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];

const ITEMS = new Map();
for (const cat of catalog.categories) {
  for (const item of cat.items) ITEMS.set(item.id, item);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// Earliest delivery date honoring 24h notice, in the property's timezone
function minDeliveryDate() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
}

function validate(body) {
  if (!body || typeof body !== 'object') return 'Invalid request.';

  const { items, guest, deliveryDate, note } = body;
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
    return 'Your order must have between 1 and 20 items.';
  }
  for (const it of items) {
    const item = it && ITEMS.get(it.id);
    if (!item || item.price == null) return 'One of the items in your order is no longer available.';
    if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > 10) return 'Item quantities must be between 1 and 10.';
  }
  if (!guest || typeof guest.name !== 'string' || !guest.name.trim() || guest.name.length > 80) {
    return 'Please include the guest name.';
  }
  if (typeof guest.cabin !== 'string' || !guest.cabin.trim() || guest.cabin.length > 60) {
    return 'Please include the cabin.';
  }
  for (const d of [guest.checkin, guest.checkout]) {
    if (d && !DATE_RE.test(d)) return 'Invalid stay dates.';
  }
  if (typeof deliveryDate !== 'string' || !DATE_RE.test(deliveryDate)) {
    return 'Please choose a delivery day.';
  }
  if (deliveryDate < minDeliveryDate()) {
    return 'We require 24 hours notice — please choose a later delivery day, or call us at (303) 674-1901.';
  }
  if (note != null && (typeof note !== 'string' || note.length > 500)) {
    return 'Special request is too long.';
  }
  return null;
}

async function createSession(env, body) {
  const { items, guest, deliveryDate } = body;
  const note = (body.note || '').trim();

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('submit_type', 'pay');

  const summaryParts = [];
  items.forEach((it, i) => {
    const item = ITEMS.get(it.id);
    form.set(`line_items[${i}][quantity]`, String(it.qty));
    form.set(`line_items[${i}][price_data][currency]`, 'usd');
    form.set(`line_items[${i}][price_data][unit_amount]`, String(item.price));
    form.set(`line_items[${i}][price_data][product_data][name]`, item.name);
    summaryParts.push(`${it.qty}× ${item.name}`);
  });

  // Return the guest to their personalized guidebook after checkout
  const returnParams = new URLSearchParams();
  if (guest.name) returnParams.set('guest', guest.name);
  if (guest.cabin) returnParams.set('cabin', guest.cabin);
  if (guest.checkin) returnParams.set('checkin', guest.checkin);
  if (guest.checkout) returnParams.set('checkout', guest.checkout);
  const base = `${SITE}/guidebook.html?${returnParams.toString()}`;
  form.set('success_url', `${base}&order=success&session_id={CHECKOUT_SESSION_ID}#enhance`);
  form.set('cancel_url', `${base}&order=cancelled#enhance`);

  const metadata = {
    source: 'guest-guidebook',
    guest_name: guest.name.trim(),
    cabin: guest.cabin.trim(),
    check_in: guest.checkin || '',
    check_out: guest.checkout || '',
    delivery_date: deliveryDate,
    special_request: note.slice(0, 480),
    order_summary: summaryParts.join('; ').slice(0, 480),
  };
  for (const [key, value] of Object.entries(metadata)) {
    if (value === '') continue;
    form.set(`metadata[${key}]`, value);
    form.set(`payment_intent_data[metadata][${key}]`, value);
  }
  form.set(
    'payment_intent_data[description]',
    `Enhancements — ${guest.cabin.trim()} — deliver ${deliveryDate}`
  );

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const session = await res.json();
  if (!res.ok || !session.url) {
    console.error('Stripe error', res.status, JSON.stringify(session.error || session).slice(0, 500));
    throw new Error('stripe');
  }
  return session.url;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return json(405, { error: 'Method not allowed.' }, origin);
    }
    // Browsers always send Origin on cross-origin POSTs; reject unknown sites
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json(403, { error: 'Forbidden.' }, origin);
    }
    if (!env.STRIPE_SECRET_KEY) {
      return json(500, { error: 'Checkout is not configured yet.' }, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: 'Invalid request.' }, origin);
    }

    const problem = validate(body);
    if (problem) return json(400, { error: problem }, origin);

    try {
      const url = await createSession(env, body);
      return json(200, { url }, origin);
    } catch {
      return json(502, { error: 'Our payment service hiccuped — please try again in a minute, or call us at (303) 674-1901.' }, origin);
    }
  },
};
