const parts = ["cpu", "board", "ram", "gpu", "psu", "case"];
const data = {};
const selects = {};

async function loadAllData() {
  for (let part of parts) {
    const res = await fetch(`data/compatibility/${part}.json`);
    data[part] = await res.json();
    selects[part] = document.getElementById(part);
    updateOptions(part);
    selects[part].addEventListener("change", () => filterCompatibility(part));
  }
}

function updateOptions(part, filtered = null) {
  const sel = selects[part];
  sel.innerHTML = "";
  const list = filtered || data[part];
  list.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.model;
    opt.textContent = item.model;
    sel.appendChild(opt);
  });
}

function filterCompatibility(changedPart) {
  const selected = {};
  parts.forEach((p) => {
    const value = selects[p].value;
    if (value) {
      selected[p] = data[p].find((item) => item.model === value);
    }
  });

  parts.forEach((part) => {
    if (part === changedPart) return;
    const filtered = data[part].filter((item) => {
      if (selected.cpu && selected.board) {
        if (
          part === "board" &&
          item.socket !== selected.cpu.socket
        ) return false;
        if (
          part === "cpu" &&
          item.socket !== selected.board.socket
        ) return false;
      }
      if (selected.board && selected.ram) {
        if (
          part === "ram" &&
          item.type !== selected.board.ramType
        ) return false;
      }
      if (selected.gpu && selected.case) {
        if (
          part === "case" &&
          item.gpuMaxLength < selected.gpu.length
        ) return false;
        if (
          part === "gpu" &&
          item.length > selected.case.gpuMaxLength
        ) return false;
      }
      if (selected.psu && selected.gpu) {
        if (
          part === "psu" &&
          item.capacity < selected.gpu.power + 150
        ) return false;
      }
      return true;
    });
    updateOptions(part, filtered);
  });
}

loadAllData();
