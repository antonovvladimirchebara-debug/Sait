const STORAGE_KEY = 'sait_content';
const PW_KEY = 'sait_admin_pw';
const SESSION_KEY = 'sait_admin_session';
const LOCKOUT_KEY = 'sait_lockout';
const LOCKOUT_DB_KEY = 'sait_lockout_db';
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;

const DEFAULT_PW_HASH = '41b472af8ea6180a35e4c2eda03587b54c927658e0b2d5207e3d1406941532ae';

const DEFAULT_CONTENT = {
    hero: {
        badge: 'Добро пожаловать',
        title: 'Создаём {highlight} будущее вместе',
        highlight: 'цифровое',
        description: 'Мы помогаем бизнесу расти с помощью современных технологий, инновационного дизайна и надёжных решений.',
        btn1: 'Начать проект',
        btn2: 'Узнать больше'
    },
    features: {
        title: 'Что мы предлагаем',
        description: 'Комплексные решения для вашего бизнеса — от идеи до реализации',
        items: [
            { title: 'Веб-разработка', text: 'Современные адаптивные сайты с быстрой загрузкой и отличным пользовательским опытом' },
            { title: 'UI/UX Дизайн', text: 'Интуитивно понятные интерфейсы, которые нравятся пользователям и увеличивают конверсию' },
            { title: 'Чистый код', text: 'Структурированный, документированный и легко поддерживаемый код для долгосрочного развития' },
            { title: 'Безопасность', text: 'Защита данных и надёжная инфраструктура для безопасной работы вашего проекта' },
            { title: 'Быстрая доставка', text: 'Гибкая методология разработки для быстрого достижения результатов без потери качества' },
            { title: 'Масштабируемость', text: 'Архитектура, готовая к росту — ваш проект будет развиваться вместе с бизнесом' }
        ]
    },
    about: {
        title: 'Мы создаём продукты, которыми гордимся',
        text1: 'Наша команда объединяет талантливых разработчиков, дизайнеров и стратегов. Мы верим, что отличный продукт — это сочетание технического совершенства и глубокого понимания потребностей пользователей.',
        text2: 'Каждый проект для нас — это возможность создать что-то по-настоящему ценное и помочь нашим клиентам достичь их целей.',
        card1_number: '10+',
        card1_label: 'лет опыта',
        card2_number: '500+',
        card2_label: 'проектов',
        highlight1: 'Индивидуальный подход',
        highlight2: 'Современные технологии',
        highlight3: 'Поддержка 24/7'
    },
    stats: {
        num1: 500, suf1: '+', label1: 'Проектов завершено',
        num2: 50,  suf2: '+', label2: 'Специалистов в команде',
        num3: 99,  suf3: '%', label3: 'Довольных клиентов',
        num4: 10,  suf4: '+', label4: 'Лет на рынке'
    },
    contact: {
        title: 'Давайте обсудим ваш проект',
        description: 'Расскажите нам о вашей идее, и мы поможем воплотить её в жизнь. Первая консультация — бесплатно.',
        email: 'hello@sait.dev',
        phone: '+7 (999) 123-45-67',
        address: 'Москва, Россия'
    }
};

async function sha256(str) {
    const buf = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getPasswordHash() {
    return localStorage.getItem(PW_KEY) || DEFAULT_PW_HASH;
}

async function checkPassword(pw) {
    const hash = await sha256(pw);
    return hash === getPasswordHash();
}

async function setPassword(newPw) {
    const hash = await sha256(newPw);
    localStorage.setItem(PW_KEY, hash);
}

/* ===== Browser Fingerprint ===== */
function getBrowserFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fp', 2, 2);
    const canvasData = canvas.toDataURL();

    const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'unknown',
        navigator.platform || 'unknown',
        canvasData.slice(-50)
    ];
    let hash = 0;
    const str = components.join('|');
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return 'fp_' + Math.abs(hash).toString(36);
}

/* ===== Brute-Force Protection ===== */
let cachedIP = null;

async function getClientIP() {
    if (cachedIP) return cachedIP;
    try {
        const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        cachedIP = data.ip;
        return cachedIP;
    } catch {
        return 'unknown';
    }
}

function getLockoutDB() {
    try {
        return JSON.parse(localStorage.getItem(LOCKOUT_DB_KEY)) || {};
    } catch { return {}; }
}

function saveLockoutDB(db) {
    localStorage.setItem(LOCKOUT_DB_KEY, JSON.stringify(db));
}

function getLockoutEntry(fingerprint) {
    const db = getLockoutDB();
    return db[fingerprint] || null;
}

function setLockoutEntry(fingerprint, entry) {
    const db = getLockoutDB();
    db[fingerprint] = entry;
    saveLockoutDB(db);
}

function getSessionLockout() {
    try {
        return JSON.parse(sessionStorage.getItem(LOCKOUT_KEY)) || { attempts: 0, lockedUntil: 0 };
    } catch { return { attempts: 0, lockedUntil: 0 }; }
}

function setSessionLockout(data) {
    sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
}

async function isLocked() {
    const now = Date.now();

    const session = getSessionLockout();
    if (session.lockedUntil > now) return session.lockedUntil;

    const fp = getBrowserFingerprint();
    const fpEntry = getLockoutEntry(fp);
    if (fpEntry && fpEntry.lockedUntil > now) return fpEntry.lockedUntil;

    const ip = await getClientIP();
    if (ip !== 'unknown') {
        const ipEntry = getLockoutEntry('ip_' + ip);
        if (ipEntry && ipEntry.lockedUntil > now) return ipEntry.lockedUntil;
    }

    return false;
}

async function registerFailedAttempt() {
    const now = Date.now();
    const fp = getBrowserFingerprint();
    const ip = await getClientIP();

    const session = getSessionLockout();
    session.attempts = (session.attempts || 0) + 1;
    if (session.attempts >= MAX_ATTEMPTS) {
        session.lockedUntil = now + LOCKOUT_DURATION_MS;
    }
    setSessionLockout(session);

    const fpEntry = getLockoutEntry(fp) || { attempts: 0, lockedUntil: 0 };
    fpEntry.attempts = (fpEntry.attempts || 0) + 1;
    if (fpEntry.attempts >= MAX_ATTEMPTS) {
        fpEntry.lockedUntil = now + LOCKOUT_DURATION_MS;
    }
    setLockoutEntry(fp, fpEntry);

    if (ip !== 'unknown') {
        const ipEntry = getLockoutEntry('ip_' + ip) || { attempts: 0, lockedUntil: 0 };
        ipEntry.attempts = (ipEntry.attempts || 0) + 1;
        if (ipEntry.attempts >= MAX_ATTEMPTS) {
            ipEntry.lockedUntil = now + LOCKOUT_DURATION_MS;
        }
        setLockoutEntry('ip_' + ip, ipEntry);
    }

    return session.attempts;
}

function resetLockout() {
    const fp = getBrowserFingerprint();
    setSessionLockout({ attempts: 0, lockedUntil: 0 });
    setLockoutEntry(fp, { attempts: 0, lockedUntil: 0 });
}

function formatTimeLeft(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
}

function getSavedContent() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return null;
}

function getContent() {
    const saved = getSavedContent();
    if (!saved) return JSON.parse(JSON.stringify(DEFAULT_CONTENT));
    return deepMerge(JSON.parse(JSON.stringify(DEFAULT_CONTENT)), saved);
}

function deepMerge(target, source) {
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key]) target[key] = {};
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

function saveContent(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const POSTS_KEY = 'sait_posts';
const COMMENTS_KEY = 'sait_comments';

function getPosts() {
    try { return JSON.parse(localStorage.getItem(POSTS_KEY)) || []; }
    catch { return []; }
}

function savePosts(posts) {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

function getAllComments() {
    try { return JSON.parse(localStorage.getItem(COMMENTS_KEY)) || {}; }
    catch { return {}; }
}

function saveAllComments(all) {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
}

function formatDate(iso) {
    const d = new Date(iso);
    const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || '';
}

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', async () => {
    const isLoggedIn = sessionStorage.getItem(SESSION_KEY) === 'true';
    if (isLoggedIn) {
        showAdmin();
    } else {
        await checkAndShowLockout();
    }
    initLogin();
    initSidebar();
    initSaveButton();
    initSettings();
    initPasswordModal();
    initLogout();
    initPostsManager();
});

let lockoutTimerInterval = null;

async function checkAndShowLockout() {
    const lockedUntil = await isLocked();
    if (lockedUntil) {
        showLockoutScreen(lockedUntil);
        return true;
    }
    return false;
}

function showLockoutScreen(lockedUntil) {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');
    const pwInput = document.getElementById('password');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

    if (submitBtn) submitBtn.disabled = true;
    if (pwInput) pwInput.disabled = true;

    function updateTimer() {
        const remaining = lockedUntil - Date.now();
        if (remaining <= 0) {
            clearInterval(lockoutTimerInterval);
            errorEl.innerHTML = '';
            errorEl.classList.remove('show');
            if (submitBtn) submitBtn.disabled = false;
            if (pwInput) { pwInput.disabled = false; pwInput.focus(); }
            return;
        }
        errorEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;margin-right:4px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Вход заблокирован. Повторите через <strong>${formatTimeLeft(remaining)}</strong>`;
        errorEl.classList.add('show');
    }

    updateTimer();
    if (lockoutTimerInterval) clearInterval(lockoutTimerInterval);
    lockoutTimerInterval = setInterval(updateTimer, 1000);
}

function initLogin() {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const lockedUntil = await isLocked();
        if (lockedUntil) {
            showLockoutScreen(lockedUntil);
            return;
        }

        const pw = document.getElementById('password').value;
        const valid = await checkPassword(pw);

        if (valid) {
            resetLockout();
            sessionStorage.setItem(SESSION_KEY, 'true');
            errorEl.classList.remove('show');
            showAdmin();
        } else {
            const attempts = await registerFailedAttempt();
            const remaining = MAX_ATTEMPTS - attempts;

            if (remaining <= 0) {
                const lockedUntilNew = await isLocked();
                showLockoutScreen(lockedUntilNew);
            } else {
                errorEl.innerHTML = `Неверный пароль. Осталось попыток: <strong>${remaining}</strong>`;
                errorEl.classList.add('show');
            }

            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }
    });
}

function showAdmin() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    loadContentToForm();
}

function initSidebar() {
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(link => {
        link.addEventListener('click', () => {
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            document.querySelectorAll('.editor-section').forEach(s => s.classList.remove('active'));
            const section = document.getElementById('editor-' + link.dataset.section);
            if (section) section.classList.add('active');
        });
    });
}

function loadContentToForm() {
    const content = getContent();

    document.querySelectorAll('[data-field]').forEach(input => {
        const path = input.dataset.field.split('.');
        let value = content;
        for (const key of path) {
            value = value?.[key];
        }
        if (value !== undefined && value !== null) {
            input.value = value;
        }
    });

    renderFeaturesEditor(content.features.items);
}

function renderFeaturesEditor(items) {
    const container = document.getElementById('features-list');
    if (!container) return;
    container.innerHTML = '';

    items.forEach((item, i) => {
        const card = document.createElement('div');
        card.className = 'feature-edit-card';
        card.innerHTML = `
            <h4>Карточка ${i + 1}</h4>
            <div class="form-group">
                <label>Заголовок</label>
                <input type="text" data-feature="${i}" data-prop="title" value="${escapeHtml(item.title)}">
            </div>
            <div class="form-group">
                <label>Описание</label>
                <textarea data-feature="${i}" data-prop="text" rows="2">${escapeHtml(item.text)}</textarea>
            </div>
        `;
        container.appendChild(card);
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function collectFormData() {
    const content = getContent();

    document.querySelectorAll('[data-field]').forEach(input => {
        const path = input.dataset.field.split('.');
        let obj = content;
        for (let i = 0; i < path.length - 1; i++) {
            if (!obj[path[i]]) obj[path[i]] = {};
            obj = obj[path[i]];
        }
        const lastKey = path[path.length - 1];
        const val = input.value.trim();
        if (val) {
            obj[lastKey] = input.type === 'number' ? parseInt(val, 10) : val;
        }
    });

    document.querySelectorAll('[data-feature]').forEach(input => {
        const idx = parseInt(input.dataset.feature, 10);
        const prop = input.dataset.prop;
        if (content.features.items[idx]) {
            content.features.items[idx][prop] = input.value.trim();
        }
    });

    return content;
}

function initSaveButton() {
    const saveBtn = document.getElementById('save-btn');
    const statusEl = document.getElementById('save-status');

    saveBtn.addEventListener('click', () => {
        const data = collectFormData();
        saveContent(data);
        statusEl.textContent = 'Сохранено!';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
    });
}

function initSettings() {
    const saveBtn = document.getElementById('save-password-btn');
    const msgEl = document.getElementById('pw-msg');

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const current = document.getElementById('settings-current-pw').value;
            const newPw = document.getElementById('settings-new-pw').value;
            const confirmPw = document.getElementById('settings-confirm-pw').value;

            const valid = await checkPassword(current);
            if (!valid) {
                showMsg(msgEl, 'Неверный текущий пароль', 'error');
                return;
            }
            if (newPw.length < 6) {
                showMsg(msgEl, 'Пароль слишком короткий (минимум 6 символов)', 'error');
                return;
            }
            if (newPw !== confirmPw) {
                showMsg(msgEl, 'Пароли не совпадают', 'error');
                return;
            }
            await setPassword(newPw);
            showMsg(msgEl, 'Пароль изменён!', 'success');
            document.getElementById('settings-current-pw').value = '';
            document.getElementById('settings-new-pw').value = '';
            document.getElementById('settings-confirm-pw').value = '';
        });
    }

    const resetBtn = document.getElementById('reset-content-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Вы уверены? Все изменения будут удалены.')) {
                localStorage.removeItem(STORAGE_KEY);
                loadContentToForm();
                const statusEl = document.getElementById('save-status');
                statusEl.textContent = 'Контент сброшен к значениям по умолчанию';
                setTimeout(() => { statusEl.textContent = ''; }, 3000);
            }
        });
    }
}

function initPasswordModal() {
    const btn = document.getElementById('change-password-btn');
    const modal = document.getElementById('password-modal');
    const cancelBtn = document.getElementById('modal-cancel');
    const saveBtn = document.getElementById('modal-save-pw');
    const msgEl = document.getElementById('modal-pw-msg');

    if (!btn || !modal) return;

    btn.addEventListener('click', () => { modal.style.display = 'flex'; });
    cancelBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    saveBtn.addEventListener('click', async () => {
        const current = document.getElementById('modal-current-pw').value;
        const newPw = document.getElementById('modal-new-pw').value;

        const valid = await checkPassword(current);
        if (!valid) {
            showMsg(msgEl, 'Неверный текущий пароль', 'error');
            return;
        }
        if (newPw.length < 6) {
            showMsg(msgEl, 'Минимум 6 символов', 'error');
            return;
        }
        await setPassword(newPw);
        showMsg(msgEl, 'Пароль изменён!', 'success');
        setTimeout(() => { modal.style.display = 'none'; }, 1500);
    });
}

function initLogout() {
    const btn = document.getElementById('logout-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            sessionStorage.removeItem(SESSION_KEY);
            location.reload();
        });
    }
}

function showMsg(el, text, type) {
    el.textContent = text;
    el.className = 'settings-msg ' + type;
    setTimeout(() => { el.textContent = ''; el.className = 'settings-msg'; }, 4000);
}

/* ===== Posts Manager ===== */
let editingPostId = null;

function initPostsManager() {
    const newBtn = document.getElementById('new-post-btn');
    const backBtn = document.getElementById('back-to-posts-btn');
    const saveBtn = document.getElementById('save-post-btn');
    const cancelBtn = document.getElementById('cancel-post-btn');

    if (!newBtn) return;

    newBtn.addEventListener('click', () => openPostEditor(null));
    backBtn.addEventListener('click', closePostEditor);
    cancelBtn.addEventListener('click', closePostEditor);

    saveBtn.addEventListener('click', () => {
        const title = document.getElementById('post-title-input').value.trim();
        const content = document.getElementById('post-content-editor').innerHTML.trim();

        if (!title) {
            const input = document.getElementById('post-title-input');
            input.style.borderColor = '#ff6b6b';
            input.style.boxShadow = '0 0 0 3px rgba(255,107,107,0.2)';
            input.focus();
            setTimeout(() => { input.style.borderColor = ''; input.style.boxShadow = ''; }, 2000);
            return;
        }
        if (!content || content === '<br>') {
            document.getElementById('post-content-editor').focus();
            return;
        }

        const posts = getPosts();

        if (editingPostId) {
            const idx = posts.findIndex(p => p.id === editingPostId);
            if (idx !== -1) {
                posts[idx].title = title;
                posts[idx].content = content;
                posts[idx].updated = new Date().toISOString();
            }
        } else {
            posts.push({
                id: 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                title,
                content,
                date: new Date().toISOString(),
                updated: null
            });
        }

        savePosts(posts);
        closePostEditor();
        renderAdminPosts();
    });

    initPostToolbar();
    renderAdminPosts();
}

function openPostEditor(postId) {
    editingPostId = postId;
    const titleInput = document.getElementById('post-title-input');
    const contentEditor = document.getElementById('post-content-editor');

    if (postId) {
        const post = getPosts().find(p => p.id === postId);
        if (post) {
            titleInput.value = post.title;
            contentEditor.innerHTML = post.content;
        }
    } else {
        titleInput.value = '';
        contentEditor.innerHTML = '';
    }

    document.getElementById('posts-manager').style.display = 'none';
    document.getElementById('post-editor-panel').style.display = 'block';
    titleInput.focus();
}

function closePostEditor() {
    editingPostId = null;
    document.getElementById('posts-manager').style.display = '';
    document.getElementById('post-editor-panel').style.display = 'none';
}

function renderAdminPosts() {
    const container = document.getElementById('admin-posts-list');
    if (!container) return;

    const posts = getPosts().sort((a, b) => new Date(b.date) - new Date(a.date));
    const allComments = getAllComments();

    if (posts.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);padding:20px 0">Публикаций пока нет. Нажмите «Новая публикация», чтобы создать первую.</p>';
        return;
    }

    container.innerHTML = '';

    posts.forEach(post => {
        const commentCount = (allComments[post.id] || []).length;
        const excerpt = stripHtml(post.content).slice(0, 120);
        const card = document.createElement('div');
        card.className = 'admin-post-card';
        card.innerHTML = `
            <div class="admin-post-info">
                <h3>${escapeHtml(post.title)}</h3>
                <p class="admin-post-excerpt">${excerpt}${excerpt.length >= 120 ? '...' : ''}</p>
                <div class="admin-post-meta">
                    <span>${formatDate(post.date)}</span>
                    ${post.updated ? `<span> · обновлено ${formatDate(post.updated)}</span>` : ''}
                    <span> · ${commentCount} комм.</span>
                </div>
            </div>
            <div class="admin-post-actions">
                <button class="btn btn-ghost btn-sm edit-post-btn" data-id="${post.id}">Редактировать</button>
                <button class="btn btn-ghost btn-sm btn-danger-text delete-post-btn" data-id="${post.id}">Удалить</button>
            </div>
        `;
        container.appendChild(card);
    });

    container.querySelectorAll('.edit-post-btn').forEach(btn => {
        btn.addEventListener('click', () => openPostEditor(btn.dataset.id));
    });

    container.querySelectorAll('.delete-post-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!confirm('Удалить публикацию? Комментарии тоже будут удалены.')) return;
            const id = btn.dataset.id;
            let posts = getPosts();
            posts = posts.filter(p => p.id !== id);
            savePosts(posts);

            const allC = getAllComments();
            delete allC[id];
            saveAllComments(allC);

            renderAdminPosts();
        });
    });
}

function initPostToolbar() {
    const toolbar = document.getElementById('post-toolbar');
    const editor = document.getElementById('post-content-editor');
    if (!toolbar || !editor) return;

    toolbar.querySelectorAll('button[data-cmd]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            editor.focus();
            const cmd = btn.dataset.cmd;
            const value = btn.dataset.value || null;

            if (cmd === 'createLink') {
                const url = prompt('Введите URL:', 'https://');
                if (url) document.execCommand(cmd, false, url);
            } else if (cmd === 'formatBlock') {
                document.execCommand(cmd, false, value);
            } else {
                document.execCommand(cmd, false, null);
            }
        });
    });
}
