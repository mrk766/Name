document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    const state = {
        username: localStorage.getItem('devhub_username') || null,
        currentView: 'coderoomSubjects', // coderoomSubjects, coderoomPosts, chatroom, singlePost
        activeSubject: null,
        activePostId: null,
        posts: JSON.parse(localStorage.getItem('devhub_posts')) || [],
        messages: JSON.parse(localStorage.getItem('devhub_messages')) || [],
        comments: JSON.parse(localStorage.getItem('devhub_comments')) || [],
    };

    // --- DOM SELECTORS ---
    const views = {
        coderoomSubjects: document.getElementById('coderoom-subjects-view'),
        coderoomPosts: document.getElementById('coderoom-posts-view'),
        chatroom: document.getElementById('chatroom-view'),
        singlePost: document.getElementById('single-post-view'),
    };
    const navLinks = { coderoom: document.getElementById('nav-coderoom'), chatroom: document.getElementById('nav-chatroom') };
    const modal = document.getElementById('post-modal');

    // --- DATA & USER MANAGEMENT ---
    const saveData = () => {
        localStorage.setItem('devhub_username', state.username);
        localStorage.setItem('devhub_posts', JSON.stringify(state.posts));
        // ... save other data
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

    // --- NAVIGATION & RENDERING ---
    const navigate = (view, context = null) => {
        state.currentView = view;
        Object.values(views).forEach(v => v.classList.remove('active'));
        Object.values(navLinks).forEach(l => l.classList.remove('active'));
        views[view].classList.add('active');

        switch (view) {
            case 'coderoomSubjects':
                renderSubjects();
                navLinks.coderoom.classList.add('active');
                break;
            case 'coderoomPosts':
                state.activeSubject = context;
                document.getElementById('posts-view-title').textContent = `${state.activeSubject} Posts`;
                renderPostsForSubject();
                navLinks.coderoom.classList.add('active');
                break;
            case 'chatroom':
                renderChatroom();
                navLinks.chatroom.classList.add('active');
                break;
            case 'singlePost':
                state.activePostId = context;
                renderSinglePost();
                navLinks.coderoom.classList.add('active');
                break;
        }
    };
    
    const renderSubjects = () => {
        const subjectsGrid = document.getElementById('subjects-grid');
        const subjects = [...new Set(state.posts.map(p => p.subject))];
        if (subjects.length === 0) {
            subjectsGrid.innerHTML = `<p>No subjects found. Create a post to add one!</p>`;
            return;
        }
        subjectsGrid.innerHTML = subjects.map(s => `<div class="subject-card" data-subject="${s}">${s}</div>`).join('');
    };

    const renderPostsForSubject = () => {
        const postList = document.getElementById('post-list');
        const searchTerm = document.getElementById('post-search-bar').value.toLowerCase();
        const sortBy = document.getElementById('post-sort-select').value;
        
        let posts = state.posts.filter(p => p.subject === state.activeSubject);
        if (searchTerm) {
            posts = posts.filter(p => p.title.toLowerCase().includes(searchTerm));
        }

        posts.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.timestamp) - new Date(a.timestamp);
            if (sortBy === 'oldest') return new Date(a.timestamp) - new Date(b.timestamp);
            if (sortBy === 'number') return a.postNumber - b.postNumber;
            return 0;
        });

        postList.innerHTML = posts.map(p => `
            <li class="post-list-item" data-post-id="${p.id}">
                <a>
                    <h4>${p.title}</h4>
                    <div class="post-meta">By ${p.author} on ${new Date(p.timestamp).toLocaleDateString()}</div>
                </a>
            </li>`).join('');
    };

    const renderSinglePost = () => {
        const post = state.posts.find(p => p.id === state.activePostId);
        const contentDiv = document.getElementById('post-detail-content');
        if (!post) {
            contentDiv.innerHTML = 'Post not found.';
            return;
        }
        contentDiv.innerHTML = `
            <h1>${post.title}</h1>
            <p>By ${post.author} | Subject: ${post.subject} | Post #: ${post.postNumber}</p>
            <p>${post.description}</p>
            <div class="code-snippet-container">
                <div class="code-snippet-header">
                    <span class="code-snippet-lang">${post.subject.toLowerCase()}</span>
                    <button class="copy-code-btn" data-code="${btoa(post.code)}">Copy</button>
                </div>
                <pre><code class="language-${post.subject.toLowerCase()}">${escapeHtml(post.code)}</code></pre>
            </div>`;
        Prism.highlightAll();
        // Render comments for the post as well
        renderCommentsForPost();
    };
    
    const renderCommentsForPost = () => { /* Logic to render comments in single post view */ };
    const renderChatroom = () => { /* Your existing chatroom render logic */ };

    // --- EVENT LISTENERS ---
    const setupEventListeners = () => {
        navLinks.coderoom.addEventListener('click', () => navigate('coderoomSubjects'));
        navLinks.chatroom.addEventListener('click', () => navigate('chatroom'));
        document.getElementById('create-post-btn').addEventListener('click', () => {
            if (ensureUserExists()) modal.classList.add('visible');
        });
        document.getElementById('post-form').addEventListener('submit', handleCreatePost);
        document.getElementById('back-to-subjects-btn').addEventListener('click', () => navigate('coderoomSubjects'));
        document.getElementById('back-to-posts-btn').addEventListener('click', () => navigate('coderoomPosts', state.activeSubject));
        document.getElementById('post-search-bar').addEventListener('input', renderPostsForSubject);
        document.getElementById('post-sort-select').addEventListener('change', renderPostsForSubject);

        // Event delegation for dynamic content
        document.body.addEventListener('click', (e) => {
            const subjectCard = e.target.closest('.subject-card');
            const postListItem = e.target.closest('.post-list-item');
            const copyBtn = e.target.closest('.copy-code-btn');

            if (subjectCard) navigate('coderoomPosts', subjectCard.dataset.subject);
            if (postListItem) navigate('singlePost', postListItem.dataset.postId);
            if (copyBtn) {
                const decodedCode = atob(copyBtn.dataset.code);
                navigator.clipboard.writeText(decodedCode);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
            }
        });
        // Add chat/comment form submit listeners that call ensureUserExists()
    };
    
    // --- FORM HANDLERS ---
    const handleCreatePost = (e) => {
        e.preventDefault();
        const newPost = {
            id: `p_${Date.now()}`,
            author: state.username,
            title: document.getElementById('post-title').value,
            subject: document.getElementById('post-subject').value,
            postNumber: parseInt(document.getElementById('post-number').value, 10),
            description: document.getElementById('post-description').value,
            code: document.getElementById('post-code').value,
            timestamp: new Date().toISOString()
        };
        state.posts.push(newPost);
        saveData();
        modal.classList.remove('visible');
        e.target.reset();
        navigate('coderoomPosts', newPost.subject);
    };

    // --- UTILITIES & INIT ---
    const escapeHtml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    const init = () => {
        setupEventListeners();
        navigate('coderoomSubjects'); // Start in the Coderoom
    };
    init();
});
