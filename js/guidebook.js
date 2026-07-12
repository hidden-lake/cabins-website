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
    east: { name: 'East Lot', how: 'at the far right of the drive, by the stone wall' }
  };

  // Photo, blurb, and walking directions for the "Your Cabin" section
  var CABIN_INFO = {
    'owls-nest': {
      img: 'images/cabins/owls-nest/IMG_0120.jpeg',
      page: 'cabin-owls-nest.html',
      desc: 'A romantic A-frame with an antler chandelier, a spa bath with soaking tub, and a wrap-around porch right on Bear Creek.',
      find: 'from the West Lot, follow the path down past the private residence — it sits at the far left of the grounds, just up from the flagstone patio (#1 on the map).'
    },
    'huckleberry-house': {
      img: 'images/cabins/huckleberry-house/IMG_0150.jpeg',
      page: 'cabin-huckleberry-house.html',
      desc: 'A creekside cabin for 2–4 guests with spiral-staircase loft bedrooms and private patio dining on Bear Creek.',
      find: 'from the West Lot, head down the path — it’s the large cabin at the center of the grounds, right on the creek (#3 on the map).'
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
      find: 'from the East Lot, it’s the first cabin you’ll reach, just past the stone wall (#10 on the map).'
    },
    'bootlegger-barn': {
      img: 'images/cabins/barn/exterior-winter.jpg',
      page: 'cabin-bootlegger-barn.html',
      desc: 'A restored prohibition-era barn with a whisky-barrel shower, stained glass, and creek views.',
      find: 'from the East Lot, follow the walk down — it’s the middle cabin at the eastern end (#11 on the map).'
    },
    'chicken-coop': {
      img: 'images/cabins/chicken-coop/exterior.jpg',
      page: 'cabin-chicken-coop.html',
      desc: 'A romantic cabin with a gourmet kitchen, stone fireplace, clawfoot tub, and private deck.',
      find: 'from the East Lot, follow the walk down — it’s the far corner cabin nearest the Nature Preserve (#12 on the map).'
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
      .map(function (id) { return { item: itemsById[id], qty: Math.min(cart[id], 10) }; });
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
      if (act === 'inc') cart[id] = Math.min(cart[id] + 1, 10);
      if (act === 'dec') cart[id] = cart[id] - 1;
      if (act === 'rm' || cart[id] <= 0) delete cart[id];
      saveCart(cart);
      renderCart();
    });
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
  }

  function openDrawer() {
    renderCart();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showCartError(msg) {
    var el = overlay.querySelector('.cart-error');
    el.textContent = msg;
    el.classList.add('show');
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

    var delivery = overlay.querySelector('#cart-delivery').value;
    if (!delivery) return showCartError('Please choose a delivery day.');
    if (delivery < minDeliveryStr()) return showCartError('We need 24 hours notice — please pick a later day, or call us at ' + PHONE_DISPLAY + ' and we’ll see what we can do.');

    if (CHECKOUT_ENDPOINT.indexOf('CHANGE-ME') !== -1) {
      return showCartError('Online ordering is almost ready! For now, call us at ' + PHONE_DISPLAY + ' to arrange your enhancements.');
    }

    var payload = {
      items: entries.map(function (e) { return { id: e.item.id, qty: e.qty }; }),
      guest: {
        name: name,
        cabin: cabinName,
        checkin: link.checkin ? toDateStr(link.checkin) : '',
        checkout: link.checkout ? toDateStr(link.checkout) : ''
      },
      deliveryDate: delivery,
      note: overlay.querySelector('#cart-note').value.trim().slice(0, 450)
    };

    var btn = overlay.querySelector('.cart-checkout');
    btn.disabled = true;
    btn.textContent = 'One moment…';

    if (typeof gtag === 'function') {
      gtag('event', 'begin_checkout', { currency: 'USD', value: cartTotal() / 100, items: gaItems() });
    }
    try {
      sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ value: cartTotal() / 100, items: gaItems() }));
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
      if (typeof gtag === 'function') {
        var last = null;
        try { last = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || 'null'); } catch (e) { /* ignore */ }
        if (last) {
          gtag('event', 'purchase', {
            transaction_id: link.sessionId || undefined,
            currency: 'USD',
            value: last.value,
            items: last.items
          });
          try { sessionStorage.removeItem(LAST_ORDER_KEY); } catch (e) { /* ignore */ }
        }
      }
    } else if (link.order === 'cancelled') {
      banner.innerHTML = '<div class="order-banner cancelled">No charge was made — your selections are saved below whenever you’re ready.</div>';
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
  // Scrollspy — highlight the section you're in
  // ============================================
  function setupScrollSpy() {
    var ids = ['arrive', 'enhance', 'settle', 'explore', 'depart'];
    var links = {};
    document.querySelectorAll('.dock a[href^="#"]').forEach(function (a) {
      links[a.getAttribute('href').slice(1)] = a;
    });
    var lastCurrent = null;
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
    var tabs = document.querySelectorAll('.enhancement-tab');
    var panels = document.querySelectorAll('.enhancement-panel');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = this.getAttribute('data-tab');
        if (typeof gtag === 'function') {
          gtag('event', 'enhancement_tab_click', { tab: target, label: this.textContent.trim(), page: 'guidebook' });
        }
        tabs.forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        panels.forEach(function (panel) {
          panel.style.display = panel.getAttribute('data-panel') === target ? 'grid' : 'none';
        });
      });
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
    handleOrderReturn();
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
        cart[id] = Math.min((cart[id] || 0) + 1, 10);
        saveCart(cart);
        renderCart();
        if (typeof gtag === 'function') {
          gtag('event', 'add_to_cart', {
            currency: 'USD',
            value: itemsById[id].price / 100,
            items: [{ item_id: id, item_name: itemsById[id].name, price: itemsById[id].price / 100, quantity: 1 }]
          });
        }
        var original = btn.textContent;
        btn.textContent = 'Added ✓';
        btn.classList.add('added');
        setTimeout(function () {
          btn.textContent = original;
          btn.classList.remove('added');
        }, 1200);
      });
    }).catch(function () {
      var panel = document.querySelector('.enhancement-panel[data-panel="wine"]');
      if (panel) panel.innerHTML = '<p class="enh-loading">We couldn’t load our offerings just now — please call us at ' + PHONE_DISPLAY + ' to arrange enhancements.</p>';
    });
  });
})();
