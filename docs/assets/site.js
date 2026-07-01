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
})();
