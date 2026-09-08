# AI Studio Proxy Server

[![Stargazers over time](https://starchart.cc/CJackHwang/AIstudioProxyAPI.svg?variant=adaptive)](https://starchart.cc/CJackHwang/AIstudioProxyAPI)
### Stargazers over time

---

[点击查看项目使用演示视频](https://drive.google.com/file/d/1efR-cNG2CNboNpogHA1ASzmx45wO579p/view?usp=drive_link)

这是一个Node.js+Playwright服务器，通过模拟 OpenAI API 的方式来访问 Google AI Studio 网页版，服务器无缝交互转发gemini对话。这使得兼容 OpenAI API 的客户端（如 Open WebUI, NextChat 等）可以使用 AI Studio 的无限额度及能力


## ✋ 免责声明

使用本项目即表示您已完整阅读、理解并同意本免责声明的全部内容。
本项目通过自动化脚本（Playwright）与 Google AI Studio 网页版进行交互。这种自动化访问网页的方式可能违反 Google AI Studio 或相关 Google 服务的用户协议或服务条款（Terms of Service）。不当使用本项目可能导致您的 Google 账号受到警告、功能限制、暂时或永久封禁等处罚。项目作者及贡献者对此不承担任何责任。
由于本项目依赖于 Google AI Studio 网页的结构和前端代码，Google 随时可能更新或修改其网页，这可能导致本项目的功能失效、不稳定或出现未知错误。项目作者及贡献者无法保证本项目的持续可用性或稳定性。
本项目并非 Google 或 OpenAI 的官方项目或合作项目。它是一个完全独立的第三方工具。项目作者与 Google 和 OpenAI 没有任何关联。
本项目按"现状"（AS IS）提供，不提供任何明示或暗示的保证，包括但不限于适销性、特定用途的适用性及不侵权的保证。您理解并同意自行承担使用本项目可能带来的所有风险。
在任何情况下，项目作者或贡献者均不对因使用或无法使用本项目而产生的任何直接、间接、附带、特殊、惩罚性或后果性的损害承担责任。
使用本项目，即视为您已完全理解并接受本免责声明的全部条款。如果您不同意本声明的任何内容，请立即停止使用本项目。


## ✨ 特性

*   **OpenAI API 兼容**: 提供 `/v1/chat/completions` 和 `/v1/models` 端点，兼容大多数 OpenAI 客户端。
*   **流式响应**: 支持 `stream=true`，实现打字机效果。
*   **非流式响应**: 支持 `stream=false`，一次性返回完整 JSON 响应。
*   **系统提示词 (System Prompt)**: 支持通过请求体中的 `messages` 数组的 `system` 角色或额外的 `system_prompt` 字段传递系统提示词。
*   **内部 Prompt 优化**: 自动包装用户输入，指导 AI Studio 输出特定格式（流式为 Markdown 代码块，非流式为 JSON），并包含起始标记 `<<<START_RESPONSE>>>` 以便解析。
*   **自动连接脚本 (`auto_connect_aistudio.cjs`)**:
    *   自动查找并启动 Chrome/Chromium 浏览器，开启调试端口，**并设置特定窗口宽度 (460px)** 以优化布局。
    *   自动检测并尝试连接已存在的 Chrome 调试实例。
    *   提供交互式选项，允许用户选择连接现有实例或自动结束冲突进程。
    *   自动查找或打开 AI Studio 的 `New chat` 页面。
    *   自动启动 `server.cjs`。
*   **服务端 (`server.cjs`)**:
    *   连接到由 `auto_connect_aistudio.cjs` 管理的 Chrome 实例。
    *   **自动清空上下文**: 当检测到来自客户端的请求可能是"新对话"时（基于消息历史长度），自动模拟点击 AI Studio 页面上的"Clear chat"按钮及其确认对话框，并验证清空效果，以实现更好的会话隔离。
    *   处理 API 请求，通过 Playwright 操作 AI Studio 页面。
    *   解析 AI Studio 的响应，提取有效内容。
    *   提供简单的 Web UI (`/`) 进行基本测试。
    *   提供健康检查端点 (`/health`)。
*   **错误快照**: 在 Playwright 操作、响应解析或**清空聊天**出错时，自动在 `errors` 目录下保存页面截图和 HTML，方便调试。
*   **依赖检测**: 两个脚本在启动时都会检查所需依赖，并提供安装指导。
*   **跨平台设计**: 旨在支持 macOS, Linux 和 Windows (WSL 推荐)。

## ⚠️ 重要提示

*   **非官方项目**: 本项目与 Google 无关，依赖于对 AI Studio Web 界面的自动化操作，可能因 AI Studio 页面更新而失效。
*   **自动清空功能的脆弱性**: 自动清空上下文的功能依赖于精确的 UI 元素选择器 (`CLEAR_CHAT_BUTTON_SELECTOR`, `CLEAR_CHAT_CONFIRM_BUTTON_SELECTOR` 在 `server.cjs` 中)。如果 AI Studio 页面结构发生变化，此功能可能会失效。届时需要更新这些选择器。
*   **不支持历史编辑/分叉**: 即使实现了新对话的上下文清空，本代理仍然无法支持客户端进行历史消息编辑并从该点重新生成对话的功能。AI Studio 内部维护的对话历史是线性的。
*   **固定窗口宽度**: `auto_connect_aistudio.cjs` 会以固定的宽度 (460px) 启动 Chrome 窗口，以确保清空按钮可见。
*   **安全性**: 启动 Chrome 时开启了远程调试端口 (默认为 `8848`)，请确保此端口仅在受信任的网络环境中使用，或通过防火墙规则限制访问。切勿将此端口暴露到公网。
*   **稳定性**: 由于依赖浏览器自动化，其稳定性不如官方 API。长时间运行或频繁请求可能导致页面无响应或连接中断，可能需要重启浏览器或服务器。
*   **AI Studio 限制**: AI Studio 本身可能有请求频率限制、内容策略限制等，代理服务器无法绕过这些限制。
*   **参数配置**: **请注意，像模型选择 (例如切换 Gemini 不同版本)、温度 (Temperature)、输出长度限制等参数，需要您直接在 AI Studio 页面的右侧设置面板中进行调整。本代理服务器目前不处理或转发这些通过 API 请求传递的参数。** 您需要预先在 AI Studio Web UI 中设置好所需的模型和参数。

## 🚀 开始使用

### 1. 先决条件

*   **Node.js**: v16 或更高版本。
*   **NPM / Yarn / PNPM**: 用于安装依赖。
*   **Google Chrome / Chromium**: 需要安装浏览器本体。
*   **Google AI Studio 账号**: 并能正常访问和使用。

### 2. 安装

1.  **克隆仓库**: 
    ```bash
    git clone https://github.com/CJackHwang/AIstudioProxyAPI
    cd AIstudioProxyAPI
    ```

2.  **安装依赖**: 
    根据你的包管理器选择：
    ```bash
    npm install
    # 或
    yarn install
    # 或
    pnpm install
    ```
    这将安装 `express`, `cors`, `playwright`, `@playwright/test`。(`@playwright/test` 主要用于 `server.cjs` 中的 `expect` 断言功能)。

### 3. 运行

现在，只需要运行一个脚本即可启动所有服务：

```bash
node auto_connect_aistudio.cjs
```

这个脚本会执行以下操作：

1.  **检查依赖**: 确认 `express`, `cors`, `playwright`, `@playwright/test` 已安装，且 `server.cjs` 文件存在。
2.  **检查 Chrome 调试端口 (`8848`)** 并 **设置窗口大小**:
    *   **如果端口空闲**:
        *   它会提示您先手动关闭其他可能干扰的 Chrome 实例。
        *   然后尝试自动查找并启动一个新的 Chrome 实例（**宽度设置为 460px**），并打开远程调试端口。
    *   **如果端口被占用**:
        *   它会提示端口已被占用，并询问您如何处理（连接现有实例或尝试清理端口后启动新实例）。
3.  **连接 Playwright**: 尝试连接到 Chrome 的调试端口。
4.  **管理 AI Studio 页面**: 查找或打开 AI Studio 的 `New chat` 页面，并尝试置于前台。
5.  **启动 API 服务器**: 如果以上步骤成功，脚本会自动在后台启动 `node server.cjs`。

当 `server.cjs` 成功启动并连接到 Playwright 后，您将在终端看到类似以下的输出（来自 `server.cjs`）：

```
=============================================================
          🚀 AI Studio Proxy Server (vX.XX - Queue & Auto Clear) 🚀
=============================================================
🔗 监听地址: http://localhost:2048
   - Web UI (测试): http://localhost:2048/
   - API 端点:   http://localhost:2048/v1/chat/completions
   - 模型接口:   http://localhost:2048/v1/models
   - 健康检查:   http://localhost:2048/health
-------------------------------------------------------------
✅ Playwright 连接成功，服务已准备就绪！
-------------------------------------------------------------
```
*(请注意版本号可能会更新)*

此时，代理服务已准备就绪。

### 4. 配置客户端 (以 Open WebUI 为例)

1.  打开 Open WebUI。
2.  进入 "设置" -> "连接"。
3.  在 "模型" 部分，点击 "添加模型"。
4.  **模型名称**: 输入你想要的名字，例如 `aistudio-gemini`。
5.  **API 基础 URL**: 输入代理服务器的地址，例如 `http://localhost:2048/v1` (注意包含 `/v1`)。
6.  **API 密钥**: 留空或输入任意字符 (服务器不验证)。
7.  保存设置。
8.  现在，你应该可以在 Open WebUI 中选择 `aistudio-gemini` 模型并开始聊天了。

## 💻 多平台指南

*   **macOS**:
    *   `auto_connect_aistudio.cjs` 通常能自动找到 Chrome。
    *   防火墙可能会提示是否允许 Node.js 接受网络连接，请允许。
*   **Linux**:
    *   确保已安装 `google-chrome-stable` 或 `chromium-browser`。
    *   如果脚本找不到 Chrome，你可能需要修改 `auto_connect_aistudio.cjs` 中的 `getChromePath` 函数，或者创建一个符号链接。
    *   某些 Linux 发行版可能需要安装额外的 Playwright 依赖库，参考 [Playwright Linux 文档](https://playwright.dev/docs/intro#system-requirements)。
*   **Windows**:
    *   **强烈建议使用 WSL (Windows Subsystem for Linux)**。在 WSL 中按照 Linux 指南操作通常更顺畅。
    *   **直接在 Windows 上运行 (不推荐)**:
        *   `auto_connect_aistudio.cjs` 可能需要手动修改 `getChromePath` 函数来指定 Chrome 的路径 (`C:\Program Files\...\chrome.exe`)。注意路径中的反斜杠可能需要转义。
        *   防火墙设置需要允许 Node.js 和 Chrome 监听和连接端口。
        *   由于文件系统和权限差异，可能会遇到未知问题，例如端口检查或进程结束操作失败。

## 🔧 故障排除

*   **`auto_connect_aistudio.cjs` 启动失败或报错**:
    *   **依赖未找到**: 确保按照提示运行了 `npm install` 或等效命令。
    *   **Chrome 路径找不到**: 确认 Chrome/Chromium 已安装，并根据需要修改 `auto_connect_aistudio.cjs` 中的 `getChromePath` 函数。
    *   **端口被占用且无法自动清理**: 根据脚本提示，手动查找并结束占用 `8848` 端口的进程。
    *   **连接 Playwright 超时**: 确认 Chrome 是否已成功启动并响应，防火墙是否阻止本地连接 `127.0.0.1:8848`。
    *   **打开/导航 AI Studio 页面失败**: 检查网络连接，尝试手动在浏览器中打开 `https://aistudio.google.com/prompts/new_chat` 并完成登录。
    *   **窗口大小问题**: 如果 460px 宽度不适用于您的显示器或导致其他问题，可以修改 `auto_connect_aistudio.cjs` 中的 `--window-size` 参数。
*   **`server.cjs` 启动时提示端口被占用 (`EADDRINUSE`)**:
    *   检查是否有其他程序 (包括旧的服务器实例) 正在使用 `2048` 端口 (或你在 `server.cjs` 中设置的 `SERVER_PORT`)。关闭冲突程序或更改端口配置。
*   **服务器日志显示 Playwright 未就绪或连接失败 (在 `server.cjs` 启动后)**:
    *   这通常意味着 `auto_connect_aistudio.cjs` 启动的 Chrome 实例意外关闭或无响应了。
    *   确保 Chrome 窗口没有被关闭，AI Studio 页面没有崩溃。
    *   尝试关闭所有相关进程（`node` 和 `chrome`），然后重新运行 `node auto_connect_aistudio.cjs`。
    *   检查 `errors` 目录下是否有截图和 HTML 文件，它们可能包含 AI Studio 页面的错误信息或状态。
*   **客户端 (如 Open WebUI) 无法连接或请求失败**: 
    *   确认客户端配置的 API 基础 URL 是否正确 (`http://localhost:2048/v1`)。
    *   检查 `server.cjs` 运行的终端是否有错误输出。
    *   确保客户端和服务器在同一个网络中，且防火墙没有阻止从客户端到服务器 `2048` 端口的连接。
*   **API 请求返回 5xx 错误**: 
    *   **503 Service Unavailable / Playwright not ready**: 通常是 `server.cjs` 无法连接到 Chrome (见上文)。
    *   **504 Gateway Timeout**: 请求处理时间超过了 `server.cjs` 中设置的 `RESPONSE_COMPLETION_TIMEOUT` (默认为 5 分钟)。可能是 AI Studio 响应慢或卡住了。
    *   **502 Bad Gateway / AI Studio Error**: `server.cjs` 在 AI Studio 页面上检测到了错误提示 (例如 `toast` 消息)，或者无法正确解析 AI 的响应。检查 `errors` 目录下的快照。
    *   **500 Internal Server Error**: `server.cjs` 内部发生未捕获的错误。检查服务器日志和 `errors` 快照。
*   **AI 回复不完整、格式错误或包含 `<<<START_RESPONSE>>>` 标记**: 
    *   AI Studio 的 Web UI 输出有时不稳定或格式与预期不符。服务器尽力解析，但可能失败。
    *   非流式请求：如果返回的 JSON 中缺少 `response` 字段或无法解析，服务器可能返回空内容或原始 JSON 字符串。检查 `errors` 快照确认 AI Studio 页面的实际输出。
    *   流式请求：如果 AI 未按预期输出 Markdown 代码块或起始标记，流式传输可能提前中断或包含非预期内容。
    *   这可能是项目本身的局限性，尝试调整 Prompt 或稍后重试。
*   **自动清空上下文失败**:
    *   服务器日志出现 "清空聊天记录或验证时出错" 或 "验证超时" 的警告。
    *   **原因**: 很可能是 AI Studio 网页更新导致 `server.cjs` 中的 `CLEAR_CHAT_BUTTON_SELECTOR` 或 `CLEAR_CHAT_CONFIRM_BUTTON_SELECTOR` 失效。
    *   **解决**:
        1.  检查 `errors` 目录下对应的错误快照 (截图和 HTML)。
        2.  使用浏览器开发者工具检查 AI Studio 页面上实际的"Clear chat"按钮和确认对话框中"Continue"按钮的 HTML 结构。
        3.  更新 `server.cjs` 文件顶部的这两个选择器常量。
    *   **原因**: 清空操作本身耗时超过了 `CLEAR_CHAT_VERIFY_TIMEOUT_MS` (默认为 5 秒)。
    *   **解决**: 如果网络或机器较慢，可以尝试在 `server.cjs` 中适当增加这个超时时间。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

[MIT](LICENSE) <!-- 你需要添加一个 MIT 许可证文件 --> 
