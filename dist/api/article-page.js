const { sql, ensureSchema } = require('./_cms');

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const categorySlugs = {
  'Buying a Home':'buying-a-home',
  'Investment & Business':'investment-business',
  'Estate, Divorce & Disputes':'estate-divorce-disputes',
  'Appraisal Guides':'appraisal-guides',
  'Home Improvements':'home-improvements',
  'Land & Redevelopment':'land-redevelopment',
  'Property Taxes':'property-taxes'
};
const siteUrl = (process.env.SITE_URL || 'https://reddy-appraisal-review.vercel.app').replace(/\/$/, '');

module.exports = async (req, res) => {
  try {
    const slug = String(req.query.slug || '').toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return res.status(404).send('Article not found.');
    const db = sql();
    await ensureSchema(db);
    const rows = await db`SELECT article FROM reddy_articles WHERE slug = ${slug} LIMIT 1`;
    if (!rows.length) return res.status(404).send('Article not found.');
    const a = rows[0].article;
    const category = a.category || 'Appraisal Guides';
    const categoryPath = `/insights/category/${categorySlugs[category] || 'appraisal-guides'}/`;
    const date = new Date(`${a.published}T12:00:00Z`).toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric', timeZone:'UTC'});
    const toc = a.headings.map((heading, i) => `<a href="#section-${i}">${esc(heading)}</a>`).join('');
    const sections = a.headings.map((heading, i) => `<section id="section-${i}"><h2>${esc(heading)}</h2><p>${esc(a.paragraphs[i])}</p></section>`).join('');
    const sources = (a.sources || []).filter(x => Array.isArray(x) && /^https:\/\//.test(x[1])).map(x => `<li><a href="${esc(x[1])}" rel="noopener">${esc(x[0])} ↗</a></li>`).join('');
    const articleUrl = `/insights/${a.slug}/`;
    const canonical = `${siteUrl}${articleUrl}`;
    const schema = {'@context':'https://schema.org','@type':'BlogPosting','headline':a.title,'description':a.description || a.excerpt,'datePublished':a.published,'author':{'@type':'Organization','name':'Reddy Appraisal LLC'},'articleSection':category,'articleBody':a.paragraphs.join('\n\n'),'mainEntityOfPage':canonical};
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(a.seo_title || a.title)} | Reddy Appraisal LLC</title><meta name="description" content="${esc(a.description || a.excerpt)}"><meta property="og:title" content="${esc(a.title)}"><meta property="og:description" content="${esc(a.excerpt)}"><meta property="og:type" content="article"><link rel="canonical" href="${esc(canonical)}"><link rel="stylesheet" href="/styles.css"><script src="/editorial.js" defer></script><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script></head><body><a class="skip" href="#main">Skip to content</a><header id="header"><a class="brand" href="/" aria-label="Reddy Appraisal home"><img class="brand-icon" src="/assets/brand-0.png" alt="" width="42" height="43"><span class="brand-wordmark" aria-label="Reddy Appraisal LLC"><span class="brand-name"><span>R</span><span>E</span><span>D</span><span>D</span><span>Y</span></span><small>APPRAISAL LLC</small></span></a><nav aria-label="Main navigation"><a href="/#about">Our approach</a><a href="/#services">Services</a><a href="/#area">Service area</a><a href="/insights/">Insights</a><a href="/#faq">FAQs</a></nav><a class="button nav-cta" href="/#request">Request an appraisal <span>↗</span></a><button class="menu" aria-label="Open navigation" aria-expanded="false">☰</button></header><main id="main" class="editorial-main"><article><div class="article-heading section"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/insights/">Insights</a><span>/</span><a href="${categoryPath}">${esc(category)}</a></nav><a class="eyebrow article-category-link" href="${categoryPath}">${esc(category.toUpperCase())} / SOUTHERN ARIZONA ↗</a><h1>${esc(a.title)}</h1><p class="article-deck">${esc(a.excerpt)}</p><div class="article-meta"><span>By Reddy Appraisal LLC</span><time datetime="${esc(a.published)}">${esc(date)}</time><span>${Number(a.minutes) || 1} min read</span></div></div><div class="article-layout section"><aside class="article-aside"><p class="eyebrow">IN THIS ARTICLE</p>${toc}<a class="aside-hub" href="${categoryPath}">More in ${esc(category)} ↗</a><a class="aside-hub" href="/insights/">← All insights</a></aside><div class="article-body"><div class="answer-box"><p class="eyebrow">THE SHORT ANSWER</p><p>${esc(a.answer || a.excerpt)}</p></div>${sections}<section class="article-sources" id="sources"><h2>${sources ? 'Sources &amp; context' : 'About this article'}</h2>${sources ? `<ul>${sources}</ul>` : ''}<p>${esc(a.editorial_note || 'General educational information. The suitable appraisal scope depends on the property, intended use, effective date and available information.')}</p></section><section class="article-service"><p class="eyebrow">A LOCAL PERSPECTIVE ON YOUR PROPERTY</p><h2>Put a clearer value behind your next decision.</h2><p>${esc(a.cta || '')}</p><div class="article-service-links"><a class="button" href="/#request">Request an appraisal <span>↗</span></a><a class="under-link" href="/#services">Explore residential appraisal services <span>↗</span></a></div></section></div></div></article></main><footer><a class="brand" href="/">REDDY APPRAISAL LLC</a><p>Tucson, Arizona</p><span>© ${new Date().getFullYear()} Reddy Appraisal LLC</span><a href="/insights/">Real estate insights</a></footer></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Article page error:', error);
    return res.status(500).send('This article could not be loaded right now.');
  }
};
