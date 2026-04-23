/**
 * The Cabins at Country Road - Main JavaScript
 * Enhanced with animations and image gallery
 */

document.addEventListener('DOMContentLoaded', function() {

  // ============================================
  // Mobile Navigation
  // ============================================
  const navToggle = document.getElementById('nav-toggle');
  const navMain = document.getElementById('nav-main');

  if (navToggle && navMain) {
    navToggle.addEventListener('click', function() {
      navMain.classList.toggle('active');
      navToggle.classList.toggle('active');
    });

    document.addEventListener('click', function(e) {
      if (!navMain.contains(e.target) && !navToggle.contains(e.target)) {
        navMain.classList.remove('active');
        navToggle.classList.remove('active');
      }
    });
  }

  // Mobile Dropdown Toggle
  const dropdowns = document.querySelectorAll('.dropdown');
  dropdowns.forEach(function(dropdown) {
    const link = dropdown.querySelector('a');
    link.addEventListener('click', function(e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        dropdown.classList.toggle('active');
      }
    });
  });

  // ============================================
  // Scroll Animations
  // ============================================
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const animationObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  // Auto-add animation classes to common elements
  function addAnimationClasses() {
    // Section headers
    document.querySelectorAll('.section-header').forEach(function(el) {
      if (!el.classList.contains('fade-in')) {
        el.classList.add('fade-in');
        animationObserver.observe(el);
      }
    });

    // Cabin grids
    document.querySelectorAll('.cabin-grid').forEach(function(el) {
      if (!el.classList.contains('stagger-children')) {
        el.classList.add('stagger-children');
        animationObserver.observe(el);
      }
    });

    // Gallery grids
    document.querySelectorAll('.gallery-grid').forEach(function(el) {
      if (!el.classList.contains('stagger-children')) {
        el.classList.add('stagger-children');
        animationObserver.observe(el);
      }
    });

    // Feature grids
    document.querySelectorAll('.features-grid').forEach(function(el) {
      if (!el.classList.contains('stagger-children')) {
        el.classList.add('stagger-children');
        animationObserver.observe(el);
      }
    });

    // CTA cards
    document.querySelectorAll('.cta-cards').forEach(function(el) {
      if (!el.classList.contains('stagger-children')) {
        el.classList.add('stagger-children');
        animationObserver.observe(el);
      }
    });

    // Location grids
    document.querySelectorAll('.location-grid').forEach(function(el) {
      if (!el.classList.contains('fade-in-up')) {
        el.classList.add('fade-in-up');
        animationObserver.observe(el);
      }
    });

    // Enhancement grids
    document.querySelectorAll('.enhancement-grid').forEach(function(el) {
      if (!el.classList.contains('stagger-children')) {
        el.classList.add('stagger-children');
        animationObserver.observe(el);
      }
    });

    // Cabin gallery containers
    document.querySelectorAll('.cabin-gallery-container').forEach(function(el) {
      if (!el.classList.contains('fade-in-scale')) {
        el.classList.add('fade-in-scale');
        animationObserver.observe(el);
      }
    });

    // Rates cards
    document.querySelectorAll('.rates-card').forEach(function(el) {
      if (!el.classList.contains('fade-in-up')) {
        el.classList.add('fade-in-up');
        animationObserver.observe(el);
      }
    });
  }

  addAnimationClasses();

  // Observe any elements that already have animation classes
  document.querySelectorAll('.fade-in, .fade-in-up, .fade-in-scale, .stagger-children').forEach(function(el) {
    animationObserver.observe(el);
  });

  // ============================================
  // Parallax & Ken Burns Effect for Hero
  // ============================================
  const heroBackground = document.querySelector('.hero-bg');

  if (heroBackground) {
    // Add Ken Burns effect class
    heroBackground.classList.add('ken-burns');

    // Parallax on scroll
    let ticking = false;

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          const scrolled = window.pageYOffset;
          const hero = document.querySelector('.hero');
          if (hero) {
            const heroHeight = hero.offsetHeight;
            if (scrolled < heroHeight) {
              const parallaxValue = scrolled * 0.4;
              heroBackground.style.transform = `translateY(${parallaxValue}px) scale(1.1)`;
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // ============================================
  // Header Scroll Effect
  // ============================================
  const header = document.querySelector('.header');
  if (header) {
    window.addEventListener('scroll', function() {
      if (header.classList.contains('header-transparent')) {
        // Transparent header (home page) — handled by header-scrolled class
        if (window.scrollY > 80) {
          header.classList.add('header-scrolled');
        } else {
          header.classList.remove('header-scrolled');
        }
      }
    });
  }

  // ============================================
  // FAQ Accordion
  // ============================================
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(function(item) {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', function() {
        faqItems.forEach(function(otherItem) {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
          }
        });
        item.classList.toggle('active');
      });
    }
  });

  // ============================================
  // Enhancement Tabs
  // ============================================
  const tabs = document.querySelectorAll('.enhancement-tab');
  const panels = document.querySelectorAll('.enhancement-panel');

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      const target = this.getAttribute('data-tab');

      if (typeof gtag === 'function') {
        gtag('event', 'enhancement_tab_click', { tab: target, label: this.textContent.trim() });
      }

      tabs.forEach(function(t) {
        t.classList.remove('active');
      });
      this.classList.add('active');

      panels.forEach(function(panel) {
        if (panel.getAttribute('data-panel') === target) {
          panel.style.display = 'grid';
          panel.classList.remove('visible');
          setTimeout(function() {
            panel.classList.add('visible');
          }, 10);
        } else {
          panel.style.display = 'none';
        }
      });
    });
  });

  // ============================================
  // Image Gallery System
  // ============================================
  class ImageGallery {
    constructor(container) {
      this.container = container;
      this.images = JSON.parse(container.getAttribute('data-images') || '[]');
      this.currentIndex = 0;
      this.lightbox = null;
      this.keyHandler = null;
      this.autoAdvanceTimer = null;
      this.autoAdvanceDelay = 5000; // 5 seconds
      this.isPaused = false;

      if (this.images.length > 0) {
        this.init();
      }
    }

    init() {
      this.render();
      this.bindEvents();
    }

    // Auto-advance functionality
    startAutoAdvance() {
      if (this.images.length <= 1) return;

      this.stopAutoAdvance();
      this.autoAdvanceTimer = setInterval(() => {
        if (!this.isPaused && !this.lightbox) {
          this.nextFeatured();
        }
      }, this.autoAdvanceDelay);
    }

    stopAutoAdvance() {
      if (this.autoAdvanceTimer) {
        clearInterval(this.autoAdvanceTimer);
        this.autoAdvanceTimer = null;
      }
    }

    resetAutoAdvance() {
      // Reset timer when user interacts
      this.startAutoAdvance();
    }

    nextFeatured() {
      const nextIndex = (this.currentIndex + 1) % this.images.length;
      this.setFeatured(nextIndex, true); // true = isAutoAdvance
    }

    render() {
      // Replace the entire container content with a mosaic grid
      const images = this.images;
      const count = images.length;

      // Build mosaic: 1 large + up to 4 small in a grid
      const mosaicCount = Math.min(count, 5);
      let mosaicHTML = '<div class="cabin-detail-mosaic">';

      // Main large image
      mosaicHTML += `<div class="detail-mosaic-main" data-index="0">
        <img src="${images[0].src}" alt="${images[0].alt || 'Cabin photo'}">
        <span class="photo-count-badge">${count} Photos</span>
      </div>`;

      // Side images (up to 4)
      if (mosaicCount > 1) {
        mosaicHTML += '<div class="detail-mosaic-side">';
        for (let i = 1; i < mosaicCount; i++) {
          const isLast = (i === mosaicCount - 1 && count > mosaicCount);
          mosaicHTML += `<div class="detail-mosaic-thumb" data-index="${i}">
            <img src="${images[i].src}" alt="${images[i].alt || 'Cabin photo'}">
            ${isLast ? `<div class="mosaic-more">+${count - mosaicCount} more</div>` : ''}
          </div>`;
        }
        mosaicHTML += '</div>';
      }

      mosaicHTML += '</div>';
      this.container.innerHTML = mosaicHTML;
    }

    bindEvents() {
      // Click on any mosaic tile opens lightbox at that index
      this.container.querySelectorAll('[data-index]').forEach(tile => {
        tile.style.cursor = 'pointer';
        tile.addEventListener('click', () => {
          const index = parseInt(tile.getAttribute('data-index'));
          this.stopAutoAdvance();
          this.openLightbox(index);
        });
      });
    }

    preloadImages() {
      // Preload all images in the background
      this.images.forEach(img => {
        const preload = new Image();
        preload.src = img.src;
      });
    }

    preloadAdjacent() {
      // Preload next and previous images
      const next = (this.currentIndex + 1) % this.images.length;
      const prev = (this.currentIndex - 1 + this.images.length) % this.images.length;
      new Image().src = this.images[next].src;
      new Image().src = this.images[prev].src;
    }

    openLightbox(startIndex = 0) {
      this.currentIndex = startIndex;
      this.createLightbox();
      this.preloadImages();
      setTimeout(() => {
        this.lightbox.classList.add('active');
      }, 10);
      document.body.style.overflow = 'hidden';
    }

    closeLightbox() {
      if (this.lightbox) {
        this.lightbox.classList.remove('active');
        document.body.style.overflow = '';
        if (this.keyHandler) {
          document.removeEventListener('keydown', this.keyHandler);
        }
        setTimeout(() => {
          if (this.lightbox && this.lightbox.parentNode) {
            this.lightbox.remove();
          }
          this.lightbox = null;
          // Restart auto-advance when lightbox closes
          this.startAutoAdvance();
        }, 400);
      }
    }

    createLightbox() {
      this.lightbox = document.createElement('div');
      this.lightbox.className = 'lightbox';
      this.lightbox.innerHTML = `
        <div class="lightbox-content">
          <button class="lightbox-close" aria-label="Close gallery">&times;</button>
          <span class="lightbox-counter">${this.currentIndex + 1} / ${this.images.length}</span>

          <div class="lightbox-main">
            <button class="lightbox-nav lightbox-prev" aria-label="Previous image">&#8249;</button>
            <div class="lightbox-image-container">
              <img class="lightbox-image" src="${this.images[this.currentIndex].src}" alt="${this.images[this.currentIndex].alt || ''}">
            </div>
            <button class="lightbox-nav lightbox-next" aria-label="Next image">&#8250;</button>
          </div>

          ${this.images[this.currentIndex].caption ? `<div class="lightbox-caption">${this.images[this.currentIndex].caption}</div>` : ''}

          <div class="lightbox-thumbs">
            ${this.images.map((img, i) => `
              <div class="lightbox-thumb ${i === this.currentIndex ? 'active' : ''}" data-index="${i}">
                <img src="${img.thumb || img.src}" alt="">
              </div>
            `).join('')}
          </div>
        </div>
      `;

      document.body.appendChild(this.lightbox);

      setTimeout(() => {
        this.lightbox.querySelector('.lightbox-image').classList.add('loaded');
      }, 50);

      this.bindLightboxEvents();
    }

    bindLightboxEvents() {
      const close = this.lightbox.querySelector('.lightbox-close');
      const prev = this.lightbox.querySelector('.lightbox-prev');
      const next = this.lightbox.querySelector('.lightbox-next');
      const thumbs = this.lightbox.querySelectorAll('.lightbox-thumb');

      close.addEventListener('click', () => this.closeLightbox());
      prev.addEventListener('click', () => this.prevImage());
      next.addEventListener('click', () => this.nextImage());

      thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
          const index = parseInt(thumb.getAttribute('data-index'));
          this.goToImage(index);
        });
      });

      this.lightbox.addEventListener('click', (e) => {
        if (e.target === this.lightbox || e.target.classList.contains('lightbox-main')) {
          this.closeLightbox();
        }
      });

      this.keyHandler = (e) => {
        if (e.key === 'Escape') this.closeLightbox();
        if (e.key === 'ArrowLeft') this.prevImage();
        if (e.key === 'ArrowRight') this.nextImage();
      };
      document.addEventListener('keydown', this.keyHandler);

      // Touch/swipe support
      let touchStartX = 0;
      this.lightbox.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      this.lightbox.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) this.nextImage();
          else this.prevImage();
        }
      }, { passive: true });
    }

    goToImage(index) {
      this.currentIndex = index;
      this.updateLightboxImage();
    }

    prevImage() {
      this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
      this.updateLightboxImage();
    }

    nextImage() {
      this.currentIndex = (this.currentIndex + 1) % this.images.length;
      this.updateLightboxImage();
    }

    updateLightboxImage() {
      const img = this.lightbox.querySelector('.lightbox-image');
      const counter = this.lightbox.querySelector('.lightbox-counter');
      const caption = this.lightbox.querySelector('.lightbox-caption');
      const thumbs = this.lightbox.querySelectorAll('.lightbox-thumb');

      img.src = this.images[this.currentIndex].src;
      img.alt = this.images[this.currentIndex].alt || '';
      img.classList.add('loaded');
      counter.textContent = `${this.currentIndex + 1} / ${this.images.length}`;

      if (caption) {
        if (this.images[this.currentIndex].caption) {
          caption.textContent = this.images[this.currentIndex].caption;
          caption.style.display = 'block';
        } else {
          caption.style.display = 'none';
        }
      }

      thumbs.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === this.currentIndex);
      });

      const activeThumb = this.lightbox.querySelector('.lightbox-thumb.active');
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }

      this.preloadAdjacent();
    }
  }

  // Initialize all cabin gallery containers
  document.querySelectorAll('.cabin-gallery-container').forEach(container => {
    new ImageGallery(container);
  });

  // ============================================
  // Gallery Page Lightbox with Navigation
  // ============================================
  document.querySelectorAll('.gallery-grid').forEach(grid => {
    const items = Array.from(grid.querySelectorAll('.gallery-item'));
    if (items.length === 0) return;

    items.forEach((item, startIndex) => {
      item.style.cursor = 'pointer';
      item.addEventListener('click', function() {
        let currentIndex = startIndex;

        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
          <div class="lightbox-content">
            <button class="lightbox-close" aria-label="Close">&times;</button>
            <span class="lightbox-counter">${currentIndex + 1} / ${items.length}</span>
            <div class="lightbox-main">
              ${items.length > 1 ? '<button class="lightbox-nav lightbox-prev" aria-label="Previous">&#8249;</button>' : ''}
              <div class="lightbox-image-container">
                <img class="lightbox-image loaded" src="" alt="">
              </div>
              ${items.length > 1 ? '<button class="lightbox-nav lightbox-next" aria-label="Next">&#8250;</button>' : ''}
            </div>
          </div>
        `;

        document.body.appendChild(lightbox);
        document.body.style.overflow = 'hidden';

        const imgEl = lightbox.querySelector('.lightbox-image');
        const counterEl = lightbox.querySelector('.lightbox-counter');

        const updateImage = (index) => {
          currentIndex = index;
          const el = items[index];
          imgEl.src = el.getAttribute('data-src') || el.querySelector('img')?.src || '';
          imgEl.alt = el.getAttribute('data-alt') || el.getAttribute('aria-label') || '';
          if (counterEl) counterEl.textContent = `${index + 1} / ${items.length}`;
        };

        updateImage(startIndex);

        setTimeout(() => lightbox.classList.add('active'), 10);

        const closeHandler = () => {
          lightbox.classList.remove('active');
          document.body.style.overflow = '';
          document.removeEventListener('keydown', keyHandler);
          setTimeout(() => lightbox.remove(), 400);
        };

        const prevImage = () => updateImage((currentIndex - 1 + items.length) % items.length);
        const nextImage = () => updateImage((currentIndex + 1) % items.length);

        lightbox.querySelector('.lightbox-close').addEventListener('click', closeHandler);
        const prevBtn = lightbox.querySelector('.lightbox-prev');
        const nextBtn = lightbox.querySelector('.lightbox-next');
        if (prevBtn) prevBtn.addEventListener('click', prevImage);
        if (nextBtn) nextBtn.addEventListener('click', nextImage);

        lightbox.addEventListener('click', (e) => {
          if (e.target === lightbox || e.target.classList.contains('lightbox-main')) closeHandler();
        });

        const keyHandler = (e) => {
          if (e.key === 'Escape') closeHandler();
          if (e.key === 'ArrowLeft') prevImage();
          if (e.key === 'ArrowRight') nextImage();
        };
        document.addEventListener('keydown', keyHandler);

        // Touch/swipe
        let touchStartX = 0;
        lightbox.addEventListener('touchstart', (e) => {
          touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        lightbox.addEventListener('touchend', (e) => {
          const diff = touchStartX - e.changedTouches[0].screenX;
          if (Math.abs(diff) > 50) {
            if (diff > 0) nextImage();
            else prevImage();
          }
        }, { passive: true });
      });
    });
  });

  // ============================================
  // Testimonial Rotator
  // ============================================
  const rotator = document.getElementById('testimonial-rotator');
  if (rotator) {
    const slides = rotator.querySelectorAll('.testimonial-slide');
    let currentSlide = 0;

    setInterval(() => {
      slides[currentSlide].classList.remove('active');
      currentSlide = (currentSlide + 1) % slides.length;
      slides[currentSlide].classList.add('active');
    }, 6000);
  }

  // ============================================
  // Smooth Scroll
  // ============================================
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href !== '#') {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });

  // ============================================
  // Analytics Event Tracking
  // ============================================
  document.addEventListener('click', function(e) {
    if (typeof gtag !== 'function') return;
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    const label = (link.textContent || '').trim().slice(0, 100);
    const location = link.closest('header') ? 'header'
                   : link.closest('footer') ? 'footer'
                   : 'body';

    if (href.includes('via.eviivo.com')) {
      gtag('event', 'book_now_click', { link_url: href, link_text: label, location: location });
    } else if (href.startsWith('tel:')) {
      gtag('event', 'phone_click', { number: href.replace('tel:', ''), location: location });
    } else if (href.startsWith('mailto:')) {
      gtag('event', 'email_click', { address: href.replace('mailto:', '').split('?')[0], location: location });
    }
  });

});
