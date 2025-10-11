let selectedType = null;

const btnOffice = document.getElementById('btn-office');
const btnGaming = document.getElementById('btn-gaming');
const minPriceInput = document.getElementById('min-budget');
const maxPriceInput = document.getElementById('max-budget');
const btnShow = document.getElementById('btn-show');
const resultEl = document.getElementById('result');
const logo = document.getElementById('logo');

btnOffice.addEventListener('click', ()=>{ selectType('office'); });
btnGaming.addEventListener('click', ()=>{ selectType('game'); });
btnShow.addEventListener('click', showEstimate);
logo.addEventListener('click', ()=>{ window.location.href = 'index.html'; });

[minPriceInput, maxPriceInput].forEach((input) => {
  input.addEventListener('input', () => formatCurrency(input));
  input.addEventListener('keydown', (e) => handleArrowKeys(e, input));
});

function selectType(type){
  selectedType = type;
  btnOffice.classList.toggle('active', type==='office');
  btnGaming.classList.toggle('active', type==='game');
}

function formatCurrency(input){
  let value = input.value.replace(/,/g, "");
  if(!value) return;
  value = parseInt(value, 10);
  if(isNaN(value)) value = 0;
  input.value = value.toLocaleString('ko-KR');
}

function handleArrowKeys(e, input){
  if(e.key === "ArrowUp" || e.key === "ArrowDown"){
    e.preventDefault();
    let value = parseInt(input.value.replace(/,/g,"")) || 0;
    value += (e.key === "ArrowUp" ? 50000 : -50000);
    if(value < 0) value = 0;
    input.value = value.toLocaleString('ko-KR');
  }
}

async function showEstimate(){
  if(!selectedType){
    alert('먼저 용도를 선택하세요!');
    return;
  }

  const minBudget = parseInt(minPriceInput.value.replace(/,/g,'')) || 0;
  const maxBudget = parseInt(maxPriceInput.value.replace(/,/g,'')) || 0;

  if(minBudget <= 0 || maxBudget <= 0 || minBudget > maxBudget){
    alert('올바른 예산 범위를 입력하세요!');
    return;
  }

  const res = await fetch(`data/estimates/${selectedType}.json`);
  const ESTIMATES = await res.json();

  const filtered = ESTIMATES.filter(e => e.budget >= minBudget && e.budget <= maxBudget);
  if(filtered.length === 0){
    resultEl.innerHTML = "<p>해당 예산에 맞는 견적이 없습니다.</p>";
    return;
  }

  renderEstimates(filtered);
}

function renderEstimates(list){
  resultEl.innerHTML = "";
  list.forEach(estimate => {
    const c = estimate.config;
    const card = document.createElement('div');
    card.className = "estimate-card";
    card.innerHTML = `
      <h3>추천 견적</h3>
      <p><strong>CPU:</strong> ${c.cpu}</p>
      <p><strong>메인보드:</strong> ${c.mobo}</p>
      <p><strong>RAM:</strong> ${c.ram}</p>
      <p><strong>GPU:</strong> ${c.gpu}</p>
      <p><strong>PSU:</strong> ${c.psu}</p>
      <p><strong>Case:</strong> ${c.case}</p>
      <p><strong>성능 설명:</strong> ${estimate.note}</p>
      <p><strong>예산 기준:</strong> ${estimate.budget.toLocaleString('ko-KR')}원</p>
    `;
    resultEl.appendChild(card);
  });
}
