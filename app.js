const petNameInput = document.getElementById('petNameInput');
const levelInput = document.getElementById('levelInput');
const damageInput = document.getElementById('damageInput');
const addBtn = document.getElementById('addBtn');
const petTable = document.getElementById('petTable');
const petTableContainer = document.getElementById('petTableContainer');
const bestPetCard = document.getElementById('bestPetCard');
const bestPetName = document.getElementById('bestPetName');
const bestPetMultiplier = document.getElementById('bestPetMultiplier');
const selectedPet = document.getElementById('selectedPet');
const maxProjectionInput = document.getElementById('maxProjection');
const maxProjectionLabel = document.getElementById('maxProjectionLabel');
const chartCtx = document.getElementById('damageChart').getContext('2d');
const importData = document.getElementById('importData');
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');

let pets = JSON.parse(localStorage.getItem('petDamageMatrix')) || {};
let maxProjection = parseInt(maxProjectionInput.value);
let chart;

function savePets() {
  localStorage.setItem('petDamageMatrix', JSON.stringify(pets));
}

function addPet() {
  const name = petNameInput.value.trim();
  const lvl = parseInt(levelInput.value);
  const dmg = parseFloat(damageInput.value);
  if (!name || isNaN(lvl) || isNaN(dmg)) return;

  if (!pets[name]) pets[name] = {};
  pets[name][lvl] = dmg;

  levelInput.value = '';
  damageInput.value = '';

  savePets();
  render();
}

function deletePet(name) {
  delete pets[name];
  savePets();
  render();
}

function deleteLevel(name, lvl) {
  delete pets[name][lvl];
  if (Object.keys(pets[name]).length === 0) delete pets[name];
  savePets();
  render();
}

function calculateStats() {
  const calculations = {};
  Object.keys(pets).forEach(name => {
    const entries = Object.entries(pets[name]).map(([lvl,dmg])=>({x:+lvl, y:+dmg}));
    if (!entries.length) return;
    const n = entries.length;
    const sumX = entries.reduce((a,b)=>a+b.x,0);
    const sumY = entries.reduce((a,b)=>a+b.y,0);
    const sumXY = entries.reduce((a,b)=>a+b.x*b.y,0);
    const sumXX = entries.reduce((a,b)=>a+b.x*b.x,0);
    const slope = (n*sumXY - sumX*sumY)/(n*sumXX - sumX*sumX);
    const intercept = (sumY - slope*sumX)/n;
    calculations[name] = {slope, intercept};
  });
  return calculations;
}

function render() {
  const calculations = calculateStats();
  const sortedPetNames = Object.keys(pets).sort((a, b) => {
    const slopeA = calculations[a]?.slope || 0;
    const slopeB = calculations[b]?.slope || 0;
    return slopeA - slopeB;
  });

  // BEST PET
  if (sortedPetNames.length) {
    const best = sortedPetNames.reduce((best, cur) => !best || calculations[cur].slope > calculations[best].slope ? cur : best, null);
    bestPetName.textContent = `🏆 BEST PET: ${best}`;
    bestPetMultiplier.textContent = `Multiplier: x${calculations[best].slope.toFixed(2)} per level`;
    bestPetCard.classList.remove('hidden');
  } else {
    bestPetCard.classList.add('hidden');
  }

  // TABLE
  if (sortedPetNames.length) {
    let levels = Array.from(new Set(sortedPetNames.flatMap(name=>Object.keys(pets[name]).map(Number)))).sort((a,b)=>a-b);
    let html = `<thead><tr><th>Level</th>`;
    for (let name of sortedPetNames) {
      html += `<th>
        <div style="display:flex;flex-direction:column;align-items:center;gap:0.25rem;">
          <span>${name}</span>
          <span style="font-size:0.75rem;color:#6b7280;">x${calculations[name]?.slope?.toFixed(2)||'-'}</span>
          <button class="small-btn" onclick="deletePet('${name}')">Delete</button>
        </div>
      </th>`;
    }
    html += `</tr></thead><tbody>`;
    for (let lvl of levels) {
      html += `<tr><td>${lvl}</td>`;
      for (let name of sortedPetNames) {
        const dmg = pets[name][lvl];
        html += `<td>${dmg??'-'}${dmg?` <button class="small-btn" onclick="deleteLevel('${name}',${lvl})">x</button>`:''}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody>`;
    petTable.innerHTML = html;
    petTableContainer.classList.remove('hidden');
  } else {
    petTableContainer.classList.add('hidden');
  }

  // SELECT OPTIONS
  selectedPet.innerHTML = `<option value="ALL">All Pets</option>` + sortedPetNames.map(name=>`<option value="${name}">${name}</option>`).join('');

  // CHART
  const visible = selectedPet.value === "ALL" ? sortedPetNames : [selectedPet.value];
  const levelsForChart = Array.from({length:maxProjection},(_,i)=>i+1);
  const chartData = levelsForChart.map(lvl=>{
    const row = {level:lvl};
    for(let name of sortedPetNames){
      if(calculations[name]) row[name] = calculations[name].slope*lvl + calculations[name].intercept;
    }
    return row;
  });

  if(chart) chart.destroy();
  chart = new Chart(chartCtx,{
    type:'line',
    data:{
      labels: levelsForChart,
      datasets: visible.map((name,index)=>({
        label:name,
        data: chartData.map(d=>d[name]),
        borderColor:`hsl(${index*60},70%,50%)`,
        borderWidth:3,
        fill:false
      }))
    },
    options:{
      responsive:true,
      plugins:{legend:{position:'top'}},
      scales:{
        x:{title:{display:true,text:'Level'}},
        y:{title:{display:true,text:'Damage'}} 
      }
    }
  });
}

// EVENTS
addBtn.addEventListener('click', addPet);
selectedPet.addEventListener('change', render);
maxProjectionInput.addEventListener('input', ()=>{
  maxProjection = parseInt(maxProjectionInput.value);
  maxProjectionLabel.textContent = maxProjection;
  render();
});

importBtn.addEventListener('click', () => {
  try {
    const data = JSON.parse(importData.value);
    if (typeof data === 'object' && data !== null) {
      pets = data;
      savePets();
      importData.value = '';
      render();
      Toastify({
        text: 'Data imported successfully!',
        duration: 1500,
        gravity: 'top',
        position: 'right',
        backgroundColor: '#16a34a',
        stopOnFocus: true
      }).showToast();
    } else {
      Toastify({
        text: 'Invalid data format',
        duration: 1500,
        gravity: 'top',
        position: 'right',
        backgroundColor: '#dc2626',
        stopOnFocus: true
      }).showToast();
    }
  } catch (e) {
    Toastify({
      text: 'Error parsing data: ' + e.message,
      duration: 1500,
      gravity: 'top',
      position: 'right',
      backgroundColor: '#dc2626',
      stopOnFocus: true
    }).showToast();
  }
});

exportBtn.addEventListener('click', () => {
  const dataStr = JSON.stringify(pets, null, 2);
  importData.value = dataStr;
  importData.select();
  document.execCommand('copy');
  Toastify({
    text: 'Data copied to clipboard!',
    duration: 1500,
    gravity: 'top',
    position: 'right',
    backgroundColor: '#3b82f6',
    stopOnFocus: true
  }).showToast();
});

// INITIAL
render();
