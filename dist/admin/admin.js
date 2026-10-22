const $ = selector => document.querySelector(selector);
const loginView = $('#login-view');
const appView = $('#app-view');
const form = $('#article-form');
const list = $('#article-list');
const today = new Date().toISOString().slice(0, 10);
let articles = [];
let staticArticles = [];
let loadedBySlug = new Map();

function slugify(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function message(selector, text, error = false) {
  const el = $(selector);
  el.textContent = text;
  el.classList.toggle('error', error);
  el.classList.toggle('success', !error && Boolean(text));
}

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

async function checkSession() {
  try {
    const data = await request('/api/admin-session');
    showApp(data.authenticated);
  } catch {
    showApp(false);
  }
}

function showApp(authenticated) {
  loginView.hidden = authenticated;
  appView.hidden = !authenticated;
  if (authenticated) loadArticles();
}

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  message('#login-message', 'Signing in…');
  try {
    await request('/api/admin-session', { method: 'POST', body: JSON.stringify({ password: $('#admin-password').value }) });
    $('#admin-password').value = '';
    showApp(true);
  } catch (error) {
    message('#login-message', error.message, true);
  }
});

$('#logout').addEventListener('click', async () => {
  try { await request('/api/admin-session', { method: 'DELETE' }); } catch {}
  articles = [];
  showApp(false);
});

async function loadArticles() {
  list.innerHTML = '<p class="intro">Loading articles…</p>';
  try {
    const [staticResponse, dynamic] = await Promise.all([
      fetch('/articles.json', { cache: 'no-store' }),
      request('/api/articles')
    ]);
    staticArticles = staticResponse.ok ? await staticResponse.json() : [];
    const merged = new Map(staticArticles.map(article => [article.slug, article]));
    dynamic.forEach(article => merged.set(article.slug, article));
    articles = [...merged.values()].sort((a, b) => String(b.published || '').localeCompare(String(a.published || '')));
    loadedBySlug = new Map(articles.map(article => [article.slug, article]));
    renderList();
    message('#editor-message', `${articles.length} published articles ready to manage.`);
  } catch (error) {
    list.innerHTML = '<p class="intro">Could not load articles. Refresh the page or sign in again.</p>';
    message('#editor-message', error.message, true);
  }
}

function renderList() {
  list.replaceChildren();
  articles.forEach(article => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'article-row';
    button.innerHTML = '<strong></strong><span></span>';
    button.querySelector('strong').textContent = article.title;
    button.querySelector('span').textContent = `${article.category} · ${article.published || 'Published'}`;
    button.addEventListener('click', () => editArticle(article.slug));
    list.append(button);
  });
}

function addSection(heading = '', paragraph = '') {
  const row = document.createElement('section');
  row.className = 'section-row';
  row.innerHTML = '<div class="section-row-head"><strong>ARTICLE SECTION</strong><button class="remove-section" type="button">Remove</button></div><label>Section heading<input class="section-heading" maxlength="140" required></label><label>Paragraphs<textarea class="section-copy" rows="5" required></textarea></label>';
  row.querySelector('.section-heading').value = heading;
  row.querySelector('.section-copy').value = paragraph;
  row.querySelector('.remove-section').addEventListener('click', () => row.remove());
  $('#sections').append(row);
}

function clearForm() {
  form.reset();
  $('#original-slug').value = '';
  $('#slug').readOnly = false;
  $('#published').value = today;
  $('#art').value = 'guide-art';
  $('#sections').replaceChildren();
  addSection();
  $('#editor-mode').textContent = 'NEW ARTICLE';
  $('#editor-title').textContent = 'Create an article';
  $('#publish-button').innerHTML = 'Publish article <span>↗</span>';
  $('#preview-link').href = '/insights/';
  message('#editor-message', '');
}

$('#new-article').addEventListener('click', clearForm);
$('#add-section').addEventListener('click', () => addSection());

function editArticle(slug) {
  const article = loadedBySlug.get(slug);
  if (!article) return;
  form.reset();
  $('#original-slug').value = slug;
  $('#title').value = article.title || '';
  $('#slug').value = article.slug || '';
  $('#slug').readOnly = true;
  $('#category').value = article.category || '';
  $('#excerpt').value = article.excerpt || '';
  $('#seo-title').value = article.seo_title || '';
  $('#description').value = article.description || '';
  $('#answer').value = article.answer || '';
  $('#art').value = article.art || 'guide-art';
  $('#published').value = article.published || today;
  $('#editorial-note').value = article.editorial_note || '';
  $('#cta').value = article.cta || '';
  $('#sources').value = (article.sources || []).map(source => `${source[0]} | ${source[1]}`).join('\n');
  $('#sections').replaceChildren();
  (article.headings || []).forEach((heading, index) => addSection(heading, article.paragraphs?.[index] || ''));
  if (!$('#sections').children.length) addSection();
  $('#editor-mode').textContent = 'EDIT PUBLISHED ARTICLE';
  $('#editor-title').textContent = article.title;
  $('#publish-button').innerHTML = 'Save &amp; publish changes <span>↗</span>';
  $('#preview-link').href = `/insights/${slug}/`;
  message('#editor-message', `Editing the live article: /insights/${slug}/`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function parseSources() {
  return $('#sources').value.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const split = line.indexOf('|');
    return split < 0 ? [line, ''] : [line.slice(0, split).trim(), line.slice(split + 1).trim()];
  }).filter(row => row[0] && /^https:\/\//.test(row[1]));
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const sections = [...$('#sections').querySelectorAll('.section-row')];
  const payload = {
    slug: $('#slug').value || slugify($('#title').value),
    title: $('#title').value,
    seo_title: $('#seo-title').value,
    category: $('#category').value,
    excerpt: $('#excerpt').value,
    description: $('#description').value,
    answer: $('#answer').value,
    art: $('#art').value,
    published: $('#published').value || today,
    headings: sections.map(row => row.querySelector('.section-heading').value.trim()),
    paragraphs: sections.map(row => row.querySelector('.section-copy').value.trim()),
    sources: parseSources(),
    editorial_note: $('#editorial-note').value,
    cta: $('#cta').value
  };
  if (!payload.slug) payload.slug = slugify(payload.title);
  message('#editor-message', 'Publishing…');
  $('#publish-button').disabled = true;
  try {
    const originalSlug = $('#original-slug').value;
    const data = await request(`/api/articles${originalSlug ? `?slug=${encodeURIComponent(originalSlug)}` : ''}`, {
      method: originalSlug ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    await loadArticles();
    if (data.article) editArticle(data.article.slug);
    message('#editor-message', `Published. The live article is /insights/${data.article.slug}/`);
  } catch (error) {
    message('#editor-message', error.message, true);
  } finally {
    $('#publish-button').disabled = false;
  }
});

$('#title').addEventListener('input', () => {
  if (!$('#slug').readOnly) $('#slug').value = slugify($('#title').value);
});

function chunksFromText(text) {
  const normalized = String(text || '').replace(/\r/g, '').replace(/\u00a0/g, ' ').trim();
  const marked = normalized.split('\n').map(line => line.trim()).filter(Boolean);
  const headings = [];
  const paragraphs = [];
  let current = [];
  for (const line of marked) {
    const explicit = line.match(/^#{1,3}\s+(.+)$/);
    if (explicit && current.length) {
      headings.push(explicit[1].trim()); paragraphs.push(current.join(' ')); current = [];
    } else if (explicit) {
      headings.push(explicit[1].trim());
    } else {
      current.push(line.replace(/\s+/g, ' '));
    }
  }
  if (current.length) {
    if (!headings.length) headings.push('Article');
    paragraphs.push(current.join(' '));
  }
  if (headings.length > paragraphs.length) headings.length = paragraphs.length;
  if (paragraphs.length > headings.length) {
    while (headings.length < paragraphs.length) headings.push(`Section ${headings.length + 1}`);
  }
  return { headings, paragraphs };
}

async function extractDocx(file) {
  if (!window.mammoth) throw new Error('The Word document reader did not load. Check your internet connection and try again.');
  const result = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  const doc = new DOMParser().parseFromString(result.value, 'text/html');
  const headings = [];
  const paragraphs = [];
  let currentHeading = '';
  let currentText = [];
  const flush = () => {
    if (!currentText.length) return;
    headings.push(currentHeading || `Section ${headings.length + 1}`);
    paragraphs.push(currentText.join('\n\n'));
    currentText = [];
  };
  [...doc.body.children].forEach(node => {
    const tag = node.tagName.toLowerCase();
    const text = node.textContent.trim();
    if (!text) return;
    if (/^h[1-3]$/.test(tag)) { flush(); currentHeading = text; }
    else if (tag === 'p' || tag === 'li') currentText.push(text);
  });
  flush();
  if (!headings.length) return chunksFromText(doc.body.textContent);
  return { headings, paragraphs };
}

async function extractPdf(file) {
  if (!window.pdfjsLib) throw new Error('The PDF reader did not load. Check your internet connection and try again.');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pageText = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const lines = [];
    let lastY = null;
    content.items.forEach(item => {
      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 4) lines.push('\n');
      lines.push(item.str);
      lastY = y;
    });
    pageText.push(lines.join(' '));
  }
  const allText = pageText.join('\n\n').replace(/ +\n/g, '\n').replace(/\n +/g, '\n');
  const parsed = chunksFromText(allText);
  if (parsed.paragraphs.length === 1 && parsed.paragraphs[0].length > 1200) {
    parsed.headings = ['Article content'];
  }
  return parsed;
}

async function importFile(file) {
  message('#editor-message', `Reading ${file.name}…`);
  const ext = file.name.toLowerCase().split('.').pop();
  try {
    let imported;
    if (ext === 'docx') imported = await extractDocx(file);
    else if (ext === 'pdf') imported = await extractPdf(file);
    else imported = chunksFromText(await file.text());
    const firstText = imported.paragraphs[0] || '';
    if (!$('#title').value && imported.headings[0]) {
      $('#title').value = imported.headings[0];
      imported.headings.shift();
      if (imported.paragraphs.length > 1) imported.paragraphs.shift();
      else imported.headings = ['Article'];
      $('#slug').value = slugify($('#title').value);
    }
    $('#excerpt').value ||= firstText.slice(0, 220);
    $('#answer').value ||= firstText.slice(0, 500);
    $('#sections').replaceChildren();
    imported.headings.forEach((heading, index) => addSection(heading, imported.paragraphs[index] || ''));
    if (!$('#sections').children.length && firstText) addSection('Article', firstText);
    message('#editor-message', `Imported ${file.name}. Review the title and section breaks, then publish.`);
    $('#editor-title').textContent = $('#title').value || 'Review imported article';
  } catch (error) {
    message('#editor-message', error.message || 'Could not read this document.', true);
  } finally {
    $('#article-file').value = '';
  }
}

$('#article-file').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (file) importFile(file);
});

clearForm();
checkSession();
