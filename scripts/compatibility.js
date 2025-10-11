const parts = ["cpu", "board", "ram", "gpu", "psu", "case"];
const selected = {};
const loadedData = {};

async function loadParts() {
  const selectors = document.getElementById("selectors");
  selectors.innerHTML = "";

  for (let part of parts) {
    const label = document.createElement("label");
    label.innerText = part.toUpperCase();

    const select = document.createElement("select");
    select.id = part;
    select.innerHTML = `<option value="">${part.toUpperCase()} 선택</option>`;

    try {
      const response = await fetch(`data/compatibility/${part}.json`);
      const data = await response.json();
      loadedData[part] = data;
      data.forEach(item => {
        const option = document.createElement("option");
        option.value = item.model;
        option.textContent = item.model;
        select.appendChild(option);
      });
    } catch (error) {
      console.error(`${part} 로드 실패:`, error);
    }

    select.addEventListener("change", () => {
      selected[part] = select.value;
    });

    selectors.appendChild(label);
    selectors.appendChild(select);
  }
}

function getPart(part, model) {
  return loadedData[part]?.find(p => p.model === model);
}

function checkCompatibility() {
  const resultDiv = document.getElementById("compatibilityResult");
  const selectedParts = Object.values(selected).filter(Boolean);

  if (selectedParts.length === 0) {
    resultDiv.innerHTML = "<p>선택된 부품이 없습니다.</p>";
    return;
  }

  let result = "<h3>선택된 부품:</h3><ul>";
  for (let p of parts) {
    result += `<li>${p.toUpperCase()}: ${selected[p] || "선택 안됨"}</li>`;
  }
  result += "</ul>";

  let issues = [];
  let totalPower = 0;

  // ----- CPU - BOARD -----
  if (selected.cpu && selected.board) {
    const cpu = getPart("cpu", selected.cpu);
    const board = getPart("board", selected.board);
    if (cpu.socket !== board.socket) {
      issues.push("⚠️ CPU와 메인보드의 소켓이 일치하지 않습니다.");
    }
  }

  // ----- BOARD - RAM -----
  if (selected.board && selected.ram) {
    const board = getPart("board", selected.board);
    const ram = getPart("ram", selected.ram);
    if (board.ramType !== ram.type) {
      issues.push("⚠️ 메인보드와 RAM의 타입이 일치하지 않습니다.");
    }
  }

  // ----- CASE - BOARD -----
  if (selected.case && selected.board) {
    const pcCase = getPart("case", selected.case);
    const board = getPart("board", selected.board);
    if (pcCase.formFactor !== board.formFactor) {
      issues.push("⚠️ 케이스와 메인보드의 폼팩터가 다릅니다.");
    }
  }

  // ----- CASE - GPU -----
  if (selected.case && selected.gpu) {
    const pcCase = getPart("case", selected.case);
    const gpu = getPart("gpu", selected.gpu);
    if (gpu.length > pcCase.gpuMaxLength) {
      issues.push("⚠️ GPU 길이가 케이스에 들어가지 않습니다.");
    }
  }

  // ----- CASE - PSU -----
  if (selected.case && selected.psu) {
    const pcCase = getPart("case", selected.case);
    const psu = getPart("psu", selected.psu);
    if (psu.capacity / 10 > pcCase.psuMaxLength) {
      // 그냥 단순 예시, 실제로는 규격 데이터 필요
      issues.push("⚠️ PSU 길이가 케이스 제한보다 큽니다.");
    }
  }

  // ----- 전력 계산 -----
  let powerSources = ["cpu", "gpu", "ram"];
  powerSources.forEach(p => {
    if (selected[p]) {
      const item = getPart(p, selected[p]);
      totalPower += item.power || 0;
    }
  });

  if (selected.psu) {
    const psu = getPart("psu", selected.psu);
    if (psu.capacity < totalPower * 1.2) {
      issues.push(`⚠️ 전력 부족: 총 예상 소모전력은 약 ${totalPower}W이며, PSU 용량(${psu.capacity}W)이 부족할 수 있습니다.`);
    }
  }

  // ----- 결과 표시 -----
  result += `<h3>예상 총 전력 소모량: ${totalPower}W</h3>`;

  if (issues.length === 0) {
    result += "<p>✅ 모든 부품이 호환됩니다!</p>";
  } else {
    result += "<h3>호환성 문제:</h3><ul>";
    issues.forEach(issue => (result += `<li>${issue}</li>`));
    result += "</ul>";
  }

  resultDiv.innerHTML = result;
}

// 초기화
document.getElementById("reset").addEventListener("click", () => {
  for (let p of parts) {
    document.getElementById(p).value = "";
    selected[p] = "";
  }
  document.getElementById("compatibilityResult").innerHTML =
    "<p>선택된 부품이 없습니다.</p>";
});

document.getElementById("check").addEventListener("click", checkCompatibility);

loadParts();
