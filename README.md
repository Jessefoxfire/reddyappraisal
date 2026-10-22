# Reddy Appraisal LLC

Buildless responsive website based on the supplied October 2026 brand brief, with SWAA-inspired landscape composition, sliding services, scroll reveals, parallax and a compact sticky header.

Run locally: `python3 -m http.server 4173 --directory dist`

The supplied brief's AI-generated landscape is used as illustrative brand artwork and labeled accordingly. Team monograms stand in for pending photographs. The enquiry form is explicitly a preview, performs validation and does not transmit or persist information. Confirm business contact details, credentials, advertised fees and timing before public launch. No fabricated testimonials or location-specific market claims are included. Reduced-motion preferences are supported.

Source: `dist/index.html`, `dist/styles.css`, `dist/app.js`.

## Insights

The two supplied October 2026 articles are stored in `content/articles.json`; rebuild their static HTML and the homepage feature with `python3 scripts/build_insights.py`. This produces `/insights/` plus two permanent article pages, and redirects the supplied `/blog/…` suggestions to those pages on Vercel. The article bodies preserve the source PDF text. Added summaries, section headings and source links improve navigation without claiming a named expert review.

Before an indexable production launch, run `SITE_URL=https://your-confirmed-domain python3 scripts/build_insights.py` to add matching canonical URLs, sitemap and robots sitemap reference. Preview deployments remain subject to Vercel's default protection and noindex headers. The supplied Reuters reference could not be independently opened; the mortgage figures were verified against Freddie Mac's October 15, 2026 release. Original neighborhood and duplex photography is pending; card artwork is illustrative.

## Stable client review URL

Use https://reddy-appraisal-review.vercel.app for client reviews. It points to the latest approved preview and has been verified without login. After each preview deployment, update this alias to that deployment with `vercel alias set <deployment-url> reddy-appraisal-review.vercel.app`, then verify the plain URL anonymously. Deploy from `dist/`, which contains the Vercel project link. Do not send immutable per-deployment URLs for ongoing client reviews.

## October 22 article collection

The four supplied multi-article PDFs contributed 22 standalone articles (24 total with the existing October 21 articles). `content/articles.json` retains source PDF names, page numbers, original body paragraphs and supplied editorial metadata. Each article has an individual URL; seven category archives organize the library. Similar subjects remain separate articles as requested.

Rebuild with `SITE_URL=https://reddy-appraisal-review.vercel.app python3 scripts/build_insights.py` from the project root. This refreshes the homepage feature, all articles, category archives, redirects and sitemap. At a custom-domain launch, replace SITE_URL with that confirmed domain. Website designer notes are not published in article bodies. Property-tax reference links and educational notes are retained.

## Client article management

The public site and the client editor at `/admin/` use the connected Neon database (`DATABASE_URL` supplied by the Vercel integration), so articles publish immediately and stay in sync across devices. The editor supports both a web form and importing `.docx`, `.pdf`, `.md` or `.txt` content; imported text can be reviewed before publishing. Published articles can be edited in place. The 24 source articles remain versioned in `content/articles.json` and are rebuilt as static pages.

In Vercel Project Settings → Environment Variables, configure `CMS_ADMIN_PASSWORD` and a long random `CMS_SESSION_SECRET` for Production and Preview, then redeploy. Keep the admin password private and give it to the client through a secure channel. No Firebase account is used. The database is the shared live store; GitHub is the source-code backup.
