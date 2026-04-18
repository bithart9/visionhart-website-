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

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#f4f7fb;padding:32px 16px;">
      <div style="background:#1B365D;border-radius:12px 12px 0 0;padding:28px 32px;">
        <h1 style="color:#fff;margin:0;font-size:1.3rem;">Nieuw kennismakingsverzoek</h1>
        <p style="color:rgba(255,255,255,.6);margin:6px 0 0;font-size:.85rem;">Via het contactformulier op hartai.nl</p>
      </div>
      <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;">
        <table style="width:100%;border-collapse:collapse;font-size:.9rem;">
          <tr>
            <td style="padding:10px 0;color:#687280;width:120px;vertical-align:top;">Naam</td>
            <td style="padding:10px 0;color:#2D3748;font-weight:600;">${escHtml(name)}</td>
          </tr>
          ${company ? `<tr>
            <td style="padding:10px 0;color:#687280;border-top:1px solid #E8EAED;vertical-align:top;">Bedrijf</td>
            <td style="padding:10px 0;color:#2D3748;border-top:1px solid #E8EAED;">${escHtml(company)}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:10px 0;color:#687280;border-top:1px solid #E8EAED;vertical-align:top;">E-mail</td>
            <td style="padding:10px 0;border-top:1px solid #E8EAED;">
              <a href="mailto:${escHtml(email)}" style="color:#4EC0C4;">${escHtml(email)}</a>
            </td>
          </tr>
          ${phone ? `<tr>
            <td style="padding:10px 0;color:#687280;border-top:1px solid #E8EAED;vertical-align:top;">Telefoon</td>
            <td style="padding:10px 0;color:#2D3748;border-top:1px solid #E8EAED;">
              <a href="tel:${escHtml(phone)}" style="color:#4EC0C4;">${escHtml(phone)}</a>
            </td>
          </tr>` : ''}
        </table>
        <div style="margin-top:24px;padding:16px 20px;background:#f4f7fb;border-radius:8px;font-size:.82rem;color:#687280;">
          Ontvangen op ${new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', dateStyle: 'full', timeStyle: 'short' })}
        </div>
        <div style="margin-top:20px;text-align:center;">
          <a href="mailto:${escHtml(email)}" style="display:inline-block;background:#1B365D;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:.9rem;">
            Direct beantwoorden →
          </a>
        </div>
      </div>
      <p style="text-align:center;color:#9CA3AF;font-size:.75rem;margin-top:16px;">
        HartAI B.V. · contact@hartai.nl · hartai.nl
      </p>
    </div>
  `;

  try {
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
        subject:  `Nieuw verzoek — ${name.trim()}${company ? ` (${company.trim()})` : ''}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'E-mail verzenden mislukt.' });
    }

    // Bevestigingsmail naar invuller
    const confirmHtml = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#f4f7fb;padding:32px 16px;">
        <div style="background:#1B365D;border-radius:12px 12px 0 0;padding:28px 32px;">
          <h1 style="color:#fff;margin:0;font-size:1.2rem;">Bedankt voor je aanvraag, ${escHtml(name)}!</h1>
          <p style="color:rgba(255,255,255,.6);margin:6px 0 0;font-size:.85rem;">HartAI — Bouwen niet adviseren.</p>
        </div>
        <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;">
          <p style="color:#2D3748;font-size:.95rem;line-height:1.7;">We hebben je aanvraag ontvangen en nemen <strong>binnen 1 werkdag</strong> contact met je op.</p>
          <div style="margin:24px 0;padding:20px 24px;background:#f4f7fb;border-left:3px solid #4EC0C4;border-radius:0 8px 8px 0;font-size:.88rem;color:#687280;">
            <strong style="display:block;color:#1B365D;margin-bottom:8px;">Jouw aanvraag</strong>
            Naam: ${escHtml(name)}<br/>
            ${company ? `Bedrijf: ${escHtml(company)}<br/>` : ''}
            E-mail: ${escHtml(email)}<br/>
            ${phone ? `Telefoon: ${escHtml(phone)}` : ''}
          </div>
          <p style="color:#687280;font-size:.88rem;line-height:1.7;">Vragen? Stuur een e-mail naar <a href="mailto:contact@hartai.nl" style="color:#4EC0C4;">contact@hartai.nl</a> of bel ons direct.</p>
          <div style="margin-top:28px;text-align:center;">
            <a href="https://www.hartai.nl" style="display:inline-block;background:#4EC0C4;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:.9rem;">Terug naar hartai.nl →</a>
          </div>
        </div>
        <p style="text-align:center;color:#9CA3AF;font-size:.75rem;margin-top:16px;">HartAI B.V. · contact@hartai.nl · hartai.nl</p>
      </div>
    `;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'HartAI <noreply@hartai.nl>',
        to:      [email.trim()],
        subject: `Bedankt voor je aanvraag — we nemen snel contact op`,
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
