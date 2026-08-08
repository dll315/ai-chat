// ============================================================
//  config.js  —  AI 聊天程序配置
// ------------------------------------------------------------
//  说明:
//   · 所有用户配置(密钥 / 模型 / 系统提示)默认保存在浏览器
//     localStorage 中,刷新或关闭后仍然保留。
//   · DEFAULT_API_BASE 为官方 OpenAI 兼容接口地址,你也可
//     以替换成任何兼容 OpenAI Chat Completions 协议的第三方
//     服务(如 Azure OpenAI、DeepSeek、Moonshot、本地 Ollama
//     的 /v1 端点等),只需修改 BASE_URL 即可。
// ============================================================

const CONFIG = {
  // ---- OpenAI 兼容接口地址 ----
  // 官方: https://api.openai.com/v1
  // DeepSeek: https://api.deepseek.com/v1
  // Moonshot: https://api.moonshot.cn/v1
  // 本地 Ollama: http://localhost:11434/v1
  DEFAULT_API_BASE: "https://api.siliconflow.cn/v1",

  // ---- 预设模型列表(可在界面里自由切换 / 手动输入) ----
  MODELS: [
    { id: "deepseek-ai/DeepSeek-V3",                  label: "DeepSeek V3" },
    { id: "deepseek-ai/DeepSeek-R1",                  label: "DeepSeek R1" },
    { id: "Qwen/Qwen2.5-72B-Instruct",                label: "Qwen2.5 72B" },
    { id: "Qwen/Qwen2.5-7B-Instruct",                 label: "Qwen2.5 7B" },
    { id: "meta-llama/Llama-3.3-70B-Instruct",        label: "Llama 3.3 70B" },
    { id: "THUDM/glm-4-9b-chat",                      label: "GLM-4 9B" },
  ],

  DEFAULT_MODEL: "deepseek-ai/DeepSeek-V3",

  // ---- 生成参数 ----
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 2048,

  // ---- 默认系统提示词 ----
  DEFAULT_SYSTEM_PROMPT:
    "你是一个乐于助人的 AI 助手。请用简洁、准确、友好的方式回答问题。",

  // ---- 内置 API 密钥(部署时使用,用户可在设置中覆盖) ----
  // ⚠️ 警告: 此密钥在前端代码中公开可见, 任何人都可通过浏览器开发者工具查看。
  // 仅适合个人使用或额度较小场景。生产环境请使用后端代理。
  EMBEDDED_API_KEY: "sk-hhfnqnzivabickucybsnmuvirwsgwqienchlubuweqxkyuoa",

  // ---- 本地存储键名 ----
  STORAGE_KEYS: {
    API_KEY:        "aichat_api_key",
    API_BASE:       "aichat_api_base",
    MODEL:          "aichat_model",
    TEMPERATURE:    "aichat_temperature",
    MAX_TOKENS:     "aichat_max_tokens",
    SYSTEM_PROMPT:  "aichat_system_prompt",
    CONVERSATIONS:  "aichat_conversations",
    CURRENT_CONV:   "aichat_current_conv",
    THEME:          "aichat_theme",
  },
};

// 把 CONFIG 暴露到全局
window.CONFIG = CONFIG;
