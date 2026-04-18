export default async function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) {
    return res.status(200).json({ status: 'ERROR', problem: 'ANTHROPIC_API_KEY is not set in Vercel environment variables' });
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say: OK' }],
      }),
    });

    const body = await r.json();

    if (r.ok) {
      return res.status(200).json({ status: 'OK', response: body.content?.[0]?.text });
    } else {
      return res.status(200).json({ status: 'API_ERROR', code: r.status, error: body });
    }
  } catch (err) {
    return res.status(200).json({ status: 'FETCH_ERROR', error: err.message });
  }
}
