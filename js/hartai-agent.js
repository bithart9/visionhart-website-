/* HartAI Chat Agent Widget */
(function () {
  'use strict';

  const ENDPOINT = '/api/chat';
  const PROACTIVE_DELAY = 9000;

  const QUICK_ACTIONS = [
    { icon: '🧮', label: 'Bereken mijn ROI', msg: 'Ik wil weten wat AI mij oplevert. Bereken mijn ROI.' },
    { icon: '🔍', label: 'Welke AI past bij mij?', msg: 'Welke AI-oplossing past het beste bij mijn bedrijf?' },
    { icon: '💬', label: 'Wat kost dit?', msg: 'Wat zijn de kosten en wat levert het op?' },
    { icon: '📅', label: 'Plan een demo', msg: 'Ik wil een gratis kennismakingsgesprek plannen.' },
    { icon: '🔌', label: 'Mijn software?', msg: 'Werkt jullie oplossing met mijn bestaande software?' },
    { icon: '❓', label: 'Stel een vraag', msg: 'Ik heb een vraag over HartAI.' },
  ];

  const WELCOME = 'Hoi 👋 Ik ben de AI Specialist van HartAI. Ik help je ontdekken hoeveel tijd en geld AI voor jouw bedrijf kan besparen.\n\nWaar kan ik je mee helpen?';

  let isOpen = false;
  let isStreaming = false;
  let history = [];
  let proactiveFired = false;

  // ── Build HTML ──────────────────────────────────────────────────────────────
  function build() {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <!-- Trigger -->
      <button class="ha-trigger" id="ha-trigger" aria-label="Chat met HartAI AI Specialist" aria-expanded="false">
        <div class="ha-trigger-avatar" aria-hidden="true">🤖</div>
        <div class="ha-trigger-text">
          <span class="ha-trigger-label">AI Specialist</span>
          <span class="ha-trigger-sub">Direct beschikbaar</span>
        </div>
        <div class="ha-trigger-dot" aria-hidden="true"></div>
        <span class="ha-badge" id="ha-badge" hidden aria-live="polite">1</span>
      </button>

      <!-- Panel -->
      <div class="ha-panel" id="ha-panel" role="dialog" aria-label="HartAI Chat" aria-modal="true" hidden>

        <div class="ha-header">
          <div class="ha-header-avatar" aria-hidden="true">🤖</div>
          <div class="ha-header-info">
            <p class="ha-header-name">HartAI AI Specialist</p>
            <p class="ha-header-status">
              <span class="ha-header-status-dot" aria-hidden="true"></span>
              AI Specialist Online
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
          <button class="ha-send" id="ha-send" aria-label="Verstuur bericht">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>

        <div class="ha-branding">Powered by <a href="https://www.hartai.nl" target="_blank" rel="noopener">HartAI</a></div>
      </div>
    `;
    document.body.appendChild(wrap.firstElementChild); // trigger
    document.body.appendChild(wrap.lastElementChild);  // panel

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

  // ── Open / Close ────────────────────────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    const panel = document.getElementById('ha-panel');
    const trigger = document.getElementById('ha-trigger');
    panel.removeAttribute('hidden');
    requestAnimationFrame(() => panel.classList.add('is-open'));
    trigger.setAttribute('aria-expanded', 'true');
    document.getElementById('ha-badge').setAttribute('hidden', '');
    proactiveFired = true;

    if (history.length === 0) {
      appendAgentMessage(WELCOME);
    }

    setTimeout(() => {
      const input = document.getElementById('ha-input');
      if (input) input.focus();
    }, 250);
  }

  function closePanel() {
    isOpen = false;
    const panel = document.getElementById('ha-panel');
    panel.classList.remove('is-open');
    document.getElementById('ha-trigger').setAttribute('aria-expanded', 'false');
    setTimeout(() => panel.setAttribute('hidden', ''), 280);
  }

  // ── Messages ────────────────────────────────────────────────────────────────
  function appendAgentMessage(text) {
    const el = createBubble('agent', text);
    document.getElementById('ha-messages').appendChild(el);
    scrollBottom();

    history.push({ role: 'assistant', content: text });

    // Hide quick actions after first real exchange
    if (history.filter(m => m.role === 'assistant').length >= 2) {
      document.getElementById('ha-quick-actions').setAttribute('hidden', '');
    }
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
      av.setAttribute('aria-hidden', 'true');
      av.textContent = '🤖';
      wrap.appendChild(av);
    }

    const bubble = document.createElement('div');
    bubble.className = 'ha-msg-bubble';
    bubble.innerHTML = renderMarkdown(text);
    wrap.appendChild(bubble);
    return wrap;
  }

  function showTyping() {
    const msgEl = document.getElementById('ha-messages');
    const el = document.createElement('div');
    el.className = 'ha-msg ha-msg--agent';
    el.id = 'ha-typing-indicator';

    const av = document.createElement('div');
    av.className = 'ha-msg-avatar';
    av.setAttribute('aria-hidden', 'true');
    av.textContent = '🤖';

    const dots = document.createElement('div');
    dots.className = 'ha-typing';
    dots.setAttribute('aria-label', 'Aan het typen');
    dots.innerHTML = '<span></span><span></span><span></span>';

    el.appendChild(av);
    el.appendChild(dots);
    msgEl.appendChild(el);
    scrollBottom();
    return el;
  }

  function removeTyping() {
    const el = document.getElementById('ha-typing-indicator');
    if (el) el.remove();
  }

  // ── Streaming Agent Response ─────────────────────────────────────────────────
  async function streamAgentResponse() {
    isStreaming = true;
    setSendState(true);

    const typingEl = showTyping();
    let streamBubble = null;
    let accumulated = '';

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      removeTyping();

      // Create streaming bubble
      const wrap = document.createElement('div');
      wrap.className = 'ha-msg ha-msg--agent';
      const av = document.createElement('div');
      av.className = 'ha-msg-avatar';
      av.setAttribute('aria-hidden', 'true');
      av.textContent = '🤖';
      const bubble = document.createElement('div');
      bubble.className = 'ha-msg-bubble';
      bubble.innerHTML = '<span class="ha-cursor"></span>';
      wrap.appendChild(av);
      wrap.appendChild(bubble);
      document.getElementById('ha-messages').appendChild(wrap);
      streamBubble = bubble;
      scrollBottom();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              accumulated += parsed.delta.text;
              streamBubble.innerHTML = renderMarkdown(accumulated) + '<span class="ha-cursor" aria-hidden="true"></span>';
              scrollBottom();
            }
          } catch {}
        }
      }

      // Finalise bubble (remove cursor)
      if (streamBubble) {
        streamBubble.innerHTML = renderMarkdown(accumulated);
      }

      history.push({ role: 'assistant', content: accumulated });

      if (history.filter(m => m.role === 'assistant').length >= 2) {
        document.getElementById('ha-quick-actions').setAttribute('hidden', '');
      }

    } catch (err) {
      removeTyping();
      if (streamBubble) {
        streamBubble.innerHTML = renderMarkdown(accumulated || 'Er ging iets mis. Probeer het opnieuw of stuur ons een e-mail op **contact@hartai.nl**.');
      } else {
        appendAgentMessage('Er ging iets mis. Probeer het opnieuw of stuur ons een e-mail op **contact@hartai.nl**.');
      }
    }

    isStreaming = false;
    setSendState(false);
    scrollBottom();
  }

  // ── Send Message ─────────────────────────────────────────────────────────────
  function sendMessage(text) {
    const msg = (text || document.getElementById('ha-input').value).trim();
    if (!msg || isStreaming) return;

    document.getElementById('ha-input').value = '';
    autoResizeInput();

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

  function autoResizeInput() {
    const input = document.getElementById('ha-input');
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  }

  function renderMarkdown(text) {
    if (!text) return '';
    return text
      // Escape HTML entities first (security)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Bold **text**
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Line breaks
      .replace(/\n/g, '<br>');
  }

  // ── Proactive Engagement ─────────────────────────────────────────────────────
  function scheduleProactive() {
    setTimeout(() => {
      if (!isOpen && !proactiveFired) {
        proactiveFired = true;
        const badge = document.getElementById('ha-badge');
        if (badge) badge.removeAttribute('hidden');
      }
    }, PROACTIVE_DELAY);
  }

  // ── Event Listeners ──────────────────────────────────────────────────────────
  function attachListeners() {
    document.getElementById('ha-trigger').addEventListener('click', () => {
      isOpen ? closePanel() : openPanel();
    });

    document.getElementById('ha-close').addEventListener('click', closePanel);

    document.getElementById('ha-panel').addEventListener('click', e => {
      if (e.target.id === 'ha-panel') closePanel();
    });

    const input = document.getElementById('ha-input');
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    input.addEventListener('input', autoResizeInput);

    document.getElementById('ha-send').addEventListener('click', () => sendMessage());

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) closePanel();
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  function run() {
    build();
    attachListeners();
    scheduleProactive();
  }

  init();
})();
