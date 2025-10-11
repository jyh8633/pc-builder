// scripts/estimate.js
(function () {
  'use strict';

  // 1) 페이지에 estimate 루트가 있는지 검사 — 없으면 종료 (충돌 방지)
  const ROOT = document.getElementById('estimate-root');
  if (!ROOT) return;

  // 2) 루트 내부에서 DOM을 안전하게 찾음
  const btnOffice = ROOT.querySelector('#btn-office');
  const btnGaming = ROOT.querySelector('#btn-gaming');
  const inputBudget = ROOT.querySelector('#input-budget');
  const btnShow = ROOT.querySelector('#btn-show');
  const resultEl = ROOT.querySelector('#result');
  const logo = document.getElementById('logo'); // 헤더 로고(전역)에 있으면 연결

  // 3) 내부 상태 (전역 오염 없음)
  let selectedType = null;

  // 4) 간단한 유틸: 에러/메시지 표시
  function showMessage(html, kind = 'info') {
    resultEl.innerHTML = `<div class="estimate-message ${kind}">${html}</div>`;
  }

  // 5) 데이터 캐시 & fetch 안전 래퍼
  async function fetchEstimates() {
    if (window.__ESTIMATES_CACHE) return window.__ESTIMATES_CACHE;
    try {
      const res = await fetch('data/estimate/견적.json', {cache: 'no-store'});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      window.__ESTIMATES_CACHE = json; // 전역 캐시: 같은 파일 여러 번 부르는 것을 방지
      return json;
    } catch (err) {
      showMessage(`데이터를 불러오는 데 실패했습니다: ${err.message}`, 'error');
      return null;
    }
  }

  // 6) 타입 선택
  function selectType(type) {
    selectedType = type;
    if (btnOffice) btnOffice.classList.toggle('active', type === 'office');
    if (btnGaming) btnGaming.classList.toggle('active', type === 'gaming');
    // 메시지 초기화
    resultEl.innerHTML = '';
  }

  // 7) 가장 가까운 예산 항목 찾기 (reduce 사용)
  function findClosest(list, budget) {
    if (!Array.isArray(list) || list.length === 0) return null;
    return list.reduce((prev, cur) => {
      return Math.abs(cur.budget - budget) < Math.abs(prev.budget - budget) ? cur : prev;
    }, list[0]);
  }

  // 8) 추출된 견적 렌더링 (DOM 직접 삽입)
  function renderEstimate(estimate) {
    if (!estimate) {
      showMessage('해당 조건에 맞는 추천 견적이 없습니다.', 'warning');
      return;
    }

    const c = estimate.config || {};
    // 안전하게 DOM 생성
    const wrap = document.createElement('div');
    wrap.className = 'estimate-card';

    const title = document.createElement('h3');
    title.textContent = '추천 견적';
    wrap.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'estimate-list';
    const rows = [
      ['CPU', c.cpu],
      ['메인보드', c.mobo],
      ['RAM', c.ram],
      ['GPU', c.gpu],
      ['저장장치', c.storage || c.storage || ''],
      ['PSU', c.psu],
      ['케이스', c.case]
    ];

    rows.forEach(([k, v]) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${k}:</strong> ${v || '-'}`;
      list.appendChild(li);
    });
    wrap.appendChild(list);

    if (estimate.note) {
      const note = document.createElement('p');
      note.className = 'estimate-note';
      note.innerHTML = `<strong>성능 설명:</strong> ${estimate.note}`;
      wrap.appendChild(note);
    }

    const budgetInfo = document.createElement('p');
    budgetInfo.className = 'estimate-budget';
    budgetInfo.innerHTML = `<strong>예산 기준:</strong> ${estimate.budget}만원`;
    wrap.appendChild(budgetInfo);

    resultEl.innerHTML = '';       // 초기화
    resultEl.appendChild(wrap);
  }

  // 9) '추천 견적 보기' 실제 로직
  async function showEstimate() {
    resultEl.innerHTML = ''; // 초기화
    if (!selectedType) {
      showMessage('먼저 용도를 선택하세요.', 'error');
      return;
    }

    const budgetVal = Number(inputBudget.value);
    if (!budgetVal || budgetVal <= 0) {
      showMessage('올바른 예산을 숫자로 입력하세요.', 'error');
      return;
    }

    const ESTIMATES = await fetchEstimates();
    if (!ESTIMATES) return; // 오류 메시지는 fetchEstimates에서 이미 표시

    const list = ESTIMATES[selectedType];
    if (!Array.isArray(list) || list.length === 0) {
      showMessage('선택한 용도에 대한 견적 데이터가 없습니다.', 'error');
      return;
    }

    const closest = findClosest(list, budgetVal);
    // 추가 설명: 예산보다 충분히 낮은 항목만 골라주고 싶으면 조건 추가 가능
    renderEstimate(closest);
  }

  // 10) 이벤트 바인딩 (루트 내부에서만)
  if (btnOffice) btnOffice.addEventListener('click', () => selectType('office'));
  if (btnGaming) btnGaming.addEventListener('click', () => selectType('gaming'));
  if (btnShow) btnShow.addEventListener('click', showEstimate);
  if (logo) logo.addEventListener('click', () => { window.location.href = 'index.html'; });

  // 11) 초기 메시지
  resultEl.innerHTML = '<p class="muted">용도와 예산을 입력하고 "추천 견적 보기" 버튼을 눌러주세요.</p>';
})();

