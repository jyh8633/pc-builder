const officeBtn = document.getElementById("officeBtn");
const gameBtn = document.getElementById("gameBtn");
const searchBtn = document.getElementById("searchEstimates");
const minPriceInput = document.getElementById("minPrice");
const maxPriceInput = document.getElementById("maxPrice");
const resultDiv = document.getElementById("estimateResults");

let selectedType = ""; // 'office' or 'game'

// --- 천 단위 콤마 자동 입력 ---
function formatCurrency(input) {
  const value = input.value.replace(/,/g, "");
  if (!value) return;
  input.value = Number(value).toLocaleString("ko-KR");
}

// --- 버튼 상태 토글 ---
function setActiveButton(type) {
  selectedType = type;
  [officeBtn, gameBtn].forEach((btn) => btn.classList.remove("active"));
  document.getElementById(`${type}Btn`).classList.add("active");
}

// --- 가격 입력에 콤마 적용 ---
[minPriceInput, maxPriceInput].forEach((input) => {
  input.addEventListener("input", () => formatCurrency(input));
});

// --- 가격 입력 상하조정 (5만 단위로) ---
[minPriceInput, maxPriceInput].forEach((input) => {
  input.step = 50000;
});

// --- 버튼 클릭 이벤트 ---
officeBtn.addEventListener("click", () => setActiveButton("office"));
gameBtn.addEventListener("click", () => setActiveButton("game"));

// --- 견적 검색 ---
searchBtn.addEventListener("click", async () => {
  if (!selectedType) {
    alert("사무용 또는 게임용 중 하나를 선택해주세요.");
    return;
  }

  const min = Number(minPriceInput.value.replace(/,/g, "")) || 0;
  const max = Number(maxPriceInput.value.replace(/,/g, "")) || Infinity;

  try {
    const response = await fetch(`data/estimates/${selectedType}.json`);
    const data = await response.json();

    const filtered = data.filter(
      (item) => item.totalPrice >= min && item.totalPrice <= max
    );

    displayResults(filtered);
  } catch (err) {
    console.error("견적 데이터를 불러오는 중 오류 발생:", err);
    resultDiv.innerHTML = "<p>데이터를 불러오는 중 문제가 발생했습니다.</p>";
  }
});

// --- 결과 표시 (카드형) ---
function displayResults(list) {
  if (list.length === 0) {
    resultDiv.innerHTML = "<p>해당 가격대에 맞는 견적이 없습니다.</p>";
    return;
  }

  resultDiv.innerHTML = list
    .map(
      (item) => `
      <div class="card" style="margin:15px; padding:15px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <h3>${item.name}</h3>
        <p><strong>CPU:</strong> ${item.cpu}</p>
        <p><strong>GPU:</strong> ${item.gpu}</p>
        <p><strong>RAM:</strong> ${item.ram}</p>
        <p><strong>저장장치:</strong> ${item.storage}</p>
        <p><strong>예상가격:</strong> ${item.totalPrice.toLocaleString("ko-KR")} 원</p>
      </div>
    `
    )
    .join("");
}
