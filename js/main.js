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
      if (window.scrollY > 100) {
        header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.15)';
        header.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
      } else {
        header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
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
      this.startAutoAdvance();
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
      const featured = this.container.querySelector('.cabin-gallery-featured');
      const thumbstrip = this.container.querySelector('.cabin-gallery-thumbstrip');

      if (featured && this.images[0]) {
        featured.innerHTML = `
          <img src="${this.images[0].src}" alt="${this.images[0].alt || 'Cabin photo'}">
          <span class="photo-count-badge">${this.images.length} Photos</span>
        `;
      }

      if (thumbstrip) {
        thumbstrip.innerHTML = this.images.map((img, index) => `
          <div class="cabin-gallery-thumb ${index === 0 ? 'active' : ''}" data-index="${index}">
            <img src="${img.thumb || img.src}" alt="${img.alt || 'Thumbnail'}">
          </div>
        `).join('');
      }
    }

    bindEvents() {
      const featured = this.container.querySelector('.cabin-gallery-featured');
      const thumbstrip = this.container.querySelector('.cabin-gallery-thumbstrip');

      if (featured) {
        featured.addEventListener('click', () => {
          this.stopAutoAdvance();
          this.openLightbox(this.currentIndex);
        });

        // Pause auto-advance on hover
        featured.addEventListener('mouseenter', () => {
          this.isPaused = true;
        });

        featured.addEventListener('mouseleave', () => {
          this.isPaused = false;
        });
      }

      if (thumbstrip) {
        thumbstrip.addEventListener('click', (e) => {
          const thumb = e.target.closest('.cabin-gallery-thumb');
          if (thumb) {
            const index = parseInt(thumb.getAttribute('data-index'));
            this.setFeatured(index);
            this.resetAutoAdvance(); // Reset timer on manual interaction
          }
        });

        // Pause auto-advance when interacting with thumbnails
        thumbstrip.addEventListener('mouseenter', () => {
          this.isPaused = true;
        });

        thumbstrip.addEventListener('mouseleave', () => {
          this.isPaused = false;
        });
      }
    }

    setFeatured(index, isAutoAdvance = false) {
      this.currentIndex = index;
      const featured = this.container.querySelector('.cabin-gallery-featured img');
      const thumbs = this.container.querySelectorAll('.cabin-gallery-thumb');
      const thumbstrip = this.container.querySelector('.cabin-gallery-thumbstrip');

      if (featured && this.images[index]) {
        featured.style.opacity = '0';
        featured.style.transform = 'scale(1.02)';
        setTimeout(() => {
          featured.src = this.images[index].src;
          featured.alt = this.images[index].alt || 'Cabin photo';
          featured.style.opacity = '1';
          featured.style.transform = 'scale(1)';
        }, 250);
      }

      thumbs.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
      });

      // Scroll active thumbnail into view
      const activeThumb = thumbs[index];
      if (activeThumb && thumbstrip) {
        activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }

    openLightbox(startIndex = 0) {
      this.currentIndex = startIndex;
      this.createLightbox();
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

      img.classList.remove('loaded');

      setTimeout(() => {
        img.src = this.images[this.currentIndex].src;
        img.alt = this.images[this.currentIndex].alt || '';
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

        setTimeout(() => img.classList.add('loaded'), 50);
      }, 200);
    }
  }

  // Initialize all cabin gallery containers
  document.querySelectorAll('.cabin-gallery-container').forEach(container => {
    new ImageGallery(container);
  });

  // ============================================
  // Simple Gallery Item Lightbox (for gallery page)
  // ============================================
  document.querySelectorAll('.gallery-item[data-src]').forEach(item => {
    item.addEventListener('click', function() {
      const src = this.getAttribute('data-src');
      const alt = this.getAttribute('data-alt') || '';

      const lightbox = document.createElement('div');
      lightbox.className = 'lightbox';
      lightbox.innerHTML = `
        <div class="lightbox-content">
          <button class="lightbox-close" aria-label="Close">&times;</button>
          <div class="lightbox-main">
            <div class="lightbox-image-container">
              <img class="lightbox-image" src="${src}" alt="${alt}">
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(lightbox);
      document.body.style.overflow = 'hidden';

      setTimeout(() => {
        lightbox.classList.add('active');
        lightbox.querySelector('.lightbox-image').classList.add('loaded');
      }, 10);

      const closeHandler = () => {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => lightbox.remove(), 400);
      };

      lightbox.querySelector('.lightbox-close').addEventListener('click', closeHandler);
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeHandler();
      });

      const escHandler = (e) => {
        if (e.key === 'Escape') {
          closeHandler();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    });
  });

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

});
