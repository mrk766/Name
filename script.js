document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    const state = {
        currentView: 'chatroom', // 'chatroom', 'allPosts', 'singlePost'
        activePostId: null,
        posts: JSON.parse(localStorage.getItem('devhub_posts')) || [],
        messages: JSON.parse(localStorage.getItem('devhub_messages')) || [],
        comments: JSON.parse(localStorage.getItem('devhub_comments')) || [],
    };

    // --- DOM SELECTORS ---
    const views = {
        chatroom: document.getElementById('chatroom-view'),
        allPosts: document.getElementById('all-posts-view'),
        singlePost: document.getElementById('single-post-view'),
    };
    const navLinks = {
        chatroom: document.getElementById('nav-chatroom'),
        posts: document.getElementById('nav-posts'),
    };
    const chatFeed = document.getElementById('chat-feed');
    const postsGrid = document.getElementById('posts-grid');
    const postDetailContent = document.getElementById('post-detail-content');
    const postCommentsFeed = document.getElementById('post-comments-feed');
    const modal = document.getElementById('post-modal');

    // --- DATA PERSISTENCE ---
    const saveData = () => {
        localStorage.setItem('devhub_posts', JSON.stringify(state.posts));
        localStorage.setItem('devhub_messages', JSON.stringify(state.messages));
        localStorage.setItem('devhub_comments', JSON.stringify(state.comments));
    };

    // --- MAIN RENDER FUNCTION ---
    const render = () => {
        Object.values(views).forEach(view => view.classList.remove('active'));
        Object.values(navLinks).forEach(link => link.classList.remove('active'));

        views[state.currentView].classList.add('active');

        switch (state.currentView) {
            case 'chatroom':
                renderChatroom();
                navLinks.chatroom.classList.add('active');
                break;
            case 'allPosts':
                renderAllPosts();
                navLinks.posts.classList.add('active');
                break;
            case 'singlePost':
                renderSinglePost();
                navLinks.posts.classList.add('active'); // Keep 'All Posts' active
                break;
        }
    };

    // --- VIEW-SPECIFIC RENDERERS ---
    const renderChatroom = () => {
        const combinedFeed = [...state.posts, ...state.messages, ...state.comments]
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        chatFeed.innerHTML = combinedFeed.map(item => {
            if (item.type === 'post') return createPostHTML(item);
            if (item.type === 'message') return createMessageHTML(item);
            if (item.type === 'comment') {
                const parentPost = state.posts.find(p => p.id === item.postId);
                return createCommentHTML(item, parentPost);
            }
        }).join('');
        chatFeed.scrollTop = chatFeed.scrollHeight;
    };
    
    const renderAllPosts = () => {
        postsGrid.innerHTML = state.posts.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map(post => `
            <div class="post-card" data-post-id="${post.id}">
                <h3>${escapeHtml(post.title)}</h3>
                <p>${escapeHtml(post.subject)}</p>
            </div>`).join('');
    };
    
    const renderSinglePost = () => {
        const post = state.posts.find(p => p.id === state.activePostId);
        if (!post) {
            postDetailContent.innerHTML = `<h2>Post not found</h2><p>This post may have been deleted.</p>`;
            postCommentsFeed.innerHTML = '';
            return;
        }
        
        postDetailContent.innerHTML = `
            <h1>${escapeHtml(post.title)}</h1>
            <p class="post-subject">Subject: ${escapeHtml(post.subject)}</p>
            <p class="post-description">${escapeHtml(post.description)}</p>
            <pre class="language-${escapeHtml(post.subject.toLowerCase())}"><code>${escapeHtml(post.code)}</code></pre>`;

        const commentsForPost = state.comments.filter(c => c.postId === post.id)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
        postCommentsFeed.innerHTML = commentsForPost.map(comment => `<div class="comment">${escapeHtml(comment.text)}</div>`).join('');
        
        Prism.highlightAll();
    };

    // --- HTML TEMPLATE GENERATORS ---
    const createMessageHTML = (item) => `<div class="chat-message me">${escapeHtml(item.text)}</div>`;
    const createPostHTML = (item) => `
        <div class="post-in-chat" data-post-id="${item.id}">
            <h4>New Post: ${escapeHtml(item.title)}</h4>
            <div class="post-subject">Subject: ${escapeHtml(item.subject)}</div>
            <div class="post-actions">
                <button class="view-post-btn">View Post</button>
                <button class="copy-code-btn">Copy Code</button>
            </div>
        </div>`;
    const createCommentHTML = (item, parentPost) => `
        <div class="comment-in-chat" data-post-id="${item.postId}">
            <div class="reply-quote">Reply to "${escapeHtml(parentPost?.title || 'a post')}"</div>
            ${escapeHtml(item.text)}
        </div>`;

    // --- EVENT HANDLERS ---
    const setupEventListeners = () => {
        navLinks.chatroom.addEventListener('click', (e) => { e.preventDefault(); navigate('chatroom'); });
        navLinks.posts.addEventListener('click', (e) => { e.preventDefault(); navigate('allPosts'); });
        document.getElementById('back-to-chat-btn').addEventListener('click', () => navigate('chatroom'));

        document.getElementById('create-post-btn').addEventListener('click', () => { modal.classList.add('visible'); });
        document.querySelector('.modal-close').addEventListener('click', () => { modal.classList.remove('visible'); });
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('visible'); });

        document.getElementById('chat-input-form').addEventListener('submit', handleChatMessage);
        document.getElementById('post-form').addEventListener('submit', handleCreatePost);
        document.getElementById('comment-form').addEventListener('submit', handleAddComment);

        document.body.addEventListener('click', (e) => {
            const postId = e.target.closest('[data-post-id]')?.dataset.postId;
            if (e.target.matches('.view-post-btn, .post-card, .post-card *')) {
                if (postId) navigate('singlePost', postId);
            }
            if (e.target.matches('.copy-code-btn')) {
                const post = state.posts.find(p => p.id === postId);
                if (post) copyToClipboard(post.code);
            }
        });
        document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    };

    const handleChatMessage = (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-message-input');
        if (!input.value.trim()) return;
        state.messages.push({ id: `m_${Date.now()}`, type: 'message', text: input.value, timestamp: new Date().toISOString() });
        input.value = '';
        saveData();
        renderChatroom();
    };

    const handleCreatePost = (e) => {
        e.preventDefault();
        const newPost = {
            id: `p_${Date.now()}`, type: 'post',
            title: document.getElementById('post-title').value,
            subject: document.getElementById('post-subject').value,
            description: document.getElementById('post-description').value,
            code: document.getElementById('post-code').value,
            timestamp: new Date().toISOString()
        };
        state.posts.push(newPost);
        saveData();
        modal.classList.remove('visible');
        e.target.reset();
        navigate('chatroom');
    };

    const handleAddComment = (e) => {
        e.preventDefault();
        const input = document.getElementById('comment-input');
        if (!input.value.trim()) return;
        state.comments.push({ id: `c_${Date.now()}`, type: 'comment', postId: state.activePostId, text: input.value, timestamp: new Date().toISOString() });
        input.value = '';
        saveData();
        renderSinglePost();
    };

    // --- CORE & UTILITY FUNCTIONS ---
    const navigate = (view, postId = null) => {
        state.currentView = view;
        state.activePostId = postId;
        render();
    };
    
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            const notification = document.getElementById('copy-notification');
            notification.classList.add('show');
            setTimeout(() => notification.classList.remove('show'), 2000);
        });
    };
    
    const escapeHtml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    
    const toggleTheme = () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        document.getElementById('theme-toggle').textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('devhub_theme', isDark ? 'dark' : 'light');
    };
    
    const loadTheme = () => {
        if (localStorage.getItem('devhub_theme') === 'dark') {
            document.body.classList.add('dark-mode');
            document.getElementById('theme-toggle').textContent = '☀️';
        }
    };

    // --- INITIALIZATION ---
    const init = () => {
        loadTheme();
        setupEventListeners();
        render(); // Initial render
    };

    init();
});


