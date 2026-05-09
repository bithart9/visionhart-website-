function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatTranscript(messages) {
  return messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => `${m.role === 'user' ? '👤 Prospect' : '🤖 Lars'}: ${m.content}`)
    .join('\n\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, prospectEmail, prospectName } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No messages' });
  }
  if (!prospectEmail || !prospectEmail.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const transcript = formatTranscript(messages);
  const name = (prospectName || '').trim() || 'Prospect';

  // ── Step 1: Generate structured summary via Claude ──
  let summaryData = { fase: 'Onbekend', interesse: [], pijnpunten: [], aanbeveling: 'Neem contact op.', samenvatting: '' };

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `Analyseer dit HartAI-salesgesprek en geef een gestructureerd overzicht.
Geef ALLEEN geldige JSON terug, geen uitleg.

GESPREK:
${transcript}

JSON formaat:
{
  "naam": "naam als gevonden, anders leeg",
  "bedrijf": "bedrijfsnaam als gevonden",
  "fase": "Koud | Warm | Heet",
  "interesse": ["max 4 bullets wat ze willen automatiseren"],
  "pijnpunten": ["max 3 bullets hun pijnpunten"],
  "aanbeveling": "concrete vervolgactie voor HartAI (1 zin)",
  "samenvatting": "2 zinnen samenvatting van het gesprek"
}`,
        }],
      }),
    });

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      const raw = aiData?.content?.[0]?.text || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) summaryData = { ...summaryData, ...JSON.parse(jsonMatch[0]) };
    }
  } catch (_) { /* proceed with defaults */ }

  const resolvedName = summaryData.naam || name;
  const now = new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' });

  // ── Step 2: Email to contact@hartai.nl ──
  const faseColor = summaryData.fase === 'Heet' ? '#22c55e' : summaryData.fase === 'Warm' ? '#f59e0b' : '#6b7280';

  const internalHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:#1B365D;padding:28px 32px;">
    <p style="color:#4EC0C4;font-size:12px;font-weight:700;letter-spacing:2px;margin:0 0 6px;">HARTAI CHAT AGENT</p>
    <h1 style="color:#fff;font-size:22px;margin:0;">📋 Nieuw Gesprekssamenvatting</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:8px 0 0;">${esc(now)}</p>
  </td></tr>

  <!-- Prospect info -->
  <tr><td style="padding:28px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
      <tr><td style="padding:20px 24px;">
        <table width="100%" cellpadding="4" cellspacing="0">
          <tr>
            <td style="font-size:12px;color:#6b7280;font-weight:600;width:120px;">NAAM</td>
            <td style="font-size:14px;color:#1a1a2e;font-weight:700;">${esc(resolvedName)}</td>
          </tr>
          ${summaryData.bedrijf ? `<tr><td style="font-size:12px;color:#6b7280;font-weight:600;">BEDRIJF</td><td style="font-size:14px;color:#1a1a2e;">${esc(summaryData.bedrijf)}</td></tr>` : ''}
          <tr>
            <td style="font-size:12px;color:#6b7280;font-weight:600;">EMAIL</td>
            <td style="font-size:14px;color:#1a1a2e;"><a href="mailto:${esc(prospectEmail)}" style="color:#4EC0C4;">${esc(prospectEmail)}</a></td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#6b7280;font-weight:600;">FASE</td>
            <td><span style="background:${faseColor};color:#fff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;">${esc(summaryData.fase)}</span></td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Summary -->
  ${summaryData.samenvatting ? `
  <tr><td style="padding:24px 32px 0;">
    <p style="font-size:13px;color:#6b7280;font-weight:700;letter-spacing:1px;margin:0 0 10px;">SAMENVATTING</p>
    <p style="font-size:15px;color:#1a1a2e;line-height:1.6;margin:0;">${esc(summaryData.samenvatting)}</p>
  </td></tr>` : ''}

  <!-- Interest -->
  ${summaryData.interesse?.length ? `
  <tr><td style="padding:24px 32px 0;">
    <p style="font-size:13px;color:#6b7280;font-weight:700;letter-spacing:1px;margin:0 0 10px;">🎯 INTERESSE</p>
    ${summaryData.interesse.map(i => `<p style="margin:0 0 6px;font-size:14px;color:#1a1a2e;">• ${esc(i)}</p>`).join('')}
  </td></tr>` : ''}

  <!-- Pain points -->
  ${summaryData.pijnpunten?.length ? `
  <tr><td style="padding:20px 32px 0;">
    <p style="font-size:13px;color:#6b7280;font-weight:700;letter-spacing:1px;margin:0 0 10px;">😓 PIJNPUNTEN</p>
    ${summaryData.pijnpunten.map(p => `<p style="margin:0 0 6px;font-size:14px;color:#1a1a2e;">• ${esc(p)}</p>`).join('')}
  </td></tr>` : ''}

  <!-- Recommendation -->
  <tr><td style="padding:20px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1B365D;border-radius:8px;">
      <tr><td style="padding:18px 22px;">
        <p style="font-size:12px;color:#4EC0C4;font-weight:700;letter-spacing:1px;margin:0 0 6px;">⚡ AANBEVOLEN ACTIE</p>
        <p style="font-size:15px;color:#fff;font-weight:600;margin:0;">${esc(summaryData.aanbeveling)}</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Reply CTA -->
  <tr><td style="padding:24px 32px;">
    <table cellpadding="0" cellspacing="0"><tr><td style="background:#4EC0C4;border-radius:8px;">
      <a href="mailto:${esc(prospectEmail)}?subject=HartAI%20-%20Vervolg%20op%20ons%20gesprek" style="display:block;padding:12px 24px;color:#fff;font-weight:700;font-size:14px;text-decoration:none;">Direct beantwoorden →</a>
    </td></tr></table>
  </td></tr>

  <!-- Transcript -->
  <tr><td style="padding:0 32px 32px;">
    <p style="font-size:13px;color:#6b7280;font-weight:700;letter-spacing:1px;margin:0 0 10px;">📝 VOLLEDIG TRANSCRIPT</p>
    <div style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;padding:16px 20px;font-size:13px;color:#374151;line-height:1.7;white-space:pre-wrap;font-family:monospace;">${esc(transcript)}</div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

  // ── Step 3: Email to prospect ──
  const bullets = [...(summaryData.interesse || []), ...(summaryData.pijnpunten || [])].slice(0, 5);

  const prospectHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <tr><td style="background:linear-gradient(135deg,#1B365D 0%,#243d6b 100%);padding:32px;">
    <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 6px;">${esc(resolvedName)}, hier is jouw samenvatting 📋</h1>
    <p style="color:rgba(255,255,255,0.65);font-size:14px;margin:0;">Gesprek met Lars van HartAI — ${esc(now)}</p>
  </td></tr>

  <tr><td style="padding:32px;">
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">Bedankt voor ons gesprek. Hieronder vind je een overzicht van wat we besproken hebben.</p>

    ${summaryData.samenvatting ? `
    <div style="background:#f0f9fa;border-left:3px solid #4EC0C4;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:15px;color:#1a1a2e;line-height:1.6;margin:0;">${esc(summaryData.samenvatting)}</p>
    </div>` : ''}

    ${bullets.length ? `
    <p style="font-size:13px;color:#6b7280;font-weight:700;letter-spacing:1px;margin:0 0 12px;">WAT WE BESPROKEN HEBBEN</p>
    ${bullets.map(b => `<p style="margin:0 0 8px;font-size:14px;color:#374151;">• ${esc(b)}</p>`).join('')}` : ''}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;background:#1B365D;border-radius:10px;">
      <tr><td style="padding:24px;text-align:center;">
        <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0 0 14px;">Klaar voor de volgende stap?</p>
        <table cellpadding="0" cellspacing="0" align="center"><tr><td style="background:#4EC0C4;border-radius:8px;">
          <a href="https://www.hartai.nl/#contact" style="display:block;padding:13px 28px;color:#fff;font-weight:700;font-size:15px;text-decoration:none;">Plan je gratis gesprek →</a>
        </td></tr></table>
      </td></tr>
    </table>

    <p style="font-size:13px;color:#9ca3af;text-align:center;margin-top:24px;">HartAI B.V. · contact@hartai.nl · hartai.nl</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

  // ── Step 4: Send both emails via Resend ──
  const sends = [
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'HartAI Agent <noreply@hartai.nl>',
        to: ['contact@hartai.nl'],
        subject: `💬 Gesprekssamenvatting — ${resolvedName} [${summaryData.fase}]`,
        html: internalHtml,
      }),
    }),
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Lars van HartAI <noreply@hartai.nl>',
        to: [prospectEmail],
        subject: `${resolvedName}, hier is jouw samenvatting van ons gesprek`,
        html: prospectHtml,
      }),
    }),
  ];

  await Promise.allSettled(sends);

  return res.status(200).json({ ok: true });
}
