/* ═══════════════════════════════════════════════════════════
   SILLAGE — app.js
   Loads data, manages filters/search, renders cards + drawer
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ─── STATE ──────────────────────────────────────────────────
const state = {
  allFragrances: [],
  filters: {
    status:   'all',
    season:   'all',
    type:     'all',
    occasion: 'all',
  },
  search:   '',
  activeId: null,
};

// ─── DOM REFERENCES ─────────────────────────────────────────
const $ = id => document.getElementById(id);

const DOM = {
  cardGrid:      $('cardGrid'),
  loadingState:  $('loadingState'),
  emptyState:    $('emptyState'),
  resultsCount:  $('resultsCount'),
  resetFilters:  $('resetFilters'),
  resetFilters2: $('resetFilters2'),
  collectionMeta:$('collectionMeta'),
  searchInput:   $('searchInput'),
  searchClear:   $('searchClear'),
  filterBar:     $('filterBar'),
  drawerOverlay: $('drawerOverlay'),
  detailDrawer:  $('detailDrawer'),
  drawerContent: $('drawerContent'),
  drawerClose:   $('drawerClose'),
};

// ─── HELPERS ────────────────────────────────────────────────
const STATUS_LABELS = {
  owned:          'Owned',
  planning_to_buy:'Planning',
  liked_not_owned:'Liked',
  considering:    'Considering',
  to_test:        'To Test',
  disliked:       'Disliked',
};

const STATUS_CSS = {
  owned:          'owned',
  planning_to_buy:'planning',
  liked_not_owned:'liked',
  considering:    'considering',
  to_test:        'to_test',
  disliked:       'disliked',
};

const STATUS_ACCENTS = {
  owned:          '#c8a84b',
  planning_to_buy:'#6db890',
  liked_not_owned:'#6aaccc',
  considering:    '#c4956a',
  to_test:        '#a48acc',
  disliked:       '#c46a6a',
};

const RARITY_LEVELS = {
  common:    1,
  moderate:  2,
  rare:      3,
  very_rare: 4,
};

const SEASON_LABELS = {
  spring: '🌸 Spring',
  summer: '☀️ Summer',
  fall:   '🍂 Fall',
  winter: '❄️ Winter',
  all:    '✦ All',
};

const OCCASION_LABELS = {
  office:           'Office',
  dates:            'Dates',
  night_out:        'Night Out',
  casual:           'Casual',
  events:           'Events',
  smart_casual:     'Smart Casual',
  daytime:          'Daytime',
  daily:            'Daily',
  summer_daily:     'Summer Daily',
  gym:              'Gym',
  special_occasions:'Special',
  signature:        'Signature',
  evenings:         'Evenings',
  summer_casual:    'Summer Casual',
  summer_daytime:   'Summer Daytime',
  casual_weekends:  'Weekends',
};

function rarityDots(rarity) {
  const level = RARITY_LEVELS[rarity] ?? 0;
  const max   = 4;
  let html    = '';
  for (let i = 1; i <= max; i++) {
    const lit = i <= level ? `rarity-dot--lit rarity-dot--${rarity}` : '';
    html += `<span class="rarity-dot ${lit}"></span>`;
  }
  return html;
}

function rarityLabel(rarity) {
  return { common: 'Common', moderate: 'Moderate', rare: 'Rare', very_rare: 'Very Rare' }[rarity] ?? rarity;
}

function stars(rating) {
  if (!rating) return '';
  const max = 5;
  let html  = '<div class="rating-stars" aria-label="' + rating + ' out of 5">';
  for (let i = 1; i <= max; i++) {
    html += `<span class="star ${i <= rating ? 'star--lit' : ''}" aria-hidden="true">★</span>`;
  }
  return html + '</div>';
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function formatOccasion(key) {
  return OCCASION_LABELS[key] ?? key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}

// ─── FILTER LOGIC ───────────────────────────────────────────
function filterFragrances() {
  const { filters, search } = state;
  const q = search.trim().toLowerCase();

  return state.allFragrances.filter(f => {
    // Status
    if (filters.status !== 'all' && f.status !== filters.status) return false;

    // Season — support "all" value in fragrance seasons array
    if (filters.season !== 'all') {
      const seasonMatch = Array.isArray(f.seasons) &&
        (f.seasons.includes(filters.season) || f.seasons.includes('all'));
      if (!seasonMatch) return false;
    }

    // Type
    if (filters.type !== 'all' && f.type !== filters.type) return false;

    // Occasion
    if (filters.occasion !== 'all') {
      const occMatch = Array.isArray(f.occasions) && f.occasions.includes(filters.occasion);
      if (!occMatch) return false;
    }

    // Search
    if (q) {
      const haystack = [f.name, f.house, f.line, ...(f.accords ?? [])].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

function isFiltered() {
  const { filters, search } = state;
  return filters.status !== 'all' || filters.season !== 'all' ||
         filters.type !== 'all'   || filters.occasion !== 'all' ||
         search.trim() !== '';
}

// ─── RENDER CARD ────────────────────────────────────────────
function renderCard(f) {
  const statusCss   = STATUS_CSS[f.status]    ?? 'owned';
  const statusLabel = STATUS_LABELS[f.status] ?? f.status;
  const accent      = STATUS_ACCENTS[f.status]?? '#c8a84b';

  // Accords (max 5 on card)
  const accords = (f.accords ?? []).slice(0, 5)
    .map(a => `<span class="accord-pill">${escHtml(a)}</span>`)
    .join('');

  // Seasons
  const seasons = (f.seasons ?? [])
    .map(s => `<span class="season-tag season-tag--${s}">${SEASON_LABELS[s] ?? s}</span>`)
    .join('');

  // Occasions (max 3 on card)
  const occasions = (f.occasions ?? []).slice(0, 3)
    .map(o => `<span class="occasion-tag">${escHtml(formatOccasion(o))}</span>`)
    .join('');

  // Concentration + type badge
  const typeLabel = f.type === 'clone' ? ' · Clone' : '';
  const lineName  = f.line ? `<br><span class="card-conc">${escHtml(f.line)}</span>` : '';

  return `
<article
  class="frag-card"
  data-id="${f.id}"
  tabindex="0"
  role="button"
  aria-label="${escHtml(f.name)} by ${escHtml(f.house)}"
  style="--card-accent: ${accent}"
>
  <div class="card-header">
    <div class="card-title-group">
      <div class="card-name">${escHtml(f.name)}</div>
      <div class="card-house">${escHtml(f.house)}${typeLabel}</div>
      <div class="card-conc">${escHtml(f.concentration ?? '')}${lineName}</div>
    </div>
    <span class="status-badge status-badge--${statusCss}">${escHtml(statusLabel)}</span>
  </div>

  ${accords ? `<div class="accords-row">${accords}</div>` : ''}

  ${(seasons || occasions) ? `<div class="tags-row">${seasons}${occasions}</div>` : ''}

  <div class="rarity-row">
    <div class="rarity-indicator">
      <span class="rarity-label">Rarity</span>
      <div class="rarity-dots">${rarityDots(f.streetRarity)}</div>
    </div>
    ${stars(f.rating)}
  </div>

  ${f.notes_personal
    ? `<p class="card-notes">${escHtml(f.notes_personal)}</p>`
    : ''}
</article>`;
}

// ─── RENDER GRID ────────────────────────────────────────────
function render() {
  const results = filterFragrances();

  // Results count
  const total   = state.allFragrances.length;
  DOM.resultsCount.textContent = `${results.length} of ${total} fragrances`;

  // Reset button visibility
  const filtered = isFiltered();
  DOM.resetFilters.hidden  = !filtered;

  // Card grid
  if (results.length === 0) {
    DOM.cardGrid.innerHTML   = '';
    DOM.emptyState.hidden    = false;
    DOM.loadingState?.remove();
    return;
  }

  DOM.emptyState.hidden  = true;
  DOM.cardGrid.innerHTML = results.map(renderCard).join('');
}

// ─── RENDER COLLECTION META ─────────────────────────────────
function renderMeta() {
  const all     = state.allFragrances;
  const owned   = all.filter(f => f.status === 'owned').length;
  const niche   = all.filter(f => f.type === 'niche').length;
  DOM.collectionMeta.innerHTML =
    `${all.length} fragrances<br>${owned} owned · ${niche} niche`;
}

// ─── DETAIL DRAWER ──────────────────────────────────────────
function openDrawer(id) {
  const f = state.allFragrances.find(x => x.id === id);
  if (!f) return;
  state.activeId = id;

  const statusCss   = STATUS_CSS[f.status]    ?? 'owned';
  const statusLabel = STATUS_LABELS[f.status] ?? f.status;
  const accent      = STATUS_ACCENTS[f.status]?? '#c8a84b';

  // Pyramid notes
  const pyTop    = (f.notes?.top    ?? []).map(n => `<span class="pyramid-note">${escHtml(n)}</span>`).join('');
  const pyHeart  = (f.notes?.heart  ?? []).map(n => `<span class="pyramid-note">${escHtml(n)}</span>`).join('');
  const pyBase   = (f.notes?.base   ?? []).map(n => `<span class="pyramid-note">${escHtml(n)}</span>`).join('');

  // Accords
  const accords = (f.accords ?? [])
    .map(a => `<span class="accord-pill">${escHtml(a)}</span>`)
    .join('');

  // Seasons
  const seasons = (f.seasons ?? [])
    .map(s => `<span class="season-tag season-tag--${s}">${SEASON_LABELS[s] ?? s}</span>`)
    .join('');

  // Occasions
  const occasions = (f.occasions ?? [])
    .map(o => `<span class="occasion-tag">${escHtml(formatOccasion(o))}</span>`)
    .join('');

  const priceStr = f.price_eur ? `€${f.price_eur}` : '–';
  const sizeStr  = f.size_ml   ? `${f.size_ml}ml`   : '–';

  const cloneHtml = f.cloneOf
    ? `<p class="clone-badge" style="margin-top:8px">Clone of: <em>${escHtml(f.cloneOf)}</em></p>`
    : '';

  DOM.drawerContent.innerHTML = `
<div style="border-top: 2px solid ${accent}; margin: 0 -24px 16px; opacity:0.6;"></div>
<div class="drawer-house">${escHtml(f.house)}${f.line ? ` · ${escHtml(f.line)}` : ''}</div>
<h2 class="drawer-name">${escHtml(f.name)}</h2>

<div class="drawer-meta-row">
  <span class="status-badge status-badge--${statusCss}">${escHtml(statusLabel)}</span>
  <span style="font-size:12px;color:var(--text-muted);letter-spacing:.06em">${escHtml(f.concentration ?? '')} · ${escHtml(f.type)}</span>
  ${f.rating ? stars(f.rating) : ''}
</div>

${f.notes_personal ? `
<div class="drawer-section">
  <p class="drawer-section-title">Personal Notes</p>
  <p class="drawer-notes-text">"${escHtml(f.notes_personal)}"</p>
</div>` : ''}

${f.role ? `
<div class="drawer-section">
  <p class="drawer-section-title">Role in Collection</p>
  <p class="drawer-role-text">${escHtml(f.role)}</p>
</div>` : ''}

${(pyTop || pyHeart || pyBase) ? `
<div class="drawer-section">
  <p class="drawer-section-title">Fragrance Pyramid</p>
  <div class="pyramid">
    <div class="pyramid-level">
      <div class="pyramid-level-name">Top</div>
      <div class="pyramid-notes">${pyTop || '<span class="pyramid-note" style="opacity:.4">–</span>'}</div>
    </div>
    <div class="pyramid-level">
      <div class="pyramid-level-name">Heart</div>
      <div class="pyramid-notes">${pyHeart || '<span class="pyramid-note" style="opacity:.4">–</span>'}</div>
    </div>
    <div class="pyramid-level">
      <div class="pyramid-level-name">Base</div>
      <div class="pyramid-notes">${pyBase || '<span class="pyramid-note" style="opacity:.4">–</span>'}</div>
    </div>
  </div>
</div>` : ''}

${accords ? `
<div class="drawer-section">
  <p class="drawer-section-title">Accords</p>
  <div class="accords-row">${accords}</div>
</div>` : ''}

${(seasons || occasions) ? `
<div class="drawer-section">
  <p class="drawer-section-title">Season & Occasion</p>
  <div class="tags-row">${seasons}${occasions}</div>
</div>` : ''}

<div class="drawer-section">
  <p class="drawer-section-title">Details</p>
  <div class="drawer-info-grid">
    <div class="info-item">
      <div class="info-item-label">Rarity</div>
      <div class="info-item-value">${rarityLabel(f.streetRarity)}</div>
    </div>
    <div class="info-item">
      <div class="info-item-label">Price</div>
      <div class="info-item-value">${priceStr} / ${sizeStr}</div>
    </div>
  </div>
  ${cloneHtml}
</div>
`;

  DOM.drawerOverlay.classList.add('is-open');
  DOM.detailDrawer.classList.add('is-open');
  DOM.drawerOverlay.removeAttribute('aria-hidden');
  DOM.detailDrawer.removeAttribute('aria-hidden');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  state.activeId = null;
  DOM.drawerOverlay.classList.remove('is-open');
  DOM.detailDrawer.classList.remove('is-open');
  DOM.drawerOverlay.setAttribute('aria-hidden', 'true');
  DOM.detailDrawer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// ─── FILTER PERSISTENCE ─────────────────────────────────────
const LS_KEY = 'sillage_filters_v1';

function saveFilters() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ filters: state.filters, search: state.search }));
  } catch (e) {}
}

function loadFilters() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
    if (saved.filters) Object.assign(state.filters, saved.filters);
    if (saved.search)  state.search = saved.search;
  } catch (e) {}
}

function syncFilterUI() {
  // Sync pills
  document.querySelectorAll('.pill').forEach(pill => {
    const key = pill.dataset.filter;
    const val = pill.dataset.value;
    const active = val === 'all'
      ? state.filters[key] === 'all'
      : state.filters[key] === val;
    pill.classList.toggle('pill--active', active);
  });

  // Sync search input
  DOM.searchInput.value    = state.search;
  DOM.searchClear.hidden   = !state.search;
}

function resetAllFilters() {
  state.filters = { status: 'all', season: 'all', type: 'all', occasion: 'all' };
  state.search  = '';
  syncFilterUI();
  saveFilters();
  render();
}

// ─── EVENT LISTENERS ────────────────────────────────────────
function attachEvents() {
  // Filter pills
  DOM.filterBar.addEventListener('click', e => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    const key = pill.dataset.filter;
    const val = pill.dataset.value;
    if (!key || !val) return;

    state.filters[key] = val;
    saveFilters();
    syncFilterUI();
    render();
  });

  // Search
  DOM.searchInput.addEventListener('input', e => {
    state.search = e.target.value;
    DOM.searchClear.hidden = !state.search;
    saveFilters();
    render();
  });

  DOM.searchClear.addEventListener('click', () => {
    state.search = '';
    DOM.searchInput.value = '';
    DOM.searchClear.hidden = true;
    saveFilters();
    render();
    DOM.searchInput.focus();
  });

  // Reset buttons
  DOM.resetFilters.addEventListener('click',  resetAllFilters);
  DOM.resetFilters2?.addEventListener('click', resetAllFilters);

  // Card click → open drawer
  DOM.cardGrid.addEventListener('click', e => {
    const card = e.target.closest('.frag-card');
    if (!card) return;
    openDrawer(Number(card.dataset.id));
  });

  // Keyboard: Enter on card
  DOM.cardGrid.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.frag-card');
    if (!card) return;
    e.preventDefault();
    openDrawer(Number(card.dataset.id));
  });

  // Close drawer
  DOM.drawerClose.addEventListener('click',   closeDrawer);
  DOM.drawerOverlay.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.activeId !== null) closeDrawer();
  });
}

// ─── DATA LOADING ────────────────────────────────────────────
async function loadData() {
  try {
    const res  = await fetch('data/fragrances.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.allFragrances = data.fragrances ?? [];

    DOM.loadingState?.remove();
    renderMeta();
    render();
  } catch (err) {
    console.error('Failed to load fragrance data:', err);
    if (DOM.loadingState) {
      DOM.loadingState.innerHTML = `
        <p style="color:var(--text-muted)">Failed to load data.<br>
        Make sure <code>data/fragrances.json</code> exists.</p>`;
    }
  }
}

// ─── INIT ────────────────────────────────────────────────────
function init() {
  loadFilters();
  syncFilterUI();
  attachEvents();
  loadData();
}

document.addEventListener('DOMContentLoaded', init);
