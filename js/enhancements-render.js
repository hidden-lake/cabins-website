/**
 * The Cabins at Country Road - Shared enhancements renderer
 *
 * Renders enhancement cards from data/enhancements.json (the single source of
 * truth, also bundled into the checkout worker) into any
 * .enhancement-panel[data-panel] containers on the page.
 *
 * Usage:
 *   CRCEnhancements.init();                  // display-only (enhancements.html)
 *   CRCEnhancements.init({ buyable: true }); // adds "Add to order" buttons (guidebook.html)
 */
(function () {
  'use strict';

  var DATA_URL = 'data/enhancements.json';
  var dataPromise = null;

  function load() {
    if (!dataPromise) {
      dataPromise = fetch(DATA_URL).then(function (res) {
        if (!res.ok) throw new Error('Failed to load enhancements (' + res.status + ')');
        return res.json();
      });
    }
    return dataPromise;
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatPrice(cents) {
    if (cents == null) return 'MP';
    var dollars = cents / 100;
    return '$' + (dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2));
  }

  function priceHTML(item, buyable) {
    if (!buyable) {
      return '<div class="enhancement-price">' + formatPrice(item.price) + '</div>';
    }
    if (item.price == null) {
      return '<div class="enh-buy">' +
        '<span class="enhancement-price">Market Price</span>' +
        '<a class="enh-call" href="tel:+13036741901">Call to arrange</a>' +
        '</div>';
    }
    return '<div class="enh-buy">' +
      '<span class="enhancement-price">' + formatPrice(item.price) + '</span>' +
      '<button type="button" class="enh-add" data-id="' + esc(item.id) + '">Add to order</button>' +
      '</div>';
  }

  function cardHTML(item, buyable) {
    var inner = '<h4>' + esc(item.name) + '</h4>' +
      '<p>' + esc(item.desc) + '</p>' +
      priceHTML(item, buyable);
    if (item.image) {
      return '<div class="enhancement-card" data-item="' + esc(item.id) + '">' +
        '<img src="' + esc(encodeURI(item.image)) + '" alt="' + esc(item.name) + '" class="enhancement-card-img" loading="lazy">' +
        '<div class="enhancement-card-body">' + inner + '</div>' +
        '</div>';
    }
    return '<div class="enhancement-card" data-item="' + esc(item.id) + '">' + inner + '</div>';
  }

  function init(opts) {
    opts = opts || {};
    return load().then(function (data) {
      data.categories.forEach(function (cat) {
        var panel = document.querySelector('.enhancement-panel[data-panel="' + cat.id + '"]');
        if (!panel) return;
        panel.innerHTML = cat.items.map(function (item) {
          return cardHTML(item, !!opts.buyable);
        }).join('');
      });
      return data;
    });
  }

  window.CRCEnhancements = {
    load: load,
    init: init,
    formatPrice: formatPrice,
    esc: esc
  };
})();
