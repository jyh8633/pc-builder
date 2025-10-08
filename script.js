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

// 선택창 렌더링
function renderSelectors() {
  const builder = document.getElementById("builder");
  builder.innerHTML = "";

  parts.forEach(part => {
    const label = document.createElement("label");
    label.textContent = `${part.toUpperCase()}: `;

    const select = document.createElement("select");
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "선택 안 함";
    select.appendChild(empty);

    dataCache[part].forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.model;
      opt.textContent = item.model;
      select.appendChild(opt);
    });

    select.addEventListener("change", () => {
      selected[part] = select.value ? dataCache[part].find(i => i.model === select.value) : null;
      checkCompatibility();
    });

    builder.appendChild(label);
    builder.appendChild(select);
    builder.appendChild(document.createElement("br"));
  });
}

// 호환성 검사
function checkCompatibility() {
  let msg = [];

  const cpu = selected.cpu;
  const board = selected.board;
  const ram = selected.ram;
  const gpu = selected.gpu;
  const psu = selected.psu;
  const pcCase = selected.case;

  // 1️⃣ CPU ↔ BOARD
  if (cpu && board && cpu.socket !== board.socket) {
    msg.push("❌ CPU와 메인보드의 소켓이 호환되지 않습니다.");
  }

  // 2️⃣ CPU ↔ RAM
  if (cpu && ram && board && ram.type !== board.ramType) {
    msg.push("❌ CPU와 RAM의 타입이 다릅니다 (메인보드 기준).");
  }

  // 3️⃣ BOARD ↔ RAM
  if (board && ram && board.ramType !== ram.type) {
    msg.push("❌ 메인보드와 RAM의 타입이 다릅니다.");
  }

  // 4️⃣ CASE ↔ BOARD
  if (pcCase && board && pcCase.formFactor !== board.formFactor) {
    msg.push("❌ 케이스와 메인보드의 폼팩터가 맞지 않습니다.");
  }

  // 5️⃣ CASE ↔ GPU
  if (pcCase && gpu && gpu.length > pcCase.gpuMaxLength) {
    msg.push("❌ 그래픽카드가 케이스에 들어가지 않습니다.");
  }

  // 6️⃣ CASE ↔ PSU
  if (pcCase && psu && psu.capacity > pcCase.psuMaxLength) {
    msg.push("❌ 케이스에 파워서플라이가 맞지 않습니다.");
  }

  // 7️⃣ PSU 용량 ↔ 전체 전력
  let totalPower = 0;
  [cpu, ram, gpu].forEach(item => {
    if (item && item.power) totalPower += item.power;
  });
  if (psu && totalPower > psu.capacity) {
    msg.push(`❌ 파워 용량 부족 (필요 전력: ${totalPower}W / PSU: ${psu.capacity}W)`);
  }

  if (msg.length === 0) {
    msg.push("✅ 모든 부품이 호환됩니다!");
  }

  document.getElementById("result").innerHTML = msg.join("<br>");
}

// 초기화
document.getElementById("resetBtn").addEventListener("click", () => {
  parts.forEach(p => selected[p] = null);
  renderSelectors();
  document.getElementById("result").innerHTML = "";
});

loadData();
