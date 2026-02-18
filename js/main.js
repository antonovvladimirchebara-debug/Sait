document.addEventListener('DOMContentLoaded', () => {
    applyCustomContent();
    initHeader();
    initMobileMenu();
    initScrollAnimations();
    initCounterAnimation();
    initActiveNavLink();
    initContactForm();
});

function applyCustomContent() {
    let content;
    try {
        const raw = localStorage.getItem('sait_content');
        if (!raw) return;
        content = JSON.parse(raw);
    } catch (e) { return; }

    const $ = (sel) => document.querySelector(sel);
    const setText = (sel, val) => { const el = $(sel); if (el && val) el.textContent = val; };
    const setHTML = (sel, val) => { const el = $(sel); if (el && val) el.innerHTML = val; };

    if (content.hero) {
        const h = content.hero;
        setText('.hero-badge', h.badge);
        if (h.title || h.highlight) {
            const titleEl = $('.hero-title');
            if (titleEl) {
                const word = h.highlight || 'цифровое';
                const full = (h.title || 'Создаём {highlight} будущее вместе')
                    .replace('{highlight}', `<span class="gradient-text">${word}</span>`)
                    .replace(word, `<span class="gradient-text">${word}</span>`);
                titleEl.innerHTML = full;
            }
        }
        setText('.hero-description', h.description);
        if (h.btn1) setText('.hero-actions .btn-primary', h.btn1);
        if (h.btn2) setText('.hero-actions .btn-secondary', h.btn2);
    }

    if (content.about) {
        const a = content.about;
        setText('#about .section-title', a.title);
        const paragraphs = document.querySelectorAll('.about-content > p');
        if (paragraphs[0] && a.text1) paragraphs[0].textContent = a.text1;
        if (paragraphs[1] && a.text2) paragraphs[1].textContent = a.text2;

        const floats = document.querySelectorAll('.about-float-card');
        if (floats[0]) {
            setText('.about-float-1 .float-number', a.card1_number);
            setText('.about-float-1 .float-label', a.card1_label);
        }
        if (floats[1]) {
            setText('.about-float-2 .float-number', a.card2_number);
            setText('.about-float-2 .float-label', a.card2_label);
        }

        const highlights = document.querySelectorAll('.highlight span');
        if (highlights[0] && a.highlight1) highlights[0].textContent = a.highlight1;
        if (highlights[1] && a.highlight2) highlights[1].textContent = a.highlight2;
        if (highlights[2] && a.highlight3) highlights[2].textContent = a.highlight3;
    }

    if (content.stats) {
        const s = content.stats;
        const items = document.querySelectorAll('.stat-item');
        const fields = [
            { num: s.num1, suf: s.suf1, label: s.label1 },
            { num: s.num2, suf: s.suf2, label: s.label2 },
            { num: s.num3, suf: s.suf3, label: s.label3 },
            { num: s.num4, suf: s.suf4, label: s.label4 }
        ];
        fields.forEach((f, i) => {
            if (!items[i]) return;
            const numEl = items[i].querySelector('.stat-number');
            const sufEl = items[i].querySelector('.stat-suffix');
            const labEl = items[i].querySelector('.stat-label');
            if (numEl && f.num !== undefined) numEl.dataset.target = f.num;
            if (sufEl && f.suf) sufEl.textContent = f.suf;
            if (labEl && f.label) labEl.textContent = f.label;
        });
    }

    if (content.contact) {
        const c = content.contact;
        setText('#contact .section-title', c.title);
        const desc = document.querySelector('.contact-info > p');
        if (desc && c.description) desc.textContent = c.description;

        const details = document.querySelectorAll('.contact-detail .detail-value');
        if (details[0] && c.email) details[0].textContent = c.email;
        if (details[1] && c.phone) details[1].textContent = c.phone;
        if (details[2] && c.address) details[2].textContent = c.address;
    }
}

function initHeader() {
    const header = document.getElementById('header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;
        header.classList.toggle('scrolled', currentScroll > 50);
        lastScroll = currentScroll;
    }, { passive: true });
}

function initMobileMenu() {
    const toggle = document.getElementById('mobile-toggle');
    const navLinks = document.getElementById('nav-links');

    if (!toggle || !navLinks) return;

    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        navLinks.classList.toggle('open');
        document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            toggle.classList.remove('active');
            navLinks.classList.remove('open');
            document.body.style.overflow = '';
        });
    });
}

function initScrollAnimations() {
    const elements = document.querySelectorAll('[data-animate]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const siblings = Array.from(el.parentElement.children).filter(
                    child => child.hasAttribute('data-animate')
                );
                const staggerIndex = siblings.indexOf(el);
                const delay = staggerIndex * 100;

                setTimeout(() => {
                    el.classList.add('visible');
                    el.style.transition = `opacity 0.6s ease, transform 0.6s ease`;
                }, delay);

                observer.unobserve(el);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
    });

    elements.forEach(el => observer.observe(el));
}

function initCounterAnimation() {
    const counters = document.querySelectorAll('.stat-number[data-target]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element) {
    const target = parseInt(element.dataset.target, 10);
    const duration = 2000;
    const startTime = performance.now();

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);
        const currentValue = Math.round(easedProgress * target);

        element.textContent = currentValue;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function initActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                });
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '-80px 0px -50% 0px'
    });

    sections.forEach(section => observer.observe(section));
}

function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const btn = form.querySelector('button[type="submit"]');
        const originalContent = btn.innerHTML;

        btn.innerHTML = '<span>Отправлено!</span>';
        btn.style.background = 'linear-gradient(135deg, #00b894, #00cec9)';
        btn.disabled = true;

        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.style.background = '';
            btn.disabled = false;
            form.reset();
        }, 3000);
    });
}
