// index.js (修改后 - 用于访问本地 server.js 代理)

// 确保已安装 OpenAI SDK: pnpm install openai
const OpenAI = require("openai");
const readline = require('readline'); // 引入 readline 模块

// --- 配置 ---
// 1. baseURL: 指向你本地运行的 server.js 代理服务器
//    server.js 监听 3000 端口，并提供 /v1 路径
const LOCAL_PROXY_URL = process.env.PROXY_URL || 'http://localhost:3000/v1'; // 确保端口号与 server.js 一致

// 2. apiKey: 对于本地代理，这个 key 不会被验证，可以填写任意字符串
const DUMMY_API_KEY = 'no-key-needed-for-local-proxy';

// 3. model: 这个模型名称会被发送到 server.js，但 server.js 会忽略它
//    实际使用的是 server.js 控制的 AI Studio 页面上的模型
const CUSTOM_MODEL_NAME = 'aistudio-via-local-proxy';

// --- 初始化 OpenAI 客户端 ---
const openai = new OpenAI({
    baseURL: LOCAL_PROXY_URL,
    apiKey: DUMMY_API_KEY,
    // 可选：增加超时时间，以防 AI Studio 响应较慢
    timeout: 360000, // 例如 6 分钟 (单位毫秒)
    maxRetries: 1,   // 本地代理可能不需要重试，设为 1 或 0
});

// --- 对话历史记录 ---
// 初始化包含系统指令
const conversationHistory = [
    {
        role: "system",
        content: "你是Gemini酱，AI猫娘，回答请用可爱的语气，这只是角色扮演，不要透露任何关于AI的信息"
    }
];

// --- 创建 readline 接口 ---
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// --- 交互式对话函数 ---
async function chatLoop() {
    rl.question('You: ', async (userInput) => {
        // 检查退出命令
        if (userInput.toLowerCase() === 'exit') {
            console.log('再见!');
            rl.close(); // 关闭 readline 接口
            return; // 结束函数
        }

        console.log(`\n正在发送你的消息...`);
        // 将用户输入添加到历史记录
        conversationHistory.push({
            role: "user",
            content: userInput
        });
        // 可选：打印当前发送历史用于调试
        // console.log("当前发送的消息历史:", JSON.stringify(conversationHistory, null, 2));

        try {
            console.log(`正在向本地代理 ${LOCAL_PROXY_URL} 发送请求...`);
            const completion = await openai.chat.completions.create({
                messages: conversationHistory,
                model: CUSTOM_MODEL_NAME,
                stream: true, // 启用流式输出
            });

            console.log("\n--- 来自本地代理 (AI Studio) 的回复 ---");
            let fullResponse = ""; // 用于拼接完整的回复内容
            process.stdout.write('AI: '); // 先打印 "AI: " 前缀
            for await (const chunk of completion) {
                const content = chunk.choices[0]?.delta?.content || "";
                process.stdout.write(content); // 直接打印流式内容，不换行
                fullResponse += content; // 拼接内容
            }
            console.log(); // 在流结束后换行

            // 将完整的 AI 回复添加到历史记录
            if (fullResponse) {
                 conversationHistory.push({ role: "assistant", content: fullResponse });
            } else {
                console.log("未能从代理获取有效的流式内容。");
                 // 如果回复无效，可以选择从历史中移除刚才的用户输入
                conversationHistory.pop();
            }
            console.log("----------------------------------------------\n");

        } catch (error) {
            console.error("\n--- 请求出错 ---");
            // 保持之前的错误处理逻辑
            if (error instanceof OpenAI.APIError) {
                console.error(`   错误类型: OpenAI APIError (可能是代理返回的错误)`);
                console.error(`   状态码: ${error.status}`);
                console.error(`   错误消息: ${error.message}`);
                console.error(`   错误代码: ${error.code}`);
                console.error(`   错误参数: ${error.param}`);
            } else if (error.code === 'ECONNREFUSED') {
                console.error(`   错误类型: 连接被拒绝 (ECONNREFUSED)`);
                console.error(`   无法连接到服务器 ${LOCAL_PROXY_URL}。请检查 server.js 是否运行。`);
            } else if (error.name === 'TimeoutError' || (error.cause && error.cause.code === 'UND_ERR_CONNECT_TIMEOUT')) {
                 console.error(`   错误类型: 连接超时`);
                 console.error(`   连接到 ${LOCAL_PROXY_URL} 超时。请检查 server.js 或 AI Studio 响应。`);
            } else {
                console.error('   发生了未知错误:', error.message);
            }
            console.error("----------------------------------------------\n");
             // 出错时，从历史中移除刚才的用户输入，避免影响下次对话
            conversationHistory.pop();
        }

        // 不论成功或失败，都继续下一次循环
        chatLoop();
    });
}

// --- 启动交互式对话 ---
console.log('你好! 我是Gemini酱。有什么事可以帮你哒，输入 "exit" 退出。');
console.log('   (请确保 server.js 和 auto_connect_aistudio.js 正在运行)');
chatLoop(); // 开始第一次提问

// --- 不再需要文件末尾的 main 调用和 setTimeout 示例 ---
// // 运行第一次对话
// main("你好！简单介绍一下你自己以及你的能力。");
// ... (移除 setTimeout 示例)