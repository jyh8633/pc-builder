// scripts/compatibility.js
(function () {
  'use strict';

  // 루트가 없으면 동작하지 않음 -> 다른 페이지와 충돌 방지
  const ROOT = document.getElementById('compatibility-root');
  if (!ROOT) return;

  // DOM 레퍼런스 (루트 내에서)
  const sel = {
    cpu: ROOT.querySelector('#sel-cpu'),
    mobo: ROOT.querySelector('#sel-mobo'),
    ram: ROOT.querySelector('#sel-ram'),
    gpu: ROOT.querySelector('#sel-gpu'),
    case: ROOT.querySelector('#sel-case'),
    psu: ROOT.querySelector('#sel-psu')
  };
  const btnReset = ROOT.querySelector('#btn-reset');
  const summaryEl = ROOT.querySelector('#summary');
  const chosenListEl = ROOT.querySelector('#chosen-list');
  const powerEstimateEl = ROOT.querySelector('#power-estimate');

  const parts = ["cpu","mobo","ram","gpu","psu","case"];
  const data = {};        // 원시 데이터 로드
  const selected = {};    // 현재 선택(객체)

  // 유틸: 안전하게 여러 필드 이름 지원
  const pick = (obj, ...keys) => { for (const k of keys) if (obj?.[k] !== undefined) return obj[k]; return undefined; };
  const getGpuLength = g => pick(g,'length','length_mm','gpu_length') || 0;
  const getPsuCapacity = p => pick(p,'capacity','watt','wattage') || 0;
  const getPower = x => pick(x,'power','tdp') || 0;
  const getRamType = r => pick(r,'type','ramType') || pick(r,'ramType','type');
  const getBoardRamType = b => pick(b,'ramType','ram_type','ram') || pick(b,'ramType');

  // 추천 PSU 계산 (현재 선택 상태를 반영)
  function recommendedPsuWatt(overrides = {}) {
    let total = 0;
    const cpu = overrides.cpu ? overrides.cpu : selected.cpu;
    const gpu = overrides.gpu ? overrides.gpu : selected.gpu;
    const ram = overrides.ram ? overrides.ram : selected.ram;
    if (cpu) total += getPower(cpu);
    if (gpu) total += getPower(gpu);
    // RAM power often small; use provided value if exists
    if (ram) total += getPower(ram) || 0;
    // add allowance for board+storage+fans
    total += 80;
    // add 30% headroom
    const rec = Math.ceil(total * 1.3 / 50) * 50;
    return rec;
  }

  // load data files
  async function loadAllData() {
    for (const p of parts) {
      try {
        const res = await fetch(`data/compatibility/${p}.json`, {cache:'no-store'});
        if (!res.ok) throw new Error(`Failed to load ${p}.json (${res.status})`);
        data[p] = await res.json();
      } catch (err) {
        console.error(err);
        data[p] = []; // 빈배열로 대체해서 에러 상황에도 동작하도록
      }
    }
    populateAllSelects();
    applyFilters(); // 초기 필터 적용
    renderChosenList();
    renderPowerEstimate();
  }

  // populate select elements
  function populateAllSelects() {
    // clear and fill each select
    for (const p of parts) {
      const selectEl = selMap(p);
      if (!selectEl) continue;
      // keep first placeholder; remove others
      selectEl.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = `-- ${p.toUpperCase()} 선택 --`;
      selectEl.appendChild(placeholder);
      (data[p]||[]).forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.model || item.name || JSON.stringify(item); // fallback if no model
        opt.textContent = item.model || item.name || opt.value;
        selectEl.appendChild(opt);
      });

      // add change listener
      selectEl.addEventListener('change', () => {
        const val = selectEl.value;
        selected[p] = val ? (data[p].find(i=> (i.model||i.name)===val) || null) : null;
        applyFilters();
        renderChosenList();
        renderPowerEstimate();
      });
    }
  }

  // helper to return the right select element by part name
  function selMap(part) {
    switch(part) {
      case 'cpu': return sel.cpu;
      case 'mobo': return sel.mobo;
      case 'ram': return sel.ram;
      case 'gpu': return sel.gpu;
      case 'case': return sel.case;
      case 'psu': return sel.psu;
      default: return null;
    }
  }

  // apply compatibility filters: disable incompatible options
  function applyFilters() {
    // For each part, iterate its options and decide whether to disable them
    for (const part of parts) {
      const selectEl = selMap(part);
      if (!selectEl) continue;
      // iterate options (skip first placeholder at index 0)
      const opts = Array.from(selectEl.options);
      for (let i=0;i<opts.length;i++) {
        const opt = opts[i];
        if (!opt.value) { opt.disabled = false; opt.style.opacity = '1'; continue; }
        const candidate = data[part].find(it => (it.model||it.name) === opt.value);
        // assume ok until proven otherwise
        let ok = true;

        // check against every currently selected other part
        for (const [sPart, sItem] of Object.entries(selected)) {
          if (!sItem) continue;
          if (sPart === part) continue;

          // CPU <-> Mobo
          if ((sPart==='cpu' && part==='mobo') || (sPart==='mobo' && part==='cpu')) {
            const cpu = sPart==='cpu' ? sItem : candidate;
            const mobo = sPart==='mobo' ? sItem : candidate;
            if (cpu?.socket && mobo?.socket && cpu.socket !== mobo.socket) { ok = false; break; }
          }

          // Mobo <-> RAM (ramType vs type)
          if ((sPart==='mobo' && part==='ram') || (sPart==='ram' && part==='mobo')) {
            const mobo = sPart==='mobo' ? sItem : candidate;
            const ram = sPart==='ram' ? sItem : candidate;
            const moboRamType = getBoardRamType(mobo);
            const ramType = getRamType(ram);
            if (moboRamType && ramType && moboRamType !== ramType) { ok = false; break; }
          }

          // Case <-> Mobo (form factor)
          if ((sPart==='case' && part==='mobo') || (sPart==='mobo' && part==='case')) {
            const caseObj = sPart==='case' ? sItem : candidate;
            const mobo = sPart==='mobo' ? sItem : candidate;
            const caseForms = pick(caseObj,'forms') || null;
            if (caseForms) {
              // if case uses array of forms
              if (!caseForms.includes(mobo.form || mobo.formFactor || mobo.formFactor)) { ok = false; break; }
            } else {
              // fallback: direct formFactor equality
              if (caseObj.formFactor && mobo.formFactor && caseObj.formFactor !== mobo.formFactor) { ok = false; break; }
            }
          }

          // Case <-> GPU (length)
          if ((sPart==='case' && part==='gpu') || (sPart==='gpu' && part==='case')) {
            const caseObj = sPart==='case' ? sItem : candidate;
            const gpuObj = sPart==='gpu' ? sItem : candidate;
            const gpuLen = getGpuLength(gpuObj);
            const caseMax = pick(caseObj,'gpuMaxLength','maxGpuMm','max_gpu_mm') || 0;
            if (gpuLen && caseMax && gpuLen > caseMax) { ok = false; break; }
          }

          // PSU filtering: if checking PSU options, ensure candidate meets recommended watt
          if (part === 'psu') {
            // when candidate is a PSU, compute recommended with candidate replacing selection
            const tempSelected = Object.assign({}, selected);
            tempSelected['psu'] = candidate;
            const rec = recommendedPsuWatt(tempSelected);
            const cap = getPsuCapacity(candidate);
            if (cap && rec && cap < rec) { ok = false; break; }
          }

          // If a PSU is selected and candidate is other part, optionally disable candidate if it would exceed PSU:
          if (sPart === 'psu' && part !== 'psu') {
            const psuObj = sItem;
            // compute total if we include candidate
            const tempSelected = Object.assign({}, selected);
            tempSelected[part] = candidate;
            const rec = recommendedPsuWatt(tempSelected);
            const cap = getPsuCapacity(psuObj);
            if (cap && rec && cap < rec) { ok = false; break; }
          }
        } // end for selected items

        opt.disabled = !ok;
        opt.style.opacity = opt.disabled ? '0.45' : '1';
      } // end for options
    } // end for parts

    // after filtering, update UI lists
    renderChosenList();
    renderPowerEstimate();
    renderCompatibilitySummary();
  } // end applyFilters

  // render chosen list with delete buttons
  function renderChosenList() {
    chosenListEl.innerHTML = '';
    const order = ['cpu','mobo','ram','gpu','case','psu'];
    order.forEach(key => {
      const container = document.createElement('div');
      container.className = 'part-item';
      const left = document.createElement('div');
      left.innerHTML = `<div style="font-weight:600">${key.toUpperCase()}</div><div class="small">${selected[key] ? (selected[key].model||selected[key].name) : '<span class="small">미선택</span>'}</div>`;
      const right = document.createElement('div');
      if (selected[key]) {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = '삭제';
        btn.onclick = () => {
          // clear selection and reset select element
          selected[key] = null;
          const selEl = selMap(key);
          if (selEl) selEl.value = '';
          applyFilters();
        };
        right.appendChild(btn);
      }
      container.appendChild(left);
      container.appendChild(right);
      chosenListEl.appendChild(container);
    });
  }

  // render power estimate area
  function renderPowerEstimate() {
    powerEstimateEl.innerHTML = '';
    const cpu = selected.cpu;
    const gpu = selected.gpu;
    const ram = selected.ram;
    const base = (cpu ? getPower(cpu) : 0) + (gpu ? getPower(gpu) : 0) + (ram ? getPower(ram) : 0) + 80;
    const rec = recommendedPsuWatt();
    const block = document.createElement('div');
    block.className = 'part-item';
    block.innerHTML = `<div><div style="font-weight:600">예상 소비 전력</div><div class="small">대략 ${base}W (여유포함 권장: <span class="warning">${rec}W</span>)</div></div>
    <div style="text-align:right"><div class="small">권장 PSU</div><div style="margin-top:6px">${renderPsuList(rec)}</div></div>`;
    powerEstimateEl.appendChild(block);
  }

  function renderPsuList(rec) {
    const suitable = (data.psu || []).filter(p => getPsuCapacity(p) >= rec);
    if (suitable.length === 0) return `<div class="small">권장 PSU가 없습니다.</div>`;
    return suitable.map(p=>`<div class="small">${p.model} — ${getPsuCapacity(p)}W</div>`).join('');
  }

  // compute detailed issues and render in summary area
  function renderCompatibilitySummary() {
    const issues = [];
    const cpu = selected.cpu, board = selected.mobo, ram = selected.ram, gpu = selected.gpu, psu = selected.psu, pcCase = selected.case;

    if (cpu && board && cpu.socket && board.socket && cpu.socket !== board.socket) {
      issues.push(`CPU(${cpu.model})와 메인보드(${board.model})의 소켓이 맞지 않습니다.`);
    }
    if (board && ram) {
      const mrt = getBoardRamType(board);
      const rt = getRamType(ram);
      if (mrt && rt && mrt !== rt) issues.push(`메인보드(${board.model})와 RAM(${ram.model})의 타입이 다릅니다.`);
    }
    if (pcCase && board) {
      // case forms array support or simple equality
      const caseForms = pick(pcCase,'forms');
      if (caseForms && board.form) {
        if (!caseForms.includes(board.form)) issues.push(`케이스(${pcCase.model})가 메인보드(${board.model})의 폼팩터를 지원하지 않습니다.`);
      } else if (pcCase.formFactor && board.formFactor && pcCase.formFactor !== board.formFactor) {
        issues.push(`케이스(${pcCase.model})와 메인보드(${board.model})의 폼팩터가 다릅니다.`);
      }
    }
    if (pcCase && gpu) {
      const gpuLen = getGpuLength(gpu);
      const caseMax = pick(pcCase,'gpuMaxLength','maxGpuMm') || 0;
      if (gpuLen && caseMax && gpuLen > caseMax) issues.push(`케이스(${pcCase.model})에 GPU(${gpu.model})가 들어가지 않습니다. (GPU ${gpuLen}mm > 케이스 ${caseMax}mm)`);
    }
    // PSU capacity check
    const totalPower = ((cpu? getPower(cpu):0) + (gpu? getPower(gpu):0) + (ram? getPower(ram):0) + 80);
    if (psu) {
      const cap = getPsuCapacity(psu);
      const rec = Math.ceil(totalPower * 1.3 / 50) * 50;
      if (cap && cap < rec) issues.push(`PSU(${psu.model})의 용량(${cap}W)이 권장(${rec}W)보다 작습니다.`);
    }

    // render summary
    if (Object.values(selected).filter(Boolean).length === 0) {
      summaryEl.textContent = '선택된 부품이 없습니다.';
      summaryEl.className = 'summary';
    } else if (issues.length === 0) {
      summaryEl.innerHTML = '<span class="ok">✅ 모든 부품이 호환됩니다.</span>';
      summaryEl.className = 'summary';
    } else {
      summaryEl.innerHTML = '<div class="warning">❌ 호환성 문제:</div>' + issues.map(i=>`<div>${i}</div>`).join('');
      summaryEl.className = 'summary';
    }
  }

  // reset handler
  if (btnReset) btnReset.addEventListener('click', () => {
    for (const p of parts) {
      if (selMap(p)) selMap(p).value = '';
      selected[p] = null;
    }
    populateAllSelects(); // re-populate to clear disabled states
    renderChosenList();
    renderPowerEstimate();
    renderCompatibilitySummary();
  });

  // initialize
  loadAllData();

})();

