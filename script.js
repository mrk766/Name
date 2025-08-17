document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    const state = {
        username: localStorage.getItem('devhub_username') || null,
        currentView: 'coderoomSubjects', // coderoomSubjects, coderoomPosts, chatroom, singlePost
        activeSubject: null,
        activePostId: null,
        replyingTo: null, // For chat replies
        posts: JSON.parse(localStorage.getItem('devhub_posts')) || [],
        messages: JSON.parse(localStorage.getItem('devhub_messages')) || [],
        comments: JSON.parse(localStorage.getItem('devhub_comments')) || [],
    };

    // --- DOM SELECTORS ---
    const views = { coderoomSubjects: document.getElementById('coderoom-subjects-view'), coderoomPosts: document.getElementById('coderoom-posts-view'), chatroom: document.getElementById('chatroom-view'), singlePost: document.getElementById('single-post-view'), };
    const navLinks = { coderoom: document.getElementById('nav-coderoom'), chatroom: document.getElementById('nav-chatroom') };
    const modal = document.getElementById('post-modal');
    const replyIndicator = document.getElementById('reply-indicator');

    // --- DATA & USER MANAGEMENT ---
    const saveData = () => {
        localStorage.setItem('devhub_username', state.username);
        localStorage.setItem('devhub_posts', JSON.stringify(state.posts));
        localStorage.setItem('devhub_messages', JSON.stringify(state.messages));
        localStorage.setItem('devhub_comments', JSON.stringify(state.comments));
    };
    const ensureUserExists = () => {
        if (state.username) return true;
        const name = prompt("Please enter your name to continue:");
        if (name && name.trim()) {
            state.username = name.trim();
            saveData();
            return true;
        }
        return false;
    };

    // --- NAVIGATION & MAIN RENDERER ---
    const navigate = (view, context = null) => {
        state.currentView = view;
        Object.values(views).forEach(v => v.classList.remove('active'));
        Object.values(navLinks).forEach(l => l.classList.remove('active'));
        if(views[view]) views[view].classList.add('active');

        switch (view) {
            case 'coderoomSubjects': renderSubjects(); navLinks.coderoom.classList.add('active'); break;
            case 'coderoomPosts': state.activeSubject = context; document.getElementById('posts-view-title').textContent = `${state.activeSubject} Posts`; renderPostsForSubject(); navLinks.coderoom.classList.add('active'); break;
            case 'chatroom': renderChatroom(); navLinks.chatroom.classList.add('active'); break;
            case 'singlePost': state.activePostId = context; renderSinglePost(); navLinks.coderoom.classList.add('active'); break;
        }
    };
    
    // --- CODEROOM RENDERERS ---
    const renderSubjects = () => {
        const subjectsGrid = document.getElementById('subjects-grid');
        const subjects = [...new Set(state.posts.map(p => p.subject))];
        subjectsGrid.innerHTML = subjects.length ? subjects.map(s => `<div class="subject-card" data-subject="${s}">${s}</div>`).join('') : `<p>No subjects found. Create a post to add one!</p>`;
    };
    const renderPostsForSubject = () => {
        const postList = document.getElementById('post-list');
        const searchTerm = document.getElementById('post-search-bar').value.toLowerCase();
        const sortBy = document.getElementById('post-sort-select').value;
        let posts = state.posts.filter(p => p.subject === state.activeSubject && p.title.toLowerCase().includes(searchTerm));
        posts.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.timestamp) - new Date(a.timestamp);
            if (sortBy === 'oldest') return new Date(a.timestamp) - new Date(b.timestamp);
            if (sortBy === 'number') return a.postNumber - b.postNumber;
            return 0;
        });
        postList.innerHTML = posts.map(p => `<li class="post-list-item" data-post-id="${p.id}"><a><h4>${p.title}</h4><div class="post-meta">By ${p.author} on ${new Date(p.timestamp).toLocaleDateString()}</div></a></li>`).join('');
    };
    const renderSinglePost = () => {
        const post = state.posts.find(p => p.id === state.activePostId);
        const contentDiv = document.getElementById('post-detail-content');
        if (!post) { contentDiv.innerHTML = 'Post not found.'; return; }
        contentDiv.innerHTML = `<h1>${post.title}</h1><p>By ${post.author} | Subject: ${post.subject} | Post #: ${post.postNumber}</p><p>${post.description}</p>
            <div class="code-snippet-container">
                <div class="code-snippet-header"><span class="code-snippet-lang">${post.subject.toLowerCase()}</span><button class="copy-code-btn" data-code="${btoa(post.code)}">Copy</button></div>
                <pre><code class="language-${post.subject.toLowerCase()}">${escapeHtml(post.code)}</code></pre>
            </div>`;
        Prism.highlightAll();
        renderCommentsForPost();
    };

    // --- CHATROOM RENDERER & LOGIC ---
    const renderChatroom = () => {
        const chatFeed = document.getElementById('chat-feed');
        const combinedFeed = [...state.posts, ...state.messages, ...state.comments].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        chatFeed.innerHTML = combinedFeed.map(item => {
            if (item.type === 'post') return `<div class="message-wrapper center" data-id="${item.id}">${createPostInChatHTML(item)}</div>`;
            const wrapperClass = item.author === state.username ? 'me' : 'other';
            const bubbleClass = item.author === state.username ? 'me' : 'other';
            let replyHTML = item.replyToId ? createQuotedReplyHTML(findItemById(item.replyToId)) : '';
            let contentHTML = `<div class="chat-bubble ${bubbleClass}">${escapeHtml(item.text)}</div>`;
            return `<div class="message-wrapper ${wrapperClass}" data-id="${item.id}"><div class="author-name">${escapeHtml(item.author)}</div>${replyHTML}${contentHTML}<button class="reply-button">↪</button></div>`;
        }).join('');
        chatFeed.scrollTop = chatFeed.scrollHeight;
    };
    const handleReplyClick = (itemId) => {
        state.replyingTo = findItemById(itemId);
        if (state.replyingTo) {
            replyIndicator.innerHTML = `<div class="quoted-reply">Replying to <strong>${escapeHtml(state.replyingTo.author)}</strong><span class="cancel-reply" title="Cancel Reply">×</span></div>`;
            replyIndicator.style.display = 'block';
            replyIndicator.querySelector('.cancel-reply').addEventListener('click', cancelReply, { once: true });
        }
    };
    const cancelReply = () => { state.replyingTo = null; replyIndicator.style.display = 'none'; };
    
    // --- EVENT LISTENERS ---
    const setupEventListeners = () => {
        navLinks.coderoom.addEventListener('click', () => navigate('coderoomSubjects'));
        navLinks.chatroom.addEventListener('click', () => navigate('chatroom'));
        document.getElementById('create-post-btn').addEventListener('click', () => { if (ensureUserExists()) modal.classList.add('visible'); });
        document.getElementById('post-form').addEventListener('submit', handleCreatePost);
        document.getElementById('back-to-subjects-btn').addEventListener('click', () => navigate('coderoomSubjects'));
        document.getElementById('back-to-posts-btn').addEventListener('click', () => navigate('coderoomPosts', state.activeSubject));
        document.getElementById('post-search-bar').addEventListener('input', renderPostsForSubject);
        document.getElementById('post-sort-select').addEventListener('change', renderPostsForSubject);
        document.getElementById('chat-input-form').addEventListener('submit', handleChatMessage);
        document.getElementById('comment-form').addEventListener('submit', handleAddComment);

        document.body.addEventListener('click', (e) => {
            const subjectCard = e.target.closest('.subject-card');
            const postListItem = e.target.closest('.post-list-item');
            const copyBtn = e.target.closest('.copy-code-btn');
            const replyBtn = e.target.closest('.reply-button');

            if (subjectCard) navigate('coderoomPosts', subjectCard.dataset.subject);
            if (postListItem) navigate('singlePost', postListItem.dataset.postId);
            if (replyBtn) handleReplyClick(e.target.closest('.message-wrapper').dataset.id);
            if (copyBtn) {
                navigator.clipboard.writeText(atob(copyBtn.dataset.code));
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
            }
        });
        // Modal close listeners
        document.querySelector('.modal-close').addEventListener('click', () => modal.classList.remove('visible'));
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('visible'); });
    };
    
    // --- FORM HANDLERS ---
    const handleCreatePost = (e) => {
        e.preventDefault();
        const newPost = { id: `p_${Date.now()}`, author: state.username, title: document.getElementById('post-title').value, subject: document.getElementById('post-subject').value, postNumber: parseInt(document.getElementById('post-number').value, 10), description: document.getElementById('post-description').value, code: document.getElementById('post-code').value, timestamp: new Date().toISOString() };
        state.posts.push(newPost);
        saveData();
        modal.classList.remove('visible');
        e.target.reset();
        navigate('coderoomPosts', newPost.subject);
    };
    const handleChatMessage = (e) => {
        e.preventDefault();
        if (!ensureUserExists()) return;
        const input = document.getElementById('chat-message-input');
        if (!input.value.trim()) return;
        state.messages.push({ id: `m_${Date.now()}`, type: 'message', author: state.username, text: input.value, timestamp: new Date().toISOString(), replyToId: state.replyingTo ? state.replyingTo.id : null });
        input.value = '';
        cancelReply();
        saveData();
        renderChatroom();
    };
    const handleAddComment = (e) => { /* Similar to handleChatMessage, but for the comment form */ };

    // --- HELPER FUNCTIONS ---
    const findItemById = (id) => [...state.posts, ...state.messages, ...state.comments].find(item => item.id === id);
    const createPostInChatHTML = (item) => `...`; // Template for post in chat
    const createQuotedReplyHTML = (originalItem) => { /* Template for quoted reply */ };
    const renderCommentsForPost = () => { /* Renders comments in single post view */ };
    const escapeHtml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    
    // --- INITIALIZATION ---
    const init = () => {
        setupEventListeners();
        navigate('coderoomSubjects'); // Start in the Coderoom
    };
    init();
});
