/* gh-intro — Scroll Animations & Interactions */

(function () {
  'use strict';

  // Intersection Observer for fade-in animations
  function initScrollAnimations() {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.fade-in').forEach(function (el) {
      observer.observe(el);
    });
  }

  // Animated counter for stats
  function animateCounters() {
    var counters = document.querySelectorAll('[data-count]');
    var observed = new Set();

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !observed.has(entry.target)) {
            observed.add(entry.target);
            var target = parseInt(entry.target.getAttribute('data-count'), 10);
            countUp(entry.target, 0, target, 1500);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach(function (counter) {
      observer.observe(counter);
    });
  }

  function countUp(el, start, end, duration) {
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      var current = Math.floor(start + (end - start) * eased);

      if (current >= 1000) {
        el.textContent = (current / 1000).toFixed(1) + 'k';
      } else {
        el.textContent = current;
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  // Smooth scroll for nav links
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var targetId = this.getAttribute('href');
        if (targetId === '#') return;

        var target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          var navHeight = document.querySelector('.nav').offsetHeight;
          var top = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      });
    });
  }

  // Nav background on scroll
  function initNavScroll() {
    var nav = document.querySelector('.nav');
    var scrolled = false;

    function onScroll() {
      if (window.scrollY > 20 && !scrolled) {
        scrolled = true;
        nav.style.boxShadow = '0 1px 8px rgba(0, 0, 0, 0.06)';
      } else if (window.scrollY <= 20 && scrolled) {
        scrolled = false;
        nav.style.boxShadow = 'none';
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', function () {
    initScrollAnimations();
    animateCounters();
    initSmoothScroll();
    initNavScroll();
  });
})();

// Copy code button handler (global scope for inline onclick)
function copyCode(btn) {
  var codeBlock = btn.closest('.code-block');
  if (!codeBlock) return;
  var codeEl = codeBlock.querySelector('code');
  if (!codeEl) return;
  var code = codeEl.textContent;

  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>';
  var ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

  function markCopied() {
    btn.classList.add('copied');
    btn.innerHTML = ICON_CHECK;
    setTimeout(function () {
      btn.classList.remove('copied');
      btn.innerHTML = ICON_COPY;
    }, 2000);
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(markCopied).catch(function () {
      fallbackCopy(code, markCopied);
    });
  } else {
    fallbackCopy(code, markCopied);
  }
}

function fallbackCopy(text, onSuccess) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    if (document.execCommand('copy')) onSuccess();
  } catch (e) { /* silent — browser doesn't support copy */ }
  document.body.removeChild(ta);
}
