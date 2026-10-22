const crypto = require('node:crypto');
const { neon } = require('@neondatabase/serverless');

const COOKIE = 'reddy_admin';
const SESSION_SECONDS = 60 * 60 * 8;

function reply(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(body));
}

function sql() {
  const url = process.env.REDDY_ARTICLES_URL || process.env.REDDY_ARTICLES_DATABASE_URL || process.env.REDDY_ARTICLES_POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('Missing REDDY_ARTICLES_URL database connection');
  return neon(url);
}

async function ensureSchema(db) {
  await db`CREATE TABLE IF NOT EXISTS reddy_articles (
    slug TEXT PRIMARY KEY,
    article JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

function sign(value) {
  return crypto.createHmac('sha256', process.env.CMS_SESSION_SECRET).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function getCookie(req, name) {
  const cookies = String(req.headers.cookie || '').split(';');
  for (const cookie of cookies) {
    const [key, ...value] = cookie.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return '';
}

function hasSession(req) {
  if (!process.env.CMS_SESSION_SECRET) return false;
  const token = getCookie(req, COOKIE);
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;
  const value = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const issued = Number(value);
  return Number.isFinite(issued) && issued <= Date.now() + 60000 && Date.now() - issued < SESSION_SECONDS * 1000 && safeEqual(sign(value), signature);
}

function setSession(res) {
  const value = String(Date.now());
  const token = `${value}.${sign(value)}`;
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`);
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 300000) reject(new Error('Request is too large'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function cleanArticle(input) {
  const slug = String(input.slug || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const title = String(input.title || '').trim();
  const excerpt = String(input.excerpt || '').trim();
  const category = String(input.category || '').trim();
  const headings = Array.isArray(input.headings) ? input.headings.map(x => String(x).trim()).filter(Boolean) : [];
  const paragraphs = Array.isArray(input.paragraphs) ? input.paragraphs.map(x => String(x).trim()).filter(Boolean) : [];
  if (!slug || slug === 'category' || slug.length > 90) throw new Error('Enter a shorter, valid article URL.');
  if (!title || title.length > 180) throw new Error('Enter an article title under 180 characters.');
  if (!excerpt || excerpt.length > 260) throw new Error('Enter a short article summary under 260 characters.');
  if (!category) throw new Error('Choose an article category.');
  if (!headings.length || headings.length !== paragraphs.length) throw new Error('Add at least one matching heading and article section.');
  const art = String(input.art || 'guide-art');
  const allowedArt = new Set(['landscape-art', 'rental-art', 'estate-art', 'guide-art', 'improvement-art', 'land-art', 'tax-art']);
  const words = paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
  return {
    slug,
    title,
    seo_title: String(input.seo_title || title).trim().slice(0, 200),
    description: String(input.description || excerpt).trim().slice(0, 320),
    category,
    art: allowedArt.has(art) ? art : 'guide-art',
    excerpt,
    answer: String(input.answer || excerpt).trim(),
    headings,
    paragraphs,
    link: 'Read the article',
    sources: Array.isArray(input.sources) ? input.sources.filter(x => Array.isArray(x) && x.length === 2).map(x => [String(x[0]).slice(0, 180), String(x[1]).slice(0, 500)]) : [],
    cta: String(input.cta || 'Reddy Appraisal LLC provides independent residential property valuations in Tucson and Southern Arizona.').trim(),
    minutes: Math.max(1, Math.ceil(words / 220)),
    published: String(input.published || new Date().toISOString().slice(0, 10)),
    editorial_note: String(input.editorial_note || '').trim()
  };
}

module.exports = { reply, sql, ensureSchema, hasSession, setSession, clearSession, sameOrigin, readBody, cleanArticle };
