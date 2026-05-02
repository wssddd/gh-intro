/* gh-intro — GitHub Repository Generator
   Fetches live data from the GitHub REST API and
   re-renders all page sections for any public repo.
*/

(function () {
  'use strict';

  // ── Language colour palette (GitHub's official colours) ───────────
  var LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
    Java: '#b07219', Ruby: '#701516', Go: '#00ADD8', Rust: '#dea584',
    'C++': '#f34b7d', C: '#555555', 'C#': '#178600', PHP: '#4F5D95',
    Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB', Scala: '#c22d40',
    Shell: '#89e051', HTML: '#e34c26', CSS: '#563d7c', Vue: '#41b883',
    Svelte: '#ff3e00', Elixir: '#6e4a7e', Haskell: '#5e5086',
    Lua: '#000080', R: '#198CE7', MATLAB: '#e16737', Nix: '#7e7eff',
    Dockerfile: '#384d54', Makefile: '#427819', default: '#8B949E'
  };

  function langColor(name) {
    return LANG_COLORS[name] || LANG_COLORS.default;
  }

  // ── HTML escape helper — prevents XSS when inserting into innerHTML ─
  function esc(str) {
    var d = document.createElement('div');
    d.textContent = String(str == null ? '' : str);
    return d.innerHTML;
  }

  // ── Token storage ──────────────────────────────────────────────────
  var TOKEN_KEY = 'gh-intro-token';

  function loadToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; }
    catch (e) { return ''; }
  }

  function persistToken(val) {
    try {
      if (val) localStorage.setItem(TOKEN_KEY, val);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }

  window.saveToken = function () {
    var inp = document.getElementById('genToken');
    var btn = document.getElementById('genTokenSaveBtn');
    // If token already saved, Clear button removes it
    var existing = loadToken();
    if (existing && inp.value === existing) {
      persistToken('');
      inp.value = '';
      btn.textContent = 'Cleared ✓';
    } else {
      var val = inp.value.trim();
      persistToken(val);
      btn.textContent = val ? 'Saved ✓' : 'Cleared ✓';
    }
    btn.style.color = '#15803D';
    setTimeout(function () {
      updateTokenSaveBtn(loadToken());
      btn.style.color = '';
    }, 1500);
    fetchRateLimit();
  };

  window.toggleToken = function () {
    var inp = document.getElementById('genToken');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  };

  // ── GitHub API helpers ─────────────────────────────────────────────
  function apiURL(path) {
    return 'https://api.github.com' + path;
  }

  function authHeaders() {
    var token = loadToken();
    var h = { Accept: 'application/vnd.github+json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
  }

  async function apiFetch(path) {
    var res = await fetch(apiURL(path), { headers: authHeaders() });
    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      throw new Error(err.message || ('HTTP ' + res.status));
    }
    return res.json();
  }

  // ── Rate limit display ─────────────────────────────────────────────
  async function fetchRateLimit() {
    var el = document.getElementById('genRateLimit');
    if (!el) return;
    try {
      var res = await fetch(apiURL('/rate_limit'), { headers: authHeaders() });
      var data = await res.json();
      var core = data.resources && data.resources.core;
      if (!core) return;
      var remaining = core.remaining;
      var limit = core.limit;
      var reset = new Date(core.reset * 1000);
      var resetStr = reset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var pct = Math.round((remaining / limit) * 100);
      var color = remaining > 20 ? '#15803D' : remaining > 5 ? '#B45309' : '#B91C1C';
      el.innerHTML =
        '<div class="gen-rate-bar-wrap">' +
          '<div class="gen-rate-bar" style="width:' + pct + '%;background:' + color + '"></div>' +
        '</div>' +
        '<span style="color:' + color + ';font-weight:600">' + remaining + ' / ' + limit + '</span>' +
        ' requests remaining · resets at ' + resetStr;
      el.style.display = 'flex';
    } catch (e) {
      el.style.display = 'none';
    }
  }

  // ── URL parser ─────────────────────────────────────────────────────
  function parseGitHubURL(raw) {
    var str = raw.trim().replace(/\/$/, '');
    // support plain "owner/repo" shorthand
    if (/^[^/]+\/[^/]+$/.test(str)) return str;
    var m = str.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?(?:[?#].*)?$/);
    return m ? m[1] : null;
  }

  // ── Number formatter ──────────────────────────────────────────────
  function fmt(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  // ── Date formatter ────────────────────────────────────────────────
  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  // ── Status helpers ────────────────────────────────────────────────
  function setStatus(msg, type) {
    var el = document.getElementById('genStatus');
    if (!el) return;
    el.className = 'gen-status gen-status-' + (type || 'info');
    el.innerHTML = msg;
    el.style.display = msg ? 'flex' : 'none';
  }

  function setLoading(on) {
    var btn = document.getElementById('genBtn');
    if (!btn) return;
    btn.disabled = on;
    btn.querySelector('.gen-btn-text').textContent = on ? 'Fetching…' : 'Generate';
    btn.querySelector('.gen-btn-icon').style.display = on ? 'none' : '';
    if (on) {
      var spinner = btn.querySelector('.gen-spinner');
      if (!spinner) {
        spinner = document.createElement('span');
        spinner.className = 'gen-spinner';
        btn.insertBefore(spinner, btn.querySelector('.gen-btn-text'));
      }
    } else {
      var s = btn.querySelector('.gen-spinner');
      if (s) s.remove();
    }
  }

  // ── LocalStorage history ──────────────────────────────────────────
  var HISTORY_KEY = 'gh-intro-history';

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function saveHistory(slug) {
    var list = loadHistory().filter(function (s) { return s !== slug; });
    list.unshift(slug);
    list = list.slice(0, 6);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  }

  function renderHistory() {
    var el = document.getElementById('genHistory');
    if (!el) return;
    var list = loadHistory();
    if (!list.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<p class="gen-history-label">Recent</p>' +
      list.map(function (s) {
        return '<button class="gen-history-item" data-slug="' + esc(s) + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' +
          esc(s) + '</button>';
      }).join('');
    el.querySelectorAll('.gen-history-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.fillGenerator(this.dataset.slug);
      });
    });
  }

  // ── Open / close generator panel ─────────────────────────────────
  window.openGenerator = function () {
    document.getElementById('genPanel').classList.add('open');
    document.getElementById('genOverlay').classList.add('open');
    document.getElementById('genInput').focus();
    setStatus('', '');
    // Restore saved token into field
    var saved = loadToken();
    var tokenEl = document.getElementById('genToken');
    if (tokenEl) tokenEl.value = saved;
    updateTokenSaveBtn(saved);
    renderHistory();
    fetchRateLimit();
  };

  function updateTokenSaveBtn(token) {
    var btn = document.getElementById('genTokenSaveBtn');
    if (!btn) return;
    btn.textContent = token ? 'Clear' : 'Save';
    btn.classList.toggle('gen-token-save-btn-active', !!token);
  }

  window.closeGenerator = function () {
    document.getElementById('genPanel').classList.remove('open');
    document.getElementById('genOverlay').classList.remove('open');
  };

  window.fillGenerator = function (slug) {
    document.getElementById('genInput').value = 'https://github.com/' + slug;
    generatePage();
  };

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') window.closeGenerator();
  });

  // Submit on Enter in input
  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('genInput');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') generatePage();
      });
    }
  });

  // ── Main generate function ────────────────────────────────────────
  window.generatePage = async function () {
    var raw = (document.getElementById('genInput').value || '').trim();
    if (!raw) { setStatus('Please enter a GitHub repository URL.', 'error'); return; }

    var slug = parseGitHubURL(raw);
    if (!slug || slug.split('/').length !== 2) {
      setStatus('Could not parse the URL. Try: <code>https://github.com/owner/repo</code>', 'error');
      return;
    }

    setLoading(true);
    setStatus(
      '<span class="gen-spinner-inline"></span> Fetching <strong>' + esc(slug) + '</strong> from GitHub API…',
      'info'
    );

    try {
      // Parallel fetch: repo metadata + languages
      var [repo, langs] = await Promise.all([
        apiFetch('/repos/' + slug),
        apiFetch('/repos/' + slug + '/languages').catch(function () { return {}; })
      ]);

      saveHistory(slug);
      applyData(repo, langs);
      closeGenerator();
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      var msg = err.message || 'Unknown error';
      if (msg.includes('Not Found') || msg.includes('404')) {
        setStatus('Repository not found. Check the URL or make sure it is public.', 'error');
      } else if (msg.includes('rate limit') || msg.includes('403')) {
        setStatus('GitHub API rate limit reached. Add a token below to raise the limit to 5,000 req/hr.', 'error');
      } else {
        setStatus('Error: ' + msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Apply fetched data to the page ────────────────────────────────
  function applyData(repo, langs) {
    var owner = repo.owner.login;
    var name  = repo.name;
    var full  = owner + '/' + name;
    var url   = repo.html_url;
    var desc  = repo.description || 'No description provided.';
    var stars = repo.stargazers_count;
    var forks = repo.forks_count || 0;
    var issues = repo.open_issues_count;
    var license = repo.license ? repo.license.spdx_id : 'No license';
    var mainLang = repo.language || 'Unknown';
    var topics   = (repo.topics || []).slice(0, 6);
    var pushed   = fmtDate(repo.pushed_at);
    var created  = fmtDate(repo.created_at);
    var isOrg    = repo.owner.type === 'Organization';

    // ── document <title> ──
    document.title = name + ' — GitHub Introduction';

    // ── print cover ──
    var pc = document.querySelector('.print-cover-title');
    if (pc) pc.textContent = name;
    var ps = document.querySelector('.print-cover-subtitle');
    if (ps) ps.textContent = desc;
    var pm = document.querySelector('.print-cover-meta');
    if (pm) pm.innerHTML =
      '<span>github.com/' + esc(full) + '</span>' +
      '<span>' + esc(license) + '</span>' +
      '<span>' + esc(fmt(stars)) + ' Stars</span>';
    var pStats = document.querySelector('.print-cover-stats');
    if (pStats) pStats.innerHTML =
      '<div class="print-stat"><strong>' + esc(fmt(stars)) + '</strong><br>Stars</div>' +
      '<div class="print-stat"><strong>' + esc(fmt(forks)) + '</strong><br>Forks</div>' +
      '<div class="print-stat"><strong>' + esc(mainLang) + '</strong><br>Language</div>';

    // ── nav ──
    var navLogo = document.getElementById('navLogo');
    if (navLogo) navLogo.href = url;
    var navLogoText = document.getElementById('navLogoText');
    if (navLogoText) navLogoText.textContent = name;
    var navGhBtn = document.getElementById('navGitHubBtn');
    if (navGhBtn) navGhBtn.href = url;
    var navStar = document.getElementById('navStarText');
    if (navStar) navStar.textContent = 'Star ' + fmt(stars);

    // ── hero banner → social preview ──
    var banner = document.getElementById('heroBanner');
    if (banner) {
      banner.src = 'https://opengraph.githubassets.com/1/' + esc(full);
      banner.alt = esc(name) + ' — GitHub social preview';
      banner.onerror = function () { this.style.display = 'none'; };
      banner.style.display = '';
    }

    // ── hero badges (topics) ──
    var badges = document.getElementById('heroBadges');
    if (badges) {
      var badgeHTML = topics.map(function (t, i) {
        return '<span class="badge ' + (i === 0 ? 'badge-accent' : 'badge-outline') + '">' + esc(t) + '</span>';
      }).join('');
      if (!badgeHTML) badgeHTML = '<span class="badge badge-outline">' + esc(mainLang) + '</span>';
      badges.innerHTML = badgeHTML;
    }

    // ── hero text — use textContent for plain strings, innerHTML only for safe markup ──
    var heroTitleEl = document.getElementById('heroTitle');
    if (heroTitleEl) heroTitleEl.textContent = name;
    var heroSubtitleEl = document.getElementById('heroSubtitle');
    if (heroSubtitleEl) heroSubtitleEl.textContent = desc;
    setText('heroDesc',
      esc(mainLang) + ' &middot; ' + esc(license) + ' &middot; Last push: ' + esc(pushed) +
      (topics.length ? ' &middot; ' + topics.slice(0, 3).map(esc).join(', ') : '')
    );

    // ── hero stats ──
    var statsEl = document.getElementById('heroStats');
    if (statsEl) {
      statsEl.innerHTML = makeStatHTML(fmt(stars), 'Stars') +
        '<div class="stat-divider"></div>' +
        makeStatHTML(fmt(forks), 'Forks') +
        '<div class="stat-divider"></div>' +
        makeStatHTML(fmt(issues), 'Open Issues') +
        '<div class="stat-divider"></div>' +
        makeStatHTML(mainLang, 'Language');
    }

    // ── hero github link ──
    var ghLink = document.getElementById('heroGhLink');
    if (ghLink) ghLink.href = url;

    // ── about section ──
    var aboutTitleEl = document.getElementById('aboutTitle');
    if (aboutTitleEl) aboutTitleEl.textContent = 'About ' + name;
    var aboutDescEl = document.getElementById('aboutDesc');
    if (aboutDescEl) aboutDescEl.textContent = desc;
    var grid = document.getElementById('aboutGrid');
    if (grid) {
      var homepageLink = repo.homepage
        ? ' <a href="' + esc(repo.homepage) + '" target="_blank" rel="noopener">Homepage →</a>'
        : '';
      grid.innerHTML =
        makeAboutCard(iconInfo(), 'Overview', esc(desc) + homepageLink) +
        makeAboutCard(iconCode(), 'Tech Stack',
          'Primary language: <strong>' + esc(mainLang) + '</strong>. ' +
          (topics.length ? 'Topics: ' + topics.map(esc).join(', ') + '.' : '') +
          ' License: ' + esc(license) + '.'
        ) +
        makeAboutCard(iconStar(), 'Community',
          esc(fmt(stars)) + ' stars, ' + esc(fmt(forks)) + ' forks, ' +
          esc(fmt(issues)) + ' open issues. ' +
          (isOrg ? 'Maintained by the <strong>' + esc(owner) + '</strong> organisation.' :
            'Maintained by <strong>' + esc(owner) + '</strong>.')
        );
    }

    // ── project details info grid ──
    var infoGrid = document.getElementById('infoGrid');
    if (infoGrid) {
      infoGrid.innerHTML =
        makeInfoItem('Repository', '<a href="' + esc(url) + '" target="_blank" rel="noopener" class="info-value info-link">github.com/' + esc(full) + '</a>') +
        makeInfoItem('Owner', esc(owner)) +
        makeInfoItem('License', esc(license)) +
        makeInfoItem('Primary Language', esc(mainLang)) +
        makeInfoItem('Created', esc(created)) +
        makeInfoItem('Last Push', esc(pushed));
    }

    // ── language bar ──
    renderLangBar(langs);

    // ── screenshots ──
    var screenshotTitleEl = document.getElementById('screenshotTitle');
    if (screenshotTitleEl) screenshotTitleEl.textContent = name + ' — Screenshots';
    var screenshotDescEl = document.getElementById('screenshotDesc');
    if (screenshotDescEl) screenshotDescEl.textContent = 'Social preview and repository overview from GitHub.';
    var avatarSrc = repo.owner.avatar_url +
      (repo.owner.avatar_url.includes('?') ? '&' : '?') + 's=400';
    var sgrid = document.getElementById('screenshotGrid');
    if (sgrid) {
      sgrid.innerHTML =
        '<div class="screenshot-card" style="grid-column:1/-1">' +
          '<div class="screenshot-frame" style="aspect-ratio:2/1">' +
            '<img src="https://opengraph.githubassets.com/1/' + esc(full) + '" alt="' + esc(name) + ' social preview" loading="lazy">' +
          '</div>' +
          '<div class="screenshot-info">' +
            '<h4>' + esc(name) + ' — Social Preview</h4>' +
            '<p>' + esc(desc) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="screenshot-card">' +
          '<div class="screenshot-frame owner-frame">' +
            '<img src="' + esc(avatarSrc) + '" alt="' + esc(owner) + ' avatar" loading="lazy" style="object-fit:contain;padding:1rem;background:#fff">' +
          '</div>' +
          '<div class="screenshot-info">' +
            '<h4>' + esc(isOrg ? 'Organisation' : 'Owner') + ': ' + esc(owner) + '</h4>' +
            '<p><a href="https://github.com/' + esc(owner) + '" target="_blank" rel="noopener">github.com/' + esc(owner) + '</a></p>' +
          '</div>' +
        '</div>' +
        '<div class="screenshot-card">' +
          '<div class="screenshot-frame" style="background:#1E1E1E;display:flex;align-items:center;justify-content:center;padding:1.5rem">' +
            renderRepoCard(repo, langs) +
          '</div>' +
          '<div class="screenshot-info">' +
            '<h4>Repository Stats</h4>' +
            '<p>Stars, forks, open issues, and language breakdown at a glance.</p>' +
          '</div>' +
        '</div>';
    }

    // ── footer ──
    var footerText = document.getElementById('footerText');
    if (footerText) {
      footerText.innerHTML =
        '<strong>' + esc(name) + '</strong> by ' +
        '<a href="https://github.com/' + esc(owner) + '" target="_blank" rel="noopener">' + esc(owner) + '</a>' +
        ' &mdash; introduction page generated by gh-intro.';
    }
    var footerCopy = document.getElementById('footerCopy');
    if (footerCopy) {
      footerCopy.innerHTML =
        '&copy; ' + new Date().getFullYear() + ' ' + esc(owner) + '/' + esc(name) + '. ' + esc(license) +
        '. <span class="print-only"> &mdash; github.com/' + esc(full) + '</span>';
    }

    // Re-run fade-in observer on new elements
    document.querySelectorAll('.fade-in:not(.visible)').forEach(function (el) {
      el.classList.add('visible');
    });
  }

  // ── Language bar renderer ─────────────────────────────────────────
  function renderLangBar(langs) {
    var bar = document.getElementById('langBar');
    var labels = document.getElementById('langLabels');
    if (!bar || !labels) return;

    var total = Object.values(langs).reduce(function (s, v) { return s + v; }, 0);
    if (total === 0) { bar.innerHTML = ''; labels.innerHTML = ''; return; }

    var sorted = Object.entries(langs).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 6);
    bar.innerHTML = sorted.map(function (e) {
      var pct = ((e[1] / total) * 100).toFixed(1);
      return '<div class="lang-segment" style="width:' + pct + '%;background:' + langColor(e[0]) + '" title="' + e[0] + ' ' + pct + '%"></div>';
    }).join('');
    labels.innerHTML = sorted.map(function (e) {
      var pct = ((e[1] / total) * 100).toFixed(1);
      return '<span><span class="lang-dot" style="background:' + langColor(e[0]) + '"></span>' + e[0] + ' ' + pct + '%</span>';
    }).join('');
  }

  // ── Inline repo stats card (for screenshot slot) ─────────────────
  function renderRepoCard(repo, langs) {
    var total = Object.values(langs).reduce(function (s, v) { return s + v; }, 0);
    var topLangs = Object.entries(langs).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3);
    return '<div style="color:#E8E2D9;font-family:monospace;font-size:0.75rem;line-height:1.7;text-align:left;width:100%">' +
      '<div style="color:#D97757;font-weight:700;margin-bottom:0.5rem">' + esc(repo.full_name) + '</div>' +
      '<div>' + esc((repo.description || '').slice(0, 80)) + '</div>' +
      '<div style="margin-top:0.75rem;display:flex;gap:1rem">' +
        '<span>⭐ ' + esc(fmt(repo.stargazers_count)) + '</span>' +
        '<span>🍴 ' + esc(fmt(repo.forks_count)) + '</span>' +
        '<span>❗ ' + esc(fmt(repo.open_issues_count)) + '</span>' +
      '</div>' +
      (total ? '<div style="margin-top:0.5rem">' + topLangs.map(function (e) {
        var pct = ((e[1] / total) * 100).toFixed(0);
        return '<span style="margin-right:0.75rem"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + langColor(e[0]) + ';vertical-align:middle;margin-right:3px"></span>' + esc(e[0]) + ' ' + esc(pct) + '%</span>';
      }).join('') + '</div>' : '') +
      '</div>';
  }

  // ── DOM helpers ───────────────────────────────────────────────────
  function setText(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function makeStatHTML(value, label) {
    return '<div class="stat-item"><span class="stat-number">' + value + '</span><span class="stat-label">' + label + '</span></div>';
  }

  function makeAboutCard(iconSVG, title, body) {
    return '<div class="about-card"><div class="about-icon">' + iconSVG + '</div><h3>' + title + '</h3><p>' + body + '</p></div>';
  }

  function makeInfoItem(label, valueHTML) {
    return '<div class="info-item"><span class="info-label">' + label + '</span><span class="info-value">' + valueHTML + '</span></div>';
  }

  function iconInfo() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
  }
  function iconCode() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';
  }
  function iconStar() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
  }

})();
