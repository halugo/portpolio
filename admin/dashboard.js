import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { convertImageToWebp, uploadToSupabase } from './upload-helpers.js';

const supabase = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

// ---------------------------------------------------------------
// 전역 상태
// ---------------------------------------------------------------
let state = {
  site_content: {},
  career_items: [],
  portfolio_items: [],
  sns_links: [],
};

const $ = (sel) => document.querySelector(sel);
const toastEl = $('#toast');

function showToast(message, type = 'success') {
  toastEl.textContent = message;
  toastEl.className = `show ${type}`;
  setTimeout(() => { toastEl.className = ''; }, 3000);
}

// 세션 만료 시각(exp, 초 단위 UNIX timestamp)에 맞춰 자동 로그아웃한다.
// setTimeout의 최대 지연시간(약 24.8일)보다 세션(1시간)이 훨씬 짧으므로 그대로 사용해도 안전하다.
function scheduleAutoLogout(expSeconds) {
  if (!expSeconds) return;
  const msUntilExpiry = expSeconds * 1000 - Date.now() + 1000; // 여유 1초
  if (msUntilExpiry <= 0) {
    forceLogout('세션이 만료되었습니다. 다시 로그인해주세요.');
    return;
  }
  setTimeout(() => {
    forceLogout('세션이 만료되어 자동으로 로그아웃되었습니다. 다시 로그인해주세요.');
  }, msUntilExpiry);
}

async function forceLogout(message) {
  showToast(message, 'error');
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  setTimeout(() => { window.location.href = '/admin/index.html'; }, 1200);
}

// ---------------------------------------------------------------
// 초기 로드
// ---------------------------------------------------------------
async function init() {
  const meRes = await fetch('/api/auth/me');
  const me = await meRes.json();
  if (!me.authenticated) {
    window.location.href = '/admin/index.html';
    return;
  }
  scheduleAutoLogout(me.exp);

  const res = await fetch('/api/admin/content');
  if (!res.ok) {
    showToast('콘텐츠를 불러오지 못했습니다.', 'error');
    return;
  }
  state = await res.json();

  fillSiteContentForm();
  renderCareerList();
  renderPortfolioList();
  renderSnsList();

  $('#loading').hidden = true;
  $('#app').hidden = false;
}

function fillSiteContentForm() {
  const sc = state.site_content || {};
  $('#f-name').value = sc.name || '';
  $('#f-role').value = sc.role_tagline || '';
  $('#f-birth').value = sc.birth_date || '';
  $('#f-region').value = sc.region || '';
  $('#f-edu').value = sc.education || '';
  $('#f-message').value = sc.message || '';
  $('#f-email').value = sc.email || '';
  $('#f-career-summary').value = sc.career_summary || '';
  updateAllDocsStatus();
}

function updateAllDocsStatus() {
  const name = state.site_content.all_docs_file_name;
  $('#f-alldocs-status').textContent = name ? `등록됨: ${name}` : '등록된 파일 없음';
}

// ---------------------------------------------------------------
// 02 경력
// ---------------------------------------------------------------
function renderCareerList() {
  const list = $('#career-list');
  list.innerHTML = '';
  state.career_items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <button type="button" class="remove-btn" data-remove-career="${index}">✕</button>
      <label>회사명</label>
      <input type="text" data-career-field="company_name" data-index="${index}" value="${escapeAttr(item.company_name || '')}">
      <label>재직 기간</label>
      <input type="text" data-career-field="period_text" data-index="${index}" value="${escapeAttr(item.period_text || '')}" placeholder="예: 2025.01 ~ 2026.01">
      <label>담당 업무 (한 줄에 하나씩)</label>
      <textarea rows="4" data-career-field="duties" data-index="${index}">${escapeHtml((item.duties || []).join('\n'))}</textarea>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('[data-remove-career]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.career_items.splice(Number(btn.dataset.removeCareer), 1);
      renderCareerList();
    });
  });
  list.querySelectorAll('[data-career-field]').forEach((input) => {
    input.addEventListener('input', () => {
      const idx = Number(input.dataset.index);
      const field = input.dataset.careerField;
      state.career_items[idx][field] = field === 'duties'
        ? input.value.split('\n').map((s) => s.trim()).filter(Boolean)
        : input.value;
    });
  });
}

$('#career-add-btn').addEventListener('click', () => {
  state.career_items.push({ company_name: '', period_text: '', duties: [] });
  renderCareerList();
});

// ---------------------------------------------------------------
// 03 포트폴리오
// ---------------------------------------------------------------
function renderPortfolioList() {
  const list = $('#portfolio-list');
  list.innerHTML = '';
  state.portfolio_items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'item-card';
    const previewType = item.preview_type || '';
    card.innerHTML = `
      <button type="button" class="remove-btn" data-remove-portfolio="${index}">✕</button>
      <label>포트폴리오명</label>
      <input type="text" data-pf-field="title" data-index="${index}" value="${escapeAttr(item.title || '')}">
      <label>내용 설명</label>
      <textarea rows="2" data-pf-field="description" data-index="${index}">${escapeHtml(item.description || '')}</textarea>

      <label>카드 클릭 시 미리보기 방식</label>
      <select data-pf-field="preview_type" data-index="${index}">
        <option value="" ${previewType === '' ? 'selected' : ''}>없음</option>
        <option value="image" ${previewType === 'image' ? 'selected' : ''}>이미지 여러 장</option>
        <option value="pdf" ${previewType === 'pdf' ? 'selected' : ''}>PDF</option>
      </select>

      <div data-pf-image-section="${index}" style="display:${previewType === 'image' ? 'block' : 'none'}">
        <label>미리보기 이미지 (여러 장 선택 가능, 자동 webp 변환)</label>
        <div class="file-row">
          <button type="button" class="file-btn" data-pf-image-btn="${index}">이미지 추가</button>
          <span class="file-status" data-pf-image-status="${index}">${(item.images || []).length}장 등록됨</span>
          <input type="file" accept="image/*" multiple hidden data-pf-image-input="${index}">
        </div>
        <div class="thumb-row" data-pf-thumb-row="${index}"></div>
      </div>

      <div data-pf-pdf-section="${index}" style="display:${previewType === 'pdf' ? 'block' : 'none'}">
        <label>미리보기 PDF</label>
        <div class="file-row">
          <button type="button" class="file-btn" data-pf-pdf-btn="${index}">PDF 선택</button>
          <span class="file-status" data-pf-pdf-status="${index}">${item.pdf_file_url ? '등록됨' : '등록된 파일 없음'}</span>
          <input type="file" accept="application/pdf" hidden data-pf-pdf-input="${index}">
        </div>
      </div>

      <label>다운로드 파일 (선택 — 미등록 시 공개 사이트에서 다운로드 버튼 미노출)</label>
      <div class="file-row">
        <button type="button" class="file-btn" data-pf-download-btn="${index}">파일 선택</button>
        <span class="file-status" data-pf-download-status="${index}">${item.download_file_name ? `등록됨: ${item.download_file_name}` : '등록된 파일 없음'}</span>
        <input type="file" hidden data-pf-download-input="${index}">
      </div>
    `;
    list.appendChild(card);
  });

  bindPortfolioEvents();
}

function bindPortfolioEvents() {
  const list = $('#portfolio-list');

  list.querySelectorAll('[data-remove-portfolio]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.portfolio_items.splice(Number(btn.dataset.removePortfolio), 1);
      renderPortfolioList();
    });
  });

  list.querySelectorAll('[data-pf-field]').forEach((el) => {
    el.addEventListener('input', () => {
      const idx = Number(el.dataset.index);
      state.portfolio_items[idx][el.dataset.pfField] = el.value;
    });
    el.addEventListener('change', () => {
      if (el.dataset.pfField === 'preview_type') {
        const idx = Number(el.dataset.index);
        state.portfolio_items[idx].preview_type = el.value || null;
        renderPortfolioList(); // 섹션 표시/숨김 갱신을 위해 다시 그림
      }
    });
  });

  list.querySelectorAll('[data-pf-image-btn]').forEach((btn) => {
    const idx = btn.dataset.pfImageBtn;
    btn.addEventListener('click', () => list.querySelector(`[data-pf-image-input="${idx}"]`).click());
  });
  list.querySelectorAll('[data-pf-image-input]').forEach((input) => {
    input.addEventListener('change', async () => {
      const idx = Number(input.dataset.pfImageInput);
      const files = Array.from(input.files || []);
      if (files.length === 0) return;
      const statusEl = list.querySelector(`[data-pf-image-status="${idx}"]`);
      statusEl.textContent = '업로드 중...';
      try {
        for (const file of files) {
          const webpBlob = await convertImageToWebp(file);
          const publicUrl = await uploadToSupabase(supabase, 'portfolio-images', file.name.replace(/\.[^.]+$/, '.webp'), webpBlob);
          if (!state.portfolio_items[idx].images) state.portfolio_items[idx].images = [];
          state.portfolio_items[idx].images.push({ image_url: publicUrl });
        }
        renderPortfolioList();
        showToast('이미지 업로드 완료');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  list.querySelectorAll('[data-pf-thumb-row]').forEach((row) => {
    const idx = Number(row.dataset.pfThumbRow);
    (state.portfolio_items[idx].images || []).forEach((img, imgIdx) => {
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.innerHTML = `<img src="${img.image_url}" alt=""><button type="button" data-remove-image="${idx}:${imgIdx}">✕</button>`;
      row.appendChild(thumb);
    });
  });
  list.querySelectorAll('[data-remove-image]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [idx, imgIdx] = btn.dataset.removeImage.split(':').map(Number);
      state.portfolio_items[idx].images.splice(imgIdx, 1);
      renderPortfolioList();
    });
  });

  list.querySelectorAll('[data-pf-pdf-btn]').forEach((btn) => {
    const idx = btn.dataset.pfPdfBtn;
    btn.addEventListener('click', () => list.querySelector(`[data-pf-pdf-input="${idx}"]`).click());
  });
  list.querySelectorAll('[data-pf-pdf-input]').forEach((input) => {
    input.addEventListener('change', async () => {
      const idx = Number(input.dataset.pfPdfInput);
      const file = input.files?.[0];
      if (!file) return;
      const statusEl = list.querySelector(`[data-pf-pdf-status="${idx}"]`);
      statusEl.textContent = '업로드 중...';
      try {
        const publicUrl = await uploadToSupabase(supabase, 'documents', file.name, file);
        state.portfolio_items[idx].pdf_file_url = publicUrl;
        statusEl.textContent = '등록됨';
        showToast('PDF 업로드 완료');
      } catch (err) {
        showToast(err.message, 'error');
        statusEl.textContent = '업로드 실패';
      }
    });
  });

  list.querySelectorAll('[data-pf-download-btn]').forEach((btn) => {
    const idx = btn.dataset.pfDownloadBtn;
    btn.addEventListener('click', () => list.querySelector(`[data-pf-download-input="${idx}"]`).click());
  });
  list.querySelectorAll('[data-pf-download-input]').forEach((input) => {
    input.addEventListener('change', async () => {
      const idx = Number(input.dataset.pfDownloadInput);
      const file = input.files?.[0];
      if (!file) return;
      const statusEl = list.querySelector(`[data-pf-download-status="${idx}"]`);
      statusEl.textContent = '업로드 중...';
      try {
        const publicUrl = await uploadToSupabase(supabase, 'documents', file.name, file);
        state.portfolio_items[idx].download_file_url = publicUrl;
        state.portfolio_items[idx].download_file_name = file.name;
        statusEl.textContent = `등록됨: ${file.name}`;
        showToast('파일 업로드 완료');
      } catch (err) {
        showToast(err.message, 'error');
        statusEl.textContent = '업로드 실패';
      }
    });
  });
}

$('#portfolio-add-btn').addEventListener('click', () => {
  state.portfolio_items.push({ title: '', description: '', preview_type: null, images: [], pdf_file_url: null, download_file_url: null, download_file_name: null });
  renderPortfolioList();
});

// ---------------------------------------------------------------
// 04 SNS
// ---------------------------------------------------------------
function renderSnsList() {
  const list = $('#sns-list');
  list.innerHTML = '';
  state.sns_links.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <button type="button" class="remove-btn" data-remove-sns="${index}">✕</button>
      <label>라벨 (관리용, 예: 인스타그램)</label>
      <input type="text" data-sns-field="label" data-index="${index}" value="${escapeAttr(item.label || '')}">
      <label>아이콘 이미지</label>
      <div class="file-row">
        <button type="button" class="file-btn" data-sns-icon-btn="${index}">이미지 선택</button>
        <span class="file-status" data-sns-icon-status="${index}">${item.icon_url ? '등록됨' : '등록된 파일 없음'}</span>
        <input type="file" accept="image/*" hidden data-sns-icon-input="${index}">
        ${item.icon_url ? `<img src="${item.icon_url}" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : ''}
      </div>
      <label>이동 URL</label>
      <input type="text" data-sns-field="link_url" data-index="${index}" value="${escapeAttr(item.link_url || '')}" placeholder="https://...">
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('[data-remove-sns]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.sns_links.splice(Number(btn.dataset.removeSns), 1);
      renderSnsList();
    });
  });
  list.querySelectorAll('[data-sns-field]').forEach((input) => {
    input.addEventListener('input', () => {
      state.sns_links[Number(input.dataset.index)][input.dataset.snsField] = input.value;
    });
  });
  list.querySelectorAll('[data-sns-icon-btn]').forEach((btn) => {
    const idx = btn.dataset.snsIconBtn;
    btn.addEventListener('click', () => list.querySelector(`[data-sns-icon-input="${idx}"]`).click());
  });
  list.querySelectorAll('[data-sns-icon-input]').forEach((input) => {
    input.addEventListener('change', async () => {
      const idx = Number(input.dataset.snsIconInput);
      const file = input.files?.[0];
      if (!file) return;
      const statusEl = list.querySelector(`[data-sns-icon-status="${idx}"]`);
      statusEl.textContent = '업로드 중...';
      try {
        const webpBlob = await convertImageToWebp(file);
        const publicUrl = await uploadToSupabase(supabase, 'sns-icons', file.name.replace(/\.[^.]+$/, '.webp'), webpBlob);
        state.sns_links[idx].icon_url = publicUrl;
        renderSnsList();
        showToast('아이콘 업로드 완료');
      } catch (err) {
        showToast(err.message, 'error');
        statusEl.textContent = '업로드 실패';
      }
    });
  });
}

$('#sns-add-btn').addEventListener('click', () => {
  state.sns_links.push({ label: '', icon_url: null, link_url: '' });
  renderSnsList();
});

// ---------------------------------------------------------------
// 내소개: 문서 한번에 받기 파일
// ---------------------------------------------------------------
$('#f-alldocs-btn').addEventListener('click', () => $('#f-alldocs-input').click());
$('#f-alldocs-input').addEventListener('change', async () => {
  const file = $('#f-alldocs-input').files?.[0];
  if (!file) return;
  $('#f-alldocs-status').textContent = '업로드 중...';
  try {
    const publicUrl = await uploadToSupabase(supabase, 'documents', file.name, file);
    state.site_content.all_docs_file_url = publicUrl;
    state.site_content.all_docs_file_name = file.name;
    updateAllDocsStatus();
    showToast('파일 업로드 완료');
  } catch (err) {
    showToast(err.message, 'error');
    updateAllDocsStatus();
  }
});

// ---------------------------------------------------------------
// 저장
// ---------------------------------------------------------------
$('#save-btn').addEventListener('click', async () => {
  state.site_content.name = $('#f-name').value;
  state.site_content.role_tagline = $('#f-role').value;
  state.site_content.birth_date = $('#f-birth').value;
  state.site_content.region = $('#f-region').value;
  state.site_content.education = $('#f-edu').value;
  state.site_content.message = $('#f-message').value;
  state.site_content.email = $('#f-email').value;
  state.site_content.career_summary = $('#f-career-summary').value || null;

  const saveBtn = $('#save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = '저장 중...';

  try {
    const res = await fetch('/api/admin/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    if (res.status === 401) {
      await forceLogout('세션이 만료되어 저장하지 못했습니다. 다시 로그인 후 시도해주세요.');
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '저장에 실패했습니다.');
    showToast('저장 완료! 공개 사이트에 반영되었습니다.');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '전체 저장';
  }
});

// ---------------------------------------------------------------
// 로그아웃
// ---------------------------------------------------------------
$('#logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/admin/index.html';
});

// ---------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------
function escapeHtml(str) {
  return String(str).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

init();
