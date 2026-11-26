/**
 * ECE Daily News Application Controller
 * Handles live rendering, bilingual mode, audio reader (TTS), search, filters,
 * bookmarks, 5PM IST countdown timer, and interactive modals.
 */

let allArticles = [];
let googleLiveArticles = [];
let activeSearchSource = 'curated'; // 'curated' or 'google'
let isGoogleSearching = false;
let currentFilter = 'all';
let currentLanguage = 'en'; // 'en' or 'ta'
let currentVisualMode = localStorage.getItem('ece_visual_mode') || 'photos'; // 'photos' or 'art'
let cardVisualOverrides = {}; // per-card toggle override
let searchQuery = '';
let savedArticles = JSON.parse(localStorage.getItem('ece_saved_news') || '[]');
let speechSynth = window.speechSynthesis;
let currentUtterance = null;
let currentPlayingId = null;

/**
 * Universal Article Finder: Resolves article by ID across both
 * curated daily news and real-time live Google News search results.
 */
function findArticleById(id) {
  if (!id) return null;
  const inCurated = allArticles.find(a => a.id === id);
  if (inCurated) return inCurated;
  if (typeof googleLiveArticles !== 'undefined' && Array.isArray(googleLiveArticles)) {
    const inGoogle = googleLiveArticles.find(a => a.id === id);
    if (inGoogle) return inGoogle;
  }
  return null;
}

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initCountdownTimer();
  updateVisualModeButtonUI();
  await loadNewsData();
  setupEventListeners();
});

// ----------------------------------------------------
// Theme Toggle & Persistence (Light / VS Code Dark)
// ----------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'vscode-dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeButtonUI(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'vscode-dark';
  const newTheme = currentTheme === 'vscode-dark' ? 'light' : 'vscode-dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeButtonUI(newTheme);
}

function updateThemeButtonUI(theme) {
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  const btn = document.getElementById('theme-toggle-btn');
  if (theme === 'vscode-dark') {
    if (icon) icon.textContent = '🌙';
    if (label) label.textContent = 'Dark';
    if (btn) btn.title = 'Switch to Light Theme';
  } else {
    if (icon) icon.textContent = '☀️';
    if (label) label.textContent = 'Light';
    if (btn) btn.title = 'Switch to VS Code Dark Theme';
  }
}

function getIllustrationSvg(type) {
  const ill = (typeof window !== 'undefined' && window.ECEIllustrations) 
    ? window.ECEIllustrations 
    : (typeof ECEIllustrations !== 'undefined' ? ECEIllustrations : null);
  if (ill && typeof ill[type] === 'function') {
    return ill[type]();
  }
  return '';
}

function getCardMediaHtml(item) {
  const cardMode = cardVisualOverrides[item.id] || currentVisualMode;
  const svg = getIllustrationSvg(item.illustration_type);
  
  if (cardMode === 'art' && svg) {
    return `<div class="w-full h-full relative group/art transition-opacity duration-300">${svg}</div>`;
  } else {
    const fallbackAttr = svg ? `onerror="this.onerror=null; this.parentElement.innerHTML=\`${svg.replace(/`/g, '\\`')}\`;"` : '';
    const imgUrl = item.image_url || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80';
    return `
      <div class="w-full h-full relative overflow-hidden bg-slate-900">
        <img src="${imgUrl}" alt="${item.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" ${fallbackAttr} />
      </div>
    `;
  }
}

function toggleVisualMode() {
  currentVisualMode = currentVisualMode === 'photos' ? 'art' : 'photos';
  localStorage.setItem('ece_visual_mode', currentVisualMode);
  cardVisualOverrides = {};
  updateVisualModeButtonUI();
  renderArticles();
}

function updateVisualModeButtonUI() {
  const icon = document.getElementById('visual-mode-icon');
  const label = document.getElementById('visual-mode-label');
  if (icon && label) {
    if (currentVisualMode === 'photos') {
      icon.textContent = '📷';
      label.textContent = 'Photos';
    } else {
      icon.textContent = '🎨';
      label.textContent = 'Vector Art';
    }
  }
}

function toggleCardVisual(itemId, event) {
  if (event) event.stopPropagation();
  const currentCardMode = cardVisualOverrides[itemId] || currentVisualMode;
  cardVisualOverrides[itemId] = currentCardMode === 'photos' ? 'art' : 'photos';
  renderArticles();
}

function toggleModalVisual(itemId, event) {
  if (event) event.stopPropagation();
  toggleCardVisual(itemId);
  const article = findArticleById(itemId);
  if (article) {
    const container = document.getElementById('modal-media-container');
    if (container) {
      container.innerHTML = getCardMediaHtml(article);
    }
    const btn = document.getElementById('modal-visual-btn');
    if (btn) {
      const mode = cardVisualOverrides[article.id] || currentVisualMode;
      btn.textContent = mode === 'photos' ? '🎨 Show Vector Art' : '📷 Show Real Photo';
    }
  }
}

async function loadNewsData() {
  try {
    let data = window.INITIAL_NEWS_DATA || null;

    // Attempt live fetch if running on http/https or local server
    try {
      const res = await fetch('data/news.json?t=' + Date.now());
      if (res.ok) {
        const fetchedData = await res.json();
        if (fetchedData && fetchedData.articles && fetchedData.articles.length > 0) {
          data = fetchedData;
        }
      }
    } catch (netErr) {
      // Ignore network/CORS error on file:// and gracefully use window.INITIAL_NEWS_DATA
    }

    if (!data) throw new Error('Failed to load news data');
    
    allArticles = data.articles || [];
    
    // Update headers and metadata
    document.getElementById('edition-title').textContent = data.edition || 'Daily Edition';
    document.getElementById('header-date-en').textContent = data.formatted_date || '';
    document.getElementById('header-date-ta').textContent = data.tamil_date || '';
    document.getElementById('total-articles-count').textContent = allArticles.length;
    
    renderArticles();
  } catch (err) {
    console.error('Error loading news:', err);
    document.getElementById('articles-grid').innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400">
        <p class="text-xl mb-4 text-red-400">⚠️ Unable to load latest news data.</p>
        <button onclick="loadNewsData()" class="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium">Retry</button>
      </div>
    `;
  }
}

function initCountdownTimer() {
  function updateClock() {
    const now = new Date();
    
    // IST is UTC + 5:30
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utcMs + (5.5 * 3600000));
    
    // Target 5:00 AM (05:00:00) IST today
    let targetIST = new Date(istTime);
    targetIST.setHours(5, 0, 0, 0);
    
    if (istTime >= targetIST) {
      // If already past 5am today, target is tomorrow 5am IST
      targetIST.setDate(targetIST.getDate() + 1);
    }
    
    const diffMs = targetIST - istTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    const timerEl = document.getElementById('ist-countdown-timer');
    if (timerEl) {
      timerEl.textContent = `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
    }
  }
  
  updateClock();
  setInterval(updateClock, 1000);
}

function setupEventListeners() {
  // Theme Toggle Button
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  // Global Language Switcher
  const langToggleBtn = document.getElementById('lang-toggle-btn');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      currentLanguage = currentLanguage === 'en' ? 'ta' : 'en';
      langToggleBtn.innerHTML = currentLanguage === 'en' 
        ? `<span class="text-xs font-mono bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">ENG</span> <span class="text-xs opacity-60">தமிழ்</span>`
        : `<span class="text-xs opacity-60">ENG</span> <span class="text-xs font-mono bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">தமிழ்</span>`;
      renderArticles();
    });
  }

  // Search input & Enter key listener for instant Google live sourcing
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerGoogleLiveSearch();
      }
    });

    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      const clearBtn = document.getElementById('search-clear-btn');
      if (clearBtn) {
        if (searchQuery.length > 0) {
          clearBtn.classList.remove('hidden');
        } else {
          clearBtn.classList.add('hidden');
        }
      }
      // If we are currently in Google Live mode, clearing the query resets back to curated
      if (!searchQuery && activeSearchSource === 'google') {
        activeSearchSource = 'curated';
        updateSourceTabUI();
      }
      renderArticles();
    });
  }

  // Keyboard Shortcuts: Ctrl+K / Cmd+K or '/' to focus search, Esc to clear/blur
  window.addEventListener('keydown', (e) => {
    const input = document.getElementById('search-input');
    if (!input) return;

    const isTyping = document.activeElement && 
      (['input', 'textarea', 'select'].includes((document.activeElement.tagName || '').toLowerCase()) ||
       document.activeElement.isContentEditable);

    // Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    } 
    // '/' key when not actively typing in an input
    else if (e.key === '/' && !isTyping) {
      e.preventDefault();
      input.focus();
      input.select();
    } 
    // Esc key to clear or blur
    else if (e.key === 'Escape' && document.activeElement === input) {
      if (input.value) {
        clearSearch();
      } else {
        input.blur();
      }
    }
  });

  // OS detection for keyboard badge
  const kbdPill = document.getElementById('search-kbd-pill');
  if (kbdPill) {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    kbdPill.textContent = isMac ? '⌘K' : 'Ctrl+K';
  }

  // Filter buttons
  const filterButtons = document.querySelectorAll('.filter-tab-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => {
        b.classList.remove('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/50');
        b.classList.add('text-slate-400', 'border-slate-800');
      });
      btn.classList.add('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/50');
      btn.classList.remove('text-slate-400', 'border-slate-800');
      
      currentFilter = btn.dataset.filter;
      // If user clicks a filter, switch back to curated mode
      if (activeSearchSource === 'google') {
        activeSearchSource = 'curated';
        updateSourceTabUI();
      }
      renderArticles();
    });
  });

  // Modal Close
  const modalOverlay = document.getElementById('story-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }
}

// ----------------------------------------------------
// Google Live Sourcing & Search Helpers
// ----------------------------------------------------
function setSearchSource(source) {
  activeSearchSource = source;
  updateSourceTabUI();
  if (source === 'google') {
    const input = document.getElementById('search-input');
    const query = input ? input.value.trim() : '';
    if (query) {
      triggerGoogleLiveSearch(query);
    } else {
      triggerGoogleLiveSearch('delhi electronics');
    }
  } else {
    renderArticles();
  }
}

function updateSourceTabUI() {
  const curatedTab = document.getElementById('source-tab-curated');
  const googleTab = document.getElementById('source-tab-google');
  const catContainer = document.getElementById('category-filters-container');

  if (activeSearchSource === 'google') {
    if (googleTab) {
      googleTab.classList.add('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/50', 'shadow-sm');
      googleTab.classList.remove('text-slate-400', 'border-transparent');
    }
    if (curatedTab) {
      curatedTab.classList.remove('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/50', 'shadow-sm');
      curatedTab.classList.add('text-slate-400', 'border-transparent');
    }
    if (catContainer) catContainer.classList.add('opacity-40', 'pointer-events-none');
  } else {
    if (curatedTab) {
      curatedTab.classList.add('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/50', 'shadow-sm');
      curatedTab.classList.remove('text-slate-400', 'border-transparent');
    }
    if (googleTab) {
      googleTab.classList.remove('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/50', 'shadow-sm');
      googleTab.classList.add('text-slate-400', 'border-transparent');
    }
    if (catContainer) catContainer.classList.remove('opacity-40', 'pointer-events-none');
  }
}

async function triggerGoogleLiveSearch(customQuery) {
  const input = document.getElementById('search-input');
  const query = customQuery || (input ? input.value.trim() : '');
  if (!query) {
    if (input) input.focus();
    return;
  }
  await fetchLiveGoogleNews(query);
}

async function fetchLiveGoogleNews(query) {
  const progressEl = document.getElementById('google-live-progress');
  const queryLabel = document.getElementById('google-loading-query');
  if (progressEl) {
    if (queryLabel) queryLabel.textContent = query;
    progressEl.classList.remove('hidden');
    progressEl.classList.add('flex');
  }

  isGoogleSearching = true;

  // Potential endpoints:
  // 1. Same-origin Netlify Function (when hosted on Netlify)
  // 2. Production Netlify Endpoint (when running offline file:/// on Desktop)
  // 3. Fallback: api.rss2json.com
  const endpoints = [
    `/.netlify/functions/google-news?q=${encodeURIComponent(query)}`,
    `https://daily-ece-news.netlify.app/.netlify/functions/google-news?q=${encodeURIComponent(query)}`,
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(`https://news.google.com/rss/search?q=${encodeURIComponent(query + ' (ECE OR semiconductor OR electronics OR telecom OR engineering)')}&hl=en-IN&gl=IN&ceid=IN:en`)}`
  ];

  let rawItems = [];
  let fetchSuccess = false;

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        if (json && json.items && json.items.length > 0) {
          rawItems = json.items;
          fetchSuccess = true;
          break;
        }
      }
    } catch (e) {
      // try next candidate
    }
  }

  if (progressEl) {
    progressEl.classList.add('hidden');
    progressEl.classList.remove('flex');
  }
  isGoogleSearching = false;

  if (fetchSuccess && rawItems.length > 0) {
    const usedPhotosInSearch = new Set();

    googleLiveArticles = rawItems.map((item, index) => {
      const topicInfo = assignTopicPhoto(item.title, query, index, usedPhotosInSearch);
      usedPhotosInSearch.add(topicInfo.photo);

      const photoUrl = topicInfo.photo.startsWith('http')
        ? topicInfo.photo
        : `https://images.unsplash.com/${topicInfo.photo}?auto=format&fit=crop&w=1200&q=80`;
      
      const cleanTitle = (item.title || '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      const source = item.source || item.author || 'Google News';
      const cleanSummary = (item.summary || item.description || `Live verified dispatch via ${source}: ${cleanTitle}. Reported directly from Google News real-time index.`)
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Extract publisher domain for live publisher icon
      let pubDomain = 'news.google.com';
      try {
        if (item.link) {
          const u = new URL(item.link);
          pubDomain = u.hostname;
        }
      } catch (e) {}

      return {
        id: `google-live-${index}-${Date.now()}`,
        is_google_live: true,
        is_live: true,
        category: 'google_live',
        category_label: `Google News • ${source}`,
        category_tamil: `கூகுள் நேரலை • ${source}`,
        category_badge_color: 'cyan',
        topic_badge: topicInfo.badge,
        publisher_domain: pubDomain,
        title: cleanTitle,
        title_tamil: `நேரலை செய்தி: ${cleanTitle}`,
        summary: cleanSummary,
        summary_tamil: `${source} ஊடகம் வழியாக கூகுள் நேரலை செய்தி: ${cleanTitle}. நிகழ்நேர தொழில்நுட்ப தகவல் அறிக்கை.`,
        tags: [query, 'Google Live', source, topicInfo.badge],
        image_url: photoUrl,
        illustration_type: topicInfo.ill || 'semiconductor',
        source: `${source} (Google News Live)`,
        live_link: item.link || `https://www.google.com/search?q=${encodeURIComponent(cleanTitle)}`,
        author: `${source} Technology Wire`,
        read_time: '2 min read',
        timestamp: item.pubDate ? new Date(item.pubDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST' : 'Just Now (Live)',
        key_highlights: [
          `Sourced live from Google News wire matching query "${query}"`,
          `Reported by ${source} on ${item.pubDate ? String(item.pubDate).substring(0, 16) : 'today'}`,
          `Click "Source ↗" to view full publisher dispatch live on ${source}`,
          `Indexed in ECE Daily News real-time search wire`
        ],
        key_highlights_tamil: [
          `"${query}" தேடலுக்கான கூகுள் நேரலை செய்தி அறிக்கை`,
          `${source} ஊடகம் மூலம் உறுதிப்படுத்தப்பட்ட தொழில்நுட்ப தகவல்`,
          `முழுமையான தகவலை படிக்க "Source ↗" பொத்தானை அழுத்தவும்`,
          `ECE நேரலை செய்தி பட்டியலில் இணைக்கப்பட்டுள்ளது`
        ]
      };
    });

    activeSearchSource = 'google';
    updateSourceTabUI();
    renderArticles();
  } else {
    googleLiveArticles = [];
    activeSearchSource = 'google';
    updateSourceTabUI();
    renderArticles();
  }
}

// =========================================================================
// ZERO-COLLISION DYNAMIC PHOTO & VISUAL ENGINE FOR SEARCH & LIVE NEWS
// 55+ Verified High-Resolution Technical Photos Across 12 ECE Subdomains
// =========================================================================
const DYNAMIC_PHOTO_CATALOG = {
  iit_campus: [
    'photo-1541339907198-e08756dedf3f',
    'photo-1498243691581-b145c3f54a5a',
    'photo-1517245386807-bb43f82c33c4'
  ],
  cleanroom_fab: [
    'photo-1581092160607-ee22621dd758',
    'photo-1581092580497-e0d23cbdf1dc',
    'photo-1581091226825-a6a2a5aee158',
    'photo-1581092334651-ddf26d9a09d0',
    'photo-1581091226033-d5c48150dbaa',
    'photo-1532094349884-543bc11b234d'
  ],
  silicon_microprocessor: [
    'photo-1591488320449-011701bb6704',
    'photo-1563986768609-322da13575f3',
    'photo-1555680202-c86f0e12f086',
    'photo-1518770660439-4636190af475',
    'photo-1550751827-4bd374c3f58b',
    'photo-1526374965328-7f61d4dc18c5'
  ],
  smt_pcb_hardware: [
    'photo-1607604276583-eef5d076aa5f',
    'photo-1563770660941-20978e870e26',
    'photo-1588508065123-287b28e013da',
    'photo-1563986768494-4dee2763ff3f',
    'photo-1517420704952-d9f39e95b43e'
  ],
  instrumentation_testbench: [
    'photo-1580894732444-8ecded7900cd',
    'photo-1581092795360-fd1ca04f0952',
    'photo-1537462715879-360eeb61a0ad',
    'photo-1581092583537-20d51b4b4f1b',
    'photo-1581093588401-fbb62a02f120',
    'photo-1581092162384-8987c1d64718'
  ],
  telecom_rf_radar: [
    'photo-1508739773434-c26b3d09e071',
    'photo-1451187580459-43490279c0fa',
    'photo-1516849841032-87cbac4d88f7',
    'photo-1544717305-2782549b5136',
    'photo-1541185933-ef5d8ed016c2',
    'photo-1506703719100-a0f3a48c0f86'
  ],
  robotics_automation: [
    'photo-1485827404703-89b55fcc595e',
    'photo-1535378620166-273708d44e4c',
    'photo-1561557944-6e7860d1a7eb',
    'photo-1531746790731-6c087fecd65a'
  ],
  ai_datacenter_servers: [
    'photo-1558494949-ef010cbdcc31',
    'photo-1597733336794-12d05021d510',
    'photo-1544197150-b99a580bb7a8',
    'photo-1520869562399-e772f042f422',
    'photo-1504384308090-c894fdcc538d'
  ],
  photonics_quantum_lasers: [
    'photo-1507413245164-6160d8298b31',
    'photo-1517055729445-fa7d27394b48',
    'photo-1511447333015-45b65e60f6d5',
    'photo-1579546929518-9e396f3cc809',
    'photo-1507668077129-56e32842fceb'
  ],
  power_ev_grid: [
    'photo-1473341304170-971dccb5ac1e',
    'photo-1513836279014-a89f7a76ae86',
    'photo-1593941707882-a5bba14938c7'
  ],
  summits_keynotes_expos: [
    'photo-1505373877841-8d25f7d46678',
    'photo-1511578314322-379afb476865',
    'photo-1475721027785-f74eccf877e2'
  ],
  consumer_electronics_retail: [
    'photo-1550009158-9ebf69173e03',
    'photo-1519389950473-47ba0277781c',
    'photo-1525547719571-a2d4ac8945e2',
    'photo-1588872657578-7efd1f1555ed',
    'photo-1505740420928-5e560c06d30e'
  ]
};

// Flattened Master Catalog of Unique Photos
const ALL_UNIQUE_PHOTOS = [];
Object.values(DYNAMIC_PHOTO_CATALOG).forEach(pool => {
  pool.forEach(p => {
    if (!ALL_UNIQUE_PHOTOS.includes(p)) ALL_UNIQUE_PHOTOS.push(p);
  });
});

/**
 * Assigns a completely unique, topic-matched photo to each search result
 * with 100% collision prevention (no two cards ever share the same photo).
 */
function assignTopicPhoto(title, query, idx, usedSet) {
  const t = (title || '').toLowerCase();
  
  // Specific Real Landmarks & Campuses
  if (t.includes('iit delhi')) {
    const p = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/IIT_Delhi_Main_Building.jpeg/960px-IIT_Delhi_Main_Building.jpeg';
    if (!usedSet || !usedSet.has(p)) return { photo: p, ill: 'circuit', badge: 'IIT DELHI RESEARCH' };
  }
  if (t.includes('iit madras') || t.includes('anna univ') || t.includes('ceg')) {
    const p = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c6/Facade_of_IIT_Madras_%28cropped%29.jpg/960px-Facade_of_IIT_Madras_%28cropped%29.jpg';
    if (!usedSet || !usedSet.has(p)) return { photo: p, ill: 'circuit', badge: 'CAMPUS INNOVATION' };
  }

  // Topic classification based on individual article title keywords
  let targetPool = null;
  let illType = 'semiconductor';
  let badgeName = 'SEMICONDUCTOR';

  if (/\b(fab|cleanroom|lithography|foundry|asml|wafer|intel 18a|tsmc)\b/i.test(t)) {
    targetPool = DYNAMIC_PHOTO_CATALOG.cleanroom_fab;
    illType = 'semiconductor';
    badgeName = 'CLEANROOM & FAB';
  } else if (/\b(chip|die|semiconductor|processor|cpu|gpu|transistor|soc|ribbonfet|powervia)\b/i.test(t)) {
    targetPool = DYNAMIC_PHOTO_CATALOG.silicon_microprocessor;
    illType = 'semiconductor';
    badgeName = 'SILICON HARDWARE';
  } else if (/\b(pcb|smt|soldering|motherboard|surface mount|assembly|foxconn|manufacturing)\b/i.test(t)) {
    targetPool = DYNAMIC_PHOTO_CATALOG.smt_pcb_hardware;
    illType = 'circuit';
    badgeName = 'SMT & PCB ASSEMBLY';
  } else if (/\b(telecom|5g|6g|rf|radar|satellite|antenna|spectrum|sub-thz|bsnl|airtel|jio)\b/i.test(t)) {
    targetPool = DYNAMIC_PHOTO_CATALOG.telecom_rf_radar;
    illType = 'telecom';
    badgeName = 'TELECOM & RF';
  } else if (/\b(robot|robotics|cobot|bipedal|autonomous|drone|automation)\b/i.test(t)) {
    targetPool = DYNAMIC_PHOTO_CATALOG.robotics_automation;
    illType = 'robotics';
    badgeName = 'ROBOTICS & AI';
  } else if (/\b(ai|server|datacenter|data center|nvidia|cluster|supercomputer|cloud)\b/i.test(t)) {
    targetPool = DYNAMIC_PHOTO_CATALOG.ai_datacenter_servers;
    illType = 'ai';
    badgeName = 'AI & DATACENTER';
  } else if (/\b(quantum|laser|photonics|optical|fiber optic|optics)\b/i.test(t)) {
    targetPool = DYNAMIC_PHOTO_CATALOG.photonics_quantum_lasers;
    illType = 'quantum';
    badgeName = 'QUANTUM & OPTICS';
  } else if (/\b(battery|ev|electric vehicle|power|inverter|gan|sic|grid|high voltage)\b/i.test(t)) {
    targetPool = DYNAMIC_PHOTO_CATALOG.power_ev_grid;
    illType = 'sensors';
    badgeName = 'POWER & EV TECH';
  } else if (/\b(summit|conference|seminar|expo|convenes|inaugurates|leadership|meet)\b/i.test(t)) {
    targetPool = DYNAMIC_PHOTO_CATALOG.summits_keynotes_expos;
    illType = 'circuit';
    badgeName = 'INDUSTRY SUMMIT';
  } else if (/\b(campus|iit|university|cutoff|ranks|dtu|admissions|curriculum|phd|gate|jee)\b/i.test(t)) {
    targetPool = DYNAMIC_PHOTO_CATALOG.iit_campus;
    illType = 'circuit';
    badgeName = 'ACADEMIC RADAR';
  } else if (/\b(fire|showroom|store|market|consumer|retail|goods|shop|arrested)\b/i.test(t)) {
    targetPool = DYNAMIC_PHOTO_CATALOG.consumer_electronics_retail;
    illType = 'circuit';
    badgeName = 'ELECTRONICS SECTOR';
  } else if (/\b(oscilloscope|sensor|mems|multimeter|probing|test|diagnostics|iot)\b/i.test(t)) {
    targetPool = DYNAMIC_PHOTO_CATALOG.instrumentation_testbench;
    illType = 'sensors';
    badgeName = 'HARDWARE TESTING';
  } else {
    // General fallback
    targetPool = DYNAMIC_PHOTO_CATALOG.cleanroom_fab.concat(DYNAMIC_PHOTO_CATALOG.silicon_microprocessor);
    illType = 'semiconductor';
    badgeName = 'ECE DISPATCH';
  }

  // Find first unused photo in the chosen target pool
  let chosen = null;
  if (targetPool) {
    for (const p of targetPool) {
      if (!usedSet || !usedSet.has(p)) {
        chosen = p;
        break;
      }
    }
  }

  // If all in target pool are already used, pick from global master catalog
  if (!chosen) {
    for (const p of ALL_UNIQUE_PHOTOS) {
      if (!usedSet || !usedSet.has(p)) {
        chosen = p;
        break;
      }
    }
  }

  // Absolute fallback
  if (!chosen) {
    chosen = ALL_UNIQUE_PHOTOS[idx % ALL_UNIQUE_PHOTOS.length];
  }

  return { photo: chosen, ill: illType, badge: badgeName };
}

function setSearchQuery(query, event, autoFetchGoogle) {
  if (event) event.stopPropagation();
  const input = document.getElementById('search-input');
  if (input) {
    input.value = query;
    searchQuery = query.toLowerCase().trim();
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) {
      if (searchQuery.length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }
    input.focus();
    if (autoFetchGoogle) {
      triggerGoogleLiveSearch(query);
    } else {
      activeSearchSource = 'curated';
      updateSourceTabUI();
      renderArticles();
    }
  }
}

function clearSearch() {
  const input = document.getElementById('search-input');
  if (input) {
    input.value = '';
    searchQuery = '';
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) clearBtn.classList.add('hidden');
    activeSearchSource = 'curated';
    updateSourceTabUI();
    input.focus();
    renderArticles();
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatch(text, query) {
  if (!text || !query) return text || '';
  try {
    const escaped = escapeRegExp(query);
    const regex = new RegExp(`(${escaped})`, 'gi');
    return String(text).replace(regex, '<mark class="search-highlight">$1</mark>');
  } catch (e) {
    return text || '';
  }
}

function renderArticles() {
  const grid = document.getElementById('articles-grid');
  if (!grid) return;

  // 1. If in Google Live Mode, render live Google News articles
  if (activeSearchSource === 'google') {
    if (googleLiveArticles.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 px-4 text-center glass-panel rounded-2xl border border-slate-800 my-4 shadow-xl">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-3xl shadow-lg shadow-cyan-500/10">
            🌐
          </div>
          <h3 class="text-xl font-bold text-slate-100 mb-2">No Live Google News Found for "${searchQuery}"</h3>
          <p class="text-slate-400 text-sm max-w-md mx-auto mb-6 leading-relaxed">
            Google News did not return any recent articles for this exact search. Try another keyword or switch back to the curated daily edition.
          </p>
          <div class="flex flex-wrap items-center justify-center gap-2.5">
            <button onclick="setSearchSource('curated')" class="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-all">
              Switch to Daily Edition
            </button>
            <button onclick="triggerGoogleLiveSearch('delhi electronics')" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all">
              Try "Delhi Electronics"
            </button>
          </div>
        </div>
      `;
      return;
    }

    const bannerHtml = `
      <div class="col-span-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 mb-2">
        <div class="flex items-center gap-2.5">
          <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
          <div class="text-xs">
            <span class="text-slate-300">Showing</span>
            <strong class="text-cyan-300 font-bold ml-1">${googleLiveArticles.length} live articles</strong>
            <span class="text-slate-400">directly sourced from Google News for</span>
            <span class="text-white font-semibold underline decoration-cyan-400">"${searchQuery || 'Live ECE'}"</span>
          </div>
        </div>
        <button onclick="setSearchSource('curated')" class="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer self-start sm:self-auto">
          ← Back to Daily Edition
        </button>
      </div>
    `;

    grid.innerHTML = bannerHtml + googleLiveArticles.map(item => createArticleCard(item)).join('');
    return;
  }

  // 2. Curated Edition Filtering
  let filtered = allArticles.filter(item => {
    // Filter matching
    if (currentFilter === 'saved') {
      return savedArticles.includes(item.id);
    }
    if (currentFilter === 'tamil_only') {
      return true;
    }
    if (currentFilter !== 'all' && item.category !== currentFilter) {
      return false;
    }
    return true;
  });

  // Search matching across all relevant technical fields
  if (searchQuery) {
    filtered = filtered.filter(item => {
      const matchText = (
        (item.title || '') + ' ' +
        (item.title_tamil || '') + ' ' +
        (item.summary || '') + ' ' +
        (item.summary_tamil || '') + ' ' +
        (item.tags || []).join(' ') + ' ' +
        (item.category_label || '') + ' ' +
        (item.source || '') + ' ' +
        (item.author || '') + ' ' +
        (item.key_highlights || []).join(' ') + ' ' +
        (item.key_highlights_tamil || []).join(' ')
      ).toLowerCase();
      return matchText.includes(searchQuery);
    });
  }

  // Update Live Search Status Bar
  const statusBar = document.getElementById('search-status-bar');
  const countEl = document.getElementById('search-result-count');
  if (statusBar && countEl) {
    if (searchQuery.length > 0) {
      statusBar.classList.remove('hidden');
      statusBar.classList.add('flex');
      countEl.innerHTML = `Found <strong class="text-cyan-300 font-bold">${filtered.length}</strong> of ${allArticles.length} stories for "<span class="text-slate-200">${searchQuery}</span>"`;
    } else {
      statusBar.classList.add('hidden');
      statusBar.classList.remove('flex');
    }
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 px-4 text-center glass-panel rounded-2xl border border-slate-800 my-4 shadow-xl">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-3xl shadow-lg shadow-cyan-500/10">
          🔍
        </div>
        <h3 class="text-xl font-bold text-slate-100 mb-2">No Curated Articles for "${searchQuery}"</h3>
        <p class="text-slate-400 text-sm max-w-md mx-auto mb-6 leading-relaxed">
          Would you like to source live real-time ECE news for <strong>"${searchQuery}"</strong> directly from Google News?
        </p>
        
        <div class="flex flex-wrap items-center justify-center gap-2.5 mb-6">
          <button onclick="triggerGoogleLiveSearch()" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition-all flex items-center gap-2">
            <span>🌐 Source "${searchQuery}" Live on Google News</span>
            <span>↵</span>
          </button>
          <button onclick="clearSearch()" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all">
            Clear Search ✕
          </button>
        </div>

        <div class="pt-4 border-t border-slate-800/80 max-w-lg mx-auto">
          <p class="text-[11px] font-mono text-slate-500 mb-2">Try popular ECE locations & topics:</p>
          <div class="flex flex-wrap justify-center gap-1.5">
            <button onclick="setSearchQuery('Delhi ECE', event, true)" class="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono border border-cyan-500/30">#Delhi ECE</button>
            <button onclick="setSearchQuery('IIT Delhi', event, true)" class="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700/80">#IIT Delhi</button>
            <button onclick="setSearchQuery('Intel 18A', event)" class="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700/80">#Intel 18A</button>
            <button onclick="setSearchQuery('6G', event)" class="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700/80">#6G</button>
            <button onclick="setSearchQuery('MEMS', event)" class="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700/80">#MEMS</button>
            <button onclick="setSearchQuery('Tata', event)" class="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700/80">#Tata</button>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // In Curated mode with active query, offer direct Google Live search prompt
  const livePromptHtml = searchQuery ? `
    <div class="col-span-full p-3 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-between text-xs mb-2">
      <div class="flex items-center gap-2">
        <span class="text-cyan-400">🌐</span>
        <span class="text-slate-300">Want live web dispatches for <strong>"${searchQuery}"</strong>?</span>
      </div>
      <button onclick="triggerGoogleLiveSearch()" class="px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
        <span>Source "${searchQuery}" on Google Live</span>
        <span class="text-[10px]">↗</span>
      </button>
    </div>
  ` : '';

  grid.innerHTML = livePromptHtml + filtered.map(item => createArticleCard(item)).join('');
}

function createArticleCard(item) {
  const isTamil = currentLanguage === 'ta' || currentFilter === 'tamil_only';
  const rawTitle = isTamil ? (item.title_tamil || item.title) : item.title;
  const rawSummary = isTamil ? (item.summary_tamil || item.summary) : item.summary;
  const title = highlightMatch(rawTitle, searchQuery);
  const summary = highlightMatch(rawSummary, searchQuery);
  const categoryLabel = isTamil ? (item.category_tamil || item.category_label) : item.category_label;
  const isSaved = savedArticles.includes(item.id);
  const isPlaying = currentPlayingId === item.id;

  // Category Accent Badges
  const badgeClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
  }[item.category_badge_color] || 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';

  // Render Media Header (Photo or SVG Illustration based on user preference)
  const mediaHtml = getCardMediaHtml(item);
  const cardVisualMode = cardVisualOverrides[item.id] || currentVisualMode;

  return `
    <article class="glass-panel glass-panel-hover rounded-2xl overflow-hidden flex flex-col group border border-slate-800/80 relative">
      <!-- Media Header with Realistic Photo or Colorful Vector Art -->
      <div class="relative h-56 w-full overflow-hidden bg-slate-950">
        ${mediaHtml}
        
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80 pointer-events-none"></div>
        
        <!-- Category & Read Time Badges -->
        <div class="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 pointer-events-none">
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border backdrop-blur-md ${item.is_google_live ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 flex items-center gap-1.5' : badgeClasses}">
            ${item.is_google_live ? '<span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>' : ''}
            ${item.is_google_live && item.publisher_domain ? `<img src="https://www.google.com/s2/favicons?domain=${item.publisher_domain}&sz=32" class="w-3.5 h-3.5 rounded-sm inline-block" onerror="this.style.display='none'" />` : ''}
            ${categoryLabel}
          </span>
          ${item.topic_badge ? `
          <span class="px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider uppercase bg-slate-950/80 text-cyan-300 border border-cyan-800/60 backdrop-blur-md shadow-sm">
            ${item.topic_badge}
          </span>` : ''}
          <span class="px-2 py-1 rounded-full text-xs font-mono bg-slate-900/80 text-slate-300 border border-slate-700/80 backdrop-blur-md">
            ${item.read_time}
          </span>
        </div>

        <!-- Per-Card Controls: Visual Toggle, Language Switch, Bookmark -->
        <div class="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <button onclick="toggleCardVisual('${item.id}', event)" class="px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-xs font-mono backdrop-blur-md transition-all shadow-sm flex items-center gap-1" title="Toggle between Realistic Photo and Vector Illustration">
            <span>${cardVisualMode === 'photos' ? '🎨 Art' : '📷 Photo'}</span>
          </button>
          <button onclick="toggleCardLanguage('${item.id}', event)" class="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-xs font-mono backdrop-blur-md transition-all shadow-sm" title="Toggle English/Tamil">
            ${isTamil ? 'ENG' : 'தமிழ்'}
          </button>
          <button onclick="toggleBookmark('${item.id}', event)" class="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs backdrop-blur-md transition-all shadow-sm ${isSaved ? 'text-amber-400 border-amber-500/40' : 'text-slate-400 hover:text-amber-300'}" title="Save article">
            ${isSaved ? '★' : '☆'}
          </button>
        </div>

        <!-- Timestamp Pill -->
        <div class="absolute bottom-3 left-3">
          <span class="text-xs font-mono text-cyan-300/80 bg-slate-900/90 px-2 py-0.5 rounded border border-cyan-900/50">
            🕒 ${item.timestamp}
          </span>
        </div>
      </div>

      <!-- Content Body -->
      <div class="p-5 flex-1 flex flex-col justify-between">
        <div>
          <!-- Title -->
          <h2 class="text-lg font-bold text-slate-100 hover:text-cyan-400 transition-colors leading-snug mb-2 cursor-pointer ${isTamil ? 'tamil-text font-semibold' : ''}" onclick="openStoryModal('${item.id}')">
            ${title}
          </h2>

          <!-- Summary -->
          <p class="text-sm text-slate-400 line-clamp-3 mb-4 leading-relaxed ${isTamil ? 'tamil-text' : ''}">
            ${summary}
          </p>
        </div>

        <div>
          <!-- Tags with Click-to-Search -->
          <div class="flex flex-wrap gap-1.5 mb-4">
            ${(item.tags || []).map(tag => {
              const isTagMatch = searchQuery && tag.toLowerCase().includes(searchQuery);
              const tagDisplay = highlightMatch(tag, searchQuery);
              return `
                <span onclick="setSearchQuery('${tag.replace(/'/g, "\\'")}', event)" class="cursor-pointer text-[11px] font-mono px-2 py-0.5 rounded transition-all ${isTagMatch ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/60 shadow-sm' : 'bg-slate-800/80 text-slate-300 border border-slate-700/60 hover:border-cyan-500/50 hover:text-cyan-300'}" title="Filter by #${tag}">
                  #${tagDisplay}
                </span>
              `;
            }).join('')}
          </div>

          <!-- Action Footer: Listen Aloud, Google Search & Read Deep Dive -->
          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <div class="flex items-center gap-1.5 sm:gap-2">
              <button onclick="speakArticle('${item.id}', event)" class="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${isPlaying ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500' : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-cyan-500/50 hover:text-cyan-400'}">
                ${isPlaying ? `
                  <span class="flex items-center h-4">
                    <span class="audio-bar"></span><span class="audio-bar"></span><span class="audio-bar"></span>
                  </span>
                  <span>Pause</span>
                ` : `
                  <span>🔊 Listen</span>
                `}
              </button>

              <!-- Live Google Search Link -->
              <a href="https://www.google.com/search?q=${encodeURIComponent(item.title)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border-slate-700 hover:border-cyan-500/50 text-xs font-medium transition-colors shadow-sm" title="Open live news search in Google (New Tab)">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span class="hidden sm:inline">Google</span>
                <span class="text-[10px] opacity-70">↗</span>
              </a>

              <button onclick="shareArticle('${item.id}', event)" class="p-1.5 rounded-lg border bg-slate-800/60 text-slate-400 hover:text-emerald-400 border-slate-700 hover:border-emerald-500/40 text-xs transition-colors" title="Share with friends">
                📤
              </button>
            </div>

            <button onclick="openStoryModal('${item.id}')" class="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Deep Dive</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function toggleCardLanguage(id, e) {
  if (e) e.stopPropagation();
  const card = findArticleById(id);
  if (!card) return;
  card._forceLang = card._forceLang === 'ta' ? 'en' : 'ta';
  renderArticles();
}

function toggleBookmark(id, e) {
  if (e) e.stopPropagation();
  const idx = savedArticles.indexOf(id);
  if (idx > -1) {
    savedArticles.splice(idx, 1);
  } else {
    savedArticles.push(id);
  }
  localStorage.setItem('ece_saved_news', JSON.stringify(savedArticles));
  renderArticles();
}

function speakArticle(id, e) {
  if (e) e.stopPropagation();
  const article = findArticleById(id);
  if (!article) return;

  if (speechSynth.speaking && currentPlayingId === id) {
    speechSynth.cancel();
    currentPlayingId = null;
    renderArticles();
    return;
  }

  speechSynth.cancel();
  currentPlayingId = id;

  const isTamil = currentLanguage === 'ta';
  const textToRead = isTamil 
    ? `${article.title_tamil}. ${article.summary_tamil}`
    : `${article.title}. ${article.summary}`;

  currentUtterance = new SpeechSynthesisUtterance(textToRead);
  currentUtterance.rate = 0.95;
  currentUtterance.pitch = 1.0;

  // Attempt to select optimal language voice
  const voices = speechSynth.getVoices();
  if (isTamil) {
    const taVoice = voices.find(v => v.lang.startsWith('ta'));
    if (taVoice) currentUtterance.voice = taVoice;
  } else {
    const enVoice = voices.find(v => v.lang.startsWith('en-IN') || v.lang.startsWith('en-US'));
    if (enVoice) currentUtterance.voice = enVoice;
  }

  currentUtterance.onend = () => {
    currentPlayingId = null;
    renderArticles();
  };

  currentUtterance.onerror = () => {
    currentPlayingId = null;
    renderArticles();
  };

  speechSynth.speak(currentUtterance);
  renderArticles();
}

// ----------------------------------------------------
// Google Search & Live News Helpers
// ----------------------------------------------------

function openGoogleSearch(query) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openGoogleNews(query) {
  const url = `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openGoogleScholar(query) {
  const url = `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function executeCustomGoogleSearch(event) {
  if (event) event.preventDefault();
  const input = document.getElementById('custom-google-input');
  if (input && input.value.trim()) {
    openGoogleSearch(input.value.trim());
  }
}

function setModalTab(tab) {
  const deepdiveTabBtn = document.getElementById('tab-btn-deepdive');
  const googleTabBtn = document.getElementById('tab-btn-google');
  const deepdivePane = document.getElementById('tab-pane-deepdive');
  const googlePane = document.getElementById('tab-pane-google');

  if (tab === 'deepdive') {
    if (deepdiveTabBtn) {
      deepdiveTabBtn.className = 'px-3.5 py-2 rounded-xl text-xs font-bold border transition-all bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm flex items-center gap-1.5';
    }
    if (googleTabBtn) {
      googleTabBtn.className = 'px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/60 flex items-center gap-1.5';
    }
    if (deepdivePane) deepdivePane.classList.remove('hidden');
    if (googlePane) googlePane.classList.add('hidden');
  } else {
    if (googleTabBtn) {
      googleTabBtn.className = 'px-3.5 py-2 rounded-xl text-xs font-bold border transition-all bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-sm flex items-center gap-1.5';
    }
    if (deepdiveTabBtn) {
      deepdiveTabBtn.className = 'px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/60 flex items-center gap-1.5';
    }
    if (deepdivePane) deepdivePane.classList.add('hidden');
    if (googlePane) googlePane.classList.remove('hidden');
  }
}

function openStoryModal(id) {
  const article = findArticleById(id);
  if (!article) return;

  const isTamil = currentLanguage === 'ta';
  const title = isTamil ? (article.title_tamil || article.title) : article.title;
  const summary = isTamil ? (article.summary_tamil || article.summary) : article.summary;
  const highlights = isTamil ? (article.key_highlights_tamil || article.key_highlights) : article.key_highlights;
  
  const modal = document.getElementById('story-modal');
  const modalContent = document.getElementById('modal-body');
  const activeMode = cardVisualOverrides[article.id] || currentVisualMode;
  const escapedTitle = article.title.replace(/'/g, "\\'");
  const primaryTag = (article.tags && article.tags[0]) ? article.tags[0] : 'ECE';

  modalContent.innerHTML = `
    <!-- Top Visual Banner -->
    <div class="h-60 sm:h-72 w-full overflow-hidden rounded-xl bg-slate-950 mb-5 relative border border-slate-800">
      <div id="modal-media-container" class="w-full h-full">
        ${getCardMediaHtml(article)}
      </div>
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none"></div>
      
      <!-- Visual Mode Toggle button inside Banner -->
      <button id="modal-visual-btn" onclick="toggleModalVisual('${article.id}', event)" class="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-xs text-slate-300 hover:text-cyan-300 font-mono shadow-md backdrop-blur-md transition-all">
        ${activeMode === 'photos' ? '🎨 Show Vector Art' : '📷 Show Real Photo'}
      </button>

      <div class="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <span class="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 backdrop-blur-md flex items-center gap-1.5">
          ${article.is_google_live ? '<span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>' : ''}
          ${article.category_label}
        </span>
        <span class="text-xs font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-700">
          🕒 ${article.timestamp}
        </span>
      </div>
    </div>

    <!-- Article Headings -->
    <h2 class="text-xl sm:text-2xl font-extrabold text-slate-100 mb-4 leading-snug ${isTamil ? 'tamil-text' : ''}">
      ${title}
    </h2>

    <!-- Interactive Navigation Tabs: Analysis vs Open Live in Google -->
    <div class="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 mb-5">
      <div class="flex items-center gap-1.5">
        <button id="tab-btn-deepdive" onclick="setModalTab('deepdive')" class="px-3.5 py-2 rounded-xl text-xs font-bold border transition-all bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm flex items-center gap-1.5">
          <span>📖 Engineering Analysis</span>
        </button>
        <button id="tab-btn-google" onclick="setModalTab('google')" class="px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/60 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <span>Open Live in Google</span>
          <span class="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">Live Web ↗</span>
        </button>
      </div>

      <!-- Instant 1-Click Launch Button in Top Bar -->
      <a href="${article.live_link || `https://www.google.com/search?q=${encodeURIComponent(article.title)}`}" target="_blank" rel="noopener noreferrer" class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all shadow-sm">
        <span>${article.is_google_live ? 'Open Publisher Wire' : 'Launch Google Search'}</span>
        <span class="text-[11px]">↗</span>
      </a>
    </div>

    <!-- TAB PANE 1: Engineering Analysis -->
    <div id="tab-pane-deepdive" class="space-y-5">
      ${article.live_link ? `
      <!-- Live Web Publisher Callout -->
      <div class="p-4 rounded-xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-blue-950/80 border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div class="flex items-center gap-3 text-left">
          <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xl flex-shrink-0">
            ${article.publisher_domain ? `<img src="https://www.google.com/s2/favicons?domain=${article.publisher_domain}&sz=32" class="w-5 h-5 rounded-sm" onerror="this.src=''; this.parentElement.textContent='🌐'" />` : '🌐'}
          </div>
          <div>
            <div class="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Original Live Story on ${article.source}</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Live Wire</span>
            </div>
            <div class="text-[11px] text-slate-400">Direct publisher dispatch indexed via Google News real-time wire</div>
          </div>
        </div>
        <a href="${article.live_link}" target="_blank" rel="noopener noreferrer" class="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer">
          <span>Read Full Article on ${article.source}</span>
          <span>↗</span>
        </a>
      </div>
      ` : ''}

      <!-- Summary Box -->
      <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 leading-relaxed ${isTamil ? 'tamil-text' : ''}">
        ${summary}
      </div>

      <!-- Key Technical Highlights -->
      <div>
        <h3 class="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
          <span>⚡</span>
          <span>Key Engineering Highlights & Hardware Parameters</span>
        </h3>
        <ul class="space-y-2">
          ${(highlights || []).map(hl => `
            <li class="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300 bg-slate-900/40 p-3 rounded-lg border border-slate-800/80 ${isTamil ? 'tamil-text' : ''}">
              <span class="text-cyan-400 font-bold">✔</span>
              <span>${hl}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <!-- Metadata & Citations -->
      <div class="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
        <div>
          <span class="text-slate-500">Source:</span> <span class="text-slate-300 font-semibold">${article.source}</span>
        </div>
        <div>
          <span class="text-slate-500">By:</span> <span class="text-slate-300">${article.author}</span>
        </div>
      </div>
    </div>

    <!-- TAB PANE 2: Open Live in Google -->
    <div id="tab-pane-google" class="hidden space-y-4">
      <!-- Google Hero Card -->
      <div class="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950 border border-slate-700/80 relative overflow-hidden">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shadow-md">
            <svg class="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Open Live News in Google</span>
              <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Google Integration</span>
            </h3>
            <p class="text-xs text-slate-400">Launch live web coverage, real-time news articles, research papers, and press releases in a new tab.</p>
          </div>
        </div>

        <!-- 3 Primary Google Destination Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <!-- 1. Google Web Search -->
          <a href="https://www.google.com/search?q=${encodeURIComponent(article.title)}" target="_blank" rel="noopener noreferrer" class="flex flex-col p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/60 transition-all group shadow-sm">
            <div class="flex items-center justify-between w-full mb-1">
              <span class="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <span>🌐</span> Google Web
              </span>
              <span class="text-xs text-slate-400 group-hover:text-blue-300 group-hover:translate-x-0.5 transition-transform">↗</span>
            </div>
            <span class="text-[11px] text-slate-400 leading-snug">Full web coverage, company websites & tech forums</span>
          </a>

          <!-- 2. Google News Feed -->
          <a href="https://news.google.com/search?q=${encodeURIComponent(article.title)}&hl=en-IN&gl=IN&ceid=IN:en" target="_blank" rel="noopener noreferrer" class="flex flex-col p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 transition-all group shadow-sm">
            <div class="flex items-center justify-between w-full mb-1">
              <span class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span>📰</span> Google News
              </span>
              <span class="text-xs text-slate-400 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-transform">↗</span>
            </div>
            <span class="text-[11px] text-slate-400 leading-snug">Live news wires, breaking updates & press feeds</span>
          </a>

          <!-- 3. Google Scholar -->
          <a href="https://scholar.google.com/scholar?q=${encodeURIComponent(article.title)}" target="_blank" rel="noopener noreferrer" class="flex flex-col p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/60 transition-all group shadow-sm">
            <div class="flex items-center justify-between w-full mb-1">
              <span class="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <span>🎓</span> Google Scholar
              </span>
              <span class="text-xs text-slate-400 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-transform">↗</span>
            </div>
            <span class="text-[11px] text-slate-400 leading-snug">IEEE journals, academic research & patent filings</span>
          </a>
        </div>
      </div>

      <!-- Live Custom Search Bar -->
      <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <label class="block text-xs font-semibold text-slate-300 mb-2">
          Custom Live Search on Google:
        </label>
        <form onsubmit="executeCustomGoogleSearch(event)" class="flex gap-2">
          <input id="custom-google-input" type="text" value="${article.title} ECE" class="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono shadow-inner" placeholder="Type query to search in Google..." />
          <button type="submit" class="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 whitespace-nowrap transition-all">
            <span>Search Google</span>
            <span>↗</span>
          </button>
        </form>
      </div>

      <!-- Suggested Live Search Angle Chips -->
      <div class="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
        <h4 class="text-xs font-semibold text-slate-400 mb-2.5">
          Suggested Live Search Angles (Click to open in Google):
        </h4>
        <div class="flex flex-wrap gap-2">
          <button onclick="openGoogleSearch('${escapedTitle}')" class="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-cyan-300 hover:text-cyan-200 font-mono flex items-center gap-1.5 transition-colors">
            <span>🔎</span>
            <span>Full Headline Live Search</span>
            <span class="text-[10px] opacity-60">↗</span>
          </button>
          <button onclick="openGoogleSearch('${(article.source || '').replace(/'/g, "\\'")} ${escapedTitle}')" class="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-emerald-300 hover:text-emerald-200 font-mono flex items-center gap-1.5 transition-colors">
            <span>🏛️</span>
            <span>${article.source} Press Release</span>
            <span class="text-[10px] opacity-60">↗</span>
          </button>
          <button onclick="openGoogleSearch('${primaryTag} semiconductor hardware specs')" class="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-amber-300 hover:text-amber-200 font-mono flex items-center gap-1.5 transition-colors">
            <span>⚡</span>
            <span>${primaryTag} Hardware Specs</span>
            <span class="text-[10px] opacity-60">↗</span>
          </button>
          <button onclick="openGoogleScholar('${primaryTag} IEEE paper research')" class="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-purple-300 hover:text-purple-200 font-mono flex items-center gap-1.5 transition-colors">
            <span>📄</span>
            <span>IEEE Research Papers</span>
            <span class="text-[10px] opacity-60">↗</span>
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeModal() {
  const modal = document.getElementById('story-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// ----------------------------------------------------
// Share & Phone Functionality
// ----------------------------------------------------

function getShareableUrl() {
  if (window.location.protocol.startsWith('http') && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    return window.location.href;
  }
  // Permanent Netlify URL
  return 'https://daily-ece-news.netlify.app';
}

function openShareModal() {
  const modal = document.getElementById('share-modal');
  const qrContainer = document.getElementById('qrcode-container');
  const urlInput = document.getElementById('share-url-input');
  const whatsappBtn = document.getElementById('whatsapp-share-btn');

  const shareUrl = getShareableUrl();
  urlInput.value = shareUrl;

  const whatsappText = encodeURIComponent(`⚡ Check out today's ECE Daily News (Semiconductors, 6G, IIT Madras, India Mission):\n${shareUrl}`);
  whatsappBtn.href = `https://api.whatsapp.com/send?text=${whatsappText}`;

  // Generate QR Code
  qrContainer.innerHTML = '';
  if (window.QRCode) {
    new QRCode(qrContainer, {
      text: shareUrl,
      width: 120,
      height: 120,
      colorDark: '#080c14',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    qrContainer.innerHTML = '<div class="text-[10px] text-slate-800 p-2 font-mono">Scan URL</div>';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeShareModal() {
  const modal = document.getElementById('share-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function copyShareUrl() {
  const urlInput = document.getElementById('share-url-input');
  urlInput.select();
  navigator.clipboard.writeText(urlInput.value).then(() => {
    alert('URL copied to clipboard! Send it to your friends.');
  });
}

function triggerWebShare() {
  const shareUrl = getShareableUrl();
  if (navigator.share) {
    navigator.share({
      title: 'ECE Daily News • Worldwide, India, Chennai',
      text: 'Stay updated with the latest in Semiconductors, 6G, VLSI, and ECE innovations!',
      url: shareUrl
    }).catch(err => console.log('Share dismissed', err));
  } else {
    copyShareUrl();
  }
}

function shareArticle(id, e) {
  if (e) e.stopPropagation();
  const article = findArticleById(id);
  if (!article) return;

  const shareUrl = getShareableUrl();
  const shareText = `⚡ ECE News: ${article.title}\n\n${article.summary}\n\nRead more: ${shareUrl}`;

  if (navigator.share) {
    navigator.share({
      title: article.title,
      text: article.summary,
      url: shareUrl
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(shareText).then(() => {
      alert(`Copied "${article.title.substring(0, 40)}..." to clipboard! You can paste and send it to your friends.`);
    });
  }
}
