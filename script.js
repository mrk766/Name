document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    const state = {
        username: localStorage.getItem('devhub_username') || null,
        currentView: 'chatroom',
        activePostId: null,
        replyingTo: null, // NEW: Holds the message object we are replying to
        posts: JSON.parse(localStorage.getItem('devhub_posts')) || [],
        messages: JSON.parse(localStorage.getItem('devhub_messages')) || [],
        comments: JSON.parse(localStorage.getItem('devhub_comments')) || [],
    };

    // --- DOM SELECTORS ---
    const views = { chatroom: document.getElementById('chatroom-view'), allPosts: document.getElementById('all-posts-view'), singlePost: document.getElementById('single-post-view') };
    const navLinks = { chatroom: document.getElementById('nav-chatroom'), posts: document.getElementById('nav-posts') };
    const chatFeed = document.getElementById('chat-feed');
    const postsGrid = document.getElementById('posts-grid');
    const postDetailContent = document.getElementById('post-detail-content');
    const postCommentsFeed = document.getElementById('post-comments-feed');
    const modal = document.getElementById('post-modal');
    const replyIndicator = document.getElementById('reply-indicator');

    // --- DATA PERSISTENCE ---
    const saveData = () => {
        localStorage.setItem('devhub_username', state.username);
        localStorage.setItem('devhub_posts', JSON.stringify(state.posts));
        localStorage.setItem('devhub_messages', JSON.stringify(state.messages));
        localStorage.setItem('devhub_comments', JSON.stringify(state.comments));
    };

    // --- USER MANAGEMENT ---
    const ensureUserExists = () => {
        if (state.username) return true;
        
        const name = prompt("Please enter your name to post:");
        if (name && name.trim()) {
            state.username = name.trim();
            saveData();
            return true;
        }
        return false;
    };
    
    // --- MAIN RENDER FUNCTION ---
    const render = () => {
        Object.values(views).forEach(view => view.classList.remove('active'));
        Object.values(navLinks).forEach(link => link.classList.remove('active'));
        views[state.currentView].classList.add('active');

        switch (state.currentView) {
            case 'chatroom': renderChatroom(); navLinks.chatroom.classList.add('active'); break;
            case 'allPosts': renderAllPosts(); navLinks.posts.classList.add('active'); break;
            case 'singlePost': renderSinglePost(); navLinks.posts.classList.add('active'); break;
        }
    };
    
    // --- VIEW-SPECIFIC RENDERERS ---
    const renderChatroom = () => {
        const combinedFeed = [...state.posts, ...state.messages, ...state.comments]
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        chatFeed.innerHTML = combinedFeed.map(item => {
            const wrapperClass = item.author === state.username ? 'me' : 'other';
            let contentHTML = '';

            if (item.type === 'post') {
                contentHTML = createPostHTML(item);
            } else {
                const bubbleClass = item.author === state.username ? 'me' : 'other';
                let replyHTML = '';
                if (item.replyToId) {
                    const originalItem = findItemById(item.replyToId);
                    replyHTML = createQuotedReplyHTML(originalItem);
                }
                
                if (item.type === 'message') {
                    contentHTML = `${replyHTML}<div class="chat-bubble ${bubbleClass}">${escapeHtml(item.text)}</div>`;
                } else if (item.type === 'comment') {
                    contentHTML = `${replyHTML}<div class="chat-bubble ${bubbleClass}">Comment on post: ${escapeHtml(item.text)}</div>`;
                }
            }
            
            // Posts are centered, messages have authors
            if(item.type === 'post') {
                 return `<div class="message-wrapper center" data-id="${item.id}">${contentHTML}</div>`;
            } else {
                 return `<div class="message-wrapper ${wrapperClass}" data-id="${item.id}">
                    <div class="author-name">${escapeHtml(item.author)}</div>
                    ${contentHTML}
                    <button class="reply-button">↪</button>
                </div>`;
            }

        }).join('');
        chatFeed.scrollTop = chatFeed.scrollHeight;
    };
    
    const renderAllPosts = () => { /* ... (no changes) ... */ };
    const renderSinglePost = () => { /* ... (no changes, but now shows author) ... */ };
    
    // --- HTML TEMPLATE GENERATORS ---
    const createPostHTML = (item) => `...`; // Updated to show author
    const createQuotedReplyHTML = (originalItem) => {
        if (!originalItem) return '';
        let textSnippet = '';
        if (originalItem.type === 'post') textSnippet = `Post: ${originalItem.title}`;
        else textSnippet = originalItem.text || `Comment: ${originalItem.text}`;

        return `
            <div class="quoted-reply">
                <div class="quoted-reply-author">${escapeHtml(originalItem.author)}</div>
                <span class="quoted-reply-text">${escapeHtml(textSnippet)}</span>
            </div>`;
    };

    // --- REPLY MANAGEMENT ---
    const handleReplyClick = (itemId) => {
        state.replyingTo = findItemById(itemId);
        if (state.replyingTo) {
            replyIndicator.innerHTML = `
                <div class="quoted-reply">
                    Replying to <strong>${escapeHtml(state.replyingTo.author)}</strong>
                    <span class="cancel-reply" title="Cancel Reply">×</span>
                </div>`;
            replyIndicator.style.display = 'block';
            replyIndicator.querySelector('.cancel-reply').addEventListener('click', cancelReply);
        }
    };
    const cancelReply = () => {
        state.replyingTo = null;
        replyIndicator.style.display = 'none';
    };

    // --- EVENT HANDLERS ---
    const setupEventListeners = () => {
        // ... (navigation and modal listeners are the same)
        document.getElementById('chat-input-form').addEventListener('submit', handleChatMessage);
        document.getElementById('post-form').addEventListener('submit', handleCreatePost);
        document.getElementById('comment-form').addEventListener('submit', handleAddComment);
        
        // NEW: Event delegation for reply buttons
        chatFeed.addEventListener('click', (e) => {
            if (e.target.classList.contains('reply-button')) {
                const messageWrapper = e.target.closest('.message-wrapper');
                if (messageWrapper) handleReplyClick(messageWrapper.dataset.id);
            }
        });
    };
    
    const handleChatMessage = (e) => {
        e.preventDefault();
        if (!ensureUserExists()) return;
        const input = document.getElementById('chat-message-input');
        if (!input.value.trim()) return;
        
        state.messages.push({
            id: `m_${Date.now()}`, type: 'message',
            author: state.username,
            text: input.value,
            timestamp: new Date().toISOString(),
            replyToId: state.replyingTo ? state.replyingTo.id : null,
        });
        input.value = '';
        cancelReply();
        saveData();
        renderChatroom();
    };

    const handleCreatePost = (e) => {
        e.preventDefault();
        if (!ensureUserExists()) return;
        // ... (rest of the function is the same, just add author)
        const newPost = { id: `p_${Date.now()}`, type: 'post', author: state.username, /* ... */ };
        state.posts.push(newPost);
        // ...
    };

    const handleAddComment = (e) => {
        e.preventDefault();
        if (!ensureUserExists()) return;
        // ... (rest of the function is the same, just add author and replyToId)
        state.comments.push({ id: `c_${Date.now()}`, type: 'comment', author: state.username, postId: state.activePostId, /* ... */ });
        // ...
    };

    // --- UTILITIES ---
    const findItemById = (id) => {
        return [...state.posts, ...state.messages, ...state.comments].find(item => item.id === id);
    };
    const escapeHtml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    
    // --- INITIALIZATION ---
    // ... (same as before)

    // Helper functions for renderAllPosts and renderSinglePost (simplified for brevity, they have no logic changes)
    const renderAllPosts = () => { postsGrid.innerHTML = state.posts.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map(post => `<div class="post-card" data-post-id="${post.id}"><h3>${escapeHtml(post.title)}</h3><p>By ${escapeHtml(post.author)}</p></div>`).join(''); };
    const renderSinglePost = () => { const post = state.posts.find(p => p.id === state.activePostId); if(!post) return; postDetailContent.innerHTML = `<h1>${escapeHtml(post.title)}</h1><p>By ${escapeHtml(post.author)}</p><p>${escapeHtml(post.description)}</p><pre><code>${escapeHtml(post.code)}</code></pre>`; const commentsForPost = state.comments.filter(c => c.postId === post.id); postCommentsFeed.innerHTML = commentsForPost.map(comment => `<div class="comment"><strong>${escapeHtml(comment.author)}:</strong> ${escapeHtml(comment.text)}</div>`).join(''); Prism.highlightAll();};
    
    // ... (rest of the init code from previous version)
    const navigate = (view, postId = null) => { state.currentView = view; state.activePostId = postId; render(); };
    const toggleTheme = () => { document.body.classList.toggle('dark-mode'); const isDark = document.body.classList.contains('dark-mode'); document.getElementById('theme-toggle').textContent = isDark ? '☀️' : '🌙'; localStorage.setItem('devhub_theme', isDark ? 'dark' : 'light'); };
    const loadTheme = () => { if (localStorage.getItem('devhub_theme') === 'dark') { document.body.classList.add('dark-mode'); document.getElementById('theme-toggle').textContent = '☀️'; } };
    const init = () => { loadTheme(); setupEventListeners(); render(); };
    init();
});
