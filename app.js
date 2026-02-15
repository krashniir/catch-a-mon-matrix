// OFFICIAL PET DATA FROM DEVELOPER

import { OFFICIAL_PETS } from './petsData.js';
console.log(OFFICIAL_PETS);

// DOM ELEMENTS
const chartCtx = document.getElementById('damageChart').getContext('2d');
const petTable = document.getElementById('petTable');
const petTableContainer = document.getElementById('petTableContainer');
const bestPetCard = document.getElementById('bestPetCard');
const bestPetName = document.getElementById('bestPetName');
const bestPetMultiplier = document.getElementById('bestPetMultiplier');
const searchInput = document.getElementById('searchInput');
const rarityFilter = document.getElementById('rarityFilter');
const sortFilter = document.getElementById('sortFilter');
const clearFilters = document.getElementById('clearFilters');
const levelStart = document.getElementById('levelStart');
const levelEnd = document.getElementById('levelEnd');
const petComparisons = document.getElementById('petComparisons');
const addPetComparison = document.getElementById('addPetComparison');

let chart;
let selectedPets = ['ALL']; // Track selected pets for comparison
let comparisonIndex = 0; // Track the number of pet selectors

// FILTER STATE
let filterState = {
  search: '',
  rarity: 'ALL',
  sortBy: 'DAMAGE',
  levelStart: 1,
  levelEnd: 20
};

// CALCULATE DAMAGE AT A LEVEL
function calculateDamageAtLevel(baseDamage, level) {
  return baseDamage * level;
}

// CALCULATE HEALTH AT A LEVEL
function calculateHealthAtLevel(baseHealth, level) {
  return baseHealth * level;
}

// FILTER & SORT PETS
function getFilteredPets() {
  let petNames = Object.keys(OFFICIAL_PETS);

  // Apply search filter
  if (filterState.search) {
    petNames = petNames.filter(name =>
      name.toLowerCase().includes(filterState.search.toLowerCase())
    );
  }

  // Apply rarity filter
  if (filterState.rarity !== 'ALL') {
    const isLegendary = filterState.rarity === 'LEGENDARY';
    petNames = petNames.filter(name =>
      !!OFFICIAL_PETS[name].Legendary === isLegendary
    );
  }

  // Apply sorting
  petNames.sort((a, b) => {
    const petA = OFFICIAL_PETS[a];
    const petB = OFFICIAL_PETS[b];
    
    switch(filterState.sortBy) {
      case 'DAMAGE':
        return petB.BaseDamage - petA.BaseDamage;
      case 'HEALTH':
        return petB.BaseHealth - petA.BaseHealth;
      case 'SELL':
        return petB.SellAmount - petA.SellAmount;
      case 'NAME':
        return a.localeCompare(b);
      default:
        return petB.BaseDamage - petA.BaseDamage;
    }
  });

  return petNames;
}

// GET ALL LEVELS DATA FOR CHART
function getChartData(maxLevel) {
  const data = [];
  for (let level = 1; level <= maxLevel; level++) {
    const row = { level };
    Object.keys(OFFICIAL_PETS).forEach(petName => {
      row[petName] = calculateDamageAtLevel(OFFICIAL_PETS[petName].BaseDamage, level);
    });
    data.push(row);
  }
  return data;
}

// RENDER THE ENTIRE UI
function render() {
  const petNames = getFilteredPets();

  // BEST PET CARD - Based on highest base damage
  if (petNames.length) {
    const best = petNames.reduce((best, cur) => 
      OFFICIAL_PETS[cur].BaseDamage > OFFICIAL_PETS[best].BaseDamage ? cur : best
    );
    const isLegendary = OFFICIAL_PETS[best].Legendary ? ' ⭐' : '';
    bestPetName.textContent = `🏆 BEST PET: ${best}${isLegendary}`;
    bestPetMultiplier.textContent = `Base Damage: ${OFFICIAL_PETS[best].BaseDamage} | Base Health: ${OFFICIAL_PETS[best].BaseHealth} | Sell: ${OFFICIAL_PETS[best].SellAmount}G`;
    bestPetCard.classList.remove('hidden');
  } else {
    bestPetCard.classList.add('hidden');
  }

  // BUILD TABLE - Shows level progression
  if (petNames.length) {
    const startLevel = Math.max(1, parseInt(filterState.levelStart) || 1);
    const endLevel = Math.max(startLevel, parseInt(filterState.levelEnd) || 20);
    let levels = Array.from({length: endLevel - startLevel + 1}, (_, i) => startLevel + i);
    
    let html = `<thead><tr><th class="level-header"><span class="level-label">Level</span></th>`;
    
    for (let name of petNames) {
      const isLegendary = OFFICIAL_PETS[name].Legendary ? ' ⭐' : '';
      const stats = OFFICIAL_PETS[name];
      html += `<th class="pet-header">
        <div class="pet-header-content">
          <div class="pet-name">${name}${isLegendary}</div>
          <div class="pet-stats-grid">
            <div class="stat-item">
              <div class="stat-label">DMG</div>
              <div class="stat-value">${stats.BaseDamage}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">HP</div>
              <div class="stat-value">${stats.BaseHealth}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">💰</div>
              <div class="stat-value">${stats.SellAmount}</div>
            </div>
          </div>
        </div>
      </th>`;
    }
    html += `</tr></thead><tbody>`;
    
    for (let lvl of levels) {
      html += `<tr class="level-row">
        <td class="level-cell"><strong>${lvl}</strong></td>`;
      for (let i = 0; i < petNames.length; i++) {
        const name = petNames[i];
        const dmg = calculateDamageAtLevel(OFFICIAL_PETS[name].BaseDamage, lvl);
        const health = calculateHealthAtLevel(OFFICIAL_PETS[name].BaseHealth, lvl);
        const dmgFormatted = dmg % 1 === 0 ? dmg.toFixed(0) : dmg.toFixed(2);
        const healthFormatted = health.toFixed(0);
        
        // Alternate row coloring
        const cellClass = i % 2 === 0 ? 'stat-cell' : 'stat-cell alt';
        
        html += `<td class="${cellClass}">
          <div class="stat-display">
            <div class="damage-stat">
              <span class="stat-label-small">DMG</span>
              <span class="stat-number">${dmgFormatted}</span>
            </div>
            <div class="health-stat">
              <span class="stat-label-small">HP</span>
              <span class="stat-number">${healthFormatted}</span>
            </div>
          </div>
        </td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody>`;
    petTable.innerHTML = html;
    petTableContainer.classList.remove('hidden');
  } else {
    petTableContainer.classList.add('hidden');
  }

  // UPDATE PET SELECTOR OPTIONS
  updatePetOptions(petNames);

  // CHART
  let visible = selectedPets.filter(pet => {
    if (pet === 'ALL') return false;
    return petNames.includes(pet);
  });
  
  // If 'ALL' is selected, show all pets
  if (selectedPets.includes('ALL')) {
    visible = petNames;
  }
  
  const chartData = getChartData(filterState.levelEnd);

  if(chart) chart.destroy();
  chart = new Chart(chartCtx, {
    type: 'line',
    data: {
      labels: chartData.map(d => d.level),
      datasets: visible.map((name, index) => ({
        label: name + (OFFICIAL_PETS[name].Legendary ? ' ⭐' : ''),
        data: chartData.map(d => d[name]),
        borderColor: `hsl(${index*60}, 70%, 50%)`,
        borderWidth: 3,
        fill: false,
        tension: 0.3
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        x: {
          title: { display: true, text: 'Level' }
        },
        y: {
          title: { display: true, text: 'Damage Output' }
        }
      }
    }
  });
}

// UPDATE PET COMPARISON OPTIONS
function updatePetOptions(petNames) {
  const selects = document.querySelectorAll('.petComparisonSelect');
  selects.forEach(select => {
    const currentValue = select.value;
    select.innerHTML = `<option value="ALL">All Pets</option>` + 
      petNames.map(name => `<option value="${name}">${name}${OFFICIAL_PETS[name].Legendary ? ' ⭐' : ''}</option>`).join('');
    
    // Restore the value if it still exists
    if (petNames.includes(currentValue) || currentValue === 'ALL') {
      select.value = currentValue;
    }
  });
}

// ADD NEW PET COMPARISON SELECTOR
function addPetSelector() {
  const index = comparisonIndex++;
  const item = document.createElement('div');
  item.className = 'pet-comparison-item';
  item.dataset.index = index;
  item.innerHTML = `
    <div class="pet-selector-group">
      <select class="petComparisonSelect" data-index="${index}">
        <option value="ALL">All Pets</option>
      </select>
      <button class="remove-pet-btn">✕</button>
    </div>
  `;
  
  // Populate the options
  const petNames = getFilteredPets();
  const select = item.querySelector('.petComparisonSelect');
  select.innerHTML = `<option value="ALL">All Pets</option>` + 
    petNames.map(name => `<option value="${name}">${name}${OFFICIAL_PETS[name].Legendary ? ' ⭐' : ''}</option>`).join('');
  
  // Add remove handler
  item.querySelector('.remove-pet-btn').addEventListener('click', () => {
    item.remove();
    updateSelectedPets();
    render();
  });
  
  // Add change handler
  select.addEventListener('change', () => {
    updateSelectedPets();
    render();
  });
  
  petComparisons.appendChild(item);
  updateSelectedPets();
}

// UPDATE SELECTED PETS ARRAY
function updateSelectedPets() {
  const selects = document.querySelectorAll('.petComparisonSelect');
  selectedPets = Array.from(selects).map(select => select.value);
  
  // Show/hide remove buttons - only show if more than one selector
  const removeButtons = document.querySelectorAll('.remove-pet-btn');
  removeButtons.forEach(btn => {
    btn.style.display = selects.length > 1 ? 'block' : 'none';
  });
}

// EVENT LISTENERS
addPetComparison.addEventListener('click', addPetSelector);

// Pet comparison selector change handlers are added dynamically in addPetSelector()

// FILTER EVENT LISTENERS
searchInput.addEventListener('input', (e) => {
  filterState.search = e.target.value;
  render();
});

rarityFilter.addEventListener('change', (e) => {
  filterState.rarity = e.target.value;
  render();
});

sortFilter.addEventListener('change', (e) => {
  filterState.sortBy = e.target.value;
  render();
});

levelStart.addEventListener('change', (e) => {
  filterState.levelStart = parseInt(e.target.value) || 1;
  render();
});

levelEnd.addEventListener('change', (e) => {
  filterState.levelEnd = parseInt(e.target.value) || 20;
  render();
});

clearFilters.addEventListener('click', () => {
  searchInput.value = '';
  rarityFilter.value = 'ALL';
  sortFilter.value = 'DAMAGE';
  levelStart.value = '1';
  levelEnd.value = '20';
  filterState = {
    search: '',
    rarity: 'ALL',
    sortBy: 'DAMAGE',
    levelStart: 1,
    levelEnd: 20
  };
  render();
});

// INITIALIZE PET SELECTOR CHANGE HANDLERS
document.addEventListener('change', (e) => {
  if (e.target.classList.contains('petComparisonSelect')) {
    updateSelectedPets();
    render();
  }
});

// INITIALIZE
render();
