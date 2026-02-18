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
        badge: 'Заметки Бездаря',
        title: 'Заметки {highlight}',
        highlight: 'Бездаря',
        description: 'Блядь, да мне по хуй на тебя, блядь, слушай, какая у тебя там тачка, блядь, квартиры, срачки там, блядь, яхты, всё, мне по хуй, хоть там «Бэнтли», хоть, блядь, на хуй, «Майбах», хоть «Роллс-Ройс», хоть «Бугатти» блядь, хоть стометровая яхта.. мне на это насрать, понимаешь? Сколько ты там, кого ебёшь, каких баб, каких значит вот этих самок шикарных или атласных, блядь, в космос ты летишь, мне на это насрать, понимаешь?',
        btn1: 'Читать блог',
        btn2: 'Обо мне'
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
    initAISettings();
    initAIEditorActions();
    initAIGeneratePost();
    initAIAutoPost();
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

            const parentGroup = link.closest('.tree-group');
            if (parentGroup && !parentGroup.classList.contains('open')) {
                parentGroup.classList.add('open');
            }
        });
    });

    document.querySelectorAll('[data-toggle="tree"]').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.tree-group').classList.toggle('open');
        });
    });

    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('expanded');
        });

        links.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('expanded');
                }
            });
        });
    }
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

    saveBtn.addEventListener('click', async () => {
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

        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохранение...';

        const tags = await generateTags(title, content);
        const seo = generateSEOMeta(title, content, tags);

        const posts = getPosts();

        if (editingPostId) {
            const idx = posts.findIndex(p => p.id === editingPostId);
            if (idx !== -1) {
                posts[idx].title = title;
                posts[idx].content = content;
                posts[idx].tags = tags;
                posts[idx].seo = seo;
                posts[idx].updated = new Date().toISOString();
            }
        } else {
            posts.push({
                id: 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                title,
                content,
                tags,
                seo,
                date: new Date().toISOString(),
                updated: null
            });
        }

        savePosts(posts);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Опубликовать';
        closePostEditor();
        renderAdminPosts();
    });

    const deleteAllBtn = document.getElementById('delete-all-posts-btn');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', () => {
            const posts = getPosts();
            if (posts.length === 0) return;
            if (!confirm(`Удалить все публикации (${posts.length} шт.) и все комментарии? Это необратимо.`)) return;
            localStorage.removeItem(POSTS_KEY);
            localStorage.removeItem(COMMENTS_KEY);
            renderAdminPosts();
        });
    }

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
    const postViews = (() => { try { return JSON.parse(localStorage.getItem('sait_post_views')) || {}; } catch { return {}; } })();

    if (posts.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);padding:20px 0">Публикаций пока нет. Нажмите «Новая публикация», чтобы создать первую.</p>';
        return;
    }

    container.innerHTML = '';

    posts.forEach(post => {
        const commentCount = (allComments[post.id] || []).length;
        const viewCount = postViews[post.id] || 0;
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
                    <span> · 👁 ${viewCount} · 💬 ${commentCount}</span>
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

    initImageUpload(editor);
}

/* ===== Image Upload ===== */
function initImageUpload(editor) {
    const fileInput = document.getElementById('image-file-input');
    const insertBtn = document.getElementById('insert-image-btn');
    const urlBtn = document.getElementById('insert-image-url-btn');

    if (!fileInput || !insertBtn || !editor) return;

    insertBtn.addEventListener('click', (e) => {
        e.preventDefault();
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            Array.from(fileInput.files).forEach(file => insertImageFile(file, editor));
            fileInput.value = '';
        }
    });

    if (urlBtn) {
        urlBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const url = prompt('Введите URL изображения:', 'https://');
            if (url) {
                editor.focus();
                const img = `<img src="${url}" alt="" style="max-width:100%;border-radius:8px;margin:12px 0">`;
                document.execCommand('insertHTML', false, img);
            }
        });
    }

    editor.addEventListener('dragover', (e) => {
        e.preventDefault();
        editor.classList.add('drag-over');
    });

    editor.addEventListener('dragleave', () => {
        editor.classList.remove('drag-over');
    });

    editor.addEventListener('drop', (e) => {
        e.preventDefault();
        editor.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length) {
            Array.from(files).forEach(file => {
                if (file.type.startsWith('image/')) insertImageFile(file, editor);
            });
        }
    });

    editor.addEventListener('paste', (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                insertImageFile(item.getAsFile(), editor);
                return;
            }
        }
    });
}

function insertImageFile(file, editor) {
    if (!file || !file.type.startsWith('image/')) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        alert(`Файл "${file.name}" слишком большой (${(file.size/1024/1024).toFixed(1)} МБ). Максимум 5 МБ.`);
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        editor.focus();
        const isGif = file.type === 'image/gif';
        const img = `<img src="${e.target.result}" alt="${file.name}" style="max-width:100%;border-radius:8px;margin:12px 0" ${isGif ? '' : 'loading="lazy"'}>`;
        document.execCommand('insertHTML', false, img);
    };
    reader.readAsDataURL(file);
}

/* =========================================================
   AUTO HASHTAGS & SEO
   ========================================================= */

const STOP_WORDS = new Set(['и','в','на','с','по','для','что','это','как','не','но','от','за','к','из','до','о','а','то','все','так','его','она','они','мы','вы','он','её','их','бы','же','ли','уже','ещё','был','быть','были','будет','может','нет','да','при','или','ни','во','об','под','над','между','через','после','перед','также','тоже','только','очень','более','менее','этот','эта','эти','тот','такой','такая','такие','свой','своя','свои','который','которая','которые','один','одна','одно','весь','вся','всё','каждый','другой','другая','другие','какой','какая','какие','где','когда','если','чтобы','потому','поэтому','хотя','можно','нужно','надо','есть','быть','иметь']);

function extractKeywords(title, htmlContent) {
    const text = (title + ' ' + htmlContent.replace(/<[^>]*>/g, ' ')).toLowerCase();
    const words = text.match(/[а-яёa-z]{4,}/g) || [];
    const freq = {};

    for (const w of words) {
        if (STOP_WORDS.has(w)) continue;
        freq[w] = (freq[w] || 0) + 1;
    }

    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([word]) => word);
}

async function generateTags(title, content) {
    const keywords = extractKeywords(title, content);
    const localTags = keywords.slice(0, 5).map(w => '#' + w);

    if (isAIConfigured()) {
        try {
            const prompt = `Придумай 5-7 хештегов для статьи с заголовком "${title}". Хештеги должны быть на русском, короткие, релевантные, популярные для поиска. Формат: #тег1 #тег2 #тег3. Верни ТОЛЬКО хештеги через пробел, ничего больше.`;
            const result = await callAI(prompt, null);
            if (result) {
                const aiTags = result.match(/#[а-яёa-z0-9_]+/gi);
                if (aiTags && aiTags.length >= 3) return aiTags.slice(0, 7);
            }
        } catch { /* fallback to local */ }
    }

    return localTags;
}

function generateSEOMeta(title, content, tags) {
    const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const description = plainText.slice(0, 160) + (plainText.length > 160 ? '...' : '');
    const keywords = tags.map(t => t.replace('#', '')).join(', ');

    return { description, keywords };
}

/* =========================================================
   AI ASSISTANT
   ========================================================= */

const AI_SETTINGS_KEY = 'sait_ai_settings';

const DEFAULT_SYSTEM_PROMPT = `Ты — профессиональный копирайтер для блога. Пишешь качественные, интересные статьи на русском языке. Форматируешь текст с помощью HTML-тегов: <h2>, <h3>, <p>, <ul>, <li>, <blockquote>, <strong>, <em>, <a>. Не используй markdown. Не оборачивай ответ в \`\`\`html блоки. Отвечай только HTML-контентом статьи.`;

function getAISettings() {
    try {
        return JSON.parse(localStorage.getItem(AI_SETTINGS_KEY)) || {};
    } catch { return {}; }
}

function saveAISettings(settings) {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
}

function initAISettings() {
    const settings = getAISettings();
    const urlInput = document.getElementById('ai-api-url');
    const keyInput = document.getElementById('ai-api-key');
    const modelInput = document.getElementById('ai-model');
    const promptInput = document.getElementById('ai-system-prompt');
    const saveBtn = document.getElementById('save-ai-settings-btn');
    const msgEl = document.getElementById('ai-settings-msg');

    if (!saveBtn) return;

    const CURRENT_MODEL = 'gpt-5.2';
    const defaultUrl = atob('aHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MS9jaGF0L2NvbXBsZXRpb25z');
    const defaultKey = atob('c2stcHJvai1zOWRqNzI5SFhpSkhKMnV3UEdGR2NYNjY3a3FaOFlRSjdtdXNvYjFsVElhZjN6WEpmNGJxRDlwaXVmVTludDRWanI0YmdiZWN6T1QzQmxiRkpIWkd1QWdhSTBzTjVCTmxsTjI4cm53YkVCMzljRkFYc2tKYWJNZUxVV0ZndmFBa3I2V2o4WTBlVEVHWUtUZkVWa0NrRXJ5MnNB');

    if (!settings.url && !settings.key) {
        settings = { url: defaultUrl, key: defaultKey, model: CURRENT_MODEL, systemPrompt: '' };
        saveAISettings(settings);
    }

    if (!settings.model || settings.model !== CURRENT_MODEL) {
        settings.model = CURRENT_MODEL;
        if (!settings.url) settings.url = defaultUrl;
        if (!settings.key) settings.key = defaultKey;
        saveAISettings(settings);
    }

    urlInput.value = settings.url || defaultUrl;
    keyInput.value = settings.key || defaultKey;
    modelInput.value = settings.model;
    if (settings.systemPrompt) promptInput.value = settings.systemPrompt;

    saveBtn.addEventListener('click', () => {
        const s = {
            url: urlInput.value.trim(),
            key: keyInput.value.trim(),
            model: modelInput.value.trim(),
            systemPrompt: promptInput.value.trim()
        };
        saveAISettings(s);
        showMsg(msgEl, 'Настройки ИИ сохранены!', 'success');
    });
}

function isAIConfigured() {
    const s = getAISettings();
    return s.url && s.key;
}

async function callAI(userPrompt, statusEl) {
    const settings = getAISettings();

    if (!settings.url || !settings.key) {
        if (statusEl) setAIStatus(statusEl, 'Настройте API ключ в разделе Настройки → ИИ-ассистент', 'error');
        return null;
    }

    if (statusEl) setAIStatus(statusEl, 'Генерация...', 'loading');

    const systemPrompt = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const model = settings.model || 'gpt-5.2';

    try {
        const res = await fetch(settings.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.key}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_completion_tokens: 4000
            })
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`HTTP ${res.status}: ${err.slice(0, 200)}`);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) throw new Error('Пустой ответ от API');

        if (statusEl) setAIStatus(statusEl, 'Готово!', 'success');
        return content;
    } catch (e) {
        if (statusEl) setAIStatus(statusEl, `Ошибка: ${e.message}`, 'error');
        return null;
    }
}

function setAIStatus(el, text, type) {
    if (!el) return;
    el.className = 'ai-status ' + type;
    if (type === 'loading') {
        el.innerHTML = `<span class="ai-spinner"></span> ${text}`;
    } else {
        el.textContent = text;
    }
    if (type === 'success') {
        setTimeout(() => { el.textContent = ''; el.className = 'ai-status'; }, 4000);
    }
}

/* ===== AI Actions in Editor ===== */
function initAIEditorActions() {
    const panel = document.getElementById('ai-panel');
    if (!panel) return;

    panel.querySelectorAll('[data-ai-action]').forEach(btn => {
        btn.addEventListener('click', () => handleAIAction(btn.dataset.aiAction));
    });

    const customInput = document.getElementById('ai-custom-input');
    const customSend = document.getElementById('ai-custom-send');

    customSend.addEventListener('click', () => {
        const prompt = customInput.value.trim();
        if (prompt) handleAIAction('custom', prompt);
    });

    customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const prompt = customInput.value.trim();
            if (prompt) handleAIAction('custom', prompt);
        }
    });
}

async function handleAIAction(action, customPrompt) {
    const editor = document.getElementById('post-content-editor');
    const titleInput = document.getElementById('post-title-input');
    const statusEl = document.getElementById('ai-status');
    const currentContent = editor.innerHTML.trim();
    const title = titleInput.value.trim();

    let prompt;

    switch (action) {
        case 'generate':
            if (!title) {
                titleInput.focus();
                setAIStatus(statusEl, 'Введите заголовок — ИИ напишет текст по теме', 'error');
                return;
            }
            prompt = `Напиши статью для блога на тему: "${title}". Статья должна быть информативной, около 500-800 слов. Используй подзаголовки h2/h3, параграфы, списки где уместно.`;
            break;

        case 'improve':
            if (!currentContent || currentContent === '<br>') {
                setAIStatus(statusEl, 'Сначала напишите текст для улучшения', 'error');
                return;
            }
            prompt = `Улучши и отредактируй следующий текст статьи. Сделай его более профессиональным, добавь плавные переходы, исправь ошибки. Сохрани HTML-разметку:\n\n${currentContent}`;
            break;

        case 'continue':
            if (!currentContent || currentContent === '<br>') {
                setAIStatus(statusEl, 'Сначала начните писать текст', 'error');
                return;
            }
            prompt = `Продолжи написание следующей статьи. Добавь ещё 2-3 смысловых абзаца в том же стиле. Верни ТОЛЬКО новый текст (продолжение), без повторения уже написанного:\n\n${currentContent}`;
            break;

        case 'shorten':
            if (!currentContent || currentContent === '<br>') {
                setAIStatus(statusEl, 'Нет текста для сокращения', 'error');
                return;
            }
            prompt = `Сократи следующий текст примерно в 2 раза, сохранив ключевые идеи и HTML-разметку:\n\n${currentContent}`;
            break;

        case 'title':
            if (!currentContent || currentContent === '<br>') {
                setAIStatus(statusEl, 'Напишите текст, чтобы ИИ предложил заголовок', 'error');
                return;
            }
            prompt = `Придумай 1 короткий и цепляющий заголовок для следующей статьи. Верни ТОЛЬКО текст заголовка, без кавычек, без HTML:\n\n${currentContent}`;
            break;

        case 'custom':
            prompt = `Контекст — текст статьи:\n${currentContent || '(пока пусто)'}\n\nЗапрос от автора: ${customPrompt}\n\nВыполни запрос. Если нужно изменить текст — верни обновлённую версию. Если нужно добавить — верни только новый фрагмент.`;
            break;

        default:
            return;
    }

    setAllAIButtons(true);
    const result = await callAI(prompt, statusEl);
    setAllAIButtons(false);

    if (!result) return;

    if (action === 'title') {
        titleInput.value = result.replace(/<[^>]*>/g, '').trim();
    } else if (action === 'continue') {
        editor.innerHTML = currentContent + result;
    } else if (action === 'custom') {
        const clean = result.replace(/<[^>]*>/g, '').trim();
        const isFullArticle = result.includes('<h2') || result.includes('<h3') || result.includes('<p>');
        if (isFullArticle && result.length > currentContent.length * 0.5) {
            editor.innerHTML = result;
        } else {
            editor.innerHTML = currentContent + result;
        }
        document.getElementById('ai-custom-input').value = '';
    } else {
        editor.innerHTML = result;
    }
}

function setAllAIButtons(disabled) {
    document.querySelectorAll('.btn-ai').forEach(btn => btn.disabled = disabled);
}

/* ===== AI: Generate Post from Modal ===== */
function initAIGeneratePost() {
    const btn = document.getElementById('ai-generate-post-btn');
    const modal = document.getElementById('ai-gen-modal');
    const cancelBtn = document.getElementById('ai-gen-cancel');
    const submitBtn = document.getElementById('ai-gen-submit');

    if (!btn || !modal) return;

    btn.addEventListener('click', () => {
        if (!isAIConfigured()) {
            alert('Сначала настройте API ключ в разделе Настройки → ИИ-ассистент');
            return;
        }
        modal.style.display = 'flex';
        document.getElementById('ai-gen-topic').value = '';
        document.getElementById('ai-gen-instructions').value = '';
        document.getElementById('ai-gen-status').textContent = '';
        document.getElementById('ai-gen-topic').focus();
    });

    cancelBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    submitBtn.addEventListener('click', async () => {
        const topic = document.getElementById('ai-gen-topic').value.trim();
        const instructions = document.getElementById('ai-gen-instructions').value.trim();
        const statusEl = document.getElementById('ai-gen-status');

        if (!topic) {
            document.getElementById('ai-gen-topic').focus();
            return;
        }

        let prompt = `Напиши полноценную статью для блога на тему: "${topic}". Используй HTML-разметку. Статья 600-1000 слов, с подзаголовками, списками, полезной информацией.`;
        if (instructions) prompt += `\n\nДополнительные требования: ${instructions}`;

        submitBtn.disabled = true;
        const titlePrompt = `Придумай 1 короткий цепляющий заголовок для статьи на тему "${topic}". Верни ТОЛЬКО текст заголовка, без кавычек, без HTML.`;

        const [content, titleRaw] = await Promise.all([
            callAI(prompt, statusEl),
            callAI(titlePrompt, null)
        ]);

        submitBtn.disabled = false;

        if (!content) return;

        const title = titleRaw ? titleRaw.replace(/<[^>]*>/g, '').trim() : topic;
        const tags = await generateTags(title, content);
        const seo = generateSEOMeta(title, content, tags);

        const posts = getPosts();
        posts.push({
            id: 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            title,
            content,
            tags,
            seo,
            date: new Date().toISOString(),
            updated: null
        });
        savePosts(posts);
        renderAdminPosts();
        modal.style.display = 'none';
        setAIStatus(statusEl, '', '');
    });
}

/* ===== AI: Auto-Posting ===== */
function initAIAutoPost() {
    const btn = document.getElementById('ai-autopost-btn');
    const modal = document.getElementById('ai-autopost-modal');
    const cancelBtn = document.getElementById('autopost-cancel');
    const submitBtn = document.getElementById('autopost-submit');

    if (!btn || !modal) return;

    btn.addEventListener('click', () => {
        if (!isAIConfigured()) {
            alert('Сначала настройте API ключ в разделе Настройки → ИИ-ассистент');
            return;
        }
        modal.style.display = 'flex';
        document.getElementById('autopost-theme').value = '';
        document.getElementById('autopost-count').value = '3';
        document.getElementById('autopost-instructions').value = '';
        document.getElementById('autopost-status').textContent = '';
        document.getElementById('autopost-progress').style.display = 'none';
        document.getElementById('autopost-theme').focus();
    });

    cancelBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    submitBtn.addEventListener('click', async () => {
        const theme = document.getElementById('autopost-theme').value.trim();
        const count = Math.min(10, Math.max(1, parseInt(document.getElementById('autopost-count').value, 10) || 3));
        const instructions = document.getElementById('autopost-instructions').value.trim();
        const statusEl = document.getElementById('autopost-status');
        const progressEl = document.getElementById('autopost-progress');
        const fillEl = document.getElementById('autopost-fill');
        const textEl = document.getElementById('autopost-progress-text');

        if (!theme) {
            document.getElementById('autopost-theme').focus();
            return;
        }

        submitBtn.disabled = true;
        progressEl.style.display = 'block';

        const topicsPrompt = `Придумай ${count} уникальных тем для статей блога в нише "${theme}". ${instructions ? 'Учти: ' + instructions : ''}\n\nВерни ТОЛЬКО список тем, по одной на строку, без нумерации, без пояснений.`;

        setAIStatus(statusEl, 'Генерация тем...', 'loading');
        const topicsRaw = await callAI(topicsPrompt, null);

        if (!topicsRaw) {
            setAIStatus(statusEl, 'Не удалось сгенерировать темы', 'error');
            submitBtn.disabled = false;
            return;
        }

        const topics = topicsRaw
            .replace(/<[^>]*>/g, '')
            .split('\n')
            .map(t => t.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•]\s*/, '').trim())
            .filter(t => t.length > 3)
            .slice(0, count);

        const posts = getPosts();

        for (let i = 0; i < topics.length; i++) {
            const topic = topics[i];
            const pct = Math.round(((i) / topics.length) * 100);
            fillEl.style.width = pct + '%';
            textEl.textContent = `Публикация ${i + 1} из ${topics.length}: ${topic}`;
            setAIStatus(statusEl, `Пишу статью ${i + 1}/${topics.length}...`, 'loading');

            const articlePrompt = `Напиши статью для блога: "${topic}". HTML-разметка, 400-700 слов, подзаголовки, списки. ${instructions ? 'Стиль: ' + instructions : ''}`;
            const content = await callAI(articlePrompt, null);

            if (content) {
                const postTags = await generateTags(topic, content);
                const postSeo = generateSEOMeta(topic, content, postTags);
                posts.push({
                    id: 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                    title: topic,
                    content,
                    tags: postTags,
                    seo: postSeo,
                    date: new Date(Date.now() - (topics.length - i) * 60000).toISOString(),
                    updated: null
                });
                savePosts(posts);
            }
        }

        fillEl.style.width = '100%';
        textEl.textContent = `Готово! Создано ${topics.length} публикаций`;
        setAIStatus(statusEl, 'Авто-постинг завершён!', 'success');
        submitBtn.disabled = false;
        renderAdminPosts();

        setTimeout(() => { modal.style.display = 'none'; }, 2000);
    });
}
