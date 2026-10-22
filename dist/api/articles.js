const { reply, sql, ensureSchema, hasSession, sameOrigin, readBody, cleanArticle } = require('./_cms');

module.exports = async (req, res) => {
  try {
    const db = sql();
    await ensureSchema(db);
    const slug = String(req.query.slug || '');
    if (req.method === 'GET') {
      if (slug) {
        const rows = await db`SELECT article FROM reddy_articles WHERE slug = ${slug} LIMIT 1`;
        if (!rows.length) return reply(res, 404, { error: 'Article not found.' });
        if (req.query.admin === '1' && !hasSession(req)) return reply(res, 401, { error: 'Sign in to manage this article.' });
        return reply(res, 200, rows[0].article);
      }
      const rows = await db`SELECT article FROM reddy_articles ORDER BY updated_at DESC`;
      return reply(res, 200, rows.map(row => row.article));
    }
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return reply(res, 405, { error: 'Method not allowed.' }, { Allow: 'GET, POST, PUT, DELETE' });
    if (!hasSession(req)) return reply(res, 401, { error: 'Sign in to publish changes.' });
    if (!sameOrigin(req)) return reply(res, 403, { error: 'Request origin is not allowed.' });
    if (req.method === 'DELETE') {
      if (!slug) return reply(res, 400, { error: 'Article slug is required.' });
      await db`DELETE FROM reddy_articles WHERE slug = ${slug}`;
      return reply(res, 200, { deleted: true });
    }
    const article = cleanArticle(await readBody(req));
    if (req.method === 'PUT' && slug && slug !== article.slug) return reply(res, 400, { error: 'Changing a published article URL is not supported. Keep the existing URL when editing.' });
    await db`INSERT INTO reddy_articles (slug, article) VALUES (${article.slug}, ${JSON.stringify(article)}::jsonb)
      ON CONFLICT (slug) DO UPDATE SET article = EXCLUDED.article, updated_at = NOW()`;
    return reply(res, 200, { article, published: true });
  } catch (error) {
    console.error('Article API error:', error);
    return reply(res, 500, { error: error.message || 'The article could not be saved.' });
  }
};
