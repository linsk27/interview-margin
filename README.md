# 面试边注

面向技术面试复习的多用户阅读工作台。现有 Markdown 内容保持不删减，运行时以本机 SQLite 为权威数据源；登录用户的进度、阅读位置、收藏、复习和批注可跨浏览器同步，访客保持只读。

当前包含 9 个题库、501 道题：原有简历题 81 道、JavaScript 100 道，以及 Git、Vue、React、前端工程、后端、数据库缓存和网络部署共 320 道新增题。

完整的架构、数据模型、API、部署方式、当前进度和跨电脑迁移步骤见
[`docs/PROJECT_ARCHITECTURE_AND_HANDOFF.md`](docs/PROJECT_ARCHITECTURE_AND_HANDOFF.md)。

## 本地运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run test
npm run db:check
npm run build
```

本机生产服务（供 Cloudflare Tunnel 等反向代理使用）：

```bash
npm run start:local
```

默认只监听 `127.0.0.1:4173`，不会直接向局域网开放端口。健康检查地址为
`http://127.0.0.1:4173/api/health`。

Cloudflare Tunnel 使用本机 `~/.cloudflared/config.yml` 中的私有凭据。运行
`ops/install-scheduled-tasks.ps1` 会安装两个 Windows 任务：登录后保持本地服务和
Tunnel 运行，以及每天 03:00 执行 SQLite 在线备份。日志、数据库、备份和首次凭据
分别位于被 Git 忽略的 `logs/`、`data/`、`backups/` 目录。

首次启动会生成 `data/bootstrap-admin.txt`。该文件只显示一次管理员临时密码，首次
登录必须修改。管理员可创建 `admin / editor / learner` 账号，不开放公共注册。

## 使用入口

- 左侧题库：全文搜索、章节浏览、复习/收藏/掌握筛选。
- 正文选区：选择高亮颜色，或打开边注编辑器记录理解。
- 右侧边注：本题总结、复习日期和全部文字批注。
- 学习概览：阅读、掌握、复习、时长、14 天活动和章节进度。
- 数据同步：登录账号后写入本机 SQLite；旧版 localStorage 首次登录可幂等合并。
- 内容管理：管理员/编辑可增删改题库和题目、预览导入 Markdown、处理归档和版本冲突。
- 账号管理：管理员创建、停用、分配角色和重置一次性密码，操作写入审计日志。
- 数据备份：管理员可立即创建或下载 SQLite 备份，系统每天自动保留最近 30 份。
- 专注模式：隐藏题库和边注，只保留正文。

## 快捷键

| 按键 | 操作 |
| --- | --- |
| `/` 或 `Ctrl/Cmd + K` | 全局搜索 |
| `J` / `K` | 下一题 / 上一题 |
| `M` | 标记已掌握 |
| `R` | 标记需复习 |
| `F` | 收藏当前题 |
| `N` | 打开边注 |
| `?` | 阅读设置 |

正式入口为 `https://interview.linsk27.dpdns.org`。原 Vercel 页面只保留为跳转入口和
AI 后备接口；SQLite 服务由本机 Express 通过 Cloudflare Tunnel 提供。本机关机、
休眠、断网或代理停止时，正式入口会暂时不可用。

## 数据与权限

- SQLite 启用 WAL、外键和 5 秒写锁等待，数据文件为 `data/interview.db`。
- 会话 Cookie 使用 `HttpOnly + Secure + SameSite=Lax`；数据库只保存随机令牌哈希。
- 密码使用 Argon2id；改密、停用或角色调整会撤销现有会话。
- API 最终执行 RBAC 与资源隔离，前端隐藏管理入口不作为安全判断。
- IndexedDB 只保存尚未被服务器确认的最新写操作，确认后立即删除。

## AI 学习助手

右侧边注顶部和阅读器工具栏都可打开 AI 学习助手。它会自动携带当前题目的题干、正文及本题对话，适合追问“为什么”“用项目怎么讲”“继续追问什么”。

为防止 API Key 出现在浏览器端，AI 请求会通过 Vercel 的 `api/ai-chat.js` 转发。部署到 Vercel 后，在 Project Settings → Environment Variables 设置：

```bash
OPENAI_API_KEY=你的密钥
OPENAI_BASE_URL=https://code.rayinai.com/v1
OPENAI_MODEL=gpt-5.6-terra
```

以上为 RayinAI 中转配置。`OPENAI_BASE_URL` 也可以改为其他支持 Chat Completions 的兼容服务地址。变量配置后重新部署；本地仅运行 Vite 时 `/api/ai-chat` 不会存在，因此会提示服务未连接。

本机生产服务未配置 `OPENAI_API_KEY` 时，可以通过 `AI_FALLBACK_URL` 转发到现有的
Vercel AI 代理。这样密钥仍只保存在 Vercel，本机和浏览器都不会接触密钥。
