export default async function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) {
    return res.json({ step: 1, status: 'FAIL', reason: 'ANTHROPIC_API_KEY not found in environment' });
  }

  res.json({ step: 1, status: 'OK', keyPrefix: key.slice(0, 10) + '...' });

  // NOTE: This endpoint only checks step 1 (key presence).
  // To test the actual API call, visit /api/test-call
}
