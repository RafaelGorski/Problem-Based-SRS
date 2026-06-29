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

    // ── Animated task-bar demo ────────────────────────────────────
    // Markup already renders the full, composed scene (visible default).
    // When motion is allowed, we add `.is-playing` and cycle data-phase
    // to choreograph: focus → action bar → typing → decompose → result.
    function runTaskbarDemo(root) {
        var textEl = root.querySelector('[data-tbd-text]');
        var instruction = root.getAttribute('data-instruction') || 'Break into finer-grained sub-items';
        var placeholder = root.getAttribute('data-placeholder') || 'Describe a change\u2026';
        var working = root.getAttribute('data-working') || 'Running functional_requirements skill\u2026';
        var phaseTimer = null;
        var typeTimer = null;

        function setText(value, isPlaceholder) {
            if (!textEl) { return; }
            textEl.textContent = value;
            textEl.classList.toggle('is-placeholder', !!isPlaceholder);
        }

        function wait(ms, next) { phaseTimer = setTimeout(next, ms); }

        function typeOut(text, next) {
            setText('', false);
            var i = 0;
            (function tick() {
                i += 1;
                setText(text.slice(0, i), false);
                if (i >= text.length) { wait(520, next); return; }
                typeTimer = setTimeout(tick, 32);
            })();
        }

        var steps = [
            function (next) { root.dataset.phase = 'idle'; setText(placeholder, true); wait(1100, next); },
            function (next) { root.dataset.phase = 'focus'; wait(720, next); },
            function (next) { root.dataset.phase = 'bar'; setText(placeholder, true); wait(640, next); },
            function (next) { root.dataset.phase = 'type'; typeOut(instruction, next); },
            function (next) { root.dataset.phase = 'press'; wait(680, next); },
            function (next) { root.dataset.phase = 'work'; setText(working, false); wait(1300, next); },
            function (next) { root.dataset.phase = 'done'; setText(instruction, false); wait(2600, next); }
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
