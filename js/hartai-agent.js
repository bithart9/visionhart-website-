/* HartAI Chat Agent Widget v2 — Streaming · Sidebar · Cards */
(function () {
  'use strict';

  const ENDPOINT = '/api/chat';
  const SUMMARY_ENDPOINT = '/api/chat-summary';
  const PROACTIVE_DELAY = 9000;

  const AI_ICON_SVG = `<img src="/images/jp-avatar-crop.jpg" alt="JP Hart" style="width:100%;height:100%;object-fit:cover;object-position:center 20%;display:block;">`;
  const AI_ICON_SM  = `<img src="/images/jp-avatar-crop.jpg" alt="JP Hart" style="width:100%;height:100%;object-fit:cover;object-position:center 20%;display:block;">`;

  const QUICK_ACTIONS = [
    { icon: '🧮', label: 'Bereken mijn ROI',      msg: 'Ik wil weten wat AI mij oplevert. Bereken mijn ROI.' },
    { icon: '🔍', label: 'Welke AI past bij mij?', msg: 'Welke AI-oplossing past het beste bij mijn bedrijf?' },
    { icon: '💬', label: 'Wat kost het?',           msg: 'Wat zijn de kosten en wat levert het op?' },
    { icon: '📅', label: 'Plan een gesprek',        msg: 'Ik wil een gratis kennismakingsgesprek plannen.' },
    { icon: '🤖', label: 'Digitale Twin',           msg: 'Vertel me meer over de Digitale Twin Medewerker.' },
    { icon: '🗺️', label: 'Website begeleiding',    msg: 'Ja, geef me een rondleiding door de website. Laat me de belangrijkste onderdelen zien.' },
  ];

  const WELCOME = 'Welkom, ik ben de digitale versie van JP, oprichter van HartAI.\n\nIk help ondernemers ontdekken hoe AI tijd bespaart, processen automatiseert, kosten verlaagt en bedrijven schaalbaar maakt. Stel me gerust al je vragen over AI, digitale medewerkers, automatisering en de toekomst van jouw organisatie.\n\nWaar wil jij vandaag de meeste tijd of kosten besparen?';

  // ── State ────────────────────────────────────────────────────────────────────
  let isOpen = false;
  let isStreaming = false;
  let history = [];
  let proactiveFired = false;
  let welcomeShown = false;
  let summaryShown = false;
  let summarySent = false;
  let summaryAskInjected = false;

  // ── Session (localStorage) ───────────────────────────────────────────────────
  const STORAGE_KEY = 'ha_session';
  const SESSION_TTL = 24 * 60 * 60 * 1000;

  function saveSession() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        history, welcomeShown, summaryShown, summarySent,
        html: document.getElementById('ha-messages')?.innerHTML || '',
        ts: Date.now(),
      }));
    } catch (_) {}
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || Date.now() - (d.ts || 0) > SESSION_TTL) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      history        = Array.isArray(d.history) ? d.history : [];
      welcomeShown   = !!d.welcomeShown;
      summaryShown   = !!d.summaryShown;
      summarySent    = !!d.summarySent;
      return d;
    } catch (_) { return null; }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function isSidebarMode() { return window.innerWidth >= 768; }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function scrollBottom() {
    const el = document.getElementById('ha-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function setSendDisabled(v) {
    const btn = document.getElementById('ha-send');
    if (btn) btn.disabled = v;
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }

  // ── Card parsing ─────────────────────────────────────────────────────────────
  function cleanText(text) {
    return text
      .replace(/\[NAV:[^\]]*\]/g, '')
      .replace(/\[SCROLL:[^\]]*\]/g, '')
      .replace(/\[PRICING\]/g, '')
      .replace(/\[MEETING\]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function extractCards(text) {
    const cards = [];
    const navRe = /\[NAV:([^|\]]+)\|([^|\]]+)\|([^\]]+)\]/g;
    const scrollRe = /\[SCROLL:([^|\]]+)\|([^\]]+)\]/g;
    let m;
    while ((m = navRe.exec(text)) !== null) {
      cards.push({ type: 'nav', url: m[1].trim(), title: m[2].trim(), desc: m[3].trim() });
    }
    while ((m = scrollRe.exec(text)) !== null) {
      cards.push({ type: 'scroll', selector: m[1].trim(), label: m[2].trim() });
    }
    if (/\[PRICING\]/.test(text)) cards.push({ type: 'pricing' });
    if (/\[MEETING\]/.test(text))  cards.push({ type: 'meeting' });
    return cards;
  }

  function spotlightSection(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    if (window.innerWidth < 768) closePanel();
    const navH = document.querySelector('.nav')?.offsetHeight || 72;
    const top = el.getBoundingClientRect().top + window.scrollY - navH - 16;
    setTimeout(() => window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' }), window.innerWidth < 768 ? 360 : 0);
    el.classList.add('ha-spotlight');
    setTimeout(() => el.classList.remove('ha-spotlight'), 5000);
  }

  function buildCardEl(card) {
    const el = document.createElement('div');

    if (card.type === 'nav') {
      el.className = 'ha-card ha-card--nav';
      el.innerHTML =
        `<div class="ha-card__icon">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
             <path d="M5 12h14M12 6l6 6-6 6" stroke="#4EC0C4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
           </svg>
         </div>
         <div class="ha-card__body">
           <div class="ha-card__title">${esc(card.title)}</div>
           <div class="ha-card__desc">${esc(card.desc)}</div>
         </div>
         <a href="${esc(card.url)}" class="ha-card__btn">Bekijk →</a>`;
    } else if (card.type === 'pricing') {
      el.className = 'ha-card ha-card--pricing';
      el.innerHTML =
        `<div class="ha-card__pricing-head">Onze Tarieven</div>
         <div class="ha-card__pricing-tiers">
           <div class="ha-card__tier">
             <div class="ha-card__tier-name">Starter</div>
             <div class="ha-card__tier-price">€297<span>/mnd</span></div>
             <div class="ha-card__tier-info">1 workflow · 500 gesprekken</div>
           </div>
           <div class="ha-card__tier ha-card__tier--featured">
             <div class="ha-card__tier-badge">Populairst</div>
             <div class="ha-card__tier-name">Professional</div>
             <div class="ha-card__tier-price">€497<span>/mnd</span></div>
             <div class="ha-card__tier-info">3 workflows · Onbeperkt</div>
           </div>
           <div class="ha-card__tier">
             <div class="ha-card__tier-name">Enterprise</div>
             <div class="ha-card__tier-price" style="font-size:12px">Op aanvraag</div>
             <div class="ha-card__tier-info">Volledig maatwerk</div>
           </div>
         </div>
         <a href="/#contact" class="ha-card__cta">Plan gratis gesprek →</a>`;
    } else if (card.type === 'meeting') {
      el.className = 'ha-card ha-card--meeting';
      el.innerHTML =
        `<div class="ha-card__meet-inner">
           <div class="ha-card__meet-icon">📅</div>
           <div class="ha-card__meet-body">
             <div class="ha-card__meet-title">Gratis Gesprek Plannen</div>
             <div class="ha-card__meet-desc">30 min. Geen pitch. Concrete ROI.</div>
           </div>
           <a href="/#contact" class="ha-card__meet-btn">Plan nu →</a>
         </div>`;
    }

    return el;
  }

  function appendCards(cards, afterEl) {
    if (!cards.length || !afterEl) return;
    const visualCards = cards.filter(c => c.type !== 'scroll');
    const scrollCards = cards.filter(c => c.type === 'scroll');
    scrollCards.forEach(c => setTimeout(() => spotlightSection(c.selector), 600));
    if (!visualCards.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'ha-cards';
    visualCards.forEach(c => wrap.appendChild(buildCardEl(c)));
    afterEl.insertAdjacentElement('afterend', wrap);
    scrollBottom();
  }

  // ── Build UI ─────────────────────────────────────────────────────────────────
  function build() {
    // Trigger
    const trigger = document.createElement('button');
    trigger.id = 'ha-trigger';
    trigger.className = 'ha-trigger';
    trigger.setAttribute('aria-label', 'Chat met HartAI Specialist');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = `
      <div class="ha-trigger-icon">${AI_ICON_SVG}</div>
      <div class="ha-trigger-info">
        <span class="ha-trigger-name">Jean-Pierre · HartAI</span>
        <span class="ha-trigger-status">
          <span class="ha-trigger-dot"></span>Direct beschikbaar
        </span>
      </div>
      <span class="ha-badge" id="ha-badge" hidden aria-live="polite">1</span>`;
    document.body.appendChild(trigger);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'ha-panel';
    panel.className = 'ha-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'HartAI Chat');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('hidden', '');
    panel.innerHTML = `
      <div class="ha-header">
        <div class="ha-header-main">
          <div class="ha-header-avatar">${AI_ICON_SVG}</div>
          <div class="ha-header-info">
            <p class="ha-header-name">Jean-Pierre Hart</p>
            <p class="ha-header-role">Oprichter · HartAI</p>
            <p class="ha-header-status">
              <span class="ha-status-live">Online</span>&nbsp;· Digitale Twin
            </p>
          </div>
          <button class="ha-tour-trigger" id="ha-tour-trigger" aria-label="Website begeleiding" title="Website begeleiding">🗺️</button>
          <button class="ha-close" id="ha-close" aria-label="Sluit chat">✕</button>
        </div>
        <div class="ha-header-bar">Amsterdam · AI Automatisering · 147 Klanten geholpen</div>
      </div>
      <div class="ha-messages" id="ha-messages" role="log" aria-live="polite" aria-label="Chatberichten"></div>
      <div class="ha-quick-actions" id="ha-quick-actions" aria-label="Snelle keuzes"></div>
      <div class="ha-input-area">
        <textarea class="ha-input" id="ha-input" placeholder="Stel een vraag…" rows="1" maxlength="1000" aria-label="Typ je bericht"></textarea>
        <button class="ha-send" id="ha-send" aria-label="Verstuur">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div class="ha-summary-bar" id="ha-summary-bar" hidden>
        <button class="ha-summary-btn" id="ha-summary-btn">📧 Ontvang samenvatting per e-mail</button>
      </div>
      <div class="ha-branding">Powered by <a href="https://www.hartai.nl" target="_blank" rel="noopener">HartAI</a></div>`;
    document.body.appendChild(panel);

    // Sidebar class on desktop
    if (isSidebarMode()) panel.classList.add('ha-sidebar');
    window.addEventListener('resize', () => {
      if (isSidebarMode()) panel.classList.add('ha-sidebar');
      else panel.classList.remove('ha-sidebar');
    });

    // Quick actions
    const qa = document.getElementById('ha-quick-actions');
    QUICK_ACTIONS.forEach(({ icon, label, msg }) => {
      const btn = document.createElement('button');
      btn.className = 'ha-chip';
      btn.innerHTML = `<span aria-hidden="true">${icon}</span>${label}`;
      btn.addEventListener('click', () => sendMessage(msg));
      qa.appendChild(btn);
    });
  }

  // ── Tour Offer ───────────────────────────────────────────────────────────────
  function showTourOffer() {
    const msgs = document.getElementById('ha-messages');
    if (!msgs) return;
    const wrap = document.createElement('div');
    wrap.className = 'ha-tour-offer';
    wrap.innerHTML = `
      <p class="ha-tour-offer__text">Wil je dat ik je even rondleid?</p>
      <div class="ha-tour-offer__btns">
        <button class="ha-tour-offer__btn ha-tour-offer__btn--yes">🗺️ Ja, laat me zien</button>
        <button class="ha-tour-offer__btn ha-tour-offer__btn--no">💬 Ik stel liever vragen</button>
      </div>`;
    wrap.querySelector('.ha-tour-offer__btn--yes').addEventListener('click', () => {
      wrap.remove();
      sendMessage('Ja, geef me een rondleiding door de website. Laat me de belangrijkste onderdelen zien.');
    });
    wrap.querySelector('.ha-tour-offer__btn--no').addEventListener('click', () => {
      wrap.remove();
    });
    msgs.appendChild(wrap);
    scrollBottom();
  }

  // ── Open / Close ─────────────────────────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    const panel = document.getElementById('ha-panel');
    panel.removeAttribute('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('is-open')));
    document.getElementById('ha-trigger').setAttribute('aria-expanded', 'true');
    document.getElementById('ha-badge').setAttribute('hidden', '');
    proactiveFired = true;

    if (!welcomeShown) {
      welcomeShown = true;
      const typing = addTyping();
      setTimeout(() => {
        typing.remove();
        addAgentMsg(WELCOME, true);
        document.getElementById('ha-input')?.focus();
        setTimeout(showTourOffer, 1200);
      }, 900);
    } else {
      setTimeout(() => document.getElementById('ha-input')?.focus(), 200);
    }
  }

  function closePanel() {
    isOpen = false;
    const panel = document.getElementById('ha-panel');
    panel.classList.remove('is-open');
    document.getElementById('ha-trigger').setAttribute('aria-expanded', 'false');
    setTimeout(() => panel.setAttribute('hidden', ''), 340);
  }

  // ── Messages ─────────────────────────────────────────────────────────────────
  function addTyping() {
    const msgs = document.getElementById('ha-messages');
    const wrap = document.createElement('div');
    wrap.className = 'ha-msg ha-msg--agent';
    wrap.id = 'ha-typing-el';
    wrap.innerHTML = `<div class="ha-msg-avatar">${AI_ICON_SM}</div>
      <div class="ha-typing" aria-label="Aan het typen"><span></span><span></span><span></span></div>`;
    msgs.appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  function addAgentMsg(text, skipHistory) {
    const msgs = document.getElementById('ha-messages');
    const wrap = document.createElement('div');
    wrap.className = 'ha-msg ha-msg--agent';
    wrap.innerHTML = `<div class="ha-msg-avatar">${AI_ICON_SM}</div>
      <div class="ha-msg-bubble">${renderMarkdown(text)}</div>`;
    msgs.appendChild(wrap);
    scrollBottom();
    if (!skipHistory) history.push({ role: 'assistant', content: text });
    maybeHideQuickActions();
    saveSession();
    return wrap;
  }

  function addUserMsg(text) {
    const msgs = document.getElementById('ha-messages');
    const wrap = document.createElement('div');
    wrap.className = 'ha-msg ha-msg--user';
    wrap.innerHTML = `<div class="ha-msg-bubble">${esc(text).replace(/\n/g, '<br>')}</div>`;
    msgs.appendChild(wrap);
    scrollBottom();
    history.push({ role: 'user', content: text });
    document.getElementById('ha-quick-actions').setAttribute('hidden', '');
    saveSession();
    return wrap;
  }

  function createStreamingBubble() {
    const msgs = document.getElementById('ha-messages');
    const wrap = document.createElement('div');
    wrap.className = 'ha-msg ha-msg--agent';
    wrap.innerHTML = `<div class="ha-msg-avatar">${AI_ICON_SM}</div>
      <div class="ha-msg-bubble" id="ha-stream-bubble"><span class="ha-cursor" aria-hidden="true"></span></div>`;
    msgs.appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  function updateStreamingBubble(wrap, text, streaming) {
    const bubble = wrap.querySelector('.ha-msg-bubble');
    if (!bubble) return;
    bubble.innerHTML = renderMarkdown(text) + (streaming ? '<span class="ha-cursor" aria-hidden="true"></span>' : '');
    scrollBottom();
  }

  function maybeHideQuickActions() {
    if (history.filter(m => m.role === 'assistant').length >= 2) {
      document.getElementById('ha-quick-actions')?.setAttribute('hidden', '');
    }
  }

  // ── Streaming send ───────────────────────────────────────────────────────────
  function sendMessage(text) {
    const msg = (text || document.getElementById('ha-input')?.value || '').trim();
    if (!msg || isStreaming) return;
    const input = document.getElementById('ha-input');
    if (input) { input.value = ''; autoResize(input); }
    addUserMsg(msg);
    doStreamRequest();
  }

  async function doStreamRequest() {
    isStreaming = true;
    setSendDisabled(true);

    const typingEl = addTyping();

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          pageUrl: window.location.pathname,
          pageTitle: document.title,
        }),
      });

      typingEl.remove();

      if (!res.ok || !res.body) {
        addAgentMsg('Er ging iets mis. Probeer het opnieuw of mail via **contact@hartai.nl**.');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let msgEl = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const event = JSON.parse(raw);

            if (event.t !== undefined) {
              fullText += event.t;
              if (!msgEl) msgEl = createStreamingBubble();
              updateStreamingBubble(msgEl, cleanText(fullText), true);

            } else if (event.done) {
              if (msgEl) {
                const visibleText = cleanText(fullText);
                updateStreamingBubble(msgEl, visibleText, false);
                history.push({ role: 'assistant', content: fullText });
                maybeHideQuickActions();
                saveSession();

                const cards = extractCards(fullText);
                appendCards(cards, msgEl);

                await maybeAutoSendSummary();
                maybeInjectSummaryAsk();
              }
            } else if (event.error) {
              typingEl?.remove();
              if (msgEl) updateStreamingBubble(msgEl, 'Er ging iets mis. Probeer het opnieuw.', false);
              else addAgentMsg('Er ging iets mis. Probeer het opnieuw.');
            }
          } catch (_) {}
        }
      }

      // Fallback: stream ended without done event
      if (fullText && msgEl && !history.some(m => m.role === 'assistant' && m.content === fullText)) {
        updateStreamingBubble(msgEl, cleanText(fullText), false);
        history.push({ role: 'assistant', content: fullText });
        saveSession();
        const cards = extractCards(fullText);
        appendCards(cards, msgEl);
      }

    } catch (err) {
      typingEl?.remove();
      addAgentMsg('Er ging iets mis. Probeer het opnieuw of mail via **contact@hartai.nl**.');
    } finally {
      isStreaming = false;
      setSendDisabled(false);
      scrollBottom();
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  function extractEmailFromHistory() {
    const re = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
    for (const msg of history) {
      if (msg.role === 'user') {
        const m = msg.content.match(re);
        if (m) return m[0];
      }
    }
    return null;
  }

  function extractNameFromHistory() {
    for (let i = 0; i < history.length - 1; i++) {
      const cur = history[i];
      const next = history[i + 1];
      if (cur.role === 'assistant' && next.role === 'user') {
        const lower = cur.content.toLowerCase();
        if (lower.includes('naam') || lower.includes('hoe heet') || lower.includes('je naam')) {
          const candidate = next.content.trim();
          if (candidate.length > 1 && candidate.length < 60 && !candidate.includes('@')) {
            return candidate;
          }
        }
      }
    }
    return '';
  }

  async function maybeAutoSendSummary() {
    if (summarySent) return;
    if (history.filter(m => m.role === 'user').length < 3) return;
    const email = extractEmailFromHistory();
    if (!email) return;
    summarySent = true;
    summaryShown = true;
    document.getElementById('ha-summary-bar')?.setAttribute('hidden', '');
    const name = extractNameFromHistory();
    try {
      const r = await fetch(SUMMARY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, prospectEmail: email, prospectName: name }),
      });
      if (r.ok) addAgentMsg(`📧 Ik heb de samenvatting verstuurd naar **${email}**. Check je inbox!`, true);
    } catch (_) {}
  }

  function maybeInjectSummaryAsk(force) {
    if (summaryShown || summarySent || summaryAskInjected) return;
    if (!force && history.filter(m => m.role === 'user').length < 3) return;
    summaryAskInjected = true;
    summaryShown = true;
    document.getElementById('ha-summary-bar')?.setAttribute('hidden', '');

    const msgs = document.getElementById('ha-messages');
    const wrap = document.createElement('div');
    wrap.className = 'ha-msg ha-msg--agent';
    const av = document.createElement('div');
    av.className = 'ha-msg-avatar';
    av.innerHTML = AI_ICON_SM;
    const bubble = document.createElement('div');
    bubble.className = 'ha-msg-bubble ha-summary-form';
    bubble.innerHTML = `
      <p style="margin:0 0 10px;font-size:14px;line-height:1.5;">Trouwens — wil je een samenvatting van ons gesprek per mail? Handig om te bewaren of te delen. Typ je e-mailadres hieronder.</p>
      <input type="email" id="ha-summary-email" placeholder="jouw@email.nl" autocomplete="email" style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.1);border:1px solid rgba(78,192,196,0.4);border-radius:8px;padding:9px 12px;color:#d4dce8;font-size:14px;font-family:inherit;outline:none;" />
      <p id="ha-summary-hint" style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.4);">Druk op Enter of wacht even na het typen</p>`;
    wrap.appendChild(av);
    wrap.appendChild(bubble);
    msgs.appendChild(wrap);
    scrollBottom();
    setTimeout(() => document.getElementById('ha-summary-email')?.focus(), 100);

    async function submitSummaryEmail() {
      const input = document.getElementById('ha-summary-email');
      const email = input?.value?.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        if (input) input.style.borderColor = '#e53e3e';
        return;
      }
      if (summarySent) return;
      summarySent = true;
      bubble.innerHTML = `<p style="margin:0;font-size:14px;">⏳ Even geduld, samenvatting gaat naar <strong>${email}</strong>…</p>`;
      scrollBottom();
      const name = extractNameFromHistory();
      try {
        const r = await fetch(SUMMARY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, prospectEmail: email, prospectName: name }),
        });
        bubble.innerHTML = r.ok
          ? `<p style="margin:0;font-size:14px;">✅ Verstuurd naar <strong>${email}</strong>! Check je inbox. Tot snel 👋</p>`
          : `<p style="margin:0;font-size:14px;color:#f87171;">Er ging iets mis. Mail ons via contact@hartai.nl.</p>`;
      } catch {
        bubble.innerHTML = `<p style="margin:0;font-size:14px;color:#f87171;">Er ging iets mis. Mail ons via contact@hartai.nl.</p>`;
      }
      scrollBottom();
    }

    let autoTimer;
    document.getElementById('ha-summary-email')?.addEventListener('input', () => {
      clearTimeout(autoTimer);
      autoTimer = setTimeout(submitSummaryEmail, 1200);
    });
    document.getElementById('ha-summary-email')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { clearTimeout(autoTimer); submitSummaryEmail(); }
    });
  }

  // ── Listeners ────────────────────────────────────────────────────────────────
  function attachListeners() {
    document.getElementById('ha-trigger').addEventListener('click', () => {
      isOpen ? closePanel() : openPanel();
    });
    document.getElementById('ha-close').addEventListener('click', closePanel);
    document.getElementById('ha-tour-trigger').addEventListener('click', () => {
      sendMessage('Geef me een rondleiding door de website. Laat me stap voor stap de belangrijkste onderdelen zien.');
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) closePanel(); });

    const input = document.getElementById('ha-input');
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    input.addEventListener('input', () => autoResize(input));
    document.getElementById('ha-send').addEventListener('click', () => sendMessage());
    document.getElementById('ha-summary-btn')?.addEventListener('click', () => maybeInjectSummaryAsk(true));
  }

  // ── Proactive badge ───────────────────────────────────────────────────────────
  function scheduleProactive() {
    setTimeout(() => {
      if (!isOpen && !proactiveFired) {
        proactiveFired = true;
        document.getElementById('ha-badge')?.removeAttribute('hidden');
      }
    }, PROACTIVE_DELAY);
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function start() {
    build();
    attachListeners();
    const saved = loadSession();
    if (saved?.html) {
      const msgs = document.getElementById('ha-messages');
      if (msgs) { msgs.innerHTML = saved.html; maybeHideQuickActions(); scrollBottom(); }
    }
    scheduleProactive();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
