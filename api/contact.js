// Vercel Serverless Function — HartAI contact form → Resend

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, company, email, phone } = req.body || {};

  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Naam en e-mail zijn verplicht.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Ongeldig e-mailadres.' });
  }

  const firstName = escHtml(name.trim().split(' ')[0]);
  const now = new Date().toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam', dateStyle: 'full', timeStyle: 'short'
  });

  // ── Interne notificatie → contact@hartai.nl ──────────────────────────
  const internalHtml = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f7fb;padding:24px 16px;">
      <div style="background:#1B365D;border-radius:12px 12px 0 0;padding:24px 32px;display:flex;align-items:center;gap:16px;">
        <div style="background:#4EC0C4;border-radius:8px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="color:#fff;font-size:1.2rem;font-weight:800;">H</span>
        </div>
        <div>
          <p style="color:rgba(255,255,255,.55);margin:0;font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Nieuw kennismakingsverzoek</p>
          <h1 style="color:#fff;margin:4px 0 0;font-size:1.1rem;font-weight:700;">${escHtml(name.trim())}${company ? ` — ${escHtml(company.trim())}` : ''}</h1>
        </div>
      </div>
      <div style="background:#fff;border-radius:0 0 12px 12px;padding:28px 32px;">
        <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
          <tr><td style="padding:10px 0;color:#687280;width:110px;vertical-align:top;border-bottom:1px solid #E8EAED;">Naam</td><td style="padding:10px 0;color:#1B365D;font-weight:600;border-bottom:1px solid #E8EAED;">${escHtml(name.trim())}</td></tr>
          ${company ? `<tr><td style="padding:10px 0;color:#687280;vertical-align:top;border-bottom:1px solid #E8EAED;">Bedrijf</td><td style="padding:10px 0;color:#1B365D;border-bottom:1px solid #E8EAED;">${escHtml(company.trim())}</td></tr>` : ''}
          <tr><td style="padding:10px 0;color:#687280;vertical-align:top;border-bottom:1px solid #E8EAED;">E-mail</td><td style="padding:10px 0;border-bottom:1px solid #E8EAED;"><a href="mailto:${escHtml(email.trim())}" style="color:#4EC0C4;font-weight:600;">${escHtml(email.trim())}</a></td></tr>
          ${phone ? `<tr><td style="padding:10px 0;color:#687280;vertical-align:top;border-bottom:1px solid #E8EAED;">Telefoon</td><td style="padding:10px 0;border-bottom:1px solid #E8EAED;"><a href="tel:${escHtml(phone)}" style="color:#4EC0C4;font-weight:600;">${escHtml(phone)}</a></td></tr>` : ''}
          <tr><td style="padding:10px 0;color:#687280;vertical-align:top;">Ontvangen</td><td style="padding:10px 0;color:#687280;font-size:.82rem;">${now}</td></tr>
        </table>
        <div style="margin-top:24px;text-align:center;">
          <a href="mailto:${escHtml(email.trim())}" style="display:inline-block;background:#1B365D;color:#fff;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.9rem;">Direct beantwoorden →</a>
        </div>
      </div>
      <p style="text-align:center;color:#9CA3AF;font-size:.72rem;margin-top:16px;">HartAI B.V. · contact@hartai.nl · hartai.nl</p>
    </div>`;

  // ── Bevestigingsmail → klant ─────────────────────────────────────────
  const confirmHtml = `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HartAI — Je aanvraag is ontvangen</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Inter,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:600px;" cellpadding="0" cellspacing="0">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#132847 0%,#1B365D 100%);border-radius:16px 16px 0 0;padding:40px 40px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="background:#4EC0C4;border-radius:10px;width:44px;height:44px;text-align:center;line-height:44px;font-size:1.3rem;font-weight:800;color:#fff;display:inline-block;">H</div>
            <span style="color:#fff;font-size:1.3rem;font-weight:800;letter-spacing:-.02em;vertical-align:middle;margin-left:8px;">HartAI</span>
          </div>
        </td>
        <td align="right">
          <span style="background:rgba(78,192,196,.2);border:1px solid rgba(78,192,196,.4);color:#4EC0C4;font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:5px 12px;border-radius:100px;">Aanvraag ontvangen ✓</span>
        </td>
      </tr>
    </table>
    <h1 style="color:#fff;font-size:1.6rem;font-weight:800;margin:28px 0 10px;line-height:1.2;">${firstName}, je staat op<br>de lijst. 🎯</h1>
    <p style="color:rgba(255,255,255,.7);margin:0;font-size:.95rem;line-height:1.6;">Terwijl je dit leest, behandelen wij jouw aanvraag als prioriteit. Meer dan 150 bedrijven gingen je voor — en zij zijn blij dat ze de stap hebben gezet.</p>
  </td></tr>

  <!-- QUOTE -->
  <tr><td style="background:#4EC0C4;padding:24px 40px;">
    <p style="margin:0;color:#fff;font-size:.95rem;font-style:italic;line-height:1.7;">"De ROI was binnen 3 maanden positief. HartAI heeft ons 15+ uur per week teruggegeven — ik had dit 2 jaar eerder moeten doen."</p>
    <p style="margin:10px 0 0;color:rgba(255,255,255,.8);font-size:.78rem;font-weight:600;">— Mark de Vries, CEO TechConsult Nederland</p>
  </td></tr>

  <!-- BODY -->
  <tr><td style="background:#fff;padding:36px 40px;">

    <p style="color:#2D3748;font-size:.95rem;line-height:1.75;margin:0 0 24px;">Hoi ${firstName},</p>
    <p style="color:#2D3748;font-size:.95rem;line-height:1.75;margin:0 0 28px;">Je hebt net de eerste stap gezet die elk jaar gemiddeld <strong style="color:#1B365D;">€42.000 bespaart</strong> voor onze klanten. We nemen <strong style="color:#1B365D;">binnen 24 uur</strong> contact met je op voor een gratis kennismakingsgesprek van 30 minuten.</p>

    <!-- NEXT STEPS -->
    <div style="background:#f8fafc;border-radius:12px;padding:24px 28px;margin-bottom:28px;">
      <p style="color:#1B365D;font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin:0 0 20px;">Dit gaat er nu gebeuren</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:top;padding-bottom:18px;">
            <div style="display:inline-block;background:#4EC0C4;color:#fff;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-size:.8rem;font-weight:800;">1</div>
            <span style="display:inline-block;vertical-align:top;margin-left:12px;margin-top:4px;">
              <strong style="display:block;color:#1B365D;font-size:.88rem;">Binnen 24 uur — Persoonlijk contact</strong>
              <span style="color:#687280;font-size:.82rem;">Een van onze specialisten belt of mailt je voor een kennismaking.</span>
            </span>
          </td>
        </tr>
        <tr>
          <td style="vertical-align:top;padding-bottom:18px;">
            <div style="display:inline-block;background:#4EC0C4;color:#fff;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-size:.8rem;font-weight:800;">2</div>
            <span style="display:inline-block;vertical-align:top;margin-left:12px;margin-top:4px;">
              <strong style="display:block;color:#1B365D;font-size:.88rem;">30 minuten — Gratis analyse</strong>
              <span style="color:#687280;font-size:.82rem;">We brengen jouw grootste kansen in kaart en rekenen live de ROI uit.</span>
            </span>
          </td>
        </tr>
        <tr>
          <td style="vertical-align:top;">
            <div style="display:inline-block;background:#4EC0C4;color:#fff;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-size:.8rem;font-weight:800;">3</div>
            <span style="display:inline-block;vertical-align:top;margin-left:12px;margin-top:4px;">
              <strong style="display:block;color:#1B365D;font-size:.88rem;">Binnen 90 dagen — Meetbaar resultaat</strong>
              <span style="color:#687280;font-size:.82rem;">Gegarandeerd. Geen resultaat? Dan werken wij gratis door.</span>
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- STATS -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td width="33%" style="text-align:center;padding:16px 8px;background:#f8fafc;border-radius:10px;">
          <div style="font-size:1.4rem;font-weight:800;color:#4EC0C4;">150+</div>
          <div style="font-size:.72rem;color:#687280;margin-top:4px;">Bedrijven geholpen</div>
        </td>
        <td width="4px"></td>
        <td width="33%" style="text-align:center;padding:16px 8px;background:#f8fafc;border-radius:10px;">
          <div style="font-size:1.4rem;font-weight:800;color:#4EC0C4;">€2,5M+</div>
          <div style="font-size:.72rem;color:#687280;margin-top:4px;">Bespaard in 2025</div>
        </td>
        <td width="4px"></td>
        <td width="33%" style="text-align:center;padding:16px 8px;background:#f8fafc;border-radius:10px;">
          <div style="font-size:1.4rem;font-weight:800;color:#4EC0C4;">98%</div>
          <div style="font-size:.72rem;color:#687280;margin-top:4px;">Klanttevredenheid</div>
        </td>
      </tr>
    </table>

    <!-- URGENCY -->
    <div style="background:#1B365D;border-radius:10px;padding:18px 24px;margin-bottom:28px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:1.2rem;">⚡</span>
      <p style="margin:0;color:rgba(255,255,255,.9);font-size:.85rem;line-height:1.5;"><strong style="color:#4EC0C4;">Beperkte capaciteit:</strong> we nemen maximaal 8 nieuwe klanten per maand aan. Jouw aanvraag wordt direct behandeld.</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:8px;">
      <a href="https://www.hartai.nl" style="display:inline-block;background:#4EC0C4;color:#fff;padding:15px 36px;border-radius:10px;text-decoration:none;font-weight:800;font-size:.95rem;letter-spacing:-.01em;">Bekijk onze resultaten →</a>
    </div>
    <p style="text-align:center;color:#9CA3AF;font-size:.75rem;margin:10px 0 0;">Of beantwoord gewoon deze e-mail — wij lezen alles.</p>

  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#132847;border-radius:0 0 16px 16px;padding:24px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="color:rgba(255,255,255,.9);font-size:.82rem;margin:0 0 4px;font-weight:600;">HartAI B.V.</p>
          <p style="color:rgba(255,255,255,.45);font-size:.75rem;margin:0;line-height:1.6;">
            <a href="mailto:contact@hartai.nl" style="color:#4EC0C4;text-decoration:none;">contact@hartai.nl</a> ·
            <a href="https://www.hartai.nl" style="color:rgba(255,255,255,.45);text-decoration:none;">hartai.nl</a><br>
            Nederland · AVG-compliant · Europese datacenters
          </p>
        </td>
        <td align="right" style="vertical-align:top;">
          <div style="background:#4EC0C4;border-radius:8px;width:36px;height:36px;text-align:center;line-height:36px;font-size:1rem;font-weight:800;color:#fff;display:inline-block;">H</div>
        </td>
      </tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  try {
    // Interne notificatie
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:     'HartAI Website <noreply@hartai.nl>',
        to:       ['contact@hartai.nl'],
        reply_to: email.trim(),
        subject:  `🔔 Nieuw verzoek — ${name.trim()}${company ? ` (${company.trim()})` : ''}`,
        html:     internalHtml,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'E-mail verzenden mislukt.' });
    }

    // Bevestigingsmail naar klant
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'Jean-Pierre van HartAI <noreply@hartai.nl>',
        to:      [email.trim()],
        subject: `${firstName}, je staat op de lijst — dit gaat er nu gebeuren`,
        html:    confirmHtml,
      }),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact handler error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
