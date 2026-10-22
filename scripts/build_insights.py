"""Build static article, category, and library pages from the supplied editorial copy."""
from pathlib import Path
from datetime import date
from collections import Counter
import json, html, re, os

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
articles = json.loads((ROOT / 'content/articles.json').read_text())
by_slug = {a['slug']: a for a in articles}
base = os.environ.get('SITE_URL', '').rstrip('/')
categories = [
    ('Buying a Home', 'buying-a-home', 'Market context, affordability and the decisions behind your next home purchase.'),
    ('Investment & Business', 'investment-business', 'Understand rental property numbers and the role of residential real estate in your business decisions.'),
    ('Estate, Divorce & Disputes', 'estate-divorce-disputes', 'Independent valuation perspectives for inherited homes, settlements, buyouts and property disagreements.'),
    ('Appraisal Guides', 'appraisal-guides', 'Understand appraisal options, online estimates and the information behind a supported opinion of value.'),
    ('Home Improvements', 'home-improvements', 'Explore how casitas, renovations, pools and solar relate to property value in Southern Arizona.'),
    ('Land & Redevelopment', 'land-redevelopment', 'Consider residential land, renovation and redevelopment possibilities with a grounded view of feasibility.'),
    ('Property Taxes', 'property-taxes', 'Make sense of Arizona property values, assessment notices and the evidence behind a potential appeal.'),
]
category_map = {name: (slug, description) for name, slug, description in categories}
counts = Counter(a['category'] for a in articles)
ordered = sorted(articles, key=lambda a: a.get('published', '2026-10-21'), reverse=True)
home = (DIST / 'index.html').read_text()
header = re.search(r'<header.*?</header>', home, re.S).group()
header = re.sub(r'href="#([^"]+)"', r'href="/#\1"', header).replace('src="assets/', 'src="/assets/')
footer = re.search(r'<footer>.*?</footer>', home, re.S).group()
footer = re.sub(r'href="#([^"]+)"', r'href="/#\1"', footer)

def esc(s):
    return html.escape(str(s), quote=True)

def url(a):
    return '/insights/' + a['slug'] + '/'

def category_url(name):
    return '/insights/category/' + category_map[name][0] + '/'

def nice_date(a):
    d = date.fromisoformat(a.get('published', '2026-10-21'))
    return f'{d:%B} {d.day}, {d.year}'

def category_nav(selected=None, compact=False):
    all_current = ' aria-current="page"' if selected == 'all' else ''
    links = [f'<a href="/insights/"{all_current}>All insights <span>{len(articles)}</span></a>'] if not compact else []
    for name, _, _ in categories:
        current = ' aria-current="page"' if selected == name else ''
        links.append(f'<a href="{category_url(name)}"{current}>{esc(name)} <span>{counts[name]}</span></a>')
    return '<nav class="category-nav" aria-label="Article categories">' + ''.join(links) + '</nav>'

def card(a, level=2):
    return f'''<article class="insight-card"><a class="insight-art {esc(a['art'])}" href="{url(a)}" aria-label="{esc(a['title'])}"><span>{esc(a['category'])}</span><b aria-hidden="true">↗</b></a><div class="insight-card-copy"><p class="eyebrow">{nice_date(a).upper()} · {a['minutes']} MIN READ</p><h{level}><a href="{url(a)}">{esc(a['title'])}</a></h{level}><p>{esc(a['excerpt'])}</p><a class="under-link" href="{url(a)}">Read article <span class="visually-hidden">: {esc(a['title'])}</span><span aria-hidden="true">↗</span></a></div></article>'''

def shell(title, description, path, body, schema, article=False):
    canonical = f'<link rel="canonical" href="{esc(base+path)}"><meta property="og:url" content="{esc(base+path)}">' if base else ''
    schema_json = json.dumps(schema, ensure_ascii=False).replace('<', chr(92) + 'u003c')
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title><meta name="description" content="{esc(description)}"><meta name="theme-color" content="#193c6b"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:type" content="{'article' if article else 'website'}">{canonical}<link rel="stylesheet" href="/styles.css"><script src="/editorial.js" defer></script><script type="application/ld+json">{schema_json}</script></head><body><a class="skip" href="#main">Skip to content</a>{header}<main id="main" class="editorial-main">{body}</main>{footer}</body></html>'''

def collection_schema(title, description, entries):
    return {'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': title, 'description': description, 'hasPart': [{'@type': 'BlogPosting', 'headline': a['title'], 'url': base+url(a)} for a in entries]}

def write_page(path, text):
    output = DIST / path.lstrip('/') / 'index.html'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(text)

featured = [by_slug[s] for s in ['tucson-property-tax-bill-too-high', 'inherited-home-arizona-value', 'pool-home-value-tucson']]
feature = f'''<section class="insights-section section" id="articles"><div class="section-top reveal"><p class="eyebrow">03 / INSIGHTS &amp; PERSPECTIVES</p><span>{len(articles)} articles. Local knowledge, shared.</span></div><div class="insights-heading reveal"><h2>A clearer view of<br><em>the decisions ahead.</em></h2><div><p>Practical perspectives for Southern Arizona property owners.<br>Explore buying, investing, private appraisals and more.</p><a class="under-link" href="/insights/">Explore all {len(articles)} articles <span>↗</span></a></div></div>{category_nav(compact=True)}<div class="insights-grid home-insights-grid">{''.join(card(a, 3) for a in featured)}</div></section>'''
home = re.sub(r'<!-- INSIGHTS START -->.*?<!-- INSIGHTS END -->', lambda _: '<!-- INSIGHTS START -->'+feature+'<!-- INSIGHTS END -->', home, flags=re.S)
(DIST/'index.html').write_text(home)

cta = '''<section class="editorial-cta section"><div><p class="eyebrow">FROM PERSPECTIVE TO CONFIDENCE</p><h2>Know the value.<br><em>Make your next move.</em></h2></div><a class="button" href="/#request">Discuss your appraisal needs <span>↗</span></a></section>'''
library_description = 'Explore Tucson and Southern Arizona articles on residential appraisals, property taxes, estates, divorce, home improvements, investing and land.'
hub_body = f'''<section class="insights-library section"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">Insights</span></nav><div class="library-heading"><p class="eyebrow">THE REDDY APPRAISAL JOURNAL</p><h1>Local perspective.<br><em>Informed decisions.</em></h1><p>Real estate insights for Tucson and Southern Arizona.<br>Choose a topic, explore a question, and take a more informed next step.</p></div>{category_nav('all')}<div class="library-meta"><span>ALL INSIGHTS</span><span>{len(articles):02d} ARTICLES · {len(categories):02d} CATEGORIES</span></div><div class="insights-grid">{''.join(card(a) for a in ordered)}</div></section>{cta}'''
write_page('/insights/', shell('Tucson Real Estate & Appraisal Insights | Reddy Appraisal LLC', library_description, '/insights/', hub_body, collection_schema('Southern Arizona Real Estate Insights', library_description, ordered)))

for name, slug, description in categories:
    entries = [a for a in ordered if a['category'] == name]
    path = category_url(name)
    body = f'''<section class="insights-library section"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/insights/">Insights</a><span aria-hidden="true">/</span><span aria-current="page">{esc(name)}</span></nav><div class="library-heading category-heading"><p class="eyebrow">THE REDDY APPRAISAL JOURNAL / BY TOPIC</p><h1>{esc(name)}</h1><p>{esc(description)}</p></div>{category_nav(name)}<div class="library-meta"><span>{esc(name.upper())}</span><span>{len(entries):02d} {'ARTICLE' if len(entries)==1 else 'ARTICLES'}</span></div><div class="insights-grid">{''.join(card(a) for a in entries)}</div></section>{cta}'''
    write_page(path, shell(name+' in Tucson & Southern Arizona | Reddy Appraisal LLC', description, path, body, collection_schema(name, description, entries)))

for a in articles:
    category = a['category']
    category_path = category_url(category)
    toc = ''.join(f'<a href="#section-{n}">{esc(t)}</a>' for n, t in enumerate(a['headings']))
    paragraphs = ''.join(f'<section id="section-{n}"><h2>{esc(t)}</h2><p>{esc(p)}</p></section>' for n, (t, p) in enumerate(zip(a['headings'], a['paragraphs'])))
    source_items = ''.join(f'<li><a href="{esc(label_url)}" rel="noopener">{esc(label)} ↗</a></li>' for label, label_url in a.get('sources', []))
    default_note = 'General educational information. The suitable appraisal scope depends on the property, intended use, effective date and available information.'
    note = a.get('editorial_note') or default_note
    if a['slug'] in ['should-you-buy-a-house-in-2026', 'is-house-hacking-worth-it-2026']:
        note = 'Market context: October 2026. Mortgage averages are national figures, not individual loan quotes. Rates and market conditions can change. This article is general information, not lending or investment advice.'
    sources = f'<section class="article-sources" id="sources"><h2>{"Sources &amp; context" if source_items else "About this article"}</h2>{"<ul>"+source_items+"</ul>" if source_items else ""}<p>{esc(note)}</p></section>'
    related = [x for x in ordered if x['slug'] != a['slug'] and x['category'] == category][:2]
    if not related:
        related = [x for x in ordered if x['category'] == 'Investment & Business'][:2]
    related_html = ''.join(f'<h2><a href="{url(x)}">{esc(x["title"])} <span aria-hidden="true">↗</span></a></h2>' for x in related)
    body = f'''<article><div class="article-heading section"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/insights/">Insights</a><span aria-hidden="true">/</span><a href="{category_path}">{esc(category)}</a><span aria-hidden="true">/</span><span aria-current="page">Article</span></nav><a class="eyebrow article-category-link" href="{category_path}">{esc(category.upper())} / SOUTHERN ARIZONA ↗</a><h1>{esc(a['title'])}</h1><p class="article-deck">{esc(a['excerpt'])}</p><div class="article-meta"><span>By Reddy Appraisal LLC</span><time datetime="{a['published']}">{nice_date(a)}</time><span>{a['minutes']} min read</span></div></div><div class="article-layout section"><aside class="article-aside"><p class="eyebrow">IN THIS ARTICLE</p>{toc}<a class="aside-hub" href="{category_path}">More in {esc(category)} ↗</a><a class="aside-hub" href="/insights/">← All {len(articles)} articles</a></aside><div class="article-body"><div class="answer-box"><p class="eyebrow">THE SHORT ANSWER</p><p>{esc(a['answer'])}</p></div>{paragraphs}{sources}<section class="article-service"><p class="eyebrow">A LOCAL PERSPECTIVE ON YOUR PROPERTY</p><h2>Put a clearer value behind your next decision.</h2><p>{esc(a['cta'])}</p><div class="article-service-links"><a class="button" href="/#request">Request an appraisal <span>↗</span></a><a class="under-link" href="/#services">Explore residential appraisal services <span>↗</span></a></div></section><section class="article-related"><p class="eyebrow">CONTINUE READING</p>{related_html}<a class="under-link" href="{category_path}">Explore {esc(category)} <span>↗</span></a></section></div></div></article>'''
    schema = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'BlogPosting', 'headline': a['title'], 'description': a['description'], 'datePublished': a['published'], 'inLanguage': 'en-US', 'author': {'@type': 'Organization', 'name': 'Reddy Appraisal LLC'}, 'publisher': {'@type': 'Organization', 'name': 'Reddy Appraisal LLC'}, 'articleSection': category, 'articleBody': '\n\n'.join(a['paragraphs']), 'citation': [x[1] for x in a.get('sources', [])]},
        {'@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': n+1, 'name': label, 'item': base+href} for n, (label, href) in enumerate([('Home', '/'), ('Insights', '/insights/'), (category, category_path), (a['title'], url(a))])]}
    ]}
    if base:
        schema['@graph'][0]['mainEntityOfPage'] = base+url(a)
    write_page(url(a), shell(a['seo_title'], a['description'], url(a), body, schema, article=True))

# Preserve supplied /blog suggestions as redirects instead of duplicate content.
config_path = DIST/'vercel.json'
config = json.loads(config_path.read_text()) if config_path.exists() else {}
redirects = config.setdefault('redirects', [])
known_sources = {x['source'] for x in redirects}
for source, destination in [('/blog', '/insights/')]+[('/blog/'+a['slug'], url(a)) for a in articles]:
    if source not in known_sources:
        redirects.append({'source': source, 'destination': destination, 'permanent': True})
rewrites = config.setdefault('rewrites', [])
known_rewrites = {x['source'] for x in rewrites}
for source in ['/insights/:slug', '/insights/:slug/']:
    if source not in known_rewrites:
        rewrites.append({'source': source, 'destination': '/api/article-page?slug=:slug'})
config_path.write_text(json.dumps(config, indent=2)+'\n')
(DIST/'articles.json').write_text(json.dumps(articles, ensure_ascii=False, separators=(',', ':'))+'\n')
if base:
    from xml.sax.saxutils import escape
    paths = ['/', '/insights/']+[category_url(name) for name, _, _ in categories]+[url(a) for a in articles]
    (DIST/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+escape(base+p)+'</loc></url>' for p in paths)+'</urlset>')
    (DIST/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+base+'/sitemap.xml\n')
print(f'Built {len(articles)} article pages, {len(categories)} category pages, the library and 3 homepage features.')
