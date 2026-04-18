/* HartAI | main.js */

// ── Dynamic year in footer ──
document.getElementById('year').textContent = new Date().getFullYear();

// ── Contact Modal ──
const modal      = document.getElementById('contact-modal');
const modalClose = document.getElementById('modal-close');

function openModal() {
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  modal.querySelector('input').focus();
}
function closeModal() {
  modal.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

modalClose?.addEventListener('click', closeModal);
modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal(); });

// Intercept ALL links pointing to #contact or #scan
document.querySelectorAll('a[href="#contact"], a[href="#scan"]').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    openModal();
  });
});

// Modal form submission
const modalForm = document.getElementById('modal-contact-form');
modalForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = modalForm.querySelector('button[type="submit"]');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span>Verzenden...</span>';
  const data = Object.fromEntries(new FormData(modalForm));
  try {
    const res = await fetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      modalForm.innerHTML = `
        <div style="text-align:center;padding:32px 0;">
          <div style="font-size:3rem;margin-bottom:16px">✅</div>
          <h3 style="margin-bottom:8px">Bedankt!</h3>
          <p>We nemen binnen 1 werkdag contact op.</p>
        </div>`;
    } else { throw new Error(); }
  } catch {
    btn.disabled = false;
    btn.innerHTML = orig;
    let err = modalForm.querySelector('.form-error');
    if (!err) { err = document.createElement('p'); err.className = 'form-error'; err.style.cssText = 'color:#E53E3E;font-size:.85rem;text-align:center;'; modalForm.appendChild(err); }
    err.textContent = 'Er ging iets mis. Probeer het opnieuw of mail ons op info@hartai.nl';
  }
});

// ── Nav: sticky + mobile toggle ──
const header = document.getElementById('nav');
const toggle = document.getElementById('nav-toggle');
const menu   = document.getElementById('nav-menu');

window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

toggle?.addEventListener('click', () => {
  const open = menu.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
});

// Close mobile nav on link click
menu?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  });
});

// ── Smooth scroll for anchor links ──
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 80;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ── Scroll-reveal animation ──
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll(
  '.pain-card, .service-card, .testimonial-card, .process-step, .faq-item, .result-number-item'
).forEach(el => {
  el.setAttribute('data-animate', '');
  observer.observe(el);
});

// ── Contact form submission ──
const form = document.getElementById('contact-form');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = '<span>Verzenden...</span>';

  // Build form data
  const data = Object.fromEntries(new FormData(form));

  try {
    const res = await fetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      form.innerHTML = `
        <div style="text-align:center;padding:48px 24px;">
          <div style="font-size:3rem;margin-bottom:16px">✅</div>
          <h3 style="color:#fff;margin-bottom:12px">Bedankt voor uw aanvraag!</h3>
          <p>We nemen binnen 1 werkdag contact met u op om een afspraak in te plannen.</p>
        </div>
      `;
    } else {
      throw new Error('Server error');
    }
  } catch {
    btn.disabled = false;
    btn.innerHTML = originalText;
    showFormError('Er ging iets mis. Probeer het opnieuw of mail ons op info@hartai.nl');
  }
});

function showFormError(msg) {
  let errEl = form.querySelector('.form-error');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.className = 'form-error';
    errEl.style.cssText = 'color:#ff5fa0;font-size:.88rem;text-align:center;';
    form.appendChild(errEl);
  }
  errEl.textContent = msg;
}

// ── Cookie banner ──
const cookieBanner  = document.getElementById('cookie-banner');
const cookieAccept  = document.getElementById('cookie-accept');
const cookieDecline = document.getElementById('cookie-decline');

if (!localStorage.getItem('cookieConsent')) {
  setTimeout(() => cookieBanner?.removeAttribute('hidden'), 1500);
}

cookieAccept?.addEventListener('click', () => {
  localStorage.setItem('cookieConsent', 'accepted');
  cookieBanner.setAttribute('hidden', '');
});

cookieDecline?.addEventListener('click', () => {
  localStorage.setItem('cookieConsent', 'declined');
  cookieBanner.setAttribute('hidden', '');
});

// ── Trap focus inside open mobile nav (a11y) ──
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && menu.classList.contains('is-open')) {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }
});
