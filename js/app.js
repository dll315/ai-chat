/* ============================================================
   app.js  —  AI 聊天主程序
   ------------------------------------------------------------
   功能总览:
   1. 多会话管理(新建 / 切换 / 删除 / 自动标题)
   2. 消息发送与流式接收(实时打字效果)
   3. Markdown / 代码高亮 / 数学公式渲染
   4. 代码块一键复制
   5. 消息复制 / 重试 / 删除
   6. 设置面板(API 密钥 / 模型 / 温度等)
   7. 明暗主题切换(记忆偏好)
   8. 本地持久化(localStorage)
   9. 响应式侧边栏(移动端抽屉)
   10. Toast 通知
   ============================================================ */

(function () {
  "use strict";

  const K = CONFIG.STORAGE_KEYS;

  /* ============================================================
     状态管理
     ============================================================ */
  const state = {
    conversations: [],     // 所有会话
    currentId: null,       // 当前会话 ID
    isGenerating: false,   // 是否正在生成
    abortController: null, // 中止控制器
  };

  /* ============================================================
     工具函数
     ============================================================ */
  const $  = (id) => document.getElementById(id);
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function now() { return Date.now(); }

  function toast(msg, type = "") {
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.3s";
      setTimeout(() => el.remove(), 300);
    }, 2600);
  }

  /* ============================================================
     存储读写
     ============================================================ */
  function loadState() {
    try {
      const raw = localStorage.getItem(K.CONVERSATIONS);
      state.conversations = raw ? JSON.parse(raw) : [];
    } catch { state.conversations = []; }
    state.currentId = localStorage.getItem(K.CURRENT_CONV) || null;
  }

  function saveConversations() {
    localStorage.setItem(K.CONVERSATIONS, JSON.stringify(state.conversations));
  }

  function saveCurrentId() {
    if (state.currentId) localStorage.setItem(K.CURRENT_CONV, state.currentId);
  }

  /* ============================================================
     会话操作
     ============================================================ */
  function getCurrentConversation() {
    return state.conversations.find((c) => c.id === state.currentId) || null;
  }

  function newConversation() {
    const conv = { id: uid(), title: "新对话", messages: [], createdAt: now() };
    state.conversations.unshift(conv);
    state.currentId = conv.id;
    saveConversations();
    saveCurrentId();
    renderSidebar();
    renderMessages();
  }

  function selectConversation(id) {
    state.currentId = id;
    saveCurrentId();
    renderSidebar();
    renderMessages();
  }

  function deleteConversation(id) {
    const idx = state.conversations.findIndex((c) => c.id === id);
    if (idx < 0) return;
    state.conversations.splice(idx, 1);
    if (state.currentId === id) {
      state.currentId = state.conversations[0]?.id || null;
    }
    saveConversations();
    saveCurrentId();
    renderSidebar();
    renderMessages();
  }

  /* ============================================================
     侧边栏渲染
     ============================================================ */
  function renderSidebar() {
    const list = $("conversationsList");
    list.innerHTML = "";
    for (const conv of state.conversations) {
      const item = document.createElement("div");
      item.className = "conv-item" + (conv.id === state.currentId ? " active" : "");

      const title = document.createElement("span");
      title.className = "conv-title";
      title.textContent = conv.title || "新对话";
      title.addEventListener("click", () => selectConversation(conv.id));

      const delBtn = document.createElement("button");
      delBtn.className = "conv-delete";
      delBtn.textContent = "🗑";
      delBtn.title = "删除此对话";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`确定删除对话「${conv.title}」吗?`)) {
          deleteConversation(conv.id);
          toast("对话已删除");
        }
      });

      item.appendChild(title);
      item.appendChild(delBtn);
      list.appendChild(item);
    }
    $("topbarTitle").textContent =
      getCurrentConversation()?.title || "AI 聊天助手";
  }

  /* ============================================================
     消息渲染
     ============================================================ */
  function renderMessages() {
    const container = $("messages");
    container.innerHTML = "";
    const conv = getCurrentConversation();

    if (!conv || conv.messages.length === 0) {
      container.innerHTML = $("emptyState").outerHTML;
      // 重新绑定空状态里的建议卡片
      container.querySelectorAll(".suggestion-card").forEach((card) => {
        card.addEventListener("click", () => {
          $("input").value = card.dataset.prompt;
          sendMessage();
        });
      });
      return;
    }

    for (const msg of conv.messages) {
      container.appendChild(createMessageElement(msg));
    }
    scrollToBottom();
  }

  function createMessageElement(msg) {
    const wrapper = document.createElement("div");
    wrapper.className = "message " + msg.role;
    if (msg.error) wrapper.classList.add("error");
    wrapper.dataset.msgId = msg.id;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = msg.role === "user" ? "我" : "AI";

    const content = document.createElement("div");
    content.className = "content";

    const mdBody = document.createElement("div");
    mdBody.className = "markdown-body";
    mdBody.innerHTML = renderMarkdown(msg.content);
    content.appendChild(mdBody);

    // 操作按钮
    const actions = document.createElement("div");
    actions.className = "msg-actions";

    if (msg.role === "assistant") {
      const copyBtn = document.createElement("button");
      copyBtn.className = "msg-action-btn";
      copyBtn.textContent = "📋 复制";
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(msg.content);
        toast("已复制到剪贴板", "success");
      });
      actions.appendChild(copyBtn);

      const retryBtn = document.createElement("button");
      retryBtn.className = "msg-action-btn";
      retryBtn.textContent = "🔄 重新生成";
      retryBtn.addEventListener("click", () => regenerateMessage(msg.id));
      actions.appendChild(retryBtn);
    }

    const delBtn = document.createElement("button");
    delBtn.className = "msg-action-btn";
    delBtn.textContent = "🗑 删除";
    delBtn.addEventListener("click", () => deleteMessage(msg.id));
    actions.appendChild(delBtn);

    content.appendChild(actions);
    wrapper.appendChild(avatar);
    wrapper.appendChild(content);
    return wrapper;
  }

  /* ============================================================
     Markdown 渲染(含代码高亮 + 复制按钮 + 数学公式)
     ============================================================ */
  function renderMarkdown(text) {
    if (!text) return "";
    // 使用 marked 解析
    let html;
    try {
      if (window.marked) {
        marked.setOptions({ breaks: true, gfm: true });
        html = marked.parse(text);
      } else {
        html = "<p>" + escapeHtml(text).replace(/\n/g, "<br>") + "</p>";
      }
    } catch {
      html = "<p>" + escapeHtml(text).replace(/\n/g, "<br>") + "</p>";
    }

    // 通过临时容器解析,以便给代码块加复制按钮
    const temp = document.createElement("div");
    temp.innerHTML = html;

    temp.querySelectorAll("pre").forEach((pre) => {
      const codeEl = pre.querySelector("code");
      if (!codeEl) return;

      let lang = "";
      const classMatch = (codeEl.className || "").match(/language-(\w+)/);
      if (classMatch) lang = classMatch[1];

      if (window.hljs) {
        try { hljs.highlightElement(codeEl); } catch {}
      }

      const wrapper = document.createElement("div");
      wrapper.className = "code-block";

      const header = document.createElement("div");
      header.className = "code-header";
      const langLabel = document.createElement("span");
      langLabel.textContent = lang || "text";
      const copyBtn = document.createElement("button");
      copyBtn.className = "code-copy-btn";
      copyBtn.textContent = "📋 复制";
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(codeEl.textContent);
        copyBtn.textContent = "✓ 已复制";
        setTimeout(() => (copyBtn.textContent = "📋 复制"), 1500);
      });
      header.appendChild(langLabel);
      header.appendChild(copyBtn);

      pre.replaceWith(wrapper);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    });

    return temp.innerHTML;
  }

  /* ============================================================
     发送消息
     ============================================================ */
  async function sendMessage() {
    if (state.isGenerating) return;

    const input = $("input");
    const text = input.value.trim();
    if (!text) return;

    // 检查 API 密钥
    if (!ChatAPI.getApiKey()) {
      toast("请先在设置中填写 API 密钥", "error");
      openSettings();
      return;
    }

    // 确保有会话
    if (!getCurrentConversation()) newConversation();
    const conv = getCurrentConversation();

    // 添加用户消息
    const userMsg = { id: uid(), role: "user", content: text, createdAt: now() };
    conv.messages.push(userMsg);

    // 自动生成对话标题(取第一条用户消息前 20 字)
    if (conv.messages.length === 1 && conv.title === "新对话") {
      conv.title = text.slice(0, 20) + (text.length > 20 ? "…" : "");
      renderSidebar();
    }

    // 清空输入框
    input.value = "";
    autoResize();

    saveConversations();
    renderMessages();

    // 发起请求
    await generateResponse();
  }

  /* ============================================================
     生成 AI 回复(流式)
     ============================================================ */
  async function generateResponse() {
    const conv = getCurrentConversation();
    if (!conv) return;

    // 构建 AI 占位消息
    const aiMsg = {
      id: uid(),
      role: "assistant",
      content: "",
      createdAt: now(),
    };
    conv.messages.push(aiMsg);
    const msgEl = createMessageElement(aiMsg);
    $("messages").appendChild(msgEl);
    scrollToBottom();

    // 添加打字光标
    const mdBody = msgEl.querySelector(".markdown-body");
    mdBody.classList.add("typing-cursor");

    setGenerating(true);
    state.abortController = new AbortController();

    await ChatAPI.chatStream({
      messages: conv.messages
        .filter((m) => m.id !== aiMsg.id)
        .map((m) => ({ role: m.role, content: m.content })),
      signal: state.abortController.signal,

      onToken: (token) => {
        aiMsg.content += token;
        mdBody.innerHTML = renderMarkdown(aiMsg.content);
        mdBody.classList.add("typing-cursor");
        scrollToBottom();
      },

      onDone: () => {
        mdBody.classList.remove("typing-cursor");
        saveConversations();
        setGenerating(false);
        state.abortController = null;
      },

      onError: (err) => {
        aiMsg.error = true;
        aiMsg.content = "❌ 生成失败:" + (err.message || String(err)) +
          "\n\n请检查:\n• API 密钥是否正确\n• 接口地址是否可达\n• 模型名称是否有效";
        mdBody.classList.remove("typing-cursor");
        mdBody.innerHTML = renderMarkdown(aiMsg.content);
        msgEl.classList.add("error");
        saveConversations();
        setGenerating(false);
        state.abortController = null;
      },
    });
  }

  /* ============================================================
     停止生成
     ============================================================ */
  function stopGeneration() {
    if (state.abortController) {
      state.abortController.abort();
      toast("已停止生成");
    }
  }

  /* ============================================================
     重新生成(删除最后一条 AI 回复后重新请求)
     ============================================================ */
  async function regenerateMessage(msgId) {
    if (state.isGenerating) return;
    const conv = getCurrentConversation();
    if (!conv) return;

    const idx = conv.messages.findIndex((m) => m.id === msgId);
    if (idx < 0) return;

    // 删除该 AI 消息及其后所有消息
    conv.messages.splice(idx);
    saveConversations();
    renderMessages();
    await generateResponse();
  }

  /* ============================================================
     删除单条消息
     ============================================================ */
  function deleteMessage(msgId) {
    const conv = getCurrentConversation();
    if (!conv) return;
    conv.messages = conv.messages.filter((m) => m.id !== msgId);
    saveConversations();
    renderMessages();
  }

  /* ============================================================
     UI 状态
     ============================================================ */
  function setGenerating(val) {
    state.isGenerating = val;
    $("btnSend").hidden = val;
    $("btnStop").hidden = !val;
    $("input").disabled = val;
  }

  function scrollToBottom() {
    const el = $("messages");
    el.scrollTop = el.scrollHeight;
  }

  function autoResize() {
    const input = $("input");
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 200) + "px";
  }

  function updateModelDisplay() {
    $("modelDisplay").textContent = "模型: " + ChatAPI.getModel();
  }

  /* ============================================================
     主题切换
     ============================================================ */
  function initTheme() {
    const saved = localStorage.getItem(K.THEME) || "light";
    setTheme(saved);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(K.THEME, theme);
    const btn = $("btnToggleTheme");
    btn.textContent = theme === "dark" ? "☀" : "🌙";
    // 同步代码高亮主题
    const hljsLink = $("hljs-theme");
    hljsLink.href = theme === "dark"
      ? "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github-dark.min.css"
      : "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css";
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "light" : "dark");
  }

  /* ============================================================
     设置面板
     ============================================================ */
  function openSettings() {
    const m = $("settingsModal");
    m.hidden = false;
    $("settingApiKey").value = ChatAPI.getApiKey();
    $("settingApiBase").value = ChatAPI.getApiBase();
    $("settingModel").value = ChatAPI.getModel();
    $("settingTemperature").value = ChatAPI.getTemperature();
    $("tempValue").textContent = ChatAPI.getTemperature();
    $("settingMaxTokens").value = ChatAPI.getMaxTokens();
    $("settingSystemPrompt").value = ChatAPI.getSystemPrompt();

    // 填充模型下拉预设
    const dl = $("modelList");
    dl.innerHTML = "";
    CONFIG.MODELS.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      dl.appendChild(opt);
    });
  }

  function closeSettings() {
    $("settingsModal").hidden = true;
  }

  function saveSettings() {
    localStorage.setItem(K.API_KEY, $("settingApiKey").value.trim());
    localStorage.setItem(K.API_BASE, $("settingApiBase").value.trim() || CONFIG.DEFAULT_API_BASE);
    localStorage.setItem(K.MODEL, $("settingModel").value.trim() || CONFIG.DEFAULT_MODEL);
    localStorage.setItem(K.TEMPERATURE, $("settingTemperature").value);
    localStorage.setItem(K.MAX_TOKENS, $("settingMaxTokens").value);
    localStorage.setItem(K.SYSTEM_PROMPT, $("settingSystemPrompt").value);
    closeSettings();
    updateModelDisplay();
    toast("设置已保存", "success");
  }

  function clearAllData() {
    if (!confirm("确定要清除所有本地数据吗?\n包括所有对话记录和设置,此操作不可撤销。")) return;
    localStorage.clear();
    state.conversations = [];
    state.currentId = null;
    renderSidebar();
    renderMessages();
    closeSettings();
    initTheme();
    updateModelDisplay();
    toast("所有数据已清除");
  }

  /* ============================================================
     事件绑定
     ============================================================ */
  function bindEvents() {
    // 发送
    $("btnSend").addEventListener("click", sendMessage);
    $("btnStop").addEventListener("click", stopGeneration);

    // 输入框
    const input = $("input");
    input.addEventListener("input", autoResize);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // 新建对话
    $("btnNewChat").addEventListener("click", () => {
      if (state.isGenerating) stopGeneration();
      newConversation();
      input.focus();
    });

    // 侧边栏切换
    $("btnToggleSidebar").addEventListener("click", () => {
      $("sidebar").classList.toggle("open");
    });

    // 主题切换
    $("btnToggleTheme").addEventListener("click", toggleTheme);

    // 设置
    $("btnSettings").addEventListener("click", openSettings);
    $("btnCloseSettings").addEventListener("click", closeSettings);
    $("settingsModal").addEventListener("click", (e) => {
      if (e.target === $("settingsModal")) closeSettings();
    });
    $("btnSaveSettings").addEventListener("click", saveSettings);
    $("btnClearData").addEventListener("click", clearAllData);

    // 密码可见切换
    $("btnTogglePwd").addEventListener("click", () => {
      const inp = $("settingApiKey");
      inp.type = inp.type === "password" ? "text" : "password";
    });

    // 温度滑块实时显示
    $("settingTemperature").addEventListener("input", (e) => {
      $("tempValue").textContent = e.target.value;
    });
  }

  /* ============================================================
     初始化
     ============================================================ */
  function init() {
    loadState();
    initTheme();
    bindEvents();
    updateModelDisplay();

    if (!getCurrentConversation() && state.conversations.length === 0) {
      newConversation();
    } else if (!getCurrentConversation()) {
      state.currentId = state.conversations[0].id;
      saveCurrentId();
    }

    renderSidebar();
    renderMessages();
    $("input").focus();

    // 首次使用提示
    if (!ChatAPI.getApiKey()) {
      setTimeout(() => {
        toast("欢迎使用!请点击右上角 ⚙ 设置 API 密钥", "success");
      }, 500);
    }
  }

  // DOM 加载完成后启动
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
