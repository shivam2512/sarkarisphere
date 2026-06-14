/**
 * SarkariSphere — App Logic
 * Fetches from multiple SarkariResult RSS category feeds via rss2json (free, no key needed)
 * Each feed gives 10 items. We fetch ~12 feeds = ~120 unique items across all categories.
 */

const App = {
  jobs: [],
  filteredJobs: [],
  currentCategory: 'all',
  filteredPage: 1,
  perPage: 50,

  init() {
    this.bindSearch();
    this.setupAutoRefresh();

    const cached = this.getCache();
    if (cached && cached.jobs && cached.jobs.length > 0) {
      this.jobs = cached.jobs;
      this.renderAllBoards();
      this.updateTicker();
      this.updateStats();
      this.updateLastRefreshTime();
    } else {
      this.fetchAllJobs();
    }
  },

  setupAutoRefresh() {
    // Refresh every 10 minutes (600,000 ms)
    setInterval(() => {
      console.log('🔄 Auto-refreshing jobs in background...');
      this.fetchAllJobs(true); // true = silent refresh
    }, 10 * 60 * 1000);
  },

  updateLastRefreshTime() {
    let indicator = document.getElementById('refresh-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'refresh-indicator';
      indicator.style.cssText = 'text-align:center; padding:5px; font-size:12px; color:#666; background:#fff; border-bottom:1px solid #ddd;';
      const container = document.querySelector('.container');
      if (container) container.parentNode.insertBefore(indicator, container);
    }
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    indicator.innerHTML = `🔄 Aggregated from all sources • Last updated: <b>${time}</b> • Auto-updates every 10 mins`;
  },

  bindSearch() {
    const btn = document.getElementById('search-btn');
    const inp = document.getElementById('search-input');
    if (btn) btn.addEventListener('click', () => this.doSearch());
    if (inp) inp.addEventListener('keyup', e => { if (e.key === 'Enter') this.doSearch(); });
  },

  doSearch() {
    const q = (document.getElementById('search-input').value || '').toLowerCase().trim();
    if (!q) { this.showAllBoards(); return; }
    const results = this.jobs.filter(j => j.title.toLowerCase().includes(q));
    this.showFilteredView('🔍 Search: "' + q + '"', results);
  },

  // ─── Data Fetching ────────────────────────────────────────────────────────

  async fetchAllJobs(isSilent = false) {
    if (!isSilent) this.setLoadingState(true);

    const sources = [
      // 1. SarkariResult (WP API) - 3 pages
      this.fetchWP('https://www.sarkariresult.com/wp-json/wp/v2/posts?per_page=100&page=1', 'SarkariResult'),
      this.fetchWP('https://www.sarkariresult.com/wp-json/wp/v2/posts?per_page=100&page=2', 'SarkariResult'),
      this.fetchWP('https://www.sarkariresult.com/wp-json/wp/v2/posts?per_page=100&page=3', 'SarkariResult'),
      // 2. SarkariNetwork (WP API)
      this.fetchWP('https://www.sarkarinetwork.com/wp-json/wp/v2/posts?per_page=100&page=1', 'SarkariNetwork'),
      // 3. IndGovtJobs (Blogger JSON)
      this.fetchBlogger('https://www.indgovtjobs.in/feeds/posts/default?alt=json&max-results=50', 'IndGovtJobs'),
      // 4. FreeJobAlert (RSS via rss2json)
      this.fetchRSS('https://www.freejobalert.com/feed/', 'FreeJobAlert'),
      // 5. FreshersNow (RSS via rss2json)
      this.fetchRSS('https://www.freshersnow.com/feed/', 'FreshersNow')
    ];

    try {
      const results = await Promise.allSettled(sources);

      let allJobs = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .filter(Boolean);

      // Deduplication Engine (by normalized title)
      const seenTitles = new Set();
      this.jobs = allJobs.filter(job => {
        const normalized = job.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seenTitles.has(normalized)) return false;
        seenTitles.add(normalized);
        return true;
      });

      this.shuffleWithinCategories();
      this.setCache(this.jobs);
      this.renderAllBoards();
      this.updateTicker();
      this.updateStats();
      this.updateLastRefreshTime();

      if (isSilent) {
        window.showToast?.('Data auto-updated successfully!', 'success');
      }

    } catch (e) {
      console.error('Aggregation failed:', e);
    }
  },

  categorizeJob(title) {
    const combined = title.toLowerCase();
    if (combined.includes('result'))                                                    return 'result';
    if (combined.includes('admit card') || combined.includes('hall ticket'))            return 'admitcard';
    if (combined.includes('answer key') || combined.includes('answerkey'))              return 'answerkey';
    if (combined.includes('upsc') || combined.includes('ias') || combined.includes('civil serv')) return 'upsc';
    if (combined.includes('ssc') || combined.includes('chsl') || combined.includes('cgl') || combined.includes('mts')) return 'ssc';
    if (combined.includes('bank') || combined.includes('ibps') || combined.includes('sbi') || combined.includes('rbi') || combined.includes('clerk') || combined.includes(' po ')) return 'banking';
    if (combined.includes('railway') || combined.includes('rrb') || combined.includes('ntpc') || combined.includes('alp') || combined.includes('rpf')) return 'railways';
    if (combined.includes('police') || combined.includes('army') || combined.includes('navy') || combined.includes('nda') || combined.includes('cds') || combined.includes('defence') || combined.includes('defense') || combined.includes('crpf') || combined.includes('bsf') || combined.includes('cisf')) return 'defense';
    return 'psu';
  },

  createJobObj(title, url, dateStr, source) {
    title = (title || '').replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    if (!title) return null;
    
    const isNew = dateStr && (Date.now() - new Date(dateStr).getTime()) < 3 * 24 * 60 * 60 * 1000;
    
    return {
      id: `agg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title,
      category: this.categorizeJob(title),
      url: url || '#',
      date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
      isNew,
      source
    };
  },

  async fetchWP(url, source) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return [];
      const items = await res.json();
      if (!Array.isArray(items)) return [];
      return items.map(item => this.createJobObj(item.title?.rendered, item.link, item.date, source));
    } catch { return []; }
  },

  async fetchBlogger(url, source) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.feed || !data.feed.entry) return [];
      return data.feed.entry.map(item => {
        const linkObj = item.link.find(l => l.rel === 'alternate');
        return this.createJobObj(item.title?.$t, linkObj ? linkObj.href : null, item.published?.$t, source);
      });
    } catch { return []; }
  },

  async fetchRSS(feedUrl, source) {
    try {
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return [];
      const data = await res.json();
      if (data.status !== 'ok' || !data.items) return [];
      return data.items.map(item => this.createJobObj(item.title, item.link || item.guid, item.pubDate, source));
    } catch { return []; }
  },

  shuffleWithinCategories() {
    const buckets = {};
    this.jobs.forEach(j => {
      if (!buckets[j.category]) buckets[j.category] = [];
      buckets[j.category].push(j);
    });
    Object.keys(buckets).forEach(cat => {
      const arr = buckets[cat];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      buckets[cat] = arr;
    });
    this.jobs = Object.values(buckets).flat();
  },

  // ─── Board Rendering ──────────────────────────────────────────────────────

  renderAllBoards() {
    const boardDefs = [
      { id: 'latestjob', filter: j => j.category !== 'result' && j.category !== 'admitcard' && j.category !== 'answerkey' },
      { id: 'result',    filter: j => j.category === 'result' },
      { id: 'admitcard', filter: j => j.category === 'admitcard' },
      { id: 'upsc',      filter: j => j.category === 'upsc' },
      { id: 'banking',   filter: j => j.category === 'banking' },
      { id: 'railways',  filter: j => j.category === 'railways' },
      { id: 'ssc',       filter: j => j.category === 'ssc' },
      { id: 'defense',   filter: j => j.category === 'defense' },
      { id: 'psu',       filter: j => j.category === 'psu' },
    ];

    boardDefs.forEach(({ id, filter }) => {
      const items = this.jobs
        .filter(filter)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 35);

      const list  = document.getElementById('list-' + id);
      const count = document.getElementById('count-' + id);
      if (!list) return;

      if (count) count.textContent = items.length;

      if (items.length === 0) {
        list.innerHTML = '<li class="loading-row">Loading...</li>';
        return;
      }

      list.innerHTML = items.map(job => `
        <li>
          <a href="#" onclick="App.openJobViewer('${job.id}'); return false;">
            ${job.isNew ? '<span class="new-tag">NEW</span>' : ''}
            ${this.escHtml(job.title)}
          </a>
        </li>`).join('');
    });
  },

  escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  },

  // ─── Category Filter ──────────────────────────────────────────────────────

  filterByCategory(cat) {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    const chip = document.querySelector(`.chip[data-cat="${cat}"]`);
    if (chip) chip.classList.add('active');

    if (cat === 'all') { this.showAllBoards(); return; }

    const labels = {
      result: '📊 Results', admitcard: '🎫 Admit Cards',
      upsc: '🏛️ UPSC', ssc: '📜 SSC', banking: '🏦 Banking',
      railways: '🚂 Railway', defense: '🛡️ Defence', psu: '🏭 PSU',
      latestjob: '📋 Latest Jobs'
    };

    let items;
    if (cat === 'latestjob') {
      items = this.jobs.filter(j => j.category !== 'result' && j.category !== 'admitcard' && j.category !== 'answerkey');
    } else {
      items = this.jobs.filter(j => j.category === cat);
    }
    items = items.sort((a, b) => new Date(b.date) - new Date(a.date));

    this.filteredJobs = items;
    this.filteredPage = 1;
    this.showFilteredView(labels[cat] || cat, items);
  },

  showFilteredView(title, items) {
    document.getElementById('boards-grid').style.display = 'none';
    const fv = document.getElementById('filtered-view');
    fv.style.display = 'block';
    document.getElementById('filtered-title').textContent = `${title} (${items.length})`;
    this.filteredJobs = items;
    this.filteredPage = 1;
    this.renderFilteredPage(false);
  },

  renderFilteredPage(append = false) {
    const list = document.getElementById('filtered-list');
    const start = (this.filteredPage - 1) * this.perPage;
    const end = start + this.perPage;
    const slice = this.filteredJobs.slice(start, end);

    if (!append) list.innerHTML = '';

    if (slice.length === 0 && !append) {
      list.innerHTML = '<li class="loading-row">No results found.</li>';
      document.getElementById('load-more-btn').style.display = 'none';
      return;
    }

    list.insertAdjacentHTML('beforeend', slice.map(job => `
      <li>
        <a href="#" onclick="App.openJobViewer('${job.id}'); return false;">
          ${job.isNew ? '<span class="new-tag">NEW</span>' : ''}
          ${this.escHtml(job.title)}
        </a>
      </li>`).join(''));

    const btn = document.getElementById('load-more-btn');
    btn.style.display = end < this.filteredJobs.length ? 'block' : 'none';
  },

  loadMoreFiltered() {
    this.filteredPage++;
    this.renderFilteredPage(true);
  },

  showAllBoards() {
    document.getElementById('boards-grid').style.display = 'grid';
    document.getElementById('filtered-view').style.display = 'none';
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    const allChip = document.querySelector('.chip[data-cat="all"]');
    if (allChip) allChip.classList.add('active');
    this.currentCategory = 'all';
  },

  // ─── Ticker ───────────────────────────────────────────────────────────────

  updateTicker() {
    const recent = this.jobs
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20)
      .map(j => '📌 ' + j.title)
      .join('   ·   ');
    const track = document.getElementById('ticker-track');
    if (track && recent) track.textContent = recent;
  },

  // ─── Stats ────────────────────────────────────────────────────────────────

  updateStats() {
    const jobs    = this.jobs.filter(j => j.category !== 'result' && j.category !== 'admitcard').length;
    const results = this.jobs.filter(j => j.category === 'result').length;
    const admit   = this.jobs.filter(j => j.category === 'admitcard').length;

    const animate = (id, val) => {
      const el = document.getElementById(id);
      if (!el || val === 0) { if (el) el.textContent = val + '+'; return; }
      let cur = 0;
      const step = Math.max(1, Math.ceil(val / 20));
      const t = setInterval(() => {
        cur = Math.min(cur + step, val);
        el.textContent = cur + '+';
        if (cur >= val) clearInterval(t);
      }, 50);
    };
    animate('stat-jobs', jobs);
    animate('stat-results', results);
    animate('stat-admit', admit);
  },

  setLoadingState() {},

  // ─── Cache ────────────────────────────────────────────────────────────────

  getCache() {
    try {
      const c = localStorage.getItem(API_CONFIG.cache.storageKey);
      if (!c) return null;
      const p = JSON.parse(c);
      if (Date.now() - p.timestamp > API_CONFIG.cache.ttlMinutes * 60 * 1000) return null;
      return p;
    } catch { return null; }
  },

  setCache(jobs) {
    try {
      localStorage.setItem(API_CONFIG.cache.storageKey, JSON.stringify({ timestamp: Date.now(), jobs }));
    } catch (e) { console.warn('Cache write failed'); }
  },

  // Backend proxy base URL — dynamically uses whatever host is serving the page
  // This ensures mobile devices on the same WiFi also point to the correct server
  BACKEND_URL: window.location.origin,

  openJobViewer(jobId) {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return;

    const overlay = document.getElementById('job-viewer');
    const title = document.getElementById('jv-title');
    const loader = document.getElementById('jv-loader');
    const content = document.getElementById('jv-content');

    // Reset state
    content.innerHTML = '';
    loader.style.display = 'flex';
    title.textContent = job.title;

    // Prevent body scrolling
    document.body.style.overflow = 'hidden';

    // Show modal immediately
    overlay.classList.add('active');

    // Store current job URL for share button
    this.currentViewerUrl = job.url;

    // Fetch raw data from our backend proxy
    fetch(`${this.BACKEND_URL}/api/scrape?url=${encodeURIComponent(job.url)}`)
      .then(res => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        loader.style.display = 'none';

        if (data.html && data.html.trim()) {
          // Strip any lingering brand names from the HTML text
          const cleaned = data.html
            .replace(/sarkariresult\.com/gi, 'sarkarisphere.in')
            .replace(/sarkari result/gi, 'SarkariSphere')
            .replace(/sarkarinetwork\.com/gi, 'sarkarisphere.in')
            .replace(/sarkari network/gi, 'SarkariSphere')
            .replace(/freejobalert\.com/gi, 'sarkarisphere.in')
            .replace(/free job alert/gi, 'SarkariSphere')
            .replace(/freshersnow\.com/gi, 'sarkarisphere.in')
            .replace(/freshersnow/gi, 'SarkariSphere')
            .replace(/indgovtjobs\.in/gi, 'sarkarisphere.in')
            .replace(/indgovtjobs/gi, 'SarkariSphere');

          content.innerHTML = cleaned;

          // Rewrite all links inside the content to be safe/blank target
          content.querySelectorAll('a[href]').forEach(a => {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
          });

        } else {
          content.innerHTML = `
            <div style="text-align:center; padding: 40px; color: #888;">
              <p style="font-size: 18px;">&#9888; Could not extract details for this job.</p>
              <p style="margin-top: 10px; font-size: 14px;">This job's source page may be behind a login wall or bot protection.</p>
            </div>`;
        }
      })
      .catch(err => {
        loader.style.display = 'none';
        content.innerHTML = `
          <div style="text-align:center; padding: 40px; color: #c62828;">
            <p style="font-size: 18px;">&#9888; Failed to load details</p>
            <p style="margin-top: 10px; font-size: 14px; color:#555;">Make sure the backend server is running: <code>node server.js</code></p>
            <p style="margin-top: 6px; font-size: 13px; color:#888;">Error: ${err.message}</p>
          </div>`;
      });
  },

  closeJobViewer() {
    const overlay = document.getElementById('job-viewer');
    const content = document.getElementById('jv-content');

    overlay.classList.remove('active');
    document.body.style.overflow = '';

    // Clear content after animation finishes
    setTimeout(() => { content.innerHTML = ''; }, 300);
  },

  shareJob() {
    const title = document.getElementById('jv-title').textContent;
    // Share our own web URL instead of the scraped source URL
    const shareUrl = window.location.origin + window.location.pathname;

    const viralText = `🔥 *New Sarkari Job Alert*\n\n📌 *${title}*\n\n👉 Apply & Details: ${shareUrl}\n\n📢 Join our WhatsApp group for fast updates!`;

    // Option 1: Native share sheet (works on HTTPS mobile)
    if (navigator.share) {
      navigator.share({ title: title, text: viralText, url: shareUrl })
        .then(() => window.showToast?.('Shared successfully!', 'success'))
        .catch(() => this._copyFallback(viralText));
      return;
    }

    // Option 2: Clipboard API (works on HTTPS desktop/mobile)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(viralText)
        .then(() => window.showToast?.('Message copied! Paste in WhatsApp.', 'success'))
        .catch(() => this._copyFallback(viralText));
      return;
    }

    // Option 3: execCommand fallback (works on HTTP — local network testing)
    this._copyFallback(viralText);
  },

  _copyFallback(text) {
    // Create a temporary textarea, select its content, and copy it
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(el);
    el.focus();
    el.select();
    el.setSelectionRange(0, 99999); // for mobile

    const success = document.execCommand('copy');
    document.body.removeChild(el);

    if (success) {
      window.showToast?.('Message copied! Paste in WhatsApp.', 'success');
    } else {
      // Last resort: show a native prompt so user can manually copy
      window.prompt('Copy this link:', text);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
