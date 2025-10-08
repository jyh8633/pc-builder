const parts = ["cpu", "board", "ram", "gpu", "psu", "case"];
const selected = {};

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

function checkCompatibility() {
  const resultDiv = document.getElementById("compatibilityResult");
  const selectedParts = Object.values(selected).filter(Boolean);

  if (selectedParts.length === 0) {
    resultDiv.innerHTML = "<p>선택된 부품이 없습니다.</p>";
    return;
  }

  let result = "<h3>선택된 부품:</h3><ul>";
  for (let p in selected) {
    result += `<li>${p.toUpperCase()}: ${selected[p] || "선택 안됨"}</li>`;
  }
  result += "</ul>";

  // 간단한 호환성 예시 (추후 상세 검사 추가 가능)
  result += "<p>⚙️ 기본적인 호환성 검사는 완료되었습니다.</p>";

  resultDiv.innerHTML = result;
}

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
