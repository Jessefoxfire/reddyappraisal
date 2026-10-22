const { reply, hasSession, setSession, clearSession, sameOrigin, readBody } = require('./_cms');
const crypto = require('node:crypto');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return reply(res, 200, { authenticated: hasSession(req) });
  if (req.method === 'DELETE') {
    clearSession(res);
    return reply(res, 200, { authenticated: false });
  }
  if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed.' }, { Allow: 'GET, POST, DELETE' });
  if (!sameOrigin(req)) return reply(res, 403, { error: 'Request origin is not allowed.' });
  if (!process.env.CMS_ADMIN_PASSWORD || !process.env.CMS_SESSION_SECRET) return reply(res, 503, { error: 'Admin access is not configured yet.' });
  try {
    const body = await readBody(req);
    const actual = crypto.createHash('sha256').update(String(body.password || '')).digest();
    const expected = crypto.createHash('sha256').update(process.env.CMS_ADMIN_PASSWORD).digest();
    if (!crypto.timingSafeEqual(actual, expected)) return reply(res, 401, { error: 'That password did not match.' });
    setSession(res);
    return reply(res, 200, { authenticated: true });
  } catch (error) {
    return reply(res, 400, { error: error.message || 'Could not sign in.' });
  }
};
