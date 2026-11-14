/**
 * ECE Daily News Application Controller
 * Handles live rendering, bilingual mode, audio reader (TTS), search, filters,
 * bookmarks, 5PM IST countdown timer, and interactive modals.
 */

let allArticles = [];
let currentFilter = 'all';
let currentLanguage = 'en'; // 'en' or 'ta'
let currentVisualMode = localStorage.getItem('ece_visual_mode') || 'photos'; // 'photos' or 'art'
let cardVisualOverrides = {}; // per-card toggle override
let searchQuery = '';
let savedArticles = JSON.parse(localStorage.getItem('ece_saved_news') || '[]');
let speechSynth = window.speechSynthesis;
let currentUtterance = null;
let currentPlayingId = null;

document.addEventListener('DOMContentLoaded', async () => {
  initCountdownTimer();
  updateVisualModeButtonUI();
  await loadNewsData();
  setupEventListeners();
});

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
  const article = allArticles.find(a => a.id === itemId);
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

  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderArticles();
    });
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

function renderArticles() {
  const grid = document.getElementById('articles-grid');
  if (!grid) return;

  let filtered = allArticles.filter(item => {
    // Filter matching
    if (currentFilter === 'saved') {
      return savedArticles.includes(item.id);
    }
    if (currentFilter === 'tamil_only') {
      // Show all with Tamil priority
      return true;
    }
    if (currentFilter !== 'all' && item.category !== currentFilter) {
      return false;
    }
    return true;
  });

  // Search matching
  if (searchQuery) {
    filtered = filtered.filter(item => {
      const matchText = (
        (item.title || '') + ' ' +
        (item.title_tamil || '') + ' ' +
        (item.summary || '') + ' ' +
        (item.summary_tamil || '') + ' ' +
        (item.tags || []).join(' ') + ' ' +
        (item.category_label || '')
      ).toLowerCase();
      return matchText.includes(searchQuery);
    });
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-20 text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 text-2xl">
          🔍
        </div>
        <h3 class="text-xl font-bold text-slate-200 mb-2">No ECE Articles Found</h3>
        <p class="text-slate-400 text-sm max-w-md mx-auto">Try clearing your search query or selecting a different geographical filter tab.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(item => createArticleCard(item)).join('');
}

function createArticleCard(item) {
  const isTamil = currentLanguage === 'ta' || currentFilter === 'tamil_only';
  const title = isTamil ? (item.title_tamil || item.title) : item.title;
  const summary = isTamil ? (item.summary_tamil || item.summary) : item.summary;
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
        <div class="absolute top-3 left-3 flex flex-wrap gap-2 pointer-events-none">
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border backdrop-blur-md ${badgeClasses}">
            ${categoryLabel}
          </span>
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
          <!-- Tags -->
          <div class="flex flex-wrap gap-1.5 mb-4">
            ${(item.tags || []).map(tag => `
              <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60">
                #${tag}
              </span>
            `).join('')}
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
  const card = allArticles.find(a => a.id === id);
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
  const article = allArticles.find(a => a.id === id);
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
  const article = allArticles.find(a => a.id === id);
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
        <span class="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 backdrop-blur-md">
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
      <a href="https://www.google.com/search?q=${encodeURIComponent(article.title)}" target="_blank" rel="noopener noreferrer" class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold transition-all shadow-sm">
        <span>Launch Google Search</span>
        <span class="text-[11px]">↗</span>
      </a>
    </div>

    <!-- TAB PANE 1: Engineering Analysis -->
    <div id="tab-pane-deepdive" class="space-y-5">
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
  const article = allArticles.find(a => a.id === id);
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
