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
<html lang="nl" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>HartAI — Je aanvraag is ontvangen</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f4f8;">
<tr><td align="center" style="padding:40px 16px;">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

    <!-- LOGO HERO -->
    <tr><td align="center" style="background-color:#1B365D;border-radius:16px 16px 0 0;padding:48px 40px 40px;">
      <img src="https://www.hartai.nl/images/android-chrome-192x192.png" alt="HartAI" width="80" height="80" style="display:block;border:0;border-radius:16px;margin:0 auto 20px;" />
      <h1 style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;line-height:1.1;">HartAI</h1>
      <p style="margin:0 0 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:400;color:rgba(255,255,255,0.6);line-height:1.5;letter-spacing:0;">Business Transformation Partner</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;">
        <tr><td style="background-color:rgba(78,192,196,0.2);border:1px solid rgba(78,192,196,0.5);border-radius:100px;padding:6px 16px;">
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#4EC0C4;letter-spacing:0.1em;text-transform:uppercase;">✓ &nbsp;Aanvraag ontvangen</span>
        </td></tr>
      </table>
      <h2 style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;color:#ffffff;line-height:1.2;letter-spacing:-0.01em;">${firstName}, je staat op de lijst. 🎯</h2>
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:400;color:rgba(255,255,255,0.75);line-height:1.6;">Terwijl je dit leest behandelen wij jouw aanvraag als prioriteit.<br>150+ bedrijven gingen je voor — en zij zijn blij dat ze de stap hebben gezet.</p>
    </td></tr>

    <!-- QUOTE -->
    <tr><td style="background-color:#4EC0C4;padding:28px 40px;">
      <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:400;color:#ffffff;line-height:1.7;font-style:italic;">"De ROI was binnen 3 maanden positief. HartAI heeft ons 15+ uur per week teruggegeven — ik had dit 2 jaar eerder moeten doen."</p>
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:rgba(255,255,255,0.85);line-height:1.5;">— Mark de Vries, CEO TechConsult Nederland</p>
    </td></tr>

    <!-- BODY -->
    <tr><td style="background-color:#ffffff;padding:40px 40px 32px;">
      <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:400;color:#2D3748;line-height:1.6;">Hoi ${firstName},</p>
      <p style="margin:0 0 32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:400;color:#2D3748;line-height:1.6;">Je hebt net de eerste stap gezet die elk jaar gemiddeld <strong style="color:#1B365D;">€42.000 bespaart</strong> voor onze klanten. We nemen <strong style="color:#1B365D;">binnen 24 uur</strong> contact met je op voor een gratis kennismakingsgesprek van 30 minuten.</p>

      <!-- NEXT STEPS -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border-radius:12px;margin-bottom:32px;">
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#1B365D;letter-spacing:0.1em;text-transform:uppercase;">Dit gaat er nu gebeuren</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
            <tr>
              <td width="36" valign="top">
                <div style="width:28px;height:28px;background-color:#4EC0C4;border-radius:50%;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;line-height:28px;">1</div>
              </td>
              <td valign="top" style="padding-left:12px;">
                <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#1B365D;line-height:1.3;">Binnen 24 uur — Persoonlijk contact</p>
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:400;color:#687280;line-height:1.5;">Een van onze specialisten belt of mailt je voor een kennismaking.</p>
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
            <tr>
              <td width="36" valign="top">
                <div style="width:28px;height:28px;background-color:#4EC0C4;border-radius:50%;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;line-height:28px;">2</div>
              </td>
              <td valign="top" style="padding-left:12px;">
                <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#1B365D;line-height:1.3;">30 minuten — Gratis analyse</p>
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:400;color:#687280;line-height:1.5;">We brengen jouw grootste kansen in kaart en rekenen live de ROI uit.</p>
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="36" valign="top">
                <div style="width:28px;height:28px;background-color:#4EC0C4;border-radius:50%;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;line-height:28px;">3</div>
              </td>
              <td valign="top" style="padding-left:12px;">
                <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#1B365D;line-height:1.3;">Binnen 90 dagen — Meetbaar resultaat</p>
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:400;color:#687280;line-height:1.5;">Gegarandeerd. Geen resultaat? Dan werken wij gratis door.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>

      <!-- STATS -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
        <tr>
          <td width="32%" align="center" style="background-color:#f8fafc;border-radius:10px;padding:18px 8px;">
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#4EC0C4;line-height:1;">150+</p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;color:#687280;line-height:1.4;">Bedrijven geholpen</p>
          </td>
          <td width="2%">&nbsp;</td>
          <td width="32%" align="center" style="background-color:#f8fafc;border-radius:10px;padding:18px 8px;">
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#4EC0C4;line-height:1;">€2,5M+</p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;color:#687280;line-height:1.4;">Bespaard in 2025</p>
          </td>
          <td width="2%">&nbsp;</td>
          <td width="32%" align="center" style="background-color:#f8fafc;border-radius:10px;padding:18px 8px;">
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#4EC0C4;line-height:1;">98%</p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;color:#687280;line-height:1.4;">Klanttevredenheid</p>
          </td>
        </tr>
      </table>

      <!-- URGENCY -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
        <tr><td style="background-color:#1B365D;border-radius:10px;padding:18px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="28" valign="middle" style="font-size:18px;line-height:1;">⚡</td>
              <td valign="middle" style="padding-left:12px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:400;color:rgba(255,255,255,0.9);line-height:1.5;"><strong style="color:#4EC0C4;">Beperkte capaciteit:</strong> we nemen maximaal 8 nieuwe klanten per maand aan. Jouw aanvraag wordt direct behandeld.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>

      <!-- CTA -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 12px;">
        <tr><td align="center" style="background-color:#4EC0C4;border-radius:10px;">
          <a href="https://www.hartai.nl" style="display:inline-block;padding:15px 40px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;">Bekijk onze resultaten →</a>
        </td></tr>
      </table>
      <p style="text-align:center;margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:400;color:#9CA3AF;line-height:1.5;">Of beantwoord gewoon deze e-mail — wij lezen alles.</p>
    </td></tr>

    <!-- FOOTER -->
    <tr><td style="background-color:#132847;border-radius:0 0 16px 16px;padding:28px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="middle">
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:rgba(255,255,255,0.9);line-height:1.5;">HartAI B.V.</p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:400;color:rgba(255,255,255,0.4);line-height:1.6;">
              <a href="mailto:contact@hartai.nl" style="color:#4EC0C4;text-decoration:none;">contact@hartai.nl</a> &nbsp;·&nbsp;
              <a href="https://www.hartai.nl" style="color:rgba(255,255,255,0.4);text-decoration:none;">hartai.nl</a><br>
              Nederland &nbsp;·&nbsp; AVG-compliant &nbsp;·&nbsp; Europese datacenters
            </p>
          </td>
          <td width="56" align="right" valign="middle">
            <img src="https://www.hartai.nl/images/android-chrome-192x192.png" alt="HartAI" width="44" height="44" style="display:block;border:0;border-radius:8px;" />
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
