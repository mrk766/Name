document.addEventListener('DOMContentLoaded', () => {
  // State Management
  const state = {
    currentView: 'chatroom',
    isEditingPost: false,
    favorites: JSON.parse(localStorage.getItem('devhub_favorites')) || [],
    posts: JSON.parse(localStorage.getItem('devhub_posts')) || [],
    messages: JSON.parse(localStorage.getItem('devhub_messages')) || [],
    comments: JSON.parse(localStorage.getItem('devhub_comments')) || [],
    username: localStorage.getItem('devhub_username') || null,
  };

  // DOM Elements
  const chatFeed = document.getElementById('chat-feed');
  const chatInputForm = document.getElementById('chat-input-form');
  const chatMessageInput = document.getElementById('chat-message-input');
  const chatSearch = document.getElementById('chat-search');
  const chatFilter = document.getElementById('chat-filter');

  // Utility Functions
  const saveData = () => {
    localStorage.setItem('devhub_posts', JSON.stringify(state.posts));
    localStorage.setItem('devhub_messages', JSON.stringify(state.messages));
    localStorage.setItem('devhub_comments', JSON.stringify(state.comments));
    localStorage.setItem('devhub_favorites', JSON.stringify(state.favorites));
    localStorage.setItem('devhub_username', state.username);
  };

  const escapeHtml = (unsafe) =>
    unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const copyToClipboard = (text, message = 'Copied!') => {
    navigator.clipboard.writeText(text).then(() => {
      const notify = document.getElementById('copy-notification');
      notify.textContent = message;
      notify.classList.add('show');
      setTimeout(() => notify.classList.remove('show'), 2000);
    });
  };

  const ensureUsername = () => {
    if (!state.username) {
      document.getElementById('login-modal').classList.add('visible');
      return false;
    }
    return true;
  };

  const setUsername = () => {
    const name = document.getElementById('username-input').value.trim();
    if (name) {
      state.username = name;
      localStorage.setItem('devhub_username', name);
      document.getElementById('login-modal').classList.remove('visible');
      renderChatroom();
    }
  };

  const clearChat = () => {
    if (confirm('Are you sure you want to clear all chat messages?')) {
      state.messages = [];
      saveData();
      renderChatroom();
    }
  };

  // Rendering Functions
  const renderChatroom = () => {
    const searchTerm = chatSearch.value.toLowerCase();
    const filterType = chatFilter.value;
    
    // Combine all content types
    const combined = [
      ...state.messages.map(m => ({...m, type: 'message'})),
      ...state.posts.map(p => ({...p, type: 'post'})),
      ...state.comments.map(c => ({...c, type: 'comment'}))
    ].filter(item => {
      // Filter by type
      if (filterType !== 'all' && item.type !== filterType) return false;
      
      // Filter by search term
      let text = '';
      if (item.type === 'message') text = item.text;
      if (item.type === 'post') text = `${item.title} ${item.subject} ${item.description}`;
      if (item.type === 'comment') text = item.text;
      
      return text.toLowerCase().includes(searchTerm);
    }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    chatFeed.innerHTML = combined.map(item => {
      const timestamp = new Date(item.timestamp).toLocaleString();
      const isCurrentUser = item.user === state.username;
      const avatarColor = '#' + ((Math.abs(item.user.charCodeAt(0) * item.user.length) % 0xffffff | 0).toString(16).padStart(6, '0');
      const avatar = `<span class="avatar" style="background-color: ${avatarColor}">${item.user[0].toUpperCase()}</span>`;
      
      if (item.type === 'message') {
        return `
          <div class="chat-message ${isCurrentUser ? 'current-user' : ''}" data-id="${item.id}">
            ${isCurrentUser ? '' : avatar}
            <div class="message-content">
              ${isCurrentUser ? '' : `<span class="user">${escapeHtml(item.user)}</span>`}
              <div class="text">${marked.parse(item.text)}</div>
              <span class="timestamp">${timestamp}</span>
            </div>
            ${isCurrentUser ? avatar : ''}
            <button class="delete-btn" data-id="${item.id}" data-type="message">🗑️</button>
          </div>`;
      }
      
      if (item.type === 'post') {
        const imageHtml = item.image ? `<img src="${item.image}" alt="Post image" class="post-image-thumbnail">` : '';
        return `
          <div class="chat-post" data-id="${item.id}">
            ${avatar}
            <div class="post-content">
              <span class="user">${escapeHtml(item.user)}</span>
              <h4>${escapeHtml(item.title)}</h4>
              <p class="post-subject">${escapeHtml(item.subject)}</p>
              <div class="post-description">${marked.parse(item.description)}</div>
              ${imageHtml}
              <div class="code-preview">
                <pre><code class="language-${escapeHtml(item.language || 'text')}">${escapeHtml(item.code.slice(0, 100))}${item.code.length > 100 ? '...' : ''}</code></pre>
                <button class="view-full-btn" data-id="${item.id}">View Full</button>
              </div>
              <span class="timestamp">${timestamp}</span>
            </div>
            <button class="delete-btn" data-id="${item.id}" data-type="post">🗑️</button>
          </div>`;
      }
      
      if (item.type === 'comment') {
        const parentPost = state.posts.find(p => p.id === item.postId);
        return `
          <div class="chat-comment" data-id="${item.id}">
            ${avatar}
            <div class="comment-content">
              <span class="user">${escapeHtml(item.user)}</span>
              <div class="reply-context">Reply to "${escapeHtml(parentPost?.title || 'a post')}"</div>
              <div class="text">${marked.parse(item.text)}</div>
              <span class="timestamp">${timestamp}</span>
            </div>
            <button class="delete-btn" data-id="${item.id}" data-type="comment">🗑️</button>
          </div>`;
      }
    }).join('');

    // Apply syntax highlighting
    Prism.highlightAll();
    
    // Scroll to bottom
    chatFeed.scrollTop = chatFeed.scrollHeight;
  };

  const showFullPost = (postId) => {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    const modal = document.getElementById('post-modal');
    document.getElementById('post-modal-title').textContent = post.title;
    
    const content = `
      <div class="full-post">
        <div class="post-header">
          ${getAvatar(post.user)}
          <span class="user">${escapeHtml(post.user)}</span>
          <span class="timestamp">${new Date(post.timestamp).toLocaleString()}</span>
        </div>
        <h2>${escapeHtml(post.title)}</h2>
        <p><strong>Subject:</strong> ${escapeHtml(post.subject)}</p>
        <p><strong>Language:</strong> ${escapeHtml(post.language)}</p>
        <div class="post-description">${marked.parse(post.description)}</div>
        ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
        <div class="code-section">
          <button class="copy-btn" data-code="${escapeHtml(post.code)}">Copy Code</button>
          <pre class="language-${escapeHtml(post.language || 'text')}"><code>${escapeHtml(post.code)}</code></pre>
        </div>
        <div class="post-actions">
          <button class="favorite-btn" data-id="${post.id}">
            ${state.favorites.includes(post.id) ? '★ Unfavorite' : '☆ Favorite'}
          </button>
        </div>
      </div>`;
    
    modal.querySelector('.modal-content').innerHTML = `
      <button class="modal-close">&times;</button>
      ${content}`;
    
    modal.classList.add('visible');
    
    // Set up event listeners for the modal
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.classList.remove('visible');
    });
    
    modal.querySelector('.copy-btn')?.addEventListener('click', (e) => {
      copyToClipboard(e.target.dataset.code);
    });
    
    modal.querySelector('.favorite-btn')?.addEventListener('click', (e) => {
      const postId = e.target.dataset.id;
      const index = state.favorites.indexOf(postId);
      if (index === -1) {
        state.favorites.push(postId);
      } else {
        state.favorites.splice(index, 1);
      }
      saveData();
      e.target.textContent = state.favorites.includes(postId) ? '★ Unfavorite' : '☆ Favorite';
    });
  };

  // Event Handlers
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!ensureUsername()) return;
    
    const text = chatMessageInput.value.trim();
    if (!text) return;
    
    state.messages.push({
      id: `msg_${Date.now()}`,
      type: 'message',
      user: state.username,
      text,
      timestamp: new Date().toISOString()
    });
    
    chatMessageInput.value = '';
    saveData();
    renderChatroom();
  };

  const handleCreatePost = (e) => {
    e.preventDefault();
    if (!ensureUsername()) return;
    
    const title = document.getElementById('post-title').value.trim();
    const subject = document.getElementById('post-subject').value.trim();
    const language = document.getElementById('post-language').value.trim();
    const description = document.getElementById('post-description').value;
    const code = document.getElementById('post-code').value;
    const imageInput = document.getElementById('post-image');
    
    if (!title || !subject || !language || !code) return;
    
    const handleImage = (callback) => {
      if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (ev) => callback(ev.target.result);
        reader.readAsDataURL(imageInput.files[0]);
      } else {
        callback(null);
      }
    };
    
    handleImage((image) => {
      const newPost = {
        id: `post_${Date.now()}`,
        type: 'post',
        user: state.username,
        title,
        subject,
        language,
        description,
        code,
        image,
        timestamp: new Date().toISOString()
      };
      
      state.posts.push(newPost);
      saveData();
      document.getElementById('post-modal').classList.remove('visible');
      document.getElementById('post-form').reset();
      renderChatroom();
    });
  };

  const handleDeleteItem = (id, type) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    
    if (type === 'message') {
      state.messages = state.messages.filter(m => m.id !== id);
    } else if (type === 'post') {
      state.posts = state.posts.filter(p => p.id !== id);
      state.comments = state.comments.filter(c => c.postId !== id);
      state.favorites = state.favorites.filter(favId => favId !== id);
    } else if (type === 'comment') {
      state.comments = state.comments.filter(c => c.id !== id);
    }
    
    saveData();
    renderChatroom();
  };

  // Event Listeners Setup
  const setupEventListeners = () => {
    // Message sending
    chatInputForm.addEventListener('submit', handleSendMessage);
    
    // Post creation
    document.getElementById('create-post-btn').addEventListener('click', () => {
      if (!ensureUsername()) return;
      document.getElementById('post-modal-title').textContent = 'Create a New Post';
      document.getElementById('post-form').reset();
      document.getElementById('post-modal').classList.add('visible');
    });
    
    document.getElementById('post-form').addEventListener('submit', handleCreatePost);
    
    // Modals
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.modal-overlay').classList.remove('visible');
      });
    });
    
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('visible');
        }
      });
    });
    
    // Username setting
    document.getElementById('set-username-btn').addEventListener('click', setUsername);
    
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      document.getElementById('theme-toggle').textContent = isDark ? '☀️' : '🌙';
      localStorage.setItem('devhub_theme', isDark ? 'dark' : 'light');
    });
    
    // Chat controls
    document.getElementById('clear-chat-btn').addEventListener('click', clearChat);
    chatSearch.addEventListener('input', renderChatroom);
    chatFilter.addEventListener('change', renderChatroom);
    
    // Markdown help
    document.getElementById('markdown-help-btn').addEventListener('click', () => {
      document.getElementById('markdown-modal').classList.add('visible');
    });
    
    // Dynamic content handlers
    chatFeed.addEventListener('click', (e) => {
      const target = e.target;
      
      if (target.classList.contains('delete-btn')) {
        handleDeleteItem(target.dataset.id, target.dataset.type);
      } else if (target.classList.contains('view-full-btn') || target.closest('.view-full-btn')) {
        const postId = target.dataset.id || target.closest('[data-id]').dataset.id;
        showFullPost(postId);
      } else if (target.classList.contains('copy-btn') || target.closest('.copy-btn')) {
        const code = target.dataset.code || target.closest('[data-code]').dataset.code;
        if (code) copyToClipboard(code);
      }
    });
  };

  // Initialization
  const init = () => {
    // Load theme preference
    const storedTheme = localStorage.getItem('devhub_theme');
    if (storedTheme === 'dark') {
      document.body.classList.add('dark-mode');
      document.getElementById('theme-toggle').textContent = '☀️';
    }
    
    setupEventListeners();
    renderChatroom();
    
    // Check for username
    if (!state.username) {
      document.getElementById('login-modal').classList.add('visible');
    }
  };

  init();
});