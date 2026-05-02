/* gh-intro — Full-page long screenshot using html2canvas */

window.saveScreenshot = async function () {
  var btn = document.getElementById('screenshotBtn');
  if (!btn) return;

  // Guard: html2canvas must be loaded
  if (typeof html2canvas !== 'function') {
    alert('Screenshot library is still loading. Please try again in a moment.');
    return;
  }

  // Derive filename from current page title
  var title = document.title.replace(/\s*[—–-].*$/, '').trim() || 'gh-intro';
  var filename = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-screenshot.png';

  // ── Set button to loading state ──────────────────────────────────
  var originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.classList.add('screenshot-loading');
  btn.innerHTML =
    '<span class="screenshot-spinner"></span>' +
    '<span>Capturing…</span>';

  // ── Hide UI-only elements that should not appear in the screenshot ─
  var hideSelectors = ['.no-print', '.gen-overlay', '.gen-panel'];
  var hidden = [];
  hideSelectors.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      if (el.style.display !== 'none') {
        hidden.push({ el: el, prev: el.style.display });
        el.style.display = 'none';
      }
    });
  });

  // ── Scroll to top so html2canvas captures from the beginning ──────
  var prevScrollY = window.scrollY;
  window.scrollTo(0, 0);

  // Small delay to let reflow settle after hiding elements
  await new Promise(function (r) { setTimeout(r, 120); });

  try {
    var canvas = await html2canvas(document.body, {
      useCORS: true,           // allow cross-origin images (banner, avatars)
      allowTaint: false,
      scale: window.devicePixelRatio || 2,  // retina-quality output
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      logging: false,
      backgroundColor: '#FAF7F2',
      onclone: function (clonedDoc) {
        // In the clone: make all fade-in elements fully visible
        clonedDoc.querySelectorAll('.fade-in').forEach(function (el) {
          el.style.opacity = '1';
          el.style.transform = 'none';
        });
        // Remove the glow blob (looks odd in static image)
        clonedDoc.querySelectorAll('.hero-glow').forEach(function (el) {
          el.style.display = 'none';
        });
      }
    });

    // ── Trigger download ────────────────────────────────────────────
    canvas.toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Delay revoke to ensure download starts
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    }, 'image/png');

  } catch (err) {
    console.error('Screenshot failed:', err);
    alert('Could not capture screenshot: ' + (err.message || err));
  } finally {
    // ── Restore hidden elements ─────────────────────────────────────
    hidden.forEach(function (item) {
      item.el.style.display = item.prev;
    });

    // Restore scroll position
    window.scrollTo(0, prevScrollY);

    // Restore button
    btn.disabled = false;
    btn.classList.remove('screenshot-loading');
    btn.innerHTML = originalHTML;
  }
};
