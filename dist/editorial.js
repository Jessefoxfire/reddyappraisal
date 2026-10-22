const header=document.querySelector('#header'),menu=document.querySelector('.menu'),nav=document.querySelector('nav');
function updateHeader(){header.classList.toggle('compact',scrollY>50)}window.addEventListener('scroll',updateHeader,{passive:true});updateHeader();
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');nav.classList.toggle('open',open);menu.textContent=open?'×':'☰'});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){menu.click();menu.focus()}});
const year=document.querySelector('#year');if(year)year.textContent=new Date().getFullYear();
(()=>{
  const api='/api/articles';
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const articleUrl=article=>`/insights/${encodeURIComponent(article.slug)}/`;
  const card=article=>`<article class="insight-card"><a class="insight-art ${escapeHtml(article.art||'guide-art')}" href="${articleUrl(article)}" aria-label="${escapeHtml(article.title)}"><span>${escapeHtml(article.category)}</span><b aria-hidden="true">↗</b></a><div class="insight-card-copy"><p class="eyebrow">${escapeHtml(new Date(`${article.published||''}T12:00:00Z`).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).toUpperCase())} · ${Number(article.minutes)||1} MIN READ</p><h2><a href="${articleUrl(article)}">${escapeHtml(article.title)}</a></h2><p>${escapeHtml(article.excerpt)}</p><a class="under-link" href="${articleUrl(article)}">Read article <span aria-hidden="true">↗</span></a></div></article>`;
  function refreshList(items){
    const grid=document.querySelector('.insights-library .insights-grid');
    if(!grid||grid.classList.contains('home-insights-grid'))return;
    const active=document.querySelector('.category-nav [aria-current="page"]');
    const chosen=active&&active.textContent?active.textContent.replace(/\s+\d+\s*$/,'').trim():'';
    const current=new Set([...grid.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')));
    items.filter(article=>!chosen||chosen==='All insights'||article.category===chosen).forEach(article=>{
      const href=articleUrl(article);
      if(current.has(href))return;
      grid.insertAdjacentHTML('beforeend',card(article));
      current.add(href);
    });
  }
  function hydrateArticle(article){
    const title=document.querySelector('.article-heading h1');
    if(!title)return;
    title.textContent=article.title||title.textContent;
    const deck=document.querySelector('.article-deck');if(deck)deck.textContent=article.excerpt||deck.textContent;
    const answer=document.querySelector('.answer-box p:last-child');if(answer)answer.textContent=article.answer||article.excerpt||answer.textContent;
    const meta=document.querySelector('.article-meta');
    if(meta){const date=meta.querySelector('time');if(date){date.dateTime=article.published||'';date.textContent=new Date(`${article.published||''}T12:00:00Z`).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});}const spans=meta.querySelectorAll('span');if(spans.length>1)spans[spans.length-1].textContent=`${Number(article.minutes)||1} min read`;}
    const body=document.querySelector('.article-body');
    if(body){
      const sourceSection=body.querySelector('.article-sources');
      const service=body.querySelector('.article-service');
      body.querySelectorAll('section[id^="section-"]').forEach(section=>section.remove());
      (article.headings||[]).forEach((heading,index)=>{const section=document.createElement('section');section.id=`section-${index}`;const h=document.createElement('h2');h.textContent=heading;const p=document.createElement('p');p.textContent=article.paragraphs?.[index]||'';section.append(h,p);body.insertBefore(section,sourceSection||service||null);});
      if(sourceSection){const note=sourceSection.querySelector('p');if(note)note.textContent=article.editorial_note||note.textContent;}
      const cta=body.querySelector('.article-service > p:not(.eyebrow)');if(cta&&article.cta)cta.textContent=article.cta;
    }
  }
  fetch(api,{cache:'no-store'}).then(response=>response.ok?response.json():[]).then(items=>{
    if(!Array.isArray(items))return;
    refreshList(items);
    const slug=location.pathname.match(/^\/insights\/([^/]+)\/?$/)?.[1];
    if(slug)fetch(`${api}?slug=${encodeURIComponent(slug)}`,{cache:'no-store'}).then(response=>response.ok?response.json():null).then(article=>article&&hydrateArticle(article)).catch(()=>{});
  }).catch(()=>{});
})();
