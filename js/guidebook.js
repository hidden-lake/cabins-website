/**
 * The Cabins at Country Road - Guest Guidebook
 *
 * - Deeplink personalization: guidebook.html?guest=Jane&cabin=dreamcatcher&checkin=2026-08-01&checkout=2026-08-04
 *   (build links with guidebook-link.html)
 * - Enhancement ordering: cart + Stripe Checkout via the Cloudflare Worker in worker/
 */
(function () {
  'use strict';

  var CHECKOUT_ENDPOINT = 'https://cabins-checkout.pleo-tx.workers.dev';

  var PHONE_DISPLAY = '(303) 674-1901';
  var CART_KEY = 'crc_cart_v1';
  var LAST_ORDER_KEY = 'crc_last_order';
  var ORDERS_KEY = 'crc_orders_v1';
  var STAY_KEY = 'crc_stay_v1';
  // Which page checkout should return guests to (this script runs on both)
  var RETURN_TO = /enhancements/.test(window.location.pathname) ? 'enhancements' : 'guidebook';

  var CABINS = {
    'bootlegger-barn': 'The Bootlegger Barn',
    'chicken-coop': 'The Chicken Coop',
    'columbine-cottage': 'The Columbine Cottage',
    'dreamcatcher': 'The Dreamcatcher',
    'fish-camp': 'The Fish Camp',
    'huckleberry-house': 'The Huckleberry House',
    'orchard-house': 'The Orchard House',
    'owls-nest': "The Owl's Nest"
  };

  // Which parking lot serves each cabin (see the property map)
  var PARKING = {
    'owls-nest': 'west',
    'huckleberry-house': 'west',
    'orchard-house': 'main',
    'dreamcatcher': 'main',
    'fish-camp': 'main',
    'columbine-cottage': 'east',
    'bootlegger-barn': 'east',
    'chicken-coop': 'east'
  };
  var LOTS = {
    west: { name: 'West Lot', how: 'off Racoon Run' },
    main: { name: 'Main Lot', how: 'through the Elk Entry drive' },
    east: { name: 'East Lot', how: 'at the far right of the drive' }
  };

  // Photo, blurb, and walking directions for the "Your Cabin" section
  var CABIN_INFO = {
    'owls-nest': {
      img: 'images/cabins/owls-nest/IMG_0120.jpeg',
      page: 'cabin-owls-nest.html',
      desc: 'A romantic A-frame with an antler chandelier, a spa bath with soaking tub, and a wrap-around porch right on Bear Creek.',
      find: 'after parking, go through the stone gate — it’s the cabin to the right (#1 on the map).'
    },
    'huckleberry-house': {
      img: 'images/cabins/huckleberry-house/IMG_0150.jpeg',
      page: 'cabin-huckleberry-house.html',
      desc: 'A creekside cabin for 2–4 guests with spiral-staircase loft bedrooms and private patio dining on Bear Creek.',
      find: 'after parking, go through the stone gate — it’s the cabin on your left (#3 on the map).'
    },
    'orchard-house': {
      img: 'images/cabins/orchard-house/IMG_0221.jpeg',
      page: 'cabin-orchard-house.html',
      desc: 'A farmhouse-style cabin with ship-lap walls, a Carrara marble bath, and dark walnut floors along Bear Creek.',
      find: 'come through the walkway gate from the Main Lot — it’s the first cabin on your right (#6 on the map).'
    },
    'dreamcatcher': {
      img: 'images/cabins/dreamcatcher/bedroom-loft.jpg',
      page: 'cabin-dreamcatcher.html',
      desc: 'A creekside cabin with a lodgepole king bed, petrified wood sink, and cathedral pine ceilings on Bear Creek.',
      find: 'come through the walkway gate from the Main Lot — it’s straight ahead, the middle creekside cabin (#7 on the map).'
    },
    'fish-camp': {
      img: 'images/cabins/fish-camp/deck.jpg',
      page: 'cabin-fish-camp.html',
      desc: 'A vintage creekside cabin with pine walls, slate floors, and a river-rock shower on Bear Creek.',
      find: 'come through the walkway gate from the Main Lot — it’s the cabin to your left, beside the tall pine (#8 on the map).'
    },
    'columbine-cottage': {
      img: 'images/cabins/columbine/IMG_0598.jpg',
      page: 'cabin-columbine-cottage.html',
      desc: 'Our newest luxury cabin with a soaking tub, steam shower, and chef’s kitchen — sleeps 4 in 2 bedrooms.',
      find: 'pull into the drive and park to the right — the cottage is right there (#10 on the map).'
    },
    'bootlegger-barn': {
      img: 'images/cabins/barn/exterior-winter.jpg',
      page: 'cabin-bootlegger-barn.html',
      desc: 'A restored prohibition-era barn with a whisky-barrel shower, stained glass, and creek views.',
      find: 'pull in and follow the parking signage for the Bootlegger Barn, on the left (#11 on the map).'
    },
    'chicken-coop': {
      img: 'images/cabins/chicken-coop/exterior.jpg',
      page: 'cabin-chicken-coop.html',
      desc: 'A romantic cabin with a gourmet kitchen, stone fireplace, clawfoot tub, and private deck.',
      find: 'pull in and follow the parking signage for the Chicken Coop, on the left (#12 on the map).'
    }
  };

  var esc = window.CRCEnhancements.esc;
  var formatPrice = window.CRCEnhancements.formatPrice;

  // ============================================
  // Deeplink parsing & date helpers
  // ============================================
  // Accepts YYYY-MM-DD (our link builder) and DD/MM/YYYY (external booking emails)
  function parseDateStr(str) {
    str = (str || '').trim();
    var y, m, d;
    var iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    var dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
    if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3]; }
    else if (dmy) { d = +dmy[1]; m = +dmy[2]; y = +dmy[3]; }
    else return null;
    var date = new Date(y, m - 1, d);
    // reject values Date would silently roll over (e.g. 31/02)
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    return date;
  }

  function toDateStr(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function fmtShort(d) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function fmtRange(checkin, checkout) {
    var year = checkout.getFullYear();
    return fmtShort(checkin) + ' – ' + fmtShort(checkout) + ', ' + year;
  }

  function readDeeplink() {
    var q = new URLSearchParams(window.location.search);
    var guest = (q.get('guest') || q.get('name') || '').trim().slice(0, 80);
    var cabinParam = (q.get('cabin') || '').trim().toLowerCase();
    var cabinSlug = CABINS[cabinParam] ? cabinParam : '';
    var cabinName = CABINS[cabinParam] || (q.get('cabin') || '').trim().slice(0, 60);
    var checkin = parseDateStr(q.get('checkin'));
    var checkout = parseDateStr(q.get('checkout'));
    if (checkin && checkout && checkout <= checkin) { checkin = null; checkout = null; }
    return {
      guest: guest,
      cabinSlug: cabinSlug,
      cabinName: cabinName,
      checkin: checkin,
      checkout: checkout,
      order: q.get('order') || '',
      sessionId: q.get('session_id') || ''
    };
  }

  var link = readDeeplink();
  var staySource = (link.guest || link.cabinName || link.checkin) ? 'link' : 'none';

  // No deeplink? Remember the stay a guest told us about on a previous order
  // (only while the stay hasn't ended, so stale info never leaks forward).
  if (!link.guest && !link.cabinName && !link.checkin) {
    try {
      var savedStay = JSON.parse(localStorage.getItem(STAY_KEY) || 'null');
      if (savedStay) {
        var savedOut = parseDateStr(savedStay.checkout);
        var savedIn = parseDateStr(savedStay.checkin);
        var today = new Date(); today.setHours(0, 0, 0, 0);
        if ((savedOut && savedOut >= today) || (savedIn && savedIn >= today)) {
          link.guest = savedStay.guest || '';
          link.cabinSlug = CABINS[savedStay.cabinSlug] ? savedStay.cabinSlug : '';
          link.cabinName = CABINS[link.cabinSlug] || savedStay.cabinName || '';
          link.checkin = savedIn;
          link.checkout = savedOut;
          staySource = 'saved';
        } else {
          localStorage.removeItem(STAY_KEY);
        }
      }
    } catch (e) { /* ignore */ }
  }

  function saveStay(guest, cabinSlug, cabinName, checkin, checkout) {
    try {
      localStorage.setItem(STAY_KEY, JSON.stringify({
        guest: guest, cabinSlug: cabinSlug, cabinName: cabinName,
        checkin: checkin, checkout: checkout
      }));
    } catch (e) { /* ignore */ }
  }

  // ============================================
  // Analytics — every event carries the stay context (guest, cabin, dates)
  // so GA can answer "who viewed / did what" per guest and stay.
  // Params must be registered as custom dimensions in GA4 Admin to appear
  // in reports: guest_name, cabin, stay_checkin, stay_checkout (event + user
  // scope), plus stay_nights, stay_phase, personalization, section, etc.
  // ============================================
  function stayParams() {
    var p = {};
    if (link.guest) p.guest_name = link.guest;
    if (link.cabinSlug || link.cabinName) p.cabin = link.cabinSlug || link.cabinName;
    if (link.checkin) p.stay_checkin = toDateStr(link.checkin);
    if (link.checkout) p.stay_checkout = toDateStr(link.checkout);
    return p;
  }

  function track(name, params) {
    if (typeof gtag !== 'function') return;
    var merged = stayParams();
    Object.keys(params || {}).forEach(function (k) {
      if (params[k] !== undefined && params[k] !== '') merged[k] = params[k];
    });
    gtag('event', name, merged);
  }

  // Persist the stay on the GA user too, so user-scoped reporting works
  if (typeof gtag === 'function') {
    var userProps = stayParams();
    if (Object.keys(userProps).length) gtag('set', 'user_properties', userProps);
  }

  // One rich "who opened the guidebook" event per view (page_view carries the
  // same stay params via the config block in guidebook.html <head>)
  if (RETURN_TO === 'guidebook') {
    var viewParams = { personalization: staySource };
    var todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
    if (link.checkin && link.checkout) {
      viewParams.stay_nights = Math.round((link.checkout - link.checkin) / 86400000);
      viewParams.stay_phase = todayMid < link.checkin ? 'before'
        : (todayMid < link.checkout ? 'during' : 'after');
      viewParams.days_to_checkin = Math.round((link.checkin - todayMid) / 86400000);
    }
    if (link.order) viewParams.order_return = link.order;
    track('guidebook_view', viewParams);
  }

  // Earliest allowed delivery date (24h notice, by calendar day)
  function minDeliveryStr() {
    return toDateStr(new Date(Date.now() + 24 * 60 * 60 * 1000));
  }

  // ============================================
  // Personalization (hero + quick reference)
  // ============================================
  function personalize() {
    if (!link.guest && !link.cabinName && !link.checkin) return;

    var parts = [];
    if (link.guest) parts.push(esc(link.guest) + '’s stay');
    if (link.cabinName) parts.push(esc(link.cabinName));
    if (link.checkin && link.checkout) parts.push(esc(fmtRange(link.checkin, link.checkout)));

    var sub = document.querySelector('.hero .sub');
    if (sub && parts.length) {
      var line = document.createElement('p');
      line.className = 'guest-line';
      line.innerHTML = parts.join(' · ');
      sub.insertAdjacentElement('afterend', line);
    }

    var grid = document.querySelector('.qr-grid');
    if (grid) {
      var extras = '';
      if (link.cabinName) {
        extras += '<div class="qr-item"><span class="lab">Your Cabin</span><span class="val"><strong>' + esc(link.cabinName) + '</strong></span></div>';
      }
      if (link.checkin && link.checkout) {
        extras += '<div class="qr-item"><span class="lab">Your Stay</span><span class="val"><strong>' + esc(fmtRange(link.checkin, link.checkout)) + '</strong></span></div>';
      }
      grid.insertAdjacentHTML('afterbegin', extras);
    }
  }

  // ============================================
  // Cart state
  // ============================================
  var itemsById = {};

  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch (e) { return {}; }
  }

  function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* private mode */ }
  }

  var cart = loadCart();

  function cartEntries() {
    return Object.keys(cart)
      .filter(function (id) { return itemsById[id] && cart[id] > 0; })
      .map(function (id) { return { item: itemsById[id], qty: Math.min(cart[id], itemsById[id].max || 10) }; });
  }

  function cartTotal() {
    return cartEntries().reduce(function (sum, e) { return sum + e.item.price * e.qty; }, 0);
  }

  function cartCount() {
    return cartEntries().reduce(function (sum, e) { return sum + e.qty; }, 0);
  }

  function gaItems() {
    return cartEntries().map(function (e) {
      return { item_id: e.item.id, item_name: e.item.name, price: e.item.price / 100, quantity: e.qty };
    });
  }

  // ============================================
  // Early check-in banner — hides once it's in the cart or already purchased
  // ============================================
  var EARLY_ID = 'early-checkin';
  var earlyPurchased = false;

  function updateEarlyBanner() {
    var b = document.getElementById('early-checkin-banner');
    if (!b) return;
    b.hidden = !itemsById[EARLY_ID] || !!cart[EARLY_ID] || earlyPurchased;
  }

  // ============================================
  // Floating order button + drawer
  // ============================================
  var fab, overlay;

  function buildCartUI() {
    fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'cart-fab';
    fab.addEventListener('click', openDrawer);
    document.body.appendChild(fab);

    overlay = document.createElement('div');
    overlay.className = 'cart-overlay';
    var stayLine = (link.checkin && link.checkout)
      ? '<p class="drawer-sub">Your stay: ' + esc(fmtRange(link.checkin, link.checkout)) + '</p>'
      : '';

    var cabinOptions = '<option value="">— select your cabin —</option>' +
      Object.keys(CABINS).map(function (slug) {
        var sel = slug === link.cabinSlug ? ' selected' : '';
        return '<option value="' + slug + '"' + sel + '>' + esc(CABINS[slug]) + '</option>';
      }).join('');
    if (!link.cabinSlug && link.cabinName) {
      cabinOptions += '<option value="__other" selected>' + esc(link.cabinName) + '</option>';
    }

    // Ask for stay dates only when we don't already know them (deeplink or a
    // previous order on this device) — they key the Stripe metadata and the
    // "already ordered" lookup.
    var stayFields = (link.checkin && link.checkout) ? '' :
      '<div class="cart-dates">' +
      '<div><label for="cart-checkin">Check-in date</label>' +
      '<input id="cart-checkin" type="date" value="' + (link.checkin ? toDateStr(link.checkin) : '') + '"></div>' +
      '<div><label for="cart-checkout">Check-out</label>' +
      '<input id="cart-checkout" type="date" value="' + (link.checkout ? toDateStr(link.checkout) : '') + '"></div>' +
      '</div>';

    overlay.innerHTML =
      '<div class="cart-drawer" role="dialog" aria-label="Your enhancement order">' +
      '<button type="button" class="cart-close" aria-label="Close">&times;</button>' +
      '<h3>Your Order</h3>' +
      stayLine +
      '<div class="cart-items"></div>' +
      '<label for="cart-name">Guest name</label>' +
      '<input id="cart-name" type="text" autocomplete="name" placeholder="Name on the reservation" value="' + esc(link.guest) + '">' +
      '<label for="cart-cabin">Cabin</label>' +
      '<select id="cart-cabin">' + cabinOptions + '</select>' +
      stayFields +
      '<label for="cart-delivery">Have it ready on</label>' +
      deliveryFieldHTML() +
      '<label for="cart-note">Special requests <span style="text-transform:none;letter-spacing:0;font-weight:500">(optional)</span></label>' +
      '<textarea id="cart-note" maxlength="450" placeholder="Anniversary, allergies, banner text, timing…"></textarea>' +
      '<div class="cart-total"><span>Total</span><span class="tval"></span></div>' +
      '<p class="cart-notice">We require 24 hours notice. Alcohol orders: 21+ with valid photo ID at delivery.</p>' +
      '<div class="cart-error"></div>' +
      '<button type="button" class="cart-checkout">Continue to secure checkout</button>' +
      '<p class="cart-secure">Payment handled securely by Stripe · Receipt by email</p>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeDrawer();
    });
    overlay.querySelector('.cart-close').addEventListener('click', closeDrawer);
    overlay.querySelector('.cart-checkout').addEventListener('click', checkout);

    overlay.querySelector('.cart-items').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      var act = btn.getAttribute('data-act');
      if (!cart[id]) return;
      var removedQty = act === 'rm' ? cart[id] : (act === 'dec' ? 1 : 0);
      if (act === 'inc') cart[id] = Math.min(cart[id] + 1, (itemsById[id] && itemsById[id].max) || 10);
      if (act === 'dec') cart[id] = cart[id] - 1;
      if (act === 'rm' || cart[id] <= 0) delete cart[id];
      saveCart(cart);
      renderCart();
      if (removedQty && itemsById[id]) {
        track('remove_from_cart', {
          currency: 'USD',
          value: itemsById[id].price * removedQty / 100,
          items: [{ item_id: id, item_name: itemsById[id].name, price: itemsById[id].price / 100, quantity: removedQty }]
        });
      }
    });

    // Entered stay dates bound the delivery-date input
    var ciEl = overlay.querySelector('#cart-checkin');
    var coEl = overlay.querySelector('#cart-checkout');
    if (ciEl) {
      var syncDelivery = function () {
        var del = overlay.querySelector('#cart-delivery');
        if (!del || del.tagName !== 'INPUT') return;
        var min = minDeliveryStr();
        if (ciEl.value && ciEl.value > min) min = ciEl.value;
        del.min = min;
        if (coEl && coEl.value) {
          var lastNight = parseDateStr(coEl.value);
          if (lastNight) {
            lastNight.setDate(lastNight.getDate() - 1);
            del.max = toDateStr(lastNight);
          }
        }
        if (del.value && (del.value < del.min || (del.max && del.value > del.max))) del.value = '';
      };
      ciEl.addEventListener('change', syncDelivery);
      if (coEl) coEl.addEventListener('change', syncDelivery);
    }
  }

  function deliveryFieldHTML() {
    var min = minDeliveryStr();
    if (link.checkin && link.checkout) {
      // One option per night of the stay (delivery through the last full day)
      var opts = [];
      var d = new Date(link.checkin.getTime());
      while (d < link.checkout) {
        var val = toDateStr(d);
        var label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        if (toDateStr(d) === toDateStr(link.checkin)) label += ' (arrival day)';
        var disabled = val < min ? ' disabled' : '';
        opts.push('<option value="' + val + '"' + disabled + '>' + esc(label) + '</option>');
        d.setDate(d.getDate() + 1);
      }
      return '<select id="cart-delivery">' + opts.join('') + '</select>';
    }
    return '<input id="cart-delivery" type="date" min="' + min + '">';
  }

  function renderCart() {
    var entries = cartEntries();
    var count = cartCount();

    fab.innerHTML = '<span class="count">' + count + '</span> Your order · ' + formatPrice(cartTotal());
    fab.classList.toggle('show', count > 0);
    if (count === 0 && overlay.classList.contains('open')) {
      // keep drawer usable but show empty state
    }

    var list = overlay.querySelector('.cart-items');
    if (!entries.length) {
      list.innerHTML = '<p class="cart-empty">Nothing here yet — browse the categories and add something special.</p>';
    } else {
      list.innerHTML = entries.map(function (e) {
        return '<div class="cart-row">' +
          '<span class="nm">' + esc(e.item.name) + '</span>' +
          '<span class="qty">' +
          '<button type="button" data-act="dec" data-id="' + esc(e.item.id) + '" aria-label="Fewer">−</button>' +
          e.qty +
          '<button type="button" data-act="inc" data-id="' + esc(e.item.id) + '" aria-label="More">+</button>' +
          '</span>' +
          '<span class="amt">' + formatPrice(e.item.price * e.qty) + '</span>' +
          '<button type="button" data-act="rm" data-id="' + esc(e.item.id) + '" aria-label="Remove">×</button>' +
          '</div>';
      }).join('');
    }
    overlay.querySelector('.cart-total .tval').textContent = formatPrice(cartTotal());
    updateEarlyBanner();
  }

  function openDrawer() {
    renderCart();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    track('view_cart', { currency: 'USD', value: cartTotal() / 100, items: gaItems() });
  }

  function closeDrawer() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showCartError(msg) {
    var el = overlay.querySelector('.cart-error');
    el.textContent = msg;
    el.classList.add('show');
    track('checkout_error', { reason: msg.slice(0, 100) });
  }

  // ============================================
  // Checkout
  // ============================================
  function checkout() {
    var errEl = overlay.querySelector('.cart-error');
    errEl.classList.remove('show');

    var entries = cartEntries();
    if (!entries.length) return showCartError('Your order is empty — add an enhancement first.');

    var name = overlay.querySelector('#cart-name').value.trim();
    if (!name) return showCartError('Please tell us the name on the reservation.');

    var cabinSel = overlay.querySelector('#cart-cabin');
    var cabinSlug = cabinSel.value;
    var cabinName = cabinSlug === '__other' ? link.cabinName
      : (CABINS[cabinSlug] || '');
    if (!cabinName) return showCartError('Please select your cabin so we know where to deliver.');

    // Stay dates: from the deeplink/previous order, or the drawer fields
    var checkinStr = link.checkin ? toDateStr(link.checkin) : '';
    var checkoutStr = link.checkout ? toDateStr(link.checkout) : '';
    var ciEl = overlay.querySelector('#cart-checkin');
    var coEl = overlay.querySelector('#cart-checkout');
    if (ciEl) {
      checkinStr = ciEl.value;
      checkoutStr = coEl ? coEl.value : '';
      if (!checkinStr) return showCartError('Please tell us your check-in date so we can match this order to your stay.');
      if (checkoutStr && checkoutStr <= checkinStr) return showCartError('Check-out needs to be after check-in.');
    }

    var delivery = overlay.querySelector('#cart-delivery').value;
    if (!delivery) return showCartError('Please choose a delivery day.');
    if (delivery < minDeliveryStr()) return showCartError('We need 24 hours notice — please pick a later day, or call us at ' + PHONE_DISPLAY + ' and we’ll see what we can do.');
    if (checkinStr && delivery < checkinStr) return showCartError('That delivery day is before your check-in — please pick a day during your stay.');

    if (CHECKOUT_ENDPOINT.indexOf('CHANGE-ME') !== -1) {
      return showCartError('Online ordering is almost ready! For now, call us at ' + PHONE_DISPLAY + ' to arrange your enhancements.');
    }

    // Remember the stay so the next visit pre-fills and shows their orders
    saveStay(name, CABINS[cabinSlug] ? cabinSlug : '', cabinName, checkinStr, checkoutStr);

    var payload = {
      items: entries.map(function (e) { return { id: e.item.id, qty: e.qty }; }),
      guest: {
        name: name,
        cabin: cabinName,
        checkin: checkinStr,
        checkout: checkoutStr
      },
      deliveryDate: delivery,
      note: overlay.querySelector('#cart-note').value.trim().slice(0, 450),
      returnTo: RETURN_TO
    };

    var btn = overlay.querySelector('.cart-checkout');
    btn.disabled = true;
    btn.textContent = 'One moment…';

    // Drawer values may be fresher than the deeplink — send those
    track('begin_checkout', {
      currency: 'USD',
      value: cartTotal() / 100,
      items: gaItems(),
      guest_name: name,
      cabin: CABINS[cabinSlug] ? cabinSlug : cabinName,
      stay_checkin: checkinStr,
      stay_checkout: checkoutStr,
      delivery_date: delivery
    });
    try {
      sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify({
        value: cartTotal() / 100,
        items: gaItems(),
        amount: cartTotal(),
        deliveryDate: delivery,
        // same "2× Name; 1× Name" format the worker writes to Stripe metadata,
        // so local and server entries dedupe cleanly
        summary: entries.map(function (e) { return e.qty + '× ' + e.item.name; }).join('; '),
        checkin: payload.guest.checkin,
        cabin: cabinName
      }));
    } catch (e) { /* ignore */ }

    fetch(CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok || !data.url) throw new Error(data.error || 'Checkout is unavailable right now.');
        window.location.href = data.url;
      });
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = 'Continue to secure checkout';
      showCartError((err && err.message ? err.message : 'Something went wrong.') + ' You can always call us at ' + PHONE_DISPLAY + '.');
    });
  }

  // ============================================
  // Order return banners (?order=success|cancelled)
  // ============================================
  function handleOrderReturn() {
    if (!link.order) return;
    var banner = document.getElementById('order-banner');
    if (!banner) return;

    if (link.order === 'success') {
      banner.innerHTML = '<div class="order-banner success"><b>Thank you — your order is in!</b> A receipt is on its way to your email, and everything will be ready and waiting. Questions? Call us at <a href="tel:+13036741901" style="color:var(--gold)">' + PHONE_DISPLAY + '</a>.</div>';
      cart = {};
      saveCart(cart);
      var last = null;
      try { last = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || 'null'); } catch (e) { /* ignore */ }
      if (last) {
        track('purchase', {
          transaction_id: link.sessionId || undefined,
          currency: 'USD',
          value: last.value,
          items: last.items,
          delivery_date: last.deliveryDate || undefined
        });
        // durable same-device history (covers the ~1 min before Stripe's
        // search index picks the payment up, and stays without deeplink dates)
        try {
          var hist = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
          hist.push({
            placed: Math.round(Date.now() / 1000),
            deliveryDate: last.deliveryDate || '',
            summary: last.summary || '',
            amount: last.amount || 0,
            checkin: last.checkin || '',
            cabin: last.cabin || ''
          });
          localStorage.setItem(ORDERS_KEY, JSON.stringify(hist.slice(-20)));
          sessionStorage.removeItem(LAST_ORDER_KEY);
        } catch (e) { /* ignore */ }
      }
    } else if (link.order === 'cancelled') {
      banner.innerHTML = '<div class="order-banner cancelled">No charge was made — your selections are saved below whenever you’re ready.</div>';
      track('checkout_cancelled', { currency: 'USD', value: cartTotal() / 100, items: gaItems() });
    }

    // Strip order params so a refresh doesn't re-fire, but keep the deeplink personalization
    var q = new URLSearchParams(window.location.search);
    q.delete('order');
    q.delete('session_id');
    var qs = q.toString();
    history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + '#enhance');
  }

  // ============================================
  // Interactive property map (illustration + hotspot overlay)
  // ============================================
  var MAP_W = 1190, MAP_H = 841; // property-map.jpg dimensions = overlay viewBox

  // Dim the rest of the map so the highlighted cabin + lot pop
  function addMapDimmer(svg, holes) {
    var NS = 'http://www.w3.org/2000/svg';
    var defs = document.createElementNS(NS, 'defs');
    var mask = document.createElementNS(NS, 'mask');
    mask.setAttribute('id', 'dim-mask');
    var base = document.createElementNS(NS, 'rect');
    base.setAttribute('x', 0); base.setAttribute('y', 0);
    base.setAttribute('width', MAP_W); base.setAttribute('height', MAP_H);
    base.setAttribute('fill', 'white');
    mask.appendChild(base);
    holes.forEach(function (b) {
      var hole = document.createElementNS(NS, 'rect');
      hole.setAttribute('x', b.x - 8); hole.setAttribute('y', b.y - 8);
      hole.setAttribute('width', b.width + 16); hole.setAttribute('height', b.height + 16);
      hole.setAttribute('rx', 16);
      hole.setAttribute('fill', 'black');
      mask.appendChild(hole);
    });
    defs.appendChild(mask);
    var dim = document.createElementNS(NS, 'rect');
    dim.setAttribute('class', 'map-dim');
    dim.setAttribute('x', 0); dim.setAttribute('y', 0);
    dim.setAttribute('width', MAP_W); dim.setAttribute('height', MAP_H);
    dim.setAttribute('fill', '#2A2622');
    dim.setAttribute('fill-opacity', '0.34');
    dim.setAttribute('mask', 'url(#dim-mask)');
    svg.insertBefore(defs, svg.firstChild);
    svg.insertBefore(dim, defs.nextSibling);
  }

  // Personalized "Your Cabin" card below the map
  function setupYourCabin() {
    var box = document.getElementById('yourcabin');
    var info = CABIN_INFO[link.cabinSlug];
    if (!box || !info) return;
    var img = document.getElementById('yc-img');
    img.src = encodeURI(info.img);
    img.alt = link.cabinName;
    document.getElementById('yc-name').textContent = link.cabinName;
    document.getElementById('yc-desc').textContent = info.desc;
    var lot = LOTS[PARKING[link.cabinSlug]];
    var park = document.getElementById('yc-park');
    if (lot) park.innerHTML = '<b>Park:</b> ' + lot.name + ', ' + lot.how + '.';
    else park.remove();
    document.getElementById('yc-find').innerHTML = '<b>Find it:</b> ' + info.find;
    document.getElementById('yc-link').href = info.page;
    box.hidden = false;
  }

  // HTML pill anchored to a hotspot's top edge — stays readable at any map size
  function mapPill(wrap, bbox, label) {
    var d = document.createElement('div');
    d.className = 'map-pill';
    d.textContent = label;
    var x = (bbox.x + bbox.width / 2) / MAP_W * 100;
    var y = bbox.y / MAP_H * 100;
    d.style.left = Math.min(Math.max(x, 8), 92) + '%';
    d.style.top = Math.max(y, 4) + '%';
    wrap.appendChild(d);
  }

  function setupMap() {
    var svg = document.getElementById('grounds-map');
    if (!svg) return;
    var wrap = svg.closest('.propmap-wrap');
    var tip = document.getElementById('map-tip');
    var hideTimer;

    function showTip(spot, clientX, clientY) {
      tip.innerHTML = '<b>' + esc(spot.getAttribute('data-name')) + '</b>' +
        (spot.getAttribute('data-sub') ? '<span>' + esc(spot.getAttribute('data-sub')) + '</span>' : '');
      var r = wrap.getBoundingClientRect();
      var x = Math.min(Math.max(clientX - r.left, 90), r.width - 90);
      var y = Math.max(clientY - r.top, 44);
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
      tip.classList.add('show');
    }
    function hideTip() { tip.classList.remove('show'); }

    svg.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var spot = e.target.closest('.mapspot');
      if (spot) showTip(spot, e.clientX, e.clientY - 14);
      else hideTip();
    });
    svg.addEventListener('pointerleave', hideTip);
    svg.addEventListener('click', function (e) {
      var spot = e.target.closest('.mapspot');
      if (!spot) { hideTip(); return; }
      track('map_spot_click', { spot: spot.getAttribute('data-name') || spot.getAttribute('data-id') || '' });
      var b = spot.getBoundingClientRect();
      showTip(spot, b.left + b.width / 2, b.top - 4);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hideTip, 2800);
    });

    // Deeplink personalization: glow the guest's cabin, flag their lot
    if (!link.cabinSlug) return;
    var caption = document.getElementById('map-caption');
    var holes = [];
    var spot = svg.querySelector('.mapspot[data-id="' + link.cabinSlug + '"]');
    if (spot) {
      spot.classList.add('you');
      var cb = spot.querySelector('.hs').getBBox();
      holes.push(cb);
      mapPill(wrap, cb, 'YOUR CABIN');
    }
    var lotId = PARKING[link.cabinSlug];
    if (lotId) {
      var lot = svg.querySelector('#lot-' + lotId);
      if (lot) {
        lot.classList.add('yourlot');
        var lb = lot.querySelector('.hs').getBBox();
        holes.push(lb);
        mapPill(wrap, lb, 'PARK HERE');
      }
      if (caption) {
        caption.innerHTML = 'You’re staying in <b>' + esc(link.cabinName) + '</b> — it’s glowing gold above. Park in the <b>' +
          LOTS[lotId].name + '</b>, ' + LOTS[lotId].how + '.';
      }
    } else if (caption && spot) {
      caption.innerHTML = '<b>' + esc(link.cabinName) + '</b> is glowing gold above.';
    }
    if (holes.length) addMapDimmer(svg, holes);
  }

  // ============================================
  // Already-ordered panel — paid orders for this stay, from Stripe
  // ============================================
  function setupOrderHistory() {
    var box = document.getElementById('order-history');
    if (!box) return;

    function orderKey(o) { return o.deliveryDate + '|' + o.summary + '|' + o.amount; }

    function render(list) {
      if (list.some(function (o) { return (o.summary || '').indexOf('Early Check-In') !== -1; })) {
        earlyPurchased = true;
        updateEarlyBanner();
      }
      if (!list.length) { box.innerHTML = ''; return; }
      var rows = list.map(function (o) {
        var d = parseDateStr(o.deliveryDate);
        var label = d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Your stay';
        return '<p><b>' + esc(label) + ':</b> ' + esc(o.summary) +
          (o.amount ? ' <span class="amt">' + formatPrice(o.amount) + '</span>' : '') + '</p>';
      }).join('');
      box.innerHTML = '<div class="order-history"><span class="tag">Already ordered for your stay</span>' + rows +
        '<p class="oh-note">Everything will be ready on the day shown. Need to add or change anything? Call us at <a href="tel:+13036741901" style="color:var(--gold)">' + PHONE_DISPLAY + '</a> or email <a href="mailto:info@thecabinsatcountryroad.com" style="color:var(--gold)">info@thecabinsatcountryroad.com</a>.</p></div>';
    }

    // Same-device history first (instant), filtered to this stay when we know it
    var local = [];
    try { local = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch (e) { /* ignore */ }
    var checkinStr = link.checkin ? toDateStr(link.checkin) : '';
    local = local.filter(function (o) {
      if (checkinStr && o.checkin) return o.checkin === checkinStr;
      // without stay dates, only show recent orders (last 30 days)
      return (Date.now() / 1000) - (o.placed || 0) < 30 * 86400;
    });
    render(local);

    // Then the authoritative list from Stripe (any device with the same link)
    if (!link.cabinName || !checkinStr || CHECKOUT_ENDPOINT.indexOf('CHANGE-ME') !== -1) return;
    fetch(CHECKOUT_ENDPOINT + '/orders?cabin=' + encodeURIComponent(link.cabinName) + '&checkin=' + encodeURIComponent(checkinStr))
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.orders)) return;
        var merged = data.orders.slice();
        var seen = {};
        merged.forEach(function (o) { seen[orderKey(o)] = true; });
        local.forEach(function (o) { if (!seen[orderKey(o)]) merged.push(o); });
        merged.sort(function (a, b) { return a.deliveryDate < b.deliveryDate ? -1 : 1; });
        render(merged);
      })
      .catch(function () { /* local render already shown */ });
  }

  // ============================================
  // Scrollspy — highlight the section you're in
  // ============================================
  function setupScrollSpy() {
    var ids = ['arrive', 'enhance', 'settle', 'explore', 'depart'];
    var links = {};
    document.querySelectorAll('.dock a[href^="#"]').forEach(function (a) {
      links[a.getAttribute('href').slice(1)] = a;
    });
    var lastCurrent = null;
    var seenSections = {};
    var ticking = false;

    function update() {
      ticking = false;
      var pos = window.scrollY + 130; // sticky topbar + breathing room
      var current = ids[0];
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.offsetTop <= pos) current = id;
      });
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 60) {
        current = ids[ids.length - 1];
      }
      if (current === lastCurrent) return;
      lastCurrent = current;
      // First time each section scrolls into view — how far guests read
      if (links[current] && !seenSections[current]) {
        seenSections[current] = true;
        track('section_view', { section: current });
      }
      ids.forEach(function (id) {
        if (links[id]) links[id].classList.toggle('active', id === current);
      });
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  // ============================================
  // Tabs (this page doesn't load main.js)
  // ============================================
  function setupTabs() {
    // enhancements.html already binds tabs via main.js — don't double-bind
    if (document.querySelector('script[src*="js/main.js"]')) return;
    var tabs = document.querySelectorAll('.enhancement-tab');
    var panels = document.querySelectorAll('.enhancement-panel');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = this.getAttribute('data-tab');
        track('enhancement_tab_click', { tab: target, label: this.textContent.trim(), page: 'guidebook' });
        tabs.forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        panels.forEach(function (panel) {
          panel.style.display = panel.getAttribute('data-panel') === target ? 'grid' : 'none';
        });
      });
    });
  }

  // ============================================
  // Contact & outbound link tracking (enhancements.html gets the contact
  // events from main.js — same event/param names, so don't double-bind)
  // ============================================
  function setupLinkTracking() {
    if (document.querySelector('script[src*="js/main.js"]')) return;
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var label = (a.textContent || '').trim().slice(0, 100);
      if (href.indexOf('book.thecabinsatcountryroad.com') !== -1 || href.indexOf('via.eviivo.com') !== -1) {
        track('book_now_click', { link_url: href, link_text: label, location: 'guidebook' });
      } else if (href.indexOf('tel:') === 0) {
        track('phone_click', { number: href.replace('tel:', ''), location: 'guidebook' });
      } else if (href.indexOf('mailto:') === 0) {
        track('email_click', { address: href.replace('mailto:', '').split('?')[0], location: 'guidebook' });
      } else if (/^https?:\/\//.test(href) && href.indexOf('thecabinsatcountryroad.com') === -1) {
        // Which local recommendations (restaurants, trails, Red Rocks…) guests open
        track('outbound_click', { link_url: href.slice(0, 100), link_text: label });
      }
    });
  }

  // ============================================
  // Init
  // ============================================
  document.addEventListener('DOMContentLoaded', function () {
    personalize();
    setupMap();
    setupYourCabin();
    setupScrollSpy();
    setupTabs();
    setupLinkTracking();
    handleOrderReturn();
    setupOrderHistory();
    buildCartUI();

    window.CRCEnhancements.init({ buyable: true }).then(function (data) {
      data.categories.forEach(function (cat) {
        cat.items.forEach(function (item) { itemsById[item.id] = item; });
      });
      renderCart();

      document.addEventListener('click', function (e) {
        var btn = e.target.closest('.enh-add');
        if (!btn) return;
        var id = btn.getAttribute('data-id');
        if (!itemsById[id] || itemsById[id].price == null) return;
        cart[id] = Math.min((cart[id] || 0) + 1, itemsById[id].max || 10);
        saveCart(cart);
        renderCart();
        track('add_to_cart', {
          currency: 'USD',
          value: itemsById[id].price / 100,
          items: [{ item_id: id, item_name: itemsById[id].name, price: itemsById[id].price / 100, quantity: 1 }],
          source: btn.classList.contains('early-banner') ? 'early-checkin-banner' : 'catalog'
        });
        if (!btn.classList.contains('early-banner')) {
          var original = btn.textContent;
          btn.textContent = 'Added ✓';
          btn.classList.add('added');
          setTimeout(function () {
            btn.textContent = original;
            btn.classList.remove('added');
          }, 1200);
        }
      });
    }).catch(function () {
      var panel = document.querySelector('.enhancement-panel[data-panel="wine"]');
      if (panel) panel.innerHTML = '<p class="enh-loading">We couldn’t load our offerings just now — please call us at ' + PHONE_DISPLAY + ' to arrange enhancements.</p>';
    });
  });
})();
