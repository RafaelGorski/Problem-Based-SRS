(function () {
    'use strict';

    document.body.classList.add('js');

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Scroll reveal ──────────────────────────────────────────────
    if ('IntersectionObserver' in window && !reduceMotion) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
        document.querySelectorAll('.reveal').forEach(function (el) { observer.observe(el); });
    }

    // ── Smooth scroll for in-page anchors ─────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        var hash = a.getAttribute('href');
        if (hash === '#' || hash.length < 2) { return; }
        a.addEventListener('click', function (e) {
            var target = document.querySelector(hash);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
    // ── Copy-to-clipboard commands ────────────────────────────────
    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function (resolve, reject) {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                var ok = document.execCommand('copy');
                document.body.removeChild(ta);
                ok ? resolve() : reject(new Error('execCommand failed'));
            } catch (err) {
                document.body.removeChild(ta);
                reject(err);
            }
        });
    }

    document.querySelectorAll('[data-copy]').forEach(function (btn) {
        var labelEl = btn.querySelector('.copy-cmd-btn-label');
        var defaultLabel = labelEl ? labelEl.textContent : 'Copy';
        var statusEl = document.querySelector(btn.getAttribute('data-copy-status') || '');
        var resetTimer;

        function reset() {
            btn.classList.remove('is-copied');
            if (labelEl) { labelEl.textContent = defaultLabel; }
        }

        btn.addEventListener('click', function () {
            var source = document.querySelector(btn.getAttribute('data-copy'));
            if (!source) { return; }
            var text = (source.textContent || '').trim();
            copyText(text).then(function () {
                btn.classList.add('is-copied');
                if (labelEl) { labelEl.textContent = 'Copied'; }
                if (statusEl) { statusEl.textContent = 'Install command copied to clipboard'; }
            }).catch(function () {
                if (labelEl) { labelEl.textContent = 'Press Ctrl+C'; }
                if (statusEl) { statusEl.textContent = 'Copy failed. Select the command and press Ctrl+C.'; }
            }).then(function () {
                clearTimeout(resetTimer);
                resetTimer = setTimeout(function () {
                    reset();
                    if (statusEl) { statusEl.textContent = ''; }
                }, 2200);
            });
        });
    });
})();
