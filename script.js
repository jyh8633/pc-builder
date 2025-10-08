const parts = ["cpu", "board", "ram", "gpu", "psu", "case"];
const selected = {};
const dataCache = {};

// JSON 데이터 로드
async function loadData() {
  for (const part of parts) {
    const res = await fetch(`data/compatibility/${part}.json`);
    dataCache[part] = await res.json();
  }
  renderSelectors();
}

// 부품 선택창 렌더링
function renderSelectors() {
  const builder = document.getElementById("builder-list");
  builder.innerHTML = "";

  parts.forEach((part) => {
    const div = document.createElement("div");
    div.className = "part-row";

    const label = document.createElement("label");
    label.textContent = part.toUpperCase();

    const select = document.createElement("select");
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "선택 없음";
    select.appendChild(option);

    dataCache[part].forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.model;
      opt.textContent = item.model;
      select.appendChild(opt);
    });

    select.addEventListener("change", () => {
      selected[part] = select.value
        ? dataCache[part].find((i) => i.model === select.value)
        : null;
      updateCompatibility();
    });

    div.appendChild(label);
    div.appendChild(select);
    builder.appendChild(div);
  });
}

// 양방향 호환성 필터
function updateCompatibility() {
  const cpu = selected.cpu;
  const board = selected.board;
  const ram = selected.ram;
  const gpu = selected.gpu;
  const psu = selected.psu;
  const pcCase = selected.case;

  // 1️⃣ CPU ↔ 보드 (소켓 일치)
  if (cpu && board && cpu.socket !== board.socket) {
    alert("CPU와 메인보드의 소켓이 맞지 않습니다!");
  }

  // 2️⃣ 보드 ↔ RAM (RAM 타입 일치)
  if (board && ram && board.ramType !== ram.type) {
    alert("메인보드와 RAM의 타입이 다릅니다!");
  }

  // 3️⃣ 케이스 ↔ GPU/PSU (길이 및 폼팩터)
  if (pcCase && gpu && gpu.length > pcCase.gpuMaxLength) {
    alert("그래픽카드가 케이스에 들어가지 않습니다!");
  }
  if (pcCase && psu && psu.capacity > pcCase.psuMaxLength) {
    alert("케이스의 파워서플라이 공간이 부족합니다!");
  }

  // 4️⃣ 총 전력 계산
  let totalPower = 0;
  [cpu, ram, gpu].forEach((item) => {
    if (item && item.power) totalPower += item.power;
  });
  if (psu && totalPower > psu.capacity) {
    alert("파워 용량이 부족합니다!");
  }

  // 선택 요약 표시
  const summary = document.getElementById("summaryText");
  const chosen = parts
    .map((p) => (selected[p] ? `${p.toUpperCase()}: ${selected[p].model}` : ""))
    .filter(Boolean)
    .join(" | ");
  summary.textContent = chosen || "선택된 부품이 없습니다.";
}

// 초기화
document.getElementById("resetBtn").addEventListener("click", () => {
  selected.cpu = selected.board = selected.ram = selected.gpu = selected.psu = selected.case = null;
  renderSelectors();
  document.getElementById("summaryText").textContent = "선택된 부품이 없습니다.";
});

loadData();
