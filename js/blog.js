const POSTS_KEY = 'sait_posts';
const COMMENTS_KEY = 'sait_comments';
const VISITOR_TOKEN_KEY = 'sait_visitor_token';

function getVisitorToken() {
    let token = localStorage.getItem(VISITOR_TOKEN_KEY);
    if (!token) {
        token = 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        localStorage.setItem(VISITOR_TOKEN_KEY, token);
    }
    return token;
}

function getPosts() {
    try {
        return JSON.parse(localStorage.getItem(POSTS_KEY)) || [];
    } catch { return []; }
}

function getComments(postId) {
    try {
        const all = JSON.parse(localStorage.getItem(COMMENTS_KEY)) || {};
        return all[postId] || [];
    } catch { return []; }
}

function saveAllComments(all) {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
}

function getAllComments() {
    try {
        return JSON.parse(localStorage.getItem(COMMENTS_KEY)) || {};
    } catch { return {}; }
}

function formatDate(iso) {
    const d = new Date(iso);
    const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || '';
}

function getCurrentPostId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('post');
}

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    const postId = getCurrentPostId();
    if (postId) {
        showPost(postId);
    } else {
        showPostList();
    }
});

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

/* ===== Posts List ===== */
function showPostList() {
    document.getElementById('blog-list').style.display = '';
    document.getElementById('post-view').style.display = 'none';
    document.title = 'Блог — Заметки Бездаря';

    const posts = getPosts().sort((a, b) => new Date(b.date) - new Date(a.date));
    const grid = document.getElementById('posts-grid');
    const empty = document.getElementById('empty-state');

    if (posts.length === 0) {
        grid.style.display = 'none';
        empty.style.display = '';
        return;
    }

    grid.style.display = '';
    empty.style.display = 'none';
    grid.innerHTML = '';

    const allComments = getAllComments();

    posts.forEach(post => {
        const commentCount = (allComments[post.id] || []).length;
        const excerpt = stripHtml(post.content).slice(0, 180);
        const card = document.createElement('div');
        card.className = 'post-card';
        const tagsHtml = (post.tags || []).slice(0, 4).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
        card.innerHTML = `
            <div class="post-card-date">${formatDate(post.date)}</div>
            <h2>${escapeHtml(post.title)}</h2>
            <div class="post-card-excerpt">${excerpt}${excerpt.length >= 180 ? '...' : ''}</div>
            ${tagsHtml ? `<div class="post-card-tags">${tagsHtml}</div>` : ''}
            <div class="post-card-footer">
                <span class="post-card-comments">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    ${commentCount}
                </span>
                <span class="post-card-read">
                    Читать
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </span>
            </div>
        `;
        card.addEventListener('click', () => {
            window.location.href = `blog.html?post=${post.id}`;
        });
        grid.appendChild(card);
    });
}

/* ===== Single Post ===== */
function showPost(postId) {
    const posts = getPosts();
    const post = posts.find(p => p.id === postId);

    if (!post) {
        showPostList();
        return;
    }

    document.getElementById('blog-list').style.display = 'none';
    document.getElementById('post-view').style.display = '';
    document.title = `${post.title} — Заметки Бездаря`;

    document.getElementById('post-meta').textContent = formatDate(post.date) + (post.updated ? ` (обновлено ${formatDate(post.updated)})` : '');
    document.getElementById('post-title').textContent = post.title;
    document.getElementById('post-body').innerHTML = post.content;

    const tagsContainer = document.getElementById('post-tags');
    if (tagsContainer && post.tags && post.tags.length) {
        tagsContainer.innerHTML = post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
    } else if (tagsContainer) {
        tagsContainer.innerHTML = '';
    }

    injectPostSEO(post);

    initCommentToolbar(document.querySelector('#comment-form-wrapper .comment-toolbar'), document.getElementById('comment-editor'));
    initSubmitComment(postId);
    renderComments(postId);
}

function injectPostSEO(post) {
    const desc = post.seo?.description || stripHtml(post.content).slice(0, 160);
    const keywords = post.seo?.keywords || (post.tags || []).map(t => t.replace('#', '')).join(', ');
    const url = `https://antonovvladimirchebara-debug.github.io/Sait/blog.html?post=${post.id}`;

    setMeta('description', desc);
    setMeta('keywords', keywords);
    setMetaProperty('og:title', `${post.title} — Заметки Бездаря`);
    setMetaProperty('og:description', desc);
    setMetaProperty('og:url', url);
    setMetaProperty('og:type', 'article');

    let ld = document.getElementById('post-jsonld');
    if (!ld) {
        ld = document.createElement('script');
        ld.type = 'application/ld+json';
        ld.id = 'post-jsonld';
        document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        'headline': post.title,
        'description': desc,
        'datePublished': post.date,
        'dateModified': post.updated || post.date,
        'keywords': keywords,
        'url': url,
        'publisher': {
            '@type': 'Person',
            'name': 'Заметки Бездаря'
        }
    });
}

function setMeta(name, content) {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
    el.content = content;
}

function setMetaProperty(prop, content) {
    let el = document.querySelector(`meta[property="${prop}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
    el.content = content;
}

/* ===== Comments ===== */
function renderComments(postId) {
    const comments = getComments(postId);
    const list = document.getElementById('comments-list');
    const countEl = document.getElementById('comments-count');
    const token = getVisitorToken();

    countEl.textContent = comments.length > 0 ? `(${comments.length})` : '';
    list.innerHTML = '';

    if (comments.length === 0) {
        list.innerHTML = '<div class="no-comments">Пока нет комментариев. Будьте первым!</div>';
        return;
    }

    comments.forEach(comment => {
        const isOwn = comment.token === token;
        const el = document.createElement('div');
        el.className = 'comment-item';
        el.innerHTML = `
            <div class="comment-header">
                <div>
                    <span class="comment-author">${escapeHtml(comment.author)}</span>
                    ${isOwn ? '<span class="comment-own-badge">Вы</span>' : ''}
                </div>
                <span class="comment-date">${formatDate(comment.date)}</span>
            </div>
            <div class="comment-body">${comment.text}</div>
            ${isOwn ? `
                <div class="comment-actions">
                    <button class="comment-action-btn edit-btn" data-id="${comment.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Редактировать
                    </button>
                    <button class="comment-action-btn delete" data-id="${comment.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        Удалить
                    </button>
                </div>
            ` : ''}
        `;
        list.appendChild(el);
    });

    list.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditCommentModal(postId, btn.dataset.id));
    });

    list.querySelectorAll('.comment-action-btn.delete').forEach(btn => {
        btn.addEventListener('click', () => deleteComment(postId, btn.dataset.id));
    });
}

function initSubmitComment(postId) {
    const btn = document.getElementById('submit-comment');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', () => {
        const author = document.getElementById('comment-author').value.trim();
        const editor = document.getElementById('comment-editor');
        const text = editor.innerHTML.trim();

        if (!author) {
            highlightField(document.getElementById('comment-author'));
            return;
        }
        if (!text || text === '<br>') {
            editor.focus();
            return;
        }

        const all = getAllComments();
        if (!all[postId]) all[postId] = [];

        all[postId].push({
            id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            author,
            text,
            date: new Date().toISOString(),
            token: getVisitorToken()
        });

        saveAllComments(all);
        editor.innerHTML = '';
        renderComments(postId);

        localStorage.setItem('sait_comment_author', author);
    });

    const savedAuthor = localStorage.getItem('sait_comment_author');
    if (savedAuthor) {
        document.getElementById('comment-author').value = savedAuthor;
    }
}

function deleteComment(postId, commentId) {
    if (!confirm('Удалить комментарий?')) return;

    const all = getAllComments();
    if (!all[postId]) return;

    const token = getVisitorToken();
    all[postId] = all[postId].filter(c => !(c.id === commentId && c.token === token));
    saveAllComments(all);
    renderComments(postId);
}

/* ===== Edit Comment Modal ===== */
let editingCommentId = null;
let editingPostId = null;

function openEditCommentModal(postId, commentId) {
    const comments = getComments(postId);
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    editingCommentId = commentId;
    editingPostId = postId;

    const modal = document.getElementById('edit-comment-modal');
    const editor = document.getElementById('edit-comment-editor');
    editor.innerHTML = comment.text;

    initCommentToolbar(document.getElementById('edit-comment-toolbar'), editor);

    modal.style.display = 'flex';

    const saveBtn = document.getElementById('edit-comment-save');
    const cancelBtn = document.getElementById('edit-comment-cancel');

    const newSave = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSave, saveBtn);

    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newCancel.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    newSave.addEventListener('click', () => {
        const newText = editor.innerHTML.trim();
        if (!newText || newText === '<br>') return;

        const all = getAllComments();
        const token = getVisitorToken();
        const commentArr = all[editingPostId] || [];
        const idx = commentArr.findIndex(c => c.id === editingCommentId && c.token === token);

        if (idx !== -1) {
            commentArr[idx].text = newText;
            commentArr[idx].edited = new Date().toISOString();
            saveAllComments(all);
            renderComments(editingPostId);
        }

        modal.style.display = 'none';
    });
}

/* ===== Rich Editor Toolbar ===== */
function initCommentToolbar(toolbar, editor) {
    if (!toolbar || !editor) return;

    const buttons = toolbar.querySelectorAll('button[data-cmd]');
    const newToolbar = toolbar.cloneNode(true);
    toolbar.parentNode.replaceChild(newToolbar, toolbar);

    newToolbar.querySelectorAll('button[data-cmd]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            editor.focus();
            const cmd = btn.dataset.cmd;

            if (cmd === 'createLink') {
                const url = prompt('Введите URL:', 'https://');
                if (url) document.execCommand(cmd, false, url);
            } else {
                document.execCommand(cmd, false, null);
            }
        });
    });
}

/* ===== Helpers ===== */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function highlightField(input) {
    input.style.borderColor = '#ff6b6b';
    input.style.boxShadow = '0 0 0 3px rgba(255,107,107,0.2)';
    input.focus();
    setTimeout(() => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
    }, 2000);
}
