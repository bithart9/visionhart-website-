/* HartAI Chat Agent Widget */
(function () {
  'use strict';

  const ENDPOINT = '/api/chat';
  const PROACTIVE_DELAY = 9000;

  // SVG AI chip icon — used for avatar
  const AI_ICON_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="7" y="7" width="10" height="10" rx="1.5" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="2" fill="#fff"/>
    <path d="M7 10H4M7 12H4M7 14H4M17 10H20M17 12H20M17 14H20M10 7V4M12 7V4M14 7V4M10 17V20M12 17V20M14 17V20" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;

  // Small avatar SVG for message bubbles
  const AI_ICON_SM = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="7" y="7" width="10" height="10" rx="1.5" stroke="#fff" stroke-width="1.8"/>
    <circle cx="12" cy="12" r="2" fill="#fff"/>
    <path d="M7 10H4M7 14H4M17 10H20M17 14H20M10 7V4M14 7V4M10 17V20M14 17V20" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;

  const QUICK_ACTIONS = [
    { icon: '🧮', label: 'Bereken mijn ROI',      msg: 'Ik wil weten wat AI mij oplevert. Bereken mijn ROI.' },
    { icon: '🔍', label: 'Welke AI past bij mij?', msg: 'Welke AI-oplossing past het beste bij mijn bedrijf?' },
    { icon: '💬', label: 'Wat kost het?',           msg: 'Wat zijn de kosten en wat levert het op?' },
    { icon: '📅', label: 'Plan een demo',           msg: 'Ik wil een gratis kennismakingsgesprek plannen.' },
    { icon: '🔌', label: 'Mijn software?',          msg: 'Werkt jullie oplossing met mijn bestaande software?' },
    { icon: '❓', label: 'Stel een vraag',          msg: 'Ik heb een vraag over HartAI.' },
  ];

  const WELCOME = 'Hoi 👋 Ik ben de AI Specialist van HartAI. Ik help je direct ontdekken hoeveel tijd en geld AI voor jouw bedrijf kan besparen.\n\nWaar kan ik je mee helpen?';

  let isOpen = false;
  let isStreaming = false;
  let history = [];
  let proactiveFired = false;

  // ── Build ────────────────────────────────────────────────────────────────────
  function build() {
    // Trigger button
    const trigger = document.createElement('button');
    trigger.className = 'ha-trigger';
    trigger.id = 'ha-trigger';
    trigger.setAttribute('aria-label', 'Chat met HartAI AI Specialist');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = `
      <div class="ha-trigger-icon">${AI_ICON_SVG}</div>
      <div class="ha-trigger-info">
        <span class="ha-trigger-name">AI Specialist</span>
        <span class="ha-trigger-status">
          <span class="ha-trigger-dot"></span>Direct beschikbaar
        </span>
      </div>
      <span class="ha-badge" id="ha-badge" hidden aria-live="polite">1</span>`;
    document.body.appendChild(trigger);

    // Panel
    const panel = document.createElement('div');
    panel.className = 'ha-panel';
    panel.id = 'ha-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'HartAI Chat');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('hidden', '');
    panel.innerHTML = `
      <div class="ha-header">
        <div class="ha-header-avatar">${AI_ICON_SVG}</div>
        <div class="ha-header-info">
          <p class="ha-header-name">HartAI AI Specialist</p>
          <p class="ha-header-status">
            <span class="ha-status-live">Live</span>&nbsp;· Altijd beschikbaar
          </p>
        </div>
        <button class="ha-close" id="ha-close" aria-label="Sluit chat">✕</button>
      </div>

      <div class="ha-messages" id="ha-messages" role="log" aria-live="polite" aria-label="Chatberichten"></div>

      <div class="ha-quick-actions" id="ha-quick-actions" aria-label="Snelle keuzes"></div>

      <div class="ha-input-area">
        <textarea
          class="ha-input"
          id="ha-input"
          placeholder="Stel een vraag…"
          rows="1"
          maxlength="1000"
          aria-label="Typ je bericht"
        ></textarea>
        <button class="ha-send" id="ha-send" aria-label="Verstuur">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>

      <div class="ha-branding">Powered by <a href="https://www.hartai.nl" target="_blank" rel="noopener">HartAI</a></div>`;
    document.body.appendChild(panel);

    buildQuickActions();
  }

  function buildQuickActions() {
    const container = document.getElementById('ha-quick-actions');
    QUICK_ACTIONS.forEach(({ icon, label, msg }) => {
      const btn = document.createElement('button');
      btn.className = 'ha-chip';
      btn.innerHTML = `<span aria-hidden="true">${icon}</span>${label}`;
      btn.addEventListener('click', () => sendMessage(msg));
      container.appendChild(btn);
    });
  }

  // ── Open / Close ─────────────────────────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    const panel = document.getElementById('ha-panel');
    const trigger = document.getElementById('ha-trigger');
    panel.removeAttribute('hidden');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => panel.classList.add('is-open'));
    });
    trigger.setAttribute('aria-expanded', 'true');
    document.getElementById('ha-badge').setAttribute('hidden', '');
    proactiveFired = true;

    if (history.length === 0) {
      // Show welcome with typing delay for realism
      const typing = showTypingRaw();
      setTimeout(() => {
        typing.remove();
        appendAgentMessage(WELCOME, true); // welcome is UI-only, not sent to API
        document.getElementById('ha-input')?.focus();
      }, 900);
    } else {
      setTimeout(() => document.getElementById('ha-input')?.focus(), 250);
    }
  }

  function closePanel() {
    isOpen = false;
    const panel = document.getElementById('ha-panel');
    panel.classList.remove('is-open');
    document.getElementById('ha-trigger').setAttribute('aria-expanded', 'false');
    setTimeout(() => panel.setAttribute('hidden', ''), 300);
  }

  // ── Messages ─────────────────────────────────────────────────────────────────
  function appendAgentMessage(text, skipHistory) {
    const el = createBubble('agent', text);
    document.getElementById('ha-messages').appendChild(el);
    scrollBottom();
    if (!skipHistory) history.push({ role: 'assistant', content: text });
    hideQuickActionsIfNeeded();
    return el;
  }

  function appendUserMessage(text) {
    const el = createBubble('user', text);
    document.getElementById('ha-messages').appendChild(el);
    scrollBottom();
    history.push({ role: 'user', content: text });
    document.getElementById('ha-quick-actions').setAttribute('hidden', '');
  }

  function createBubble(type, text) {
    const wrap = document.createElement('div');
    wrap.className = `ha-msg ha-msg--${type}`;

    if (type === 'agent') {
      const av = document.createElement('div');
      av.className = 'ha-msg-avatar';
      av.innerHTML = AI_ICON_SM;
      wrap.appendChild(av);
    }

    const bubble = document.createElement('div');
    bubble.className = 'ha-msg-bubble';
    bubble.innerHTML = renderMarkdown(text);
    wrap.appendChild(bubble);
    return wrap;
  }

  function showTypingRaw() {
    const el = document.createElement('div');
    el.className = 'ha-msg ha-msg--agent';
    el.id = 'ha-typing-indicator';
    const av = document.createElement('div');
    av.className = 'ha-msg-avatar';
    av.innerHTML = AI_ICON_SM;
    const dots = document.createElement('div');
    dots.className = 'ha-typing';
    dots.setAttribute('aria-label', 'Aan het typen');
    dots.innerHTML = '<span></span><span></span><span></span>';
    el.appendChild(av);
    el.appendChild(dots);
    document.getElementById('ha-messages').appendChild(el);
    scrollBottom();
    return el;
  }

  function showTyping() {
    return showTypingRaw();
  }

  function removeTyping() {
    document.getElementById('ha-typing-indicator')?.remove();
  }

  function hideQuickActionsIfNeeded() {
    if (history.filter(m => m.role === 'assistant').length >= 2) {
      document.getElementById('ha-quick-actions').setAttribute('hidden', '');
    }
  }

  // ── Agent Response with typewriter ───────────────────────────────────────────
  async function streamAgentResponse() {
    isStreaming = true;
    setSendState(true);

    showTyping();

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const text = data.text || '...';
      removeTyping();

      // Create bubble and typewrite the text
      const wrap = document.createElement('div');
      wrap.className = 'ha-msg ha-msg--agent';
      const av = document.createElement('div');
      av.className = 'ha-msg-avatar';
      av.innerHTML = AI_ICON_SM;
      const bubble = document.createElement('div');
      bubble.className = 'ha-msg-bubble';
      bubble.innerHTML = '<span class="ha-cursor" aria-hidden="true"></span>';
      wrap.appendChild(av);
      wrap.appendChild(bubble);
      document.getElementById('ha-messages').appendChild(wrap);
      scrollBottom();

      await typewrite(bubble, text);

      history.push({ role: 'assistant', content: text });
      hideQuickActionsIfNeeded();

    } catch (err) {
      removeTyping();
      appendAgentMessage('Er ging iets mis. Probeer het opnieuw of mail ons via **contact@hartai.nl**.');
    }

    isStreaming = false;
    setSendState(false);
    scrollBottom();
  }

  // Typewriter: reveal text char-by-char at natural speed
  function typewrite(el, text) {
    return new Promise(resolve => {
      let i = 0;
      const speed = text.length > 300 ? 8 : text.length > 150 ? 12 : 18; // ms per char

      function tick() {
        i++;
        el.innerHTML = renderMarkdown(text.slice(0, i)) + '<span class="ha-cursor" aria-hidden="true"></span>';
        scrollBottom();
        if (i < text.length) {
          setTimeout(tick, speed);
        } else {
          el.innerHTML = renderMarkdown(text);
          resolve();
        }
      }
      tick();
    });
  }

  // ── Send ─────────────────────────────────────────────────────────────────────
  function sendMessage(text) {
    const msg = (text || document.getElementById('ha-input')?.value || '').trim();
    if (!msg || isStreaming) return;
    const input = document.getElementById('ha-input');
    if (input) { input.value = ''; autoResize(input); }
    appendUserMessage(msg);
    streamAgentResponse();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function setSendState(disabled) {
    const btn = document.getElementById('ha-send');
    if (btn) btn.disabled = disabled;
  }

  function scrollBottom() {
    const el = document.getElementById('ha-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function autoResize(input) {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
  }

  function renderMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  // ── Proactive ────────────────────────────────────────────────────────────────
  function scheduleProactive() {
    setTimeout(() => {
      if (!isOpen && !proactiveFired) {
        proactiveFired = true;
        document.getElementById('ha-badge')?.removeAttribute('hidden');
      }
    }, PROACTIVE_DELAY);
  }

  // ── Listeners ────────────────────────────────────────────────────────────────
  function attachListeners() {
    document.getElementById('ha-trigger').addEventListener('click', () => {
      isOpen ? closePanel() : openPanel();
    });
    document.getElementById('ha-close').addEventListener('click', closePanel);

    const input = document.getElementById('ha-input');
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    input.addEventListener('input', () => autoResize(input));

    document.getElementById('ha-send').addEventListener('click', () => sendMessage());

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) closePanel();
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  function start() {
    build();
    attachListeners();
    scheduleProactive();
  }
})();
