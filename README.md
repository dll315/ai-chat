# 🤖 AI 聊天助手

一个功能全面、开箱即用的 AI 聊天 Web 应用。纯前端实现,无需后端服务器,直接用浏览器打开即可使用。

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 💬 **流式输出** | 实时逐字显示 AI 回复,体验流畅自然 |
| 📝 **多会话管理** | 新建 / 切换 / 删除对话,自动生成标题 |
| 🎨 **Markdown 渲染** | 支持标题、列表、表格、加粗、引用等 |
| 💻 **代码高亮** | 自动识别语言并高亮,一键复制代码 |
| 📐 **数学公式** | 支持 LaTeX 公式渲染(KaTeX) |
| 🌓 **明暗主题** | 一键切换深色 / 浅色模式,自动记忆 |
| ⚙️ **灵活配置** | API 密钥、模型、温度、Token 上限均可调 |
| 🔌 **多模型支持** | 兼容 OpenAI / DeepSeek / Moonshot / Ollama 等 |
| ⏹ **可控生成** | 随时停止 AI 输出 |
| 🔄 **重新生成** | 对回复不满意可一键重试 |
| 💾 **本地持久化** | 所有对话和设置保存在浏览器 localStorage |
| 📱 **响应式布局** | 完美适配桌面和移动端 |

---

## 🚀 快速开始

### 1. 获取项目

将所有文件放在同一目录下,结构如下:

```
New project/
├── index.html        # 主页面
├── css/
│   └── styles.css    # 样式表
└── js/
    ├── config.js     # 配置文件
    ├── api.js        # API 客户端
    └── app.js        # 主程序逻辑
```

### 2. 打开应用

直接用浏览器(推荐 Chrome / Edge)打开 `index.html` 即可。

### 3. 配置 API

1. 点击右上角 **⚙ 设置**
2. 填入你的 **API 密钥**(如 OpenAI 的 `sk-...`)
3. 确认 **API 接口地址**(默认为 OpenAI 官方地址)
4. 选择或输入 **模型名称**
5. 点击 **保存**

> 💡 密钥仅保存在你浏览器的 localStorage 中,不会上传任何服务器。

### 4. 开始聊天

在底部输入框输入消息,按 **Enter** 发送(**Shift + Enter** 换行)。

---

## 🔧 配置说明

### 支持的 API 服务商

本程序兼容所有遵循 **OpenAI Chat Completions** 协议的接口:

| 服务商 | API 接口地址 | 示例模型 |
|--------|-------------|---------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o`, `gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat`, `deepseek-reasoner` |
| Moonshot (月之暗面) | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| 本地 Ollama | `http://localhost:11434/v1` | `llama3`, `qwen2` |
| Azure OpenAI | `https://<资源名>.openai.azure.com/openai/deployments/<部署名>` | 部署名 |

### 生成参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| Temperature | 0.7 | 采样温度,越高越有创造性,越低越确定 |
| Max Tokens | 2048 | AI 单次回复的最大 Token 数 |
| System Prompt | — | 设定 AI 的角色和行为风格 |

---

## 📖 使用指南

### 基本操作

- **发送消息**:在输入框输入文字,按 Enter 或点击 ↑ 按钮
- **停止生成**:生成过程中点击 ⏹ 按钮
- **新建对话**:点击侧边栏「＋ 新建对话」
- **切换对话**:点击侧边栏的对话列表
- **删除对话**:鼠标悬停在对话上,点击 🗑 图标

### 消息操作

将鼠标悬停在 AI 回复上,会显示操作按钮:

- **📋 复制**:复制该回复的原始文本
- **🔄 重新生成**:删除当前回复并重新请求
- **🗑 删除**:删除该消息

### 代码块

AI 回复中的代码块带有语言标签和复制按钮:

- 点击 **📋 复制** 可一键复制代码
- 代码会自动语法高亮

### 主题切换

点击左下角的 🌙/☀ 图标切换明暗主题,偏好会自动保存。

---

## 🏗 技术架构

```
┌─────────────────────────────────────────┐
│              index.html                 │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │  Sidebar     │  │   Main Area      │  │
│  │  会话列表     │  │  ┌────────────┐  │  │
│  │             │  │  │ Messages    │  │  │
│  │  - 新建      │  │  │ 消息渲染区  │  │  │
│  │  - 会话1     │  │  └────────────┘  │  │
│  │  - 会话2     │  │  ┌────────────┐  │  │
│  │             │  │  │ Input      │  │  │
│  └─────────────┘  │  │ 输入区     │  │  │
│                   │  └────────────┘  │  │
│                   └──────────────────┘  │
└─────────────────────────────────────────┘

数据流向:
  输入 → app.js → api.js → fetch(SSE) → 逐 Token 回调 → 渲染
                                    ↑
                              config.js(配置)
                              localStorage(持久化)
```

### 文件说明

| 文件 | 职责 |
|------|------|
| `index.html` | 页面结构,引入 CDN 库(Marked / highlight.js / KaTeX) |
| `css/styles.css` | 全部样式,含 CSS 变量主题、响应式布局 |
| `js/config.js` | 默认配置、模型列表、存储键名 |
| `js/api.js` | API 客户端,封装流式 / 非流式请求 |
| `js/app.js` | 核心逻辑:会话管理、消息渲染、交互事件 |

### 外部依赖(CDN)

- [Marked](https://marked.js.org/) — Markdown 解析
- [highlight.js](https://highlightjs.org/) — 代码语法高亮
- [KaTeX](https://katex.org/) — 数学公式渲染

> 所有依赖通过 CDN 加载,使用时需联网。如需离线使用,可将库文件下载到本地。

---

## ❓ 常见问题

<details>
<summary><b>提示「API 请求失败」怎么办?</b></summary>

1. 检查 API 密钥是否正确
2. 确认接口地址拼写无误
3. 确认账号有足够余额或额度
4. 检查模型名称是否正确(不同服务商模型名不同)
5. 如果使用本地 Ollama,确保服务已启动且开启了跨域

</details>

<details>
<summary><b>数据保存在哪里?清除了浏览器数据会丢失吗?</b></summary>

所有对话和设置保存在浏览器的 localStorage 中。清除浏览器数据会删除所有内容。如需备份,可在浏览器控制台执行:

```js
copy(JSON.stringify({
  conversations: localStorage.getItem("aichat_conversations"),
  settings: {
    apiKey: localStorage.getItem("aichat_api_key"),
    model: localStorage.getItem("aichat_model"),
    systemPrompt: localStorage.getItem("aichat_system_prompt"),
  }
}));
```

</details>

<details>
<summary><b>支持哪些模型?</b></summary>

任何兼容 OpenAI Chat Completions API 的模型都可以使用。在设置中手动输入模型名称即可。

</details>

<details>
<summary><b>API 密钥安全吗?</b></summary>

密钥仅存储在你本机浏览器的 localStorage 中,请求直接从你的浏览器发送到 API 服务器,不经过任何中间服务器。但请注意:

- 不要在公共电脑上保存密钥
- 直接打开 HTML 文件时,密钥不会外泄

</details>

<details>
<summary><b>如何使用本地 Ollama?</b></summary>

1. 安装并启动 [Ollama](https://ollama.com/)
2. 拉取模型:`ollama pull qwen2` 或 `ollama pull llama3`
3. 在设置中:
   - API 接口地址:`http://localhost:11434/v1`
   - API 密钥:随意填(如 `ollama`)
   - 模型:`qwen2` 或 `llama3`

</details>

---

## 📄 License

MIT License — 自由使用、修改和分发。

---

> 🎯 本项目为纯前端实现,适合学习 AI 对话界面开发、快速搭建个人 AI 助手或作为更复杂应用的基础模板。
