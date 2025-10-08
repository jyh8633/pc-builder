const parts = ["cpu", "board", "ram", "gpu", "psu", "case"];
const data = {};
const selections = {};

async function loadAllData() {
  for (const part of parts) {
    const res = await fetch(`data/compatibility/${part}.json`);
    data[part] = await res.json();
  }
  populateSelects();
}

function populateSelects() {
  parts.forEach(part => {
    const select = document.getElementById(part);
    select.innerHTML = `<option value="">-- ${part.toUpperCase()} 선택 --</option>`;
    data[part].forEach((item, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = item.model;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => {
      selections[part] = data[part][select.value] || null;
      checkCompatibility();
    });
  });
}

function checkCompatibility() {
  let totalPower = 0;
  let compatible = true;
  const cpu = selections.cpu;
  const board = selections.board;
  const ram = selections.ram;
  const gpu = selections.gpu;
  const psu = selections.psu;
  const pcCase = selections.case;

  if (cpu) totalPower += cpu.power || 0;
  if (gpu) totalPower += gpu.power || 0;
  if (ram) totalPower += ram.power || 0;

  if (cpu && board && cpu.socket !== board.socket) compatible = false;
  if (ram && board && ram.type !== board.ramType) compatible = false;
  if (board && pcCase && board.formFactor !== pcCase.formFactor) compatible = false;
  if (gpu && pcCase && gpu.length > pcCase.gpuMaxLength) compatible = false;
  if (psu && pcCase && psu.capacity < totalPower) compatible = false;

  document.getElementById("summary").innerHTML = parts.map(p => 
    selections[p] ? `<b>${p.toUpperCase()}:</b> ${selections[p].model}` : ""
  ).join("<br>") || "선택된 부품이 없습니다.";

  document.getElementById("power").textContent = `예상 전력: ${totalPower}W`;
  document.getElementById("compatibility").textContent = 
    compatible ? "✅ 호환성 양호" : "❌ 호환성 불일치";
}

document.getElementById("resetBtn").addEventListener("click", () => {
  parts.forEach(p => {
    document.getElementById(p).value = "";
    selections[p] = null;
  });
  checkCompatibility();
});

document.getElementById("summaryBtn").addEventListener("click", checkCompatibility);

loadAllData();
