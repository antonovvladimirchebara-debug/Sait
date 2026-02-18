const STORAGE_KEY = 'sait_content';
const PW_KEY = 'sait_admin_pw';
const SESSION_KEY = 'sait_admin_session';
const DEFAULT_PW = 'admin';

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

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'h_' + Math.abs(hash).toString(36);
}

function getPasswordHash() {
    return localStorage.getItem(PW_KEY) || hashString(DEFAULT_PW);
}

function checkPassword(pw) {
    return hashString(pw) === getPasswordHash();
}

function setPassword(newPw) {
    localStorage.setItem(PW_KEY, hashString(newPw));
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
document.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = sessionStorage.getItem(SESSION_KEY) === 'true';
    if (isLoggedIn) {
        showAdmin();
    }
    initLogin();
    initSidebar();
    initSaveButton();
    initSettings();
    initPasswordModal();
    initLogout();
    initPostsManager();
});

function initLogin() {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const pw = document.getElementById('password').value;

        if (checkPassword(pw)) {
            sessionStorage.setItem(SESSION_KEY, 'true');
            errorEl.classList.remove('show');
            showAdmin();
        } else {
            errorEl.classList.add('show');
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
        saveBtn.addEventListener('click', () => {
            const current = document.getElementById('settings-current-pw').value;
            const newPw = document.getElementById('settings-new-pw').value;
            const confirm = document.getElementById('settings-confirm-pw').value;

            if (!checkPassword(current)) {
                showMsg(msgEl, 'Неверный текущий пароль', 'error');
                return;
            }
            if (newPw.length < 3) {
                showMsg(msgEl, 'Пароль слишком короткий (минимум 3 символа)', 'error');
                return;
            }
            if (newPw !== confirm) {
                showMsg(msgEl, 'Пароли не совпадают', 'error');
                return;
            }
            setPassword(newPw);
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

    saveBtn.addEventListener('click', () => {
        const current = document.getElementById('modal-current-pw').value;
        const newPw = document.getElementById('modal-new-pw').value;

        if (!checkPassword(current)) {
            showMsg(msgEl, 'Неверный текущий пароль', 'error');
            return;
        }
        if (newPw.length < 3) {
            showMsg(msgEl, 'Минимум 3 символа', 'error');
            return;
        }
        setPassword(newPw);
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
