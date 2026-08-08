/* ============================================================
   api.js  —  AI 聊天 API 客户端
   ------------------------------------------------------------
   功能:
   · 兼容 OpenAI Chat Completions 协议(/v1/chat/completions)
   · 支持 SSE 流式输出(Streaming)
   · 支持手动终止生成(AbortController)
   · 自动读取本地存储的密钥 / 接口地址 / 模型
   ============================================================ */

const ChatAPI = (function () {
  const K = CONFIG.STORAGE_KEYS;

  /* ---------- 读取配置 ---------- */
  function getApiKey() {
    // 优先使用用户在设置中填写的密钥
    const userKey = localStorage.getItem(K.API_KEY);
    if (userKey && userKey.trim()) return userKey.trim();
    // 未填写则使用内置密钥(若有)
    if (CONFIG.EMBEDDED_API_KEY) return CONFIG.EMBEDDED_API_KEY;
    return "";
  }
  function getApiBase() {
    const userBase = localStorage.getItem(K.API_BASE);
    if (userBase && userBase.trim()) return userBase.trim();
    return CONFIG.DEFAULT_API_BASE;
  }
  function getModel()    { return localStorage.getItem(K.MODEL)   || CONFIG.DEFAULT_MODEL; }
  function getTemperature() {
    return parseFloat(localStorage.getItem(K.TEMPERATURE)) || CONFIG.DEFAULT_TEMPERATURE;
  }
  function getMaxTokens() {
    return parseInt(localStorage.getItem(K.MAX_TOKENS))   || CONFIG.DEFAULT_MAX_TOKENS;
  }
  function getSystemPrompt() {
    return localStorage.getItem(K.SYSTEM_PROMPT) || CONFIG.DEFAULT_SYSTEM_PROMPT;
  }

  /* ---------- 构建请求消息 ----------
   * messages: [{ role, content }, ...]
   * 会自动在开头插入系统提示词(若存在)
   */
  function buildMessages(messages) {
    const system = getSystemPrompt().trim();
    const result = [];
    if (system) result.push({ role: "system", content: system });
    for (const m of messages) result.push({ role: m.role, content: m.content });
    return result;
  }

  /* ---------- 非流式请求(一次性返回完整结果) ---------- */
  async function chatComplete(messages) {
    const res = await fetch(getApiBase() + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model: getModel(),
        messages: buildMessages(messages),
        temperature: getTemperature(),
        max_tokens: getMaxTokens(),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API 请求失败 (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  }

  /* ---------- 流式请求(SSE) ----------
   * messages:     会话消息数组
   * onToken:      每收到一个 token 时的回调
   * onDone:       完成时的回调
   * onError:      出错时的回调
   * signal:       AbortSignal,用于手动中止
   * 返回:         不返回内容,内容逐 token 通过 onToken 给出
   */
  async function chatStream({ messages, onToken, onDone, onError, signal }) {
    try {
      const res = await fetch(getApiBase() + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
          model: getModel(),
          messages: buildMessages(messages),
          temperature: getTemperature(),
          max_tokens: getMaxTokens(),
          stream: true,
        }),
        signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API 请求失败 (${res.status}): ${errText}`);
      }

      // 检查是否支持流式
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream") && !res.body) {
        // 降级:直接返回完整结果
        const data = await res.json();
        const content = data.choices[0].message.content;
        if (onToken) onToken(content);
        if (onDone) onDone();
        return;
      }

      // 读取 SSE 流
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 按行分割处理 SSE 数据
        const lines = buffer.split("\n");
        // 最后一行可能不完整,保留到 buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === "[DONE]") {
            if (onDone) onDone();
            return;
          }

          try {
            const json = JSON.parse(dataStr);
            const delta = json.choices?.[0]?.delta;
            if (delta && delta.content) {
              if (onToken) onToken(delta.content);
            }
          } catch (e) {
            // 忽略无法解析的行
          }
        }
      }

      if (onDone) onDone();
    } catch (err) {
      // 手动中止不算错误
      if (err.name === "AbortError") {
        if (onDone) onDone();
        return;
      }
      if (onError) onError(err);
    }
  }

  return {
    chatComplete,
    chatStream,
    getApiKey,
    getApiBase,
    getModel,
    getTemperature,
    getMaxTokens,
    getSystemPrompt,
  };
})();

window.ChatAPI = ChatAPI;
