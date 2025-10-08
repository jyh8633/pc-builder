async function loadData() {
  const [cpus, motherboards, rams, gpus] = await Promise.all([
    fetch('data/cpu.json').then(r => r.json()),
    fetch('data/motherboard.json').then(r => r.json()),
    fetch('data/ram.json').then(r => r.json()),
    fetch('data/gpu.json').then(r => r.json())
  ]);

  return { cpus, motherboards, rams, gpus };
}

function populateSelect(select, data, labelKey = 'name') {
  select.innerHTML = `<option value="">선택</option>`;
  data.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item[labelKey];
    select.appendChild(option);
  });
}

function filterData(selected, allData, key, matchValue) {
  if (!matchValue) return allData;
  return allData.filter(item => item[key] === matchValue);
}

async function init() {
  const { cpus, motherboards, rams, gpus } = await loadData();

  const cpuSelect = document.getElementById('cpuSelect');
  const mbSelect = document.getElementById('motherboardSelect');
  const ramSelect = document.getElementById('ramSelect');
  const gpuSelect = document.getElementById('gpuSelect');
  const resetBtn = document.getElementById('resetBtn');

  populateSelect(cpuSelect, cpus);
  populateSelect(mbSelect, motherboards);
  populateSelect(ramSelect, rams);
  populateSelect(gpuSelect, gpus);

  cpuSelect.addEventListener('change', () => {
    const selectedCPU = cpus.find(c => c.id === cpuSelect.value);
    const filteredMB = filterData(selectedCPU, motherboards, 'socket', selectedCPU?.socket);
    populateSelect(mbSelect, filteredMB);
  });

  mbSelect.addEventListener('change', () => {
    const selectedMB = motherboards.find(m => m.id === mbSelect.value);
    const filteredCPU = filterData(selectedMB, cpus, 'socket', selectedMB?.socket);
    populateSelect(cpuSelect, filteredCPU);
  });

  resetBtn.addEventListener('click', () => {
    cpuSelect.selectedIndex = 0;
    mbSelect.selectedIndex = 0;
    ramSelect.selectedIndex = 0;
    gpuSelect.selectedIndex = 0;
    populateSelect(cpuSelect, cpus);
    populateSelect(mbSelect, motherboards);
    populateSelect(ramSelect, rams);
    populateSelect(gpuSelect, gpus);
  });
}

init();
