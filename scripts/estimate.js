let selectedType = null;

const btnOffice = document.getElementById('btn-office');
const btnGaming = document.getElementById('btn-gaming');
const inputBudget = document.getElementById('input-budget');
const btnShow = document.getElementById('btn-show');
const resultEl = document.getElementById('result');
const logo = document.getElementById('logo');

btnOffice.addEventListener('click', () => selectType('office'));
btnGaming.addEventListener('click', () => selectType('gaming'));
btnShow.addEventListener('click', showEstimate);
logo.addEventListener('click', () => window.location.href = 'index.html');

function selectType(type) {
  selectedType = type;
  btnOffice.classList.toggle('active', type === 'office');
  btnGaming.classList.toggle('active', type === 'gaming');
}

async function showEstimate() {
  if (!selectedType) return alert('먼저 용도를 선택하세요!');
  const budget = Number(inputBudget.value);
  if (isNaN(budget) || budget <= 0) return alert('올바른 예산을 입력하세요!');

  const res = await fetch('data/estimate/견적.json');
  const ESTIMATES = await res.json();
  const list = ESTIMATES[selectedType];

  let closest = list[0];
  let diff = Math.abs(budget - closest.budget);
  for (let i = 1; i < list.length; i++) {
    const d = Math.abs(budget - list[i].budget);
    if (d < diff) { closest = list[i]; diff = d; }
  }

  renderEstimate(closest);
}

function renderEstimate(estimate) {
  const c = estimate.config;
  resultEl.innerHTML = `
    <div class="estimate-card">
      <h3>추천 견적</h3>
      <p><strong>CPU:</strong> ${c.cpu}</p>
      <p><strong>메인보드:</strong> ${c.mobo}</p>
      <p><strong>RAM:</strong> ${c.ram}</p>
      <p><strong>GPU:</strong> ${c.gpu}</p>
      <p><strong>PSU:</strong> ${c.psu}</p>
      <p><strong>Case:</strong> ${c.case}</p>
      <p><strong>성능 설명:</strong> ${estimate.note}</p>
      <p><strong>예산 기준:</strong> ${estimate.budget}만원</p>
    </div>
  `;
}
