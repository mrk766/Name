document.addEventListener('DOMContentLoaded', () => {
  const state = {
    currentView: 'chatroom',
    activePostId: null,
    posts: JSON.parse(localStorage.getItem('devhub_posts')) || [],
    messages: JSON.parse(localStorage.getItem('devhub_messages')) || [],
    comments: JSON.parse(localStorage.getItem('devhub_comments')) || [],
    username: localStorage.getItem('devhub_username') || null,
    selectedSubject: null,
  };

  const views = {
    chatroom: document.getElementById('chatroom-view'),
    coderoom: document.getElementById('coderoom-view'),
    singlePost: document.getElementById('single-post-view'),
  };

  const navLinks = {
    chatroom: document.getElementById('nav-chatroom'),
    coderoom: document.getElementById('nav-coderoom'),
  };

  const saveData = () => {
    localStorage.setItem('devhub_posts', JSON.stringify(state.posts));
    localStorage.setItem('devhub_messages', JSON.stringify(state.messages));
    localStorage.setItem('devhub_comments', JSON.stringify(state.comments));
  };

  const escapeHtml = (unsafe) =>
    unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      const notify = document.getElementById('copy-notification');
      notify.classList.add('show');
      setTimeout(() => notify.classList.remove('show'), 2000);
    });
  };

  const getSubjects = () => [...new Set(state.posts.map(p => p.subject.trim().toLowerCase()))];

  const ensureUsername = () => {
    if (!state.username) {
      document.getElementById('login-modal').classList.add('visible');
    }
  };

  const setUsername = () => {
    const name = document.getElementById('username-input').value.trim();
    if (name) {
      state.username = name;
      localStorage.setItem('devhub_username', name);
      document.getElementById('login-modal').classList.remove('visible');
    }
  };

  const navigate = (view, postId = null, subject = null) => {
    state.currentView = view;
    state.activePostId = postId;
    state.selectedSubject = subject;
    render();
  };

  const switchView = () => {
    Object.values(views).forEach(v => v.classList.remove('active'));
    Object.values(navLinks).forEach(l => l.classList.remove('active'));
    views[state.currentView].classList.add('active');
    if (state.currentView === 'chatroom') navLinks.chatroom.classList.add('active');
    if (state.currentView === 'coderoom') navLinks.coderoom.classList.add('active');
  };

  const render = () => {
    switchView();
    if (state.currentView === 'chatroom') renderChatroom();
    if (state.currentView === 'coderoom') renderCoderoom();
    if (state.currentView === 'singlePost') renderSinglePost();
  };

  const renderChatroom = () => {
    const feed = document.getElementById('chat-feed');
    const combined = [...state.messages, ...state.posts, ...state.comments].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    feed.innerHTML = combined.map(item => {
      if (item.type === 'message') {
        return `<div class="chat-message me">${escapeHtml(item.text)}</div>`;
      }
      if (item.type === 'post') {
        return `
          <div class="post-in-chat" data-post-id="${item.id}">
            <h4>${escapeHtml(item.title)}</h4>
            <p class="post-subject">${escapeHtml(item.subject)}</p>
            <div class="post-actions">
              <button class="view-post-btn">View</button>
              <button class="copy-code-btn">Copy</button>
            </div>
          </div>`;
      }
      if (item.type === 'comment') {
        const parent = state.posts.find(p => p.id === item.postId);
        return `<div class="comment-in-chat">
          <div class="reply-quote">Reply to "${parent?.title || 'a post'}"</div>
          ${escapeHtml(item.text)}
        </div>`;
      }
    }).join('');

    feed.scrollTop = feed.scrollHeight;
  };

  const renderCoderoom = () => {
    const subjectList = document.getElementById('subject-list');
    const postGrid = document.getElementById('coderoom-posts-container');
    const postSort = document.getElementById('post-sort');
    const postSearch = document.getElementById('post-search');

    const subjects = getSubjects();
    subjectList.innerHTML = subjects.map(s =>
      `<li class="${s === state.selectedSubject ? 'active' : ''}" data-subject="${s}">${s}</li>`).join('');

    const filteredPosts = state.posts.filter(p =>
      !state.selectedSubject || p.subject.trim().toLowerCase() === state.selectedSubject);

    const sorted = [...filteredPosts].sort((a, b) => {
      if (postSort.value === 'oldest') return new Date(a.timestamp) - new Date(b.timestamp);
      if (postSort.value === 'az') return a.title.localeCompare(b.title);
      return new Date(b.timestamp) - new Date(a.timestamp); // latest
    }).filter(p => p.title.toLowerCase().includes(postSearch.value.toLowerCase()));

    postGrid.innerHTML = sorted.map(post => `
      <div class="post-card" data-post-id="${post.id}">
        <h4>${escapeHtml(post.title)}</h4>
        <p>${escapeHtml(post.subject)} • ${new Date(post.timestamp).toLocaleDateString()}</p>
      </div>`).join('');
  };

  const renderSinglePost = () => {
    const post = state.posts.find(p => p.id === state.activePostId);
    const content = document.getElementById('post-detail-content');
    const commentFeed = document.getElementById('post-comments-feed');
    if (!post) return content.innerHTML = `<h2>Post not found</h2>`;

    content.innerHTML = `
      <div>
        <button class="copy-btn" onclick="navigator.clipboard.writeText(\`${post.code}\`)">Copy</button>
        <h2>${escapeHtml(post.title)}</h2>
        <p><strong>Subject:</strong> ${escapeHtml(post.subject)}</p>
        <p>${escapeHtml(post.description)}</p>
        <pre class="language-${escapeHtml(post.subject)}"><code>${escapeHtml(post.code)}</code></pre>
      </div>`;
    
    const comments = state.comments.filter(c => c.postId === post.id);
    commentFeed.innerHTML = comments.map(c => `<div class="comment">${escapeHtml(c.text)}</div>`).join('');
    Prism.highlightAll();
  };

  const setupEventListeners = () => {
    navLinks.chatroom.addEventListener('click', (e) => {
      e.preventDefault(); navigate('chatroom');
    });

    navLinks.coderoom.addEventListener('click', (e) => {
      e.preventDefault(); navigate('coderoom');
    });

    document.getElementById('create-post-btn').addEventListener('click', () => {
      ensureUsername();
      document.getElementById('post-modal').classList.add('visible');
      const datalist = document.getElementById('subject-options');
      datalist.innerHTML = getSubjects().map(s => `<option value="${s}"></option>`).join('');
    });

    document.querySelector('.modal-close').addEventListener('click', () => {
      document.getElementById('post-modal').classList.remove('visible');
    });

    document.getElementById('post-modal').addEventListener('click', (e) => {
      if (e.target.id === 'post-modal') {
        e.target.classList.remove('visible');
      }
    });

    document.getElementById('chat-input-form').addEventListener('submit', (e) => {
      e.preventDefault();
      ensureUsername();
      const input = document.getElementById('chat-message-input');
      const msg = input.value.trim();
      if (!msg) return;
      state.messages.push({
        id: `msg_${Date.now()}`,
        type: 'message',
        text: `${state.username}: ${msg}`,
        timestamp: new Date().toISOString()
      });
      input.value = '';
      saveData();
      render();
    });

    document.getElementById('post-form').addEventListener('submit', (e) => {
      e.preventDefault();
      ensureUsername();
      const title = document.getElementById('post-title').value;
      const subject = document.getElementById('post-subject').value.toLowerCase();
      const description = document.getElementById('post-description').value;
      const code = document.getElementById('post-code').value;
      state.posts.push({
        id: `post_${Date.now()}`,
        type: 'post',
        title, subject, description, code,
        timestamp: new Date().toISOString()
      });
      saveData();
      document.getElementById('post-modal').classList.remove('visible');
      e.target.reset();
      navigate('chatroom');
    });

    document.getElementById('comment-form').addEventListener('submit', (e) => {
      e.preventDefault();
      ensureUsername();
      const text = document.getElementById('comment-input').value.trim();
      if (!text) return;
      state.comments.push({
        id: `c_${Date.now()}`,
        type: 'comment',
        postId: state.activePostId,
        text: `${state.username}: ${text}`,
        timestamp: new Date().toISOString()
      });
      saveData();
      document.getElementById('comment-input').value = '';
      render();
    });

    document.body.addEventListener('click', (e) => {
      const postId = e.target.closest('[data-post-id]')?.dataset.postId;
      if (e.target.matches('.view-post-btn') || e.target.closest('.post-card')) {
        if (postId) navigate('singlePost', postId);
      }
      if (e.target.matches('.copy-code-btn')) {
        const post = state.posts.find(p => p.id === postId);
        if (post) copyToClipboard(post.code);
      }
      if (e.target.closest('#subject-list li')) {
        const subject = e.target.dataset.subject;
        navigate('coderoom', null, subject);
      }
    });

    document.getElementById('post-sort')?.addEventListener('change', render);
    document.getElementById('post-search')?.addEventListener('input', render);
    document.getElementById('subject-search')?.addEventListener('input', (e) => {
      const filter = e.target.value.toLowerCase();
      const allSubs = document.querySelectorAll('#subject-list li');
      allSubs.forEach(li => {
        li.style.display = li.dataset.subject.includes(filter) ? 'block' : 'none';
      });
    });

    document.getElementById('set-username-btn').addEventListener('click', setUsername);

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      document.getElementById('theme-toggle').textContent = isDark ? '☀️' : '🌙';
      localStorage.setItem('devhub_theme', isDark ? 'dark' : 'light');
    });

    document.getElementById('back-to-coderoom-btn')?.addEventListener('click', () => {
      navigate('coderoom');
    });
  };

  const loadTheme = () => {
    const stored = localStorage.getItem('devhub_theme');
    if (stored === 'dark') {
      document.body.classList.add('dark-mode');
      document.getElementById('theme-toggle').textContent = '☀️';
    }
  };

  const init = () => {
    loadTheme();
    setupEventListeners();
    render();
    if (!state.username) {
      ensureUsername();
    }
  };

  init();
});