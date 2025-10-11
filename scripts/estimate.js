// scripts/estimate.js
(function(){
  'use strict';
  const ROOT = document.getElementById('estimate-root');
  if(!ROOT) return; // 다른 페이지면 아무 동작 안 함

  // DOM
  const typeButtons = ROOT.querySelectorAll('.type-btn');
  const minInput = ROOT.querySelector('#minPrice');
  const maxInput = ROOT.querySelector('#maxPrice');
  const searchBtn = ROOT.querySelector('#searchBtn');
  const results = ROOT.querySelector('#estimateResults');

  const modal = document.getElementById('estimateModal');
  const modalBody = document.getElementById('modalBody');
  const modalClose = modal.querySelector('.modal-close');

  let currentType = null;
  let cachedData = [];

  // 포맷 함수 (한국식 천 단위 쉼표)
  function formatPrice(n){
    if (typeof n !== 'number') n = Number(n) || 0;
    return n.toLocaleString('ko-KR') + '원';
  }

  // 버튼 활성화 표시 (클래스는 기존 CSS에서 .active 재사용)
  typeButtons.forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      typeButtons.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentType = btn.dataset.type; // 'office' or 'game'
      await loadData(currentType); // 미리 불러오기 및 초기 표시
    });
  });

  // 데이터 로드 (캐시)
  async function loadData(type){
    try {
      const path = `data/estimates/${type}.json`;
      if(window._estimateCache && window._estimateCache[type]){
        cachedData = window._estimateCache[type];
      } else {
        const res = await fetch(path, {cache:'no-store'});
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        cachedData = json;
        window._estimateCache = window._estimateCache || {};
        window._estimateCache[type] = json;
      }
      displayList(cachedData);
    } catch(err){
      console.error('데이터 로드 실패', err);
      results.innerHTML = `<p>견적 데이터를 불러오는 중 오류가 발생했습니다.</p>`;
    }
  }

  // 검색 필터
  searchBtn.addEventListener('click', ()=>{
    if(!currentType){
      alert('먼저 사무용 또는 게이밍용을 선택하세요.');
      return;
    }
    const min = Number(minInput.value) || 0;
    const max = Number(maxInput.value) || Infinity;
    const filtered = (cachedData || []).filter(item => item.totalPrice >= min && item.totalPrice <= max);
    displayList(filtered);
  });

  // 결과 렌더 (카드형 그리드)
  function displayList(list){
    if(!Array.isArray(list) || list.length === 0){
      results.innerHTML = '<p>해당 조건에 맞는 견적이 없습니다.</p>';
      return;
    }

    // 가격대 요약
    const prices = list.map(i=>i.totalPrice);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    let html = `<div class="estimate-summary">총 ${list.length}개 • 가격대: ${formatPrice(minP)} ~ ${formatPrice(maxP)}</div>`;

    html += `<div class="estimate-grid">`;
    list.forEach((item, idx)=>{
      html += `
        <article class="estimate-card" data-idx="${idx}">
          <h3 class="estimate-title">${escapeHtml(item.name)}</h3>
          <p class="estimate-price">${formatPrice(item.totalPrice)}</p>
          <ul class="estimate-parts">
            ${item.parts.slice(0,4).map(p=>`<li><strong>${escapeHtml(p.category)}:</strong> ${escapeHtml(p.name)}</li>`).join('')}
          </ul>
          <div class="estimate-actions">
            <button class="btn-detail" data-idx="${idx}">상세보기</button>
          </div>
        </article>
      `;
    });
    html += `</div>`;
    results.innerHTML = html;

    // attach detail handlers (event delegation could also be used)
    results.querySelectorAll('.btn-detail').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const idx = Number(btn.dataset.idx);
        const dataItem = list[idx];
        showModal(dataItem);
      });
    });
  }

  // 간단한 HTML 이스케이프
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]); }

  // 모달 열기
  function showModal(item){
    if(!item) return;
    const partsHtml = item.parts.map(p=>`<tr><td style="padding:6px 8px;"><strong>${escapeHtml(p.category)}</strong></td><td style="padding:6px 8px;">${escapeHtml(p.name)}</td></tr>`).join('');
    modalBody.innerHTML = `
      <h2 style="margin-top:0">${escapeHtml(item.name)}</h2>
      <p style="margin:6px 0 12px 0; font-weight:600;">총 가격: ${formatPrice(item.totalPrice)}</p>
      <table style="width:100%; border-collapse:collapse;">${partsHtml}</table>
      ${item.note ? `<p style="margin-top:12px;"><em>${escapeHtml(item.note)}</em></p>` : ''}
    `;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden','false');
  }

  // 모달 닫기
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });
  function closeModal(){
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden','true');
    modalBody.innerHTML = '';
  }

  // 초기 안내
  results.innerHTML = '<p>용도를 선택하면 기본 견적 목록이 표시됩니다. 가격 범위를 입력하면 필터링 됩니다.</p>';
})();
