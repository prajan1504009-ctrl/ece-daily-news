/**
 * ECE Daily News Application Controller
 * Handles live rendering, bilingual mode, audio reader (TTS), search, filters,
 * bookmarks, 5PM IST countdown timer, and interactive modals.
 */

let allArticles = [];
let currentFilter = 'all';
let currentLanguage = 'en'; // 'en' or 'ta'
let searchQuery = '';
let savedArticles = JSON.parse(localStorage.getItem('ece_saved_news') || '[]');
let speechSynth = window.speechSynthesis;
let currentUtterance = null;
let currentPlayingId = null;

document.addEventListener('DOMContentLoaded', async () => {
  initCountdownTimer();
  await loadNewsData();
  setupEventListeners();
});

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
    
    // Target 5:00 PM (17:00:00) IST today
    let targetIST = new Date(istTime);
    targetIST.setHours(17, 0, 0, 0);
    
    if (istTime >= targetIST) {
      // If already past 5pm today, target is tomorrow 5pm IST
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

  // SVG Artwork Render
  let artworkHtml = '';
  if (window.ECEIllustrations && window.ECEIllustrations[item.illustration_type]) {
    artworkHtml = window.ECEIllustrations[item.illustration_type]();
  } else {
    artworkHtml = `<img src="${item.image_url}" alt="${item.title}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />`;
  }

  return `
    <article class="glass-panel glass-panel-hover rounded-2xl overflow-hidden flex flex-col group border border-slate-800/80 relative">
      <!-- Media Header with Colorful Illustration -->
      <div class="relative h-56 w-full overflow-hidden bg-slate-950">
        ${artworkHtml}
        
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80"></div>
        
        <!-- Category & Read Time Badges -->
        <div class="absolute top-3 left-3 flex flex-wrap gap-2">
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border backdrop-blur-md ${badgeClasses}">
            ${categoryLabel}
          </span>
          <span class="px-2 py-1 rounded-full text-xs font-mono bg-slate-900/80 text-slate-300 border border-slate-700/80 backdrop-blur-md">
            ${item.read_time}
          </span>
        </div>

        <!-- Per-Card Language Switch & Bookmark -->
        <div class="absolute top-3 right-3 flex items-center gap-1.5">
          <button onclick="toggleCardLanguage('${item.id}', event)" class="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-cyan-400 text-xs font-mono" title="Toggle English/Tamil">
            ${isTamil ? 'ENG' : 'தமிழ்'}
          </button>
          <button onclick="toggleBookmark('${item.id}', event)" class="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 ${isSaved ? 'text-amber-400' : 'text-slate-400 hover:text-amber-300'}" title="Save article">
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

          <!-- Action Footer: Listen Aloud & Read Deep Dive -->
          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <div class="flex items-center gap-2">
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

function openStoryModal(id) {
  const article = allArticles.find(a => a.id === id);
  if (!article) return;

  const isTamil = currentLanguage === 'ta';
  const title = isTamil ? (article.title_tamil || article.title) : article.title;
  const summary = isTamil ? (article.summary_tamil || article.summary) : article.summary;
  const highlights = isTamil ? (article.key_highlights_tamil || article.key_highlights) : article.key_highlights;
  
  const modal = document.getElementById('story-modal');
  const modalContent = document.getElementById('modal-body');

  let illustrationSvg = '';
  if (window.ECEIllustrations && window.ECEIllustrations[article.illustration_type]) {
    illustrationSvg = window.ECEIllustrations[article.illustration_type]();
  }

  modalContent.innerHTML = `
    <!-- Top Visual Banner -->
    <div class="h-64 sm:h-72 w-full overflow-hidden rounded-xl bg-slate-950 mb-6 relative border border-slate-800">
      ${illustrationSvg || `<img src="${article.image_url}" class="w-full h-full object-cover" />`}
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
      <div class="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <span class="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 backdrop-blur-md">
          ${article.category_label}
        </span>
        <span class="text-xs font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-700">
          🕒 ${article.timestamp}
        </span>
      </div>
    </div>

    <!-- Article Headings -->
    <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-100 mb-4 leading-tight ${isTamil ? 'tamil-text' : ''}">
      ${title}
    </h2>

    <!-- Summary Box -->
    <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 mb-6 text-slate-300 leading-relaxed ${isTamil ? 'tamil-text' : ''}">
      ${summary}
    </div>

    <!-- Key Technical Highlights -->
    <div class="mb-6">
      <h3 class="text-base font-bold text-cyan-400 mb-3 flex items-center gap-2">
        <span>⚡</span>
        <span>Key Engineering Highlights & Takeaways</span>
      </h3>
      <ul class="space-y-2.5">
        ${(highlights || []).map(hl => `
          <li class="flex items-start gap-2.5 text-sm text-slate-300 bg-slate-900/40 p-3 rounded-lg border border-slate-800/80 ${isTamil ? 'tamil-text' : ''}">
            <span class="text-cyan-400 font-bold">✔</span>
            <span>${hl}</span>
          </li>
        `).join('')}
      </ul>
    </div>

    <!-- Metadata & Citations -->
    <div class="pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 font-mono">
      <div>
        <span class="text-slate-500">Source:</span> <span class="text-slate-300 font-semibold">${article.source}</span>
      </div>
      <div>
        <span class="text-slate-500">By:</span> <span class="text-slate-300">${article.author}</span>
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
  if (window.location.protocol.startsWith('http')) {
    return window.location.href;
  }
  // If running locally via file://, give the local Wi-Fi IP URL on port 8080
  return 'http://192.168.29.37:8080';
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
