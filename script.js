import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4/build/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4/build/pdf.worker.min.mjs';

// 공개 사이트는 Supabase에 읽기 전용(anon key)으로 접속합니다.
// anon key는 RLS(공개 읽기 정책)로 보호되어 있어 브라우저에 노출돼도 안전합니다.
const supabase = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

// Supabase 연결이 안 되거나 데이터가 비어있을 때 사용할 기본값 (화면이 완전히 비지 않도록)
const FALLBACK = {
  site_content: {
    name: '김이주', role_tagline: 'Web · Service Planner',
    birth_date: '1986.06.12', region: '경기도 군포',
    education: '서울 방송통신대학교 컴퓨터과학과',
    message: '약 15회 웹 기획 구축과 모바일게임 및 웹 서비스 기획 경험을 고루 가지고 있습니다.',
    email: 'halugo85@gmail.com', career_summary: '총 13년 (웹기획 7년, 서비스기획 6년)',
    all_docs_file_url: null,
  },
  career_items: [],
  portfolio_items: [],
  sns_links: [],
};

// =========================================================
// 1) 데이터 로드
// =========================================================
async function loadData() {
  try {
    const [siteRes, careerRes, portfolioRes, imagesRes, snsRes] = await Promise.all([
      supabase.from('site_content').select('*').limit(1).maybeSingle(),
      supabase.from('career_items').select('*').order('sort_order', { ascending: true }),
      supabase.from('portfolio_items').select('*').order('sort_order', { ascending: true }),
      supabase.from('portfolio_images').select('*').order('sort_order', { ascending: true }),
      supabase.from('sns_links').select('*').order('sort_order', { ascending: true }),
    ]);

    const site_content = siteRes.data || FALLBACK.site_content;
    const career_items = careerRes.data && careerRes.data.length ? careerRes.data : FALLBACK.career_items;
    const portfolio_items = (portfolioRes.data || []).map((item) => ({
      ...item,
      images: (imagesRes.data || []).filter((img) => img.portfolio_id === item.id),
    }));
    const sns_links = (snsRes.data || []).filter((s) => s.icon_url && s.link_url);

    return { site_content, career_items, portfolio_items, sns_links };
  } catch (err) {
    console.error('Supabase 데이터 로드 실패, 기본값으로 표시합니다.', err);
    return FALLBACK;
  }
}

// =========================================================
// 2) 렌더링
// =========================================================
function renderSiteContent(sc) {
  document.querySelectorAll('[data-field="name"]').forEach((el) => { el.textContent = sc.name || ''; });
  document.querySelectorAll('[data-field="role"]').forEach((el) => { el.textContent = sc.role_tagline || ''; });
  document.querySelectorAll('[data-field="email"]').forEach((el) => {
    el.textContent = sc.email || '';
    el.href = `mailto:${sc.email || ''}`;
  });

  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value || ''; };
  setText('pf-birth', sc.birth_date);
  setText('pf-region', sc.region);
  setText('pf-edu', sc.education);
  setText('pf-message', sc.message);

  const noteEl = document.querySelector('[data-field="career-note"]');
  if (noteEl) {
    if (sc.career_summary) { noteEl.textContent = sc.career_summary; noteEl.style.display = ''; }
    else { noteEl.style.display = 'none'; }
  }

  const downloadAllEl = document.querySelector('[data-field="download-all"]');
  if (downloadAllEl) {
    if (sc.all_docs_file_url) { downloadAllEl.href = sc.all_docs_file_url; downloadAllEl.style.display = ''; }
    else { downloadAllEl.style.display = 'none'; }
  }
}

function renderCareer(items) {
  const timeline = document.getElementById('timeline');
  if (!timeline || items.length === 0) return; // 데이터 없으면 기존 정적 예시를 그대로 둠
  timeline.innerHTML = '';
  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const li = document.createElement('li');
    li.className = 'timeline-item reveal' + (isLast ? ' timeline-item-last' : '');
    const duties = (item.duties || []).map((d) => `<li>${escapeHtml(d)}</li>`).join('');
    li.innerHTML = `
      <div class="timeline-rail" aria-hidden="true">
        <span class="timeline-dot"></span>
        ${isLast ? '' : '<span class="timeline-line"></span>'}
      </div>
      <div class="career-card">
        <div class="career-head">
          <h3 class="career-company">${escapeHtml(item.company_name)}</h3>
          <span class="career-period">${escapeHtml(item.period_text)}</span>
        </div>
        <ul class="career-duties">${duties}</ul>
      </div>`;
    timeline.appendChild(li);
  });
}

function renderPortfolio(items) {
  const grid = document.getElementById('portfolio-grid');
  if (!grid || items.length === 0) return; // 데이터 없으면 기존 정적 예시를 그대로 둠
  grid.innerHTML = '';
  items.forEach((item) => {
    const article = document.createElement('article');
    article.className = 'portfolio-card reveal' + (item.download_file_url ? ' has-download' : '');

    const downloadHtml = item.download_file_url ? `
      <a href="${item.download_file_url}" class="card-download" download>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v12m0 0l-5-5m5 5l5-5M5 20h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        문서 다운로드
      </a>` : '';

    article.innerHTML = `
      <span class="accent-bar" aria-hidden="true"></span>
      <button class="card-open" type="button" aria-haspopup="dialog">
        <div class="card-head">
          <h3 class="card-title">${escapeHtml(item.title)}</h3>
          <svg class="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <p class="card-desc">${escapeHtml(item.description || '')}</p>
      </button>
      ${downloadHtml}`;

    const openBtn = article.querySelector('.card-open');
    if (item.preview_type === 'image' && item.images && item.images.length > 0) {
      openBtn.addEventListener('click', () => openImageLightbox(item.title, item.images));
    } else if (item.preview_type === 'pdf' && item.pdf_file_url) {
      openBtn.addEventListener('click', () => openPdfLightbox(item.title, item.pdf_file_url));
    } else {
      openBtn.style.cursor = 'default';
    }

    grid.appendChild(article);
  });
}

function renderSns(links) {
  const row = document.getElementById('sns-row');
  if (!row || links.length === 0) return; // 데이터 없으면 기존 정적 예시를 그대로 둠
  row.innerHTML = '';
  links.forEach((link) => {
    const a = document.createElement('a');
    a.className = 'sns-btn';
    a.href = link.link_url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', link.label || 'SNS');
    a.innerHTML = `<img src="${link.icon_url}" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover;">`;
    row.appendChild(a);
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

// =========================================================
// 3) 저작권 연도 자동 표기
// =========================================================
document.getElementById('copyright-year').textContent = `© ${new Date().getFullYear()}`;

// =========================================================
// 4) 스크롤 리빌 애니메이션 (동적 렌더링 이후에 실행되어야 새 요소도 감시함)
// =========================================================
function initScrollReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || targets.length === 0) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  targets.forEach((el) => observer.observe(el));
}

// =========================================================
// 5) 레이어팝업 (이미지 / PDF 미리보기)
// =========================================================
const lightbox = document.getElementById('lightbox');
const titleEl = document.getElementById('lightbox-title');
const slideEl = document.getElementById('lightbox-slide');
const indicatorEl = document.getElementById('lightbox-indicator');
const prevBtn = lightbox.querySelector('.lightbox-prev');
const nextBtn = lightbox.querySelector('.lightbox-next');
const closeBtn = lightbox.querySelector('.lightbox-close');

let mode = null;          // 'image' | 'pdf'
let currentIndex = 0;
let totalSlides = 1;
let currentImages = [];
let pdfDoc = null;
let lastFocusedEl = null;

function updateNavVisibility() {
  prevBtn.hidden = currentIndex === 0;
  nextBtn.hidden = currentIndex === totalSlides - 1;
}

async function renderImageSlide() {
  slideEl.innerHTML = '';
  const img = document.createElement('img');
  img.src = currentImages[currentIndex].image_url;
  img.alt = titleEl.textContent;
  img.style.maxWidth = '100%';
  img.style.maxHeight = '100%';
  img.style.objectFit = 'contain';
  slideEl.appendChild(img);
  indicatorEl.textContent = `${currentIndex + 1} / ${totalSlides}`;
  updateNavVisibility();
}

async function renderPdfSlide() {
  slideEl.textContent = '불러오는 중...';
  const page = await pdfDoc.getPage(currentIndex + 1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.maxWidth = '100%';
  canvas.style.maxHeight = '100%';
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  slideEl.innerHTML = '';
  slideEl.appendChild(canvas);
  indicatorEl.textContent = `PDF ${currentIndex + 1} / ${totalSlides} 페이지`;
  updateNavVisibility();
}

function openLightboxShell(title) {
  titleEl.textContent = title;
  currentIndex = 0;
  lastFocusedEl = document.activeElement;
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  closeBtn.focus();
}

async function openImageLightbox(title, images) {
  mode = 'image';
  currentImages = images;
  totalSlides = images.length;
  openLightboxShell(title);
  await renderImageSlide();
}

async function openPdfLightbox(title, pdfUrl) {
  mode = 'pdf';
  openLightboxShell(title);
  slideEl.textContent = 'PDF를 불러오는 중...';
  try {
    pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
    totalSlides = pdfDoc.numPages;
    await renderPdfSlide();
  } catch (err) {
    slideEl.textContent = 'PDF를 불러오지 못했습니다.';
    console.error(err);
  }
}

function closeLightbox() {
  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  pdfDoc = null;
  if (lastFocusedEl) lastFocusedEl.focus();
}

prevBtn.addEventListener('click', async () => {
  if (currentIndex <= 0) return;
  currentIndex -= 1;
  mode === 'pdf' ? await renderPdfSlide() : await renderImageSlide();
});
nextBtn.addEventListener('click', async () => {
  if (currentIndex >= totalSlides - 1) return;
  currentIndex += 1;
  mode === 'pdf' ? await renderPdfSlide() : await renderImageSlide();
});
closeBtn.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft' && !prevBtn.hidden) prevBtn.click();
  if (e.key === 'ArrowRight' && !nextBtn.hidden) nextBtn.click();
});
document.querySelectorAll('.card-download').forEach((btn) => {
  btn.addEventListener('click', (e) => e.stopPropagation());
});

// =========================================================
// 초기 실행
// =========================================================
(async function main() {
  const data = await loadData();
  renderSiteContent(data.site_content);
  renderCareer(data.career_items);
  renderPortfolio(data.portfolio_items);
  renderSns(data.sns_links);
  initScrollReveal();
})();
