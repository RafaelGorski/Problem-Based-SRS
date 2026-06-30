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

    // ── Animated derivation demo (CP -> CN -> FR) ─────────────────
    // The markup renders the full composed chain (visible default).
    // When motion is allowed, JS hides the downstream nodes and replays
    // two derivations: derive a Customer Need from the Customer Problem,
    // then a Functional Requirement from the Need, each run by its skill.
    function runTaskbarDemo(root) {
        var textEl = root.querySelector('[data-tbd-text]');
        var bar = root.querySelector('.tbd-bar');
        var cp = root.querySelector('.tbd-cp');
        var cn = root.querySelector('.tbd-cn');
        var fr = root.querySelector('.tbd-fr');
        var linkCn = root.querySelector('.tbd-link-cn');
        var linkFr = root.querySelector('.tbd-link-fr');
        var btnCN = root.querySelector('.tbd-btn.s1.is-derive');
        var btnFR = root.querySelector('.tbd-btn.s2.is-derive');
        if (!textEl || !bar || !cp || !cn || !fr) { return; }

        var PLACEHOLDER = 'Describe a change\u2026';
        var timers = [];
        function after(ms, fn) { timers.push(setTimeout(fn, ms)); }
        function setText(value, isPlaceholder) {
            textEl.textContent = value;
            textEl.classList.toggle('is-placeholder', !!isPlaceholder);
        }
        function clearFocus() { [cp, cn, fr].forEach(function (n) { n.classList.remove('is-focus'); }); }

        function typeOut(text, done) {
            bar.classList.add('is-typing');
            setText('', false);
            var i = 0;
            (function tick() {
                i += 1;
                setText(text.slice(0, i), false);
                if (i >= text.length) { after(560, done); return; }
                after(34, tick);
            })();
        }

        function reset() {
            clearFocus();
            cn.classList.remove('is-in');
            fr.classList.remove('is-in');
            linkCn.classList.remove('is-in');
            linkFr.classList.remove('is-in');
            bar.classList.remove('is-show', 'is-typing', 'at-cn');
            bar.classList.add('at-cp');
            delete root.dataset.stage;
            if (btnCN) { btnCN.classList.remove('is-press'); }
            if (btnFR) { btnFR.classList.remove('is-press'); }
            setText(PLACEHOLDER, true);
        }

        var steps = [
            function (n) { reset(); after(900, n); },
            function (n) { cp.classList.add('is-focus'); after(640, n); },
            function (n) { root.dataset.stage = '1'; bar.classList.add('is-show'); setText(PLACEHOLDER, true); after(620, n); },
            function (n) { typeOut('Derive the customer need', n); },
            function (n) { bar.classList.remove('is-typing'); if (btnCN) { btnCN.classList.add('is-press'); } after(420, n); },
            function (n) { if (btnCN) { btnCN.classList.remove('is-press'); } setText('Running /customer-needs\u2026', false); after(1150, n); },
            function (n) { bar.classList.remove('is-show'); cn.classList.add('is-in'); linkCn.classList.add('is-in'); clearFocus(); after(760, n); },
            function (n) { cn.classList.add('is-focus'); after(560, n); },
            function (n) { root.dataset.stage = '2'; bar.classList.remove('at-cp'); bar.classList.add('at-cn', 'is-show'); setText(PLACEHOLDER, true); after(620, n); },
            function (n) { typeOut('Derive the requirement', n); },
            function (n) { bar.classList.remove('is-typing'); if (btnFR) { btnFR.classList.add('is-press'); } after(420, n); },
            function (n) { if (btnFR) { btnFR.classList.remove('is-press'); } setText('Running /functional-requirements\u2026', false); after(1200, n); },
            function (n) { bar.classList.remove('is-show'); fr.classList.add('is-in'); linkFr.classList.add('is-in'); clearFocus(); after(2700, n); }
        ];

        var index = 0;
        function step() {
            steps[index](function () { index = (index + 1) % steps.length; step(); });
        }

        root.classList.add('is-playing');
        requestAnimationFrame(step);
    }

    if (!reduceMotion) {
        document.querySelectorAll('[data-taskbar-demo]').forEach(runTaskbarDemo);
    }
})();
