#!/usr/bin/env node

// auto_connect_aistudio.js (v2.9 - Refined Launch & Page Handling + Beautified Output)

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// --- Configuration ---
const DEBUGGING_PORT = 8848;
const TARGET_URL = 'https://aistudio.google.com/prompts/new_chat'; // Target page
const SERVER_SCRIPT_FILENAME = 'server.cjs'; // Corrected script name
const CONNECTION_RETRIES = 5;
const RETRY_DELAY_MS = 4000;
const CONNECT_TIMEOUT_MS = 20000; // Timeout for connecting to CDP
const NAVIGATION_TIMEOUT_MS = 35000; // Increased timeout for page navigation
const CDP_ADDRESS = `http://127.0.0.1:${DEBUGGING_PORT}`;

// --- ANSI Colors ---
const RESET = '\x1b[0m';
const BRIGHT = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';

// --- Globals ---
const SERVER_SCRIPT_PATH = path.join(__dirname, SERVER_SCRIPT_FILENAME);
let playwright; // Loaded in checkDependencies

// --- 读取配置文件 ---
const configPath = path.join(__dirname, 'config.json');
let config = {};
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
}

// --- Platform-Specific Chrome Path ---
function getChromePath() {
    // 优先使用配置文件中的路径
    if (config.chromePath && config.chromePath.trim() !== '') {
        if (fs.existsSync(config.chromePath)) {
            return config.chromePath;
        }
    }
    
    // 回退到默认路径检测
    switch (process.platform) {
        case 'darwin':
            return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        case 'win32':
            // 尝试 Program Files 和 Program Files (x86)
            const winPaths = [
                path.join(process.env.ProgramFiles || '', 'Google\Chrome\Application\chrome.exe'),
                path.join(process.env['ProgramFiles(x86)'] || '', 'Google\Chrome\Application\chrome.exe')
            ];
            return winPaths.find(p => fs.existsSync(p));
        case 'linux':
            // 尝试常见的 Linux 路径
            const linuxPaths = [
                '/usr/bin/google-chrome',
                '/usr/bin/google-chrome-stable',
                '/opt/google/chrome/chrome',
                // Add path for Flatpak installation if needed
                // '/var/lib/flatpak/exports/bin/com.google.Chrome'
            ];
            return linuxPaths.find(p => fs.existsSync(p));
        default:
            return null; // 不支持的平台
    }
}

const chromeExecutablePath = getChromePath();

// --- 端口检查函数 ---
function isPortInUse(port) {
    const platform = process.platform;
    let command;
    // console.log(`${DIM}   检查端口 ${port}...${RESET}`); // Optional: Verbose check
    try {
        if (platform === 'win32') {
            // 在 Windows 上，查找监听状态的 TCP 端口
            command = `netstat -ano | findstr LISTENING | findstr :${port}`;
            execSync(command); // 如果找到，不会抛出错误
            return true;
        } else if (platform === 'darwin' || platform === 'linux') {
            // 在 macOS 或 Linux 上，查找监听该端口的进程
            command = `lsof -i tcp:${port} -sTCP:LISTEN`;
            execSync(command); // 如果找到，不会抛出错误
            return true;
        }
    } catch (error) {
        // 如果命令执行失败（通常意味着找不到匹配的进程），则端口未被占用
        // console.log(`端口 ${port} 检查命令执行失败或未找到进程:`, error.message.split('\n')[0]); // 可选的调试信息
        return false;
    }
    // 对于不支持的平台，保守地假设端口未被占用
    return false;
}

// --- 查找占用端口的 PID --- (新增)
function findPidsUsingPort(port) {
    const platform = process.platform;
    const pids = [];
    let command;
    try {
        console.log(`${DIM}   正在查找占用端口 ${port} 的进程...${RESET}`);
        if (platform === 'win32') {
            command = `netstat -ano | findstr LISTENING | findstr :${port}`;
            const output = execSync(command).toString();
            const lines = output.trim().split('\n');
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1]; // PID is the last column
                if (pid && !isNaN(pid)) {
                    pids.push(pid);
                }
            }
        } else { // macOS or Linux
            command = `lsof -t -i tcp:${port} -sTCP:LISTEN`;
            const output = execSync(command).toString();
            const lines = output.trim().split('\n');
            for (const line of lines) {
                const pid = line.trim();
                if (pid && !isNaN(pid)) {
                    pids.push(pid);
                }
            }
        }
        if (pids.length > 0) {
             console.log(`   ${YELLOW}找到占用端口 ${port} 的 PID: ${pids.join(', ')}${RESET}`);
        } else {
             console.log(`   ${GREEN}未找到明确监听端口 ${port} 的进程。${RESET}`);
        }
    } catch (error) {
        // 命令失败通常意味着没有找到进程
        console.log(`   ${GREEN}查找端口 ${port} 进程的命令执行失败或无结果。${RESET}`);
    }
    return [...new Set(pids)]; // 返回去重后的 PID 列表
}

// --- 结束进程 --- (新增)
function killProcesses(pids) {
    if (pids.length === 0) return true; // 没有进程需要结束

    const platform = process.platform;
    let success = true;
    console.log(`${YELLOW}   正在尝试结束 PID: ${pids.join(', ')}...${RESET}`);

    for (const pid of pids) {
        try {
            if (platform === 'win32') {
                execSync(`taskkill /F /PID ${pid}`);
                console.log(`   ${GREEN}✅ 成功结束 PID ${pid} (Windows)${RESET}`);
            } else { // macOS or Linux
                execSync(`kill -9 ${pid}`);
                console.log(`   ${GREEN}✅ 成功结束 PID ${pid} (macOS/Linux)${RESET}`);
            }
        } catch (error) {
            console.warn(`   ${RED}⚠️ 结束 PID ${pid} 时出错: ${error.message.split('\n')[0]}${RESET}`);
            // 可能原因：进程已不存在、权限不足等
            success = false; // 标记至少有一个失败了
        }
    }
    return success;
}

// --- 创建 Readline Interface ---
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

// --- 步骤 1: 检查 Playwright 依赖 ---
async function checkDependencies() {
    console.log(`${CYAN}-------------------------------------------------${RESET}`);
    console.log(`${CYAN}--- 步骤 1: 检查依赖项 ---${RESET}`);
    console.log('将检查以下模块是否已安装:');
    const requiredModules = ['express', 'playwright', '@playwright/test', 'cors'];
    const missingModules = [];
    let allFound = true;

    for (const moduleName of requiredModules) {
        process.stdout.write(`   - ${moduleName} ... `);
        try {
            require.resolve(moduleName); // Use require.resolve for checking existence without loading
            console.log(`${GREEN}✓ 已找到${RESET}`); // Green checkmark
        } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                console.log(`${RED}❌ 未找到${RESET}`); // Red X
                missingModules.push(moduleName);
                allFound = false;
            } else {
                console.log(`${RED}❌ 检查时出错: ${error.message}${RESET}`);
                allFound = false;
                // Consider exiting if it's not MODULE_NOT_FOUND?
                // return false;
            }
        }
    }

    process.stdout.write(`   - 服务器脚本 (${SERVER_SCRIPT_FILENAME}) ... `);
    if (!fs.existsSync(SERVER_SCRIPT_PATH)) {
        console.log(`${RED}❌ 未找到${RESET}`); // Red X
        console.error(`     ${RED}错误: 未在预期路径找到 '${SERVER_SCRIPT_FILENAME}' 文件。${RESET}`);
        console.error(`     预期路径: ${SERVER_SCRIPT_PATH}`);
        console.error(`     请确保 '${SERVER_SCRIPT_FILENAME}' 与此脚本位于同一目录。`);
        allFound = false;
    } else {
        console.log(`${GREEN}✓ 已找到${RESET}`); // Green checkmark
    }

    if (!allFound) {
        console.log(`\n${RED}-------------------------------------------------${RESET}`);
        console.error(`${RED}❌ 错误: 依赖项检查未通过！${RESET}`);
        if (missingModules.length > 0) {
            console.error(`   ${RED}缺少以下 Node.js 模块: ${missingModules.join(', ')}${RESET}`);
            console.log('   请根据您使用的包管理器运行以下命令安装依赖：');
            console.log(`      ${MAGENTA}npm install ${missingModules.join(' ')}${RESET}`);
            console.log('      或');
            console.log(`      ${MAGENTA}yarn add ${missingModules.join(' ')}${RESET}`);
            console.log('      或');
            console.log(`      ${MAGENTA}pnpm install ${missingModules.join(' ')}${RESET}`);
            console.log('   (如果已安装但仍提示未找到，请尝试删除 node_modules 目录和 package-lock.json/yarn.lock 文件后重新安装)');
        }
        if (!fs.existsSync(SERVER_SCRIPT_PATH)) {
             console.error(`   ${RED}缺少必要的服务器脚本文件: ${SERVER_SCRIPT_FILENAME}${RESET}`);
             console.error(`   请确保它和 auto_connect_aistudio.cjs 在同一个文件夹内。`);
        }
        console.log(`${RED}-------------------------------------------------${RESET}`);
        return false;
    }

    console.log(`\n${GREEN}✅ 所有依赖检查通过。${RESET}`);
    playwright = require('playwright'); // Load playwright only after checks
    return true;
}

// --- 步骤 2: 检查并启动 Chrome ---
async function launchChrome() {
    console.log(`${CYAN}-------------------------------------------------${RESET}`);
    console.log(`${CYAN}--- 步骤 2: 启动或连接 Chrome (调试端口 ${DEBUGGING_PORT}) ---${RESET}`);

    // 首先检查端口是否被占用
    if (isPortInUse(DEBUGGING_PORT)) {
        console.log(`${YELLOW}⚠️ 警告: 端口 ${DEBUGGING_PORT} 已被占用。${RESET}`);
        console.log('   这通常意味着已经有一个 Chrome 实例在监听此端口。');
        const question = `选择操作: [Y/n]
  ${GREEN}Y (默认): 尝试连接现有 Chrome 实例并启动 API 服务器。${RESET}
  ${YELLOW}n:        自动强行结束占用端口 ${DEBUGGING_PORT} 的进程，然后启动新的 Chrome 实例。${RESET}
请输入选项 [Y/n]: `;
        const answer = await askQuestion(question);

        if (answer.toLowerCase() === 'n') {
            console.log(`\n好的，您选择了启动新实例。将尝试自动清理端口...`);
            const pids = findPidsUsingPort(DEBUGGING_PORT);
            if (pids.length > 0) {
                const killSuccess = killProcesses(pids);
                if (killSuccess) {
                    console.log(`   ${GREEN}✅ 尝试结束进程完成。等待 1 秒检查端口...${RESET}`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 短暂等待
                    if (isPortInUse(DEBUGGING_PORT)) {
                        console.error(`${RED}❌ 错误: 尝试结束后，端口 ${DEBUGGING_PORT} 仍然被占用。${RESET}`);
                        console.error('   可能原因：权限不足，或进程未能正常终止。请尝试手动结束进程。' );
                         // 提供手动清理提示
                         console.log(`${YELLOW}提示: 您可以使用以下命令查找进程 ID (PID):${RESET}`);
                         if (process.platform === 'win32') {
                             console.log(`  - 在 CMD 或 PowerShell 中: netstat -ano | findstr :${DEBUGGING_PORT}`);
                             console.log('  - 找到 PID 后，使用: taskkill /F /PID <PID>');
                         } else { // macOS or Linux
                             console.log(`  - 在终端中: lsof -t -i:${DEBUGGING_PORT}`);
                             console.log('  - 找到 PID 后，使用: kill -9 <PID>');
                         }
                         await askQuestion('请在手动结束进程后，按 Enter 键重试脚本...');
                         process.exit(1); // 退出，让用户处理后重跑
                    } else {
                        console.log(`   ${GREEN}✅ 端口 ${DEBUGGING_PORT} 现在空闲。${RESET}`);
                        // 端口已清理，继续执行下面的 Chrome 启动流程
                    }
                } else {
                    console.error(`${RED}❌ 错误: 尝试结束部分或全部占用端口的进程失败。${RESET}`);
                    console.error('   请检查日志中的具体错误信息，可能需要手动结束进程。');
                    await askQuestion('请在手动结束进程后，按 Enter 键重试脚本...');
                    process.exit(1); // 退出，让用户处理后重跑
                }
            } else {
                console.log(`${YELLOW}   虽然端口被占用，但未能找到具体监听的进程 PID。可能情况复杂，建议手动检查。${RESET}` );
                 await askQuestion('请手动检查并确保端口空闲后，按 Enter 键重试脚本...');
                 process.exit(1); // 退出
            }
            // 如果代码执行到这里，意味着端口清理成功，将继续启动 Chrome
            console.log(`\n准备启动新的 Chrome 实例...`);

        } else {
            console.log(`\n好的，将尝试连接到现有的 Chrome 实例...`);
            return 'use_existing'; // 特殊返回值，告知主流程跳过启动，直接连接
        }
    }

    // --- 如果端口未被占用，或者用户选择 'n' 且自动清理成功 ---

    if (!chromeExecutablePath) {
        console.error(`${RED}❌ 错误: 未能在当前操作系统 (${process.platform}) 的常见路径找到 Chrome 可执行文件。${RESET}`);
        console.error('   请确保已安装 Google Chrome，或修改脚本中的 getChromePath 函数以指向正确的路径。');
        if (process.platform === 'win32') {
             console.error('   (已尝试查找 %ProgramFiles% 和 %ProgramFiles(x86)% 下的路径)');
        } else if (process.platform === 'linux') {
             console.error('   (已尝试查找 /usr/bin/google-chrome, /usr/bin/google-chrome-stable, /opt/google/chrome/chrome)');
        }
        return false;
    }

    console.log(`   ${GREEN}找到 Chrome 路径:${RESET} ${chromeExecutablePath}`);

    // 只有在明确需要启动新实例时才提示关闭其他实例
    // (如果上面选择了 'n' 并清理成功，这里 isPortInUse 应该返回 false)
    if (!isPortInUse(DEBUGGING_PORT)) {
         console.log(`${YELLOW}⚠️ 重要提示：为了确保新的调试端口生效，建议先手动完全退出所有*其他*可能干扰的 Google Chrome 实例。${RESET}`);
         console.log('   (在 macOS 上通常是 Cmd+Q，Windows/Linux 上是关闭所有窗口)');
         await askQuestion('请确认已处理好其他 Chrome 实例，然后按 Enter 键继续启动...');
    } else {
         // 理论上不应该到这里，因为端口已被清理或选择了 use_existing
         console.warn(`   ${YELLOW}警告：端口 ${DEBUGGING_PORT} 意外地仍被占用。继续尝试启动，但这极有可能失败。${RESET}`);
         await askQuestion('请按 Enter 键继续尝试启动...');
    }


    console.log(`正在尝试启动 Chrome...`);
    console.log(`  路径: "${chromeExecutablePath}"`);
    // --- 修改：添加启动参数 ---
    const chromeArgs = [
        `--remote-debugging-port=${DEBUGGING_PORT}`,
        `--window-size=460,800` // 指定宽度为 460px，高度暂定为 800px (可以根据需要调整)
        // 你可以在这里添加其他需要的 Chrome 启动参数
    ];
    console.log(`  参数: ${chromeArgs.join(' ')}`); // 打印所有参数

    try {
        const chromeProcess = spawn(
            chromeExecutablePath,
            chromeArgs, // 使用包含窗口大小的参数数组
            { detached: true, stdio: 'ignore' } // Detach to allow script to exit independently if needed
        );
        chromeProcess.unref(); // Allow parent process to exit independently

        console.log(`${GREEN}✅ Chrome 启动命令已发送 (指定窗口大小)。稍后将尝试连接...${RESET}`);
        console.log(`${DIM}⏳ 等待 3 秒让 Chrome 进程启动...${RESET}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        return true; // 表示启动流程已尝试

    } catch (error) {
        console.error(`${RED}❌ 启动 Chrome 时出错: ${error.message}${RESET}`);
        console.error(`   请检查路径 "${chromeExecutablePath}" 是否正确，以及是否有权限执行。`);
        return false;
    }
}

// --- 步骤 3: 连接 Playwright 并管理页面 (带重试) ---
async function connectAndManagePage() {
    console.log(`${CYAN}-------------------------------------------------${RESET}`);
    console.log(`${CYAN}--- 步骤 3: 连接 Playwright 到 ${CDP_ADDRESS} (最多尝试 ${CONNECTION_RETRIES} 次) ---${RESET}`);
    let browser = null;
    let context = null;

    for (let i = 0; i < CONNECTION_RETRIES; i++) {
        try {
            console.log(`\n${DIM}尝试连接 Playwright (第 ${i + 1}/${CONNECTION_RETRIES} 次)...${RESET}`);
            browser = await playwright.chromium.connectOverCDP(CDP_ADDRESS, { timeout: CONNECT_TIMEOUT_MS });
            console.log(`${GREEN}✅ 成功连接到 Chrome！${RESET}`);

             // Simplified context fetching
             await new Promise(resolve => setTimeout(resolve, 500)); // Short delay after connect
             const contexts = browser.contexts();
             if (contexts && contexts.length > 0) {
                 context = contexts[0];
                 console.log(`-> 获取到浏览器默认上下文。`);
                 break; // Connection and context successful
             } else {
                 // This case should be rare if connectOverCDP succeeded with a responsive Chrome
                 throw new Error('连接成功，但无法获取浏览器上下文。Chrome 可能没有响应或未完全初始化。');
             }

        } catch (error) {
            console.warn(`   ${YELLOW}连接尝试 ${i + 1} 失败: ${error.message.split('\n')[0]}${RESET}`);
             if (browser && browser.isConnected()) {
                 // Should not happen if connectOverCDP failed, but good practice
                 await browser.close().catch(e => console.error("尝试关闭连接失败的浏览器时出错:", e));
             }
             browser = null;
             context = null;

            if (i < CONNECTION_RETRIES - 1) {
                console.log(`   ${YELLOW}可能原因: Chrome 未完全启动 / 端口 ${DEBUGGING_PORT} 未监听 / 端口被占用。${RESET}`);
                console.log(`${DIM}   等待 ${RETRY_DELAY_MS / 1000} 秒后重试...${RESET}`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            } else {
                console.error(`\n${RED}❌ 在 ${CONNECTION_RETRIES} 次尝试后仍然无法连接。${RESET}`);
                console.error('   请再次检查：');
                console.error('   1. Chrome 是否真的已经通过脚本成功启动，并且窗口可见、已加载？(可能需要登录Google)');
                console.error(`   2. 是否有其他程序占用了端口 ${DEBUGGING_PORT}？(检查命令: macOS/Linux: lsof -i :${DEBUGGING_PORT} | Windows: netstat -ano | findstr ${DEBUGGING_PORT})`);
                console.error('   3. 启动 Chrome 时终端或系统是否有报错信息？');
                console.error('   4. 防火墙或安全软件是否阻止了本地回环地址(127.0.0.1)的连接？');
                return false;
            }
        }
    }

    if (!browser || !context) {
         console.error(`${RED}-> 未能成功连接到浏览器或获取上下文。${RESET}`);
         return false;
    }

    // --- 连接成功后的页面管理逻辑 ---
    console.log(`\n${CYAN}--- 页面管理 ---${RESET}`);
    try {
        let targetPage = null;
        let pages = [];
        try {
            pages = context.pages();
        } catch (err) {
             console.error(`${RED}❌ 获取现有页面列表时出错:${RESET}`, err);
             console.log("   将尝试打开新页面...");
        }

        console.log(`${DIM}-> 检查 ${pages.length} 个已存在的页面...${RESET}`);
        const aiStudioUrlPattern = 'aistudio.google.com/';
        const loginUrlPattern = 'accounts.google.com/';

        for (const page of pages) {
            try {
                if (!page.isClosed()) {
                    const pageUrl = page.url();
                    console.log(`${DIM}   检查页面: ${pageUrl}${RESET}`);
                    // Prioritize AI Studio pages, then login pages
                    if (pageUrl.includes(aiStudioUrlPattern)) {
                         console.log(`-> ${GREEN}找到 AI Studio 页面:${RESET} ${pageUrl}`);
                         targetPage = page;
                         // Ensure it's the target URL if possible
                         if (!pageUrl.includes('/prompts/new_chat')) {
                              console.log(`${YELLOW}   非目标页面，尝试导航到 ${TARGET_URL}...${RESET}`);
                              try {
                                   await targetPage.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
                                   console.log(`   ${GREEN}导航成功:${RESET} ${targetPage.url()}`);
                              } catch (navError) {
                                   console.warn(`   ${YELLOW}警告：导航到 ${TARGET_URL} 失败: ${navError.message.split('\n')[0]}${RESET}`);
                                   console.warn(`   ${YELLOW}将使用当前页面 (${pageUrl})，请稍后手动确认。${RESET}`);
                              }
                         } else {
                              console.log(`   ${GREEN}页面已在目标路径或子路径。${RESET}`);
                         }
                         break; // Found a good AI Studio page
                    } else if (pageUrl.includes(loginUrlPattern) && !targetPage) {
                        // Keep track of a login page if no AI studio page is found yet
                        console.log(`-> ${YELLOW}发现 Google 登录页面，暂存。${RESET}`);
                        targetPage = page;
                        // Don't break here, keep looking for a direct AI Studio page
                    }
                 }
             } catch (pageError) {
                  if (!page.isClosed()) {
                      console.warn(`   ${YELLOW}警告：评估或导航页面时出错: ${pageError.message.split('\n')[0]}${RESET}`);
                  }
                  // Avoid using a page that caused an error
                  if (targetPage === page) {
                      targetPage = null;
                  }
             }
        }

        // If after checking all pages, the best we found was a login page
        if (targetPage && targetPage.url().includes(loginUrlPattern)) {
            console.log(`-> ${YELLOW}未找到直接的 AI Studio 页面，将使用之前找到的登录页面。${RESET}`);
            console.log(`   ${YELLOW}请确保在该页面手动完成登录。${RESET}`);
        }

        // If no suitable page was found at all
        if (!targetPage) {
            console.log(`-> ${YELLOW}未找到合适的现有页面。正在打开新页面并导航到 ${TARGET_URL}...${RESET}`);
            try {
                targetPage = await context.newPage();
                console.log(`${DIM}   正在导航...${RESET}`);
                await targetPage.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
                console.log(`-> ${GREEN}新页面已打开并导航到:${RESET} ${targetPage.url()}`);
            } catch (newPageError) {
                 console.error(`${RED}❌ 打开或导航新页面到 ${TARGET_URL} 失败: ${newPageError.message}${RESET}`);
                 console.error("   请检查网络连接，以及 Chrome 是否能正常访问该网址。可能需要手动登录。" );
                 await browser.close().catch(e => {});
                 return false;
            }
        }

        try {
            await targetPage.bringToFront();
            console.log('-> 已尝试将目标页面置于前台。');
        } catch (bringToFrontError) {
            console.warn(`   ${YELLOW}警告：将页面置于前台失败: ${bringToFrontError.message.split('\n')[0]}${RESET}`);
            console.warn(`   (这可能发生在窗口最小化或位于不同虚拟桌面上时，通常不影响连接)`);
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay after bringToFront


        console.log(`\n${BRIGHT}${GREEN}🎉 --- AI Studio 连接准备完成 --- 🎉${RESET}`);
        console.log(`${GREEN}Chrome 已启动，Playwright 已连接，相关页面已找到或创建。${RESET}`);
        console.log(`${YELLOW}请确保在 Chrome 窗口中 AI Studio 页面处于可交互状态 (例如，已登录Google, 无弹窗)。${RESET}`);

        return true;

    } catch (error) {
        console.error(`\n${RED}❌ --- 步骤 3 页面管理失败 ---${RESET}`);
        console.error('   在连接成功后，处理页面时发生错误:', error);
        if (browser && browser.isConnected()) {
             await browser.close().catch(e => console.error("关闭浏览器时出错:", e));
        }
        return false;
    } finally {
         // 这里不再打印即将退出的日志，因为脚本会继续运行 server.js
         // console.log("-> auto_connect_aistudio.js 步骤3结束。");
         // 不需要手动断开 browser 连接，因为是 connectOverCDP
    }
}


// --- 步骤 4: 启动 API 服务器 ---
function startApiServer() {
    console.log(`${CYAN}-------------------------------------------------${RESET}`);
    console.log(`${CYAN}--- 步骤 4: 启动 API 服务器 ('node ${SERVER_SCRIPT_FILENAME}') ---${RESET}`);
    console.log(`${DIM}   脚本路径: ${SERVER_SCRIPT_PATH}${RESET}`);

    if (!fs.existsSync(SERVER_SCRIPT_PATH)) {
        console.error(`${RED}❌ 错误: 无法启动服务器，文件不存在: ${SERVER_SCRIPT_PATH}${RESET}`);
        process.exit(1);
    }

    console.log(`${DIM}正在启动: node ${SERVER_SCRIPT_PATH}${RESET}`);

    try {
        const serverProcess = spawn('node', [SERVER_SCRIPT_PATH], {
            stdio: 'inherit',
            cwd: __dirname
        });

        serverProcess.on('error', (err) => {
            console.error(`${RED}❌ 启动 '${SERVER_SCRIPT_FILENAME}' 失败: ${err.message}${RESET}`);
            console.error(`请检查 Node.js 是否已安装并配置在系统 PATH 中，以及 '${SERVER_SCRIPT_FILENAME}' 文件是否有效。`);
            process.exit(1);
        });

        serverProcess.on('exit', (code, signal) => {
            console.log(`\n${MAGENTA}👋 '${SERVER_SCRIPT_FILENAME}' 进程已退出 (代码: ${code}, 信号: ${signal})。${RESET}`);
            console.log("自动连接脚本执行结束。");
            process.exit(code ?? 0);
        });
        // Don't print the success message here, let server.cjs print its own ready message
        // console.log("✅ '${SERVER_SCRIPT_FILENAME}' 已启动。脚本将保持运行，直到服务器进程结束或被手动中断。");

    } catch (error) {
        console.error(`${RED}❌ 启动 '${SERVER_SCRIPT_FILENAME}' 时发生意外错误: ${error.message}${RESET}`);
        process.exit(1);
    }
}


// --- 主执行流程 ---
(async () => {
    console.log(`${MAGENTA}🚀 欢迎使用 AI Studio 自动连接与启动脚本 (跨平台优化, v2.9 自动端口清理) 🚀${RESET}`);
    console.log(`${MAGENTA}=================================================${RESET}`);

    if (!await checkDependencies()) {
        process.exit(1);
    }

    console.log(`${MAGENTA}=================================================${RESET}`);

    const launchResult = await launchChrome();

    if (launchResult === false) {
        console.log(`${RED}❌ 启动 Chrome 失败，脚本终止。${RESET}`);
        process.exit(1);
    }

    // 如果 launchResult 是 'use_existing' 或 true, 都需要连接
    console.log(`${MAGENTA}=================================================${RESET}`);
    if (!await connectAndManagePage()) {
         // 如果连接失败，并且我们是尝试连接到现有实例，给出更具体的提示
         if (launchResult === 'use_existing') {
             console.error(`${RED}❌ 连接到现有 Chrome 实例 (端口 ${DEBUGGING_PORT}) 失败。${RESET}`);
             console.error('   请确认：');
             console.error('   1. 占用该端口的确实是您想连接的 Chrome 实例。');
             console.error('   2. 该 Chrome 实例是以 --remote-debugging-port 参数启动的。');
             console.error('   3. Chrome 实例本身运行正常，没有崩溃或无响应。');
         }
         process.exit(1);
    }

    // 无论 Chrome 是新启动的还是已存在的，只要连接成功，就启动 API 服务器
    console.log(`${MAGENTA}=================================================${RESET}`);
    startApiServer();

})(); 