// test_multi.cjs - 连续多轮请求自动化测试脚本
const OpenAI = require('openai');

const PROXY_URL = process.env.PROXY_URL || 'http://localhost:3000/v1';
const MODEL_NAME = process.env.MODEL || 'gemini-2.5-flash';

const client = new OpenAI({
    baseURL: PROXY_URL,
    apiKey: 'test-key',
    timeout: 120000,
});

// 测试用例集
const testCases = [
    {
        title: '测试 1: 基础常识问答 (非流式)',
        stream: false,
        prompt: '请用一句话回答：中国首都是哪里？'
    },
    {
        title: '测试 2: 数学简答 (非流式)',
        stream: false,
        prompt: '计算：15 * 8 等于多少？直接给数字。'
    },
    {
        title: '测试 3: 创意写作 (流式)',
        stream: true,
        prompt: '请写一首描写秋天景色的七言绝句。'
    },
    {
        title: '测试 4: 代码生成 (流式)',
        stream: true,
        prompt: '写一个 Python 快速排序函数，附带简短注释。'
    }
];

async function runTest(testCase, index) {
    console.log(`\n============================================================`);
    console.log(`▶ [${index + 1}/${testCases.length}] ${testCase.title}`);
    console.log(`❓ 提示词: "${testCase.prompt}"`);
    console.log(`⚡ 模式: ${testCase.stream ? '流式传输 (Streaming)' : '完整返回 (Non-streaming)'}`);
    console.log(`------------------------------------------------------------`);

    const startTime = Date.now();
    try {
        if (testCase.stream) {
            process.stdout.write('🤖 回复: ');
            const stream = await client.chat.completions.create({
                model: MODEL_NAME,
                messages: [{ role: 'user', content: testCase.prompt }],
                stream: true,
            });

            let fullText = '';
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta?.content || '';
                process.stdout.write(delta);
                fullText += delta;
            }
            console.log(); // 换行
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`⏱️ 耗时: ${elapsed} 秒 | 状态: ✅ 成功 (返回字符数: ${fullText.length})`);
            return { success: true, elapsed: parseFloat(elapsed), len: fullText.length };
        } else {
            const response = await client.chat.completions.create({
                model: MODEL_NAME,
                messages: [{ role: 'user', content: testCase.prompt }],
                stream: false,
            });

            const content = response.choices[0]?.message?.content || '';
            console.log(`🤖 回复: ${content.trim()}`);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`⏱️ 耗时: ${elapsed} 秒 | 状态: ✅ 成功 (返回字符数: ${content.length})`);
            return { success: true, elapsed: parseFloat(elapsed), len: content.length };
        }
    } catch (err) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`❌ 请求失败 (耗时 ${elapsed} 秒):`, err.message);
        return { success: false, elapsed: parseFloat(elapsed), error: err.message };
    }
}

async function main() {
    console.log(`🚀 开始执行 AI Studio Proxy 多轮连续请求测试`);
    console.log(`🔗 目标代理地址: ${PROXY_URL}`);
    console.log(`📦 测试用例数: ${testCases.length}`);

    const results = [];
    for (let i = 0; i < testCases.length; i++) {
        const res = await runTest(testCases[i], i);
        results.push(res);
        // 每轮测试间隔 1 秒
        if (i < testCases.length - 1) {
            console.log(`⏸️ 等待 1 秒进行下一轮...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log(`\n============================================================`);
    console.log(`📊 测试汇总统计`);
    console.log(`============================================================`);
    const successCount = results.filter(r => r.success).length;
    const totalElapsed = results.reduce((acc, r) => acc + r.elapsed, 0).toFixed(2);
    const avgElapsed = (totalElapsed / results.length).toFixed(2);

    console.log(`总测试项: ${results.length} | 成功: ${successCount} | 失败: ${results.length - successCount}`);
    console.log(`总耗时: ${totalElapsed} 秒 | 平均每轮耗时: ${avgElapsed} 秒`);

    results.forEach((r, idx) => {
        const status = r.success ? '✅ PASS' : '❌ FAIL';
        console.log(`  - 测试 ${idx + 1}: ${status} (${r.elapsed}s)`);
    });
    console.log(`============================================================\n`);
}

main().catch(err => {
    console.error('测试脚本执行异常:', err);
    process.exit(1);
});
