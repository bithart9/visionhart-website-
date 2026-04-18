/* HartAI | cookie-consent.js — GA4 Consent Mode v2 */

const GA4_ID    = 'G-NJ63NG8D2B';
const STORE_KEY = 'hartai_consent_v1';

// ── Helpers ──────────────────────────────────────────
function getConsent() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch { return null; }
}
function saveConsent(prefs) {
  localStorage.setItem(STORE_KEY, JSON.stringify({ ...prefs, ts: Date.now() }));
}

function applyConsent(prefs) {
  if (typeof gtag === 'undefined') return;
  gtag('consent', 'update', {
    analytics_storage:  prefs.analytics ? 'granted' : 'denied',
    ad_storage:         prefs.marketing ? 'granted' : 'denied',
    ad_user_data:       prefs.marketing ? 'granted' : 'denied',
    ad_personalization: prefs.marketing ? 'granted' : 'denied',
  });
  if (prefs.analytics && !document.getElementById('ga4-script')) {
    const s = document.createElement('script');
    s.id    = 'ga4-script';
    s.async = true;
    s.src   = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    document.head.appendChild(s);
    s.onload = () => { gtag('js', new Date()); gtag('config', GA4_ID); };
  }
}

// ── UI ───────────────────────────────────────────────
const $banner = () => document.getElementById('cookie-banner');
const $modal  = () => document.getElementById('cookie-settings-modal');

function showBanner() { $banner()?.removeAttribute('hidden'); }
function hideBanner() { $banner()?.setAttribute('hidden', ''); }
function showModal()  { $modal()?.removeAttribute('hidden'); document.body.style.overflow = 'hidden'; syncToggles(); }
function hideModal()  { $modal()?.setAttribute('hidden', ''); document.body.style.overflow = ''; }

function syncToggles() {
  const p = getConsent();
  const ta = document.getElementById('toggle-analytics');
  const tm = document.getElementById('toggle-marketing');
  if (ta) ta.checked = p ? !!p.analytics : false;
  if (tm) tm.checked = p ? !!p.marketing : false;
}

function acceptAll() {
  const p = { functional: true, analytics: true, marketing: true };
  saveConsent(p); applyConsent(p); hideBanner(); hideModal();
  showToast('Alle cookies geaccepteerd.');
}
function declineAll() {
  const p = { functional: true, analytics: false, marketing: false };
  saveConsent(p); applyConsent(p); hideBanner(); hideModal();
  showToast('Alleen functionele cookies actief.');
}
function saveSettings() {
  const p = {
    functional: true,
    analytics:  !!(document.getElementById('toggle-analytics')?.checked),
    marketing:  !!(document.getElementById('toggle-marketing')?.checked),
  };
  saveConsent(p); applyConsent(p); hideBanner(); hideModal();
  showToast('Voorkeuren opgeslagen.');
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className  = 'cookie-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('cookie-toast--visible'));
  setTimeout(() => { t.classList.remove('cookie-toast--visible'); setTimeout(() => t.remove(), 400); }, 2800);
}

// ── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const existing = getConsent();
  if (existing) {
    applyConsent(existing);
  } else {
    setTimeout(showBanner, 1200);
  }

  // Banner
  document.getElementById('cookie-accept-all')    ?.addEventListener('click', acceptAll);
  document.getElementById('cookie-decline-all')   ?.addEventListener('click', declineAll);
  document.getElementById('cookie-open-settings') ?.addEventListener('click', () => { hideBanner(); showModal(); });

  // Settings modal
  document.getElementById('cookie-settings-close')      ?.addEventListener('click', hideModal);
  document.getElementById('cookie-settings-accept-all') ?.addEventListener('click', acceptAll);
  document.getElementById('cookie-settings-save')       ?.addEventListener('click', saveSettings);
  $modal()?.addEventListener('click', e => { if (e.target === $modal()) hideModal(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$modal()?.hasAttribute('hidden')) hideModal();
  });
});

// Public — roep aan via onclick of footer link
window.openCookieSettings = showModal;
