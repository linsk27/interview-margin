# 面试边注

面向技术面试复习的多用户阅读工作台。现有 Markdown 内容保持不删减，运行时以本机 SQLite 为权威数据源；登录用户的进度、阅读位置、收藏、复习和批注可跨浏览器同步，访客保持只读。

当前包含 9 个题库、501 道题：原有简历题 81 道、JavaScript 100 道，以及 Git、Vue、React、前端工程、后端、数据库缓存和网络部署共 320 道新增题。

完整的架构、数据模型、API、部署方式、当前进度和跨电脑迁移步骤见
[`docs/PROJECT_ARCHITECTURE_AND_HANDOFF.md`](docs/PROJECT_ARCHITECTURE_AND_HANDOFF.md)。

当前正式环境已部署在 Windows 11 个人电脑上，使用 Node.js `v22.15.0` 和
cloudflared `2026.7.2`。运行数据库已从 SQLite 一致性备份恢复，Express 与 Tunnel
由 Windows 计划任务持续运行，另一个计划任务每天执行数据库备份。另有一份独立的
Vercel 游客备用站 `https://interview-margin.vercel.app`，即使个人电脑离线也能读取构建时
导出的公开题库快照；登录、批注、进度同步和后台管理仍依赖个人电脑上的账户服务。

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

`npm run build` 会先自动执行 `npm run content:export`，从 Git 中的公开、未归档内置题生成
`public/catalog.json`，再把它打入 `dist/` 供 Vercel 游客备用站使用。需要单独检查快照时也可
直接运行 `npm run content:export`。该快照不读取生产 SQLite，因此后台中仅存在于 SQLite 的
编辑内容要先同步回题库源并重新部署，才会出现在 Vercel 备用站。

当前回归基线为 28 个测试文件、107/107 项测试通过；`db:check` 为 9 个题库、501 题、
501 个唯一 ID，420 道结构化富题解均达到正文/来源门禁，12 道核心题含站内 SVG 图解，
生产构建通过。

本机生产服务（供 Cloudflare Tunnel 等反向代理使用）：

```bash
npm run start:local
```

默认只监听 `127.0.0.1:4173`，不会直接向局域网开放端口。健康检查地址为
`http://127.0.0.1:4173/api/health`。

## 题库内容开发

JavaScript 与 7 个工程题库采用“原题清单 + 逐题 enrichment + 生成后的 Markdown”三层结构。
逐题原理、示例、追问、易错点和来源位于 `server/content/enrichments/`；不要直接批量修改
`public/question-banks/` 下的生成产物。受控技术图位于 `public/content/diagrams/`，正文只允许
引用该目录内带替代文本的同源 SVG，远程图片、Base64 和原始内联 SVG 会被拒绝。

修改题库源后执行：

```bash
npm run content:generate
npm test
npm run db:check
npm run build
```

生成器会校验题号、标题、正文结构和来源，保持 501 个题目 ID 不变。生产启动只覆盖仍标记为
`seed` 的内置题；管理员已经编辑并转为 `editor` 来源的题目不会被自动正文覆盖。

当前使用 remotely managed Cloudflare Tunnel `interview-margin-local`。Connector 从
`~/.cloudflared/interview-margin-local.token` 读取私密 token，将
`http://127.0.0.1:4173` 作为 `--url` 目标，并使用 `--token-file` 参数启动。该方案不依赖
本机 `config.yml` 或 Tunnel UUID JSON 凭据，也不使用额外的 HTTP(S) 代理。运行
`ops/install-scheduled-tasks.ps1` 会安装两个 Windows 任务：登录后保持本地服务和 Tunnel
运行，以及每天 03:00 执行 SQLite 在线备份。日志、数据库、备份和首次凭据分别位于被
Git 忽略的 `logs/`、`data/`、`backups/` 目录；token 文件位于用户目录，同样不得提交到
Git。

首次启动会生成 `data/bootstrap-admin.txt`。该文件只显示一次管理员临时密码，首次
登录必须修改。管理员可直接创建 `admin / editor / learner` 账号，也可生成一次性
`learner` 邀请；任何人都能自行进入的公共注册仍然关闭。

## 游客浏览与个人记录

游客无需账号即可浏览全部公开题库和题目正文，并可使用搜索、题目切换、代码复制、
阅读版式、字号、主题、专注模式和 AI 学习助手。普通滚动、上下题和双页翻页不会触发
登录，也不会读取或写入个人学习状态。

收藏、掌握状态、题目总结、高亮与批注、复习计划、个人学习概览、复习/收藏/掌握筛选
以及学习记录导入导出属于账号记忆功能；游客点击这些入口时才显示带具体原因的登录框。
个人状态 API 仍由服务端强制鉴权，前端提示不能替代 API 权限检查。

当个人电脑、Tunnel 或账户 API 不可用时，Vercel 站会自动回退到随构建发布的
`/catalog.json`，游客阅读、搜索和题目切换仍可使用；需要保存批注、收藏、进度或进入后台
时会提示账户服务不可用。这里的“备用”解决的是托管电脑离线，不代表访客设备在完全断网时
还能首次打开网页。

## 邀请注册

管理员应从正式域名登录并进入“内容管理 → 账号权限 → 邀请注册”生成邀请。链接会使用
当前页面的 origin，因此不要把在 `localhost` 或 `127.0.0.1` 开发页面生成的链接发给
别人。默认有效期为 72 小时，服务端允许 1–168 小时，当前界面提供 24 小时、3 天和
7 天三个选项。完整邀请链接只在创建成功时显示一次，需立即复制并通过可信的私下渠道
发送；后台列表只显示可使用、已使用、已撤销或已过期状态及时间等元数据，不能再次取回
原链接。

受邀者应先退出其他账号，再打开 `/#invite/...` 链接，自行填写用户名、显示名称和至少
12 位密码。注册成功后固定获得 `learner` 角色并自动登录，不需要管理员接触其密码。
邀请只能使用一次，管理员可在使用前撤销；过期、已使用和已撤销的邀请都会失效。如需
创建编辑或管理员账号，仍由管理员在同一页面直接创建并分配角色。

邀请 token 不写入服务端访问路径：浏览器从 URL fragment 读取后立即清除地址栏，之后
只把 token 放入固定邀请 API 的 JSON 请求体。SQLite `invitations` 表只保存 token 的
SHA-256 哈希，原始 token 不写入数据库、审计日志或邀请列表。

## 使用入口

- 左侧题库：全文搜索、章节浏览、复习/收藏/掌握筛选。
- 正文选区：选择高亮颜色，或打开边注编辑器记录理解。
- 右侧边注：本题总结、复习日期和全部文字批注。
- 学习概览：阅读、掌握、复习、时长、14 天活动和章节进度。
- 数据同步：登录账号后写入本机 SQLite；旧版 localStorage 首次登录可幂等合并。
- 内容管理：管理员/编辑可增删改题库和题目、预览导入 Markdown、处理归档和版本冲突。
- 账号管理：管理员生成/撤销 learner 邀请，或直接创建、停用、分配角色和重置账号密码；操作写入审计日志。
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

主站为 `https://interview.linsk27.dpdns.org`，由个人电脑上的 Express、SQLite 和
Cloudflare Tunnel 提供完整动态服务；游客备用站为
`https://interview-margin.vercel.app`，由 Vercel 托管前端、公开题库快照和 AI 函数。
个人电脑关机、休眠、断网或 Tunnel Connector 停止时，主站和所有账号记忆功能会暂时
不可用，但 Vercel 备用站仍可进行只读游客浏览。

当前不要直接把 `interview.linsk27.dpdns.org` 指向 Vercel：`vercel.json` 的 `/api/*`
目前仍代理到这个主机名，直接切换会形成代理回环。未来如需让 Vercel 承接主域名，应先建立
独立的 API 子域名（例如 `api.interview.linsk27.dpdns.org`）并让 Tunnel 只把该子域名指向
个人电脑，再更新 Vercel API 代理、`APP_ORIGINS` 并完成验证后切换主域名。

## 数据与权限

- SQLite 启用 WAL、外键和 5 秒写锁等待，数据文件为 `data/interview.db`。
- 会话 Cookie 使用 `HttpOnly + Secure + SameSite=Lax`；数据库只保存随机令牌哈希。
- 密码使用 Argon2id；改密、停用或角色调整会撤销现有会话。
- API 最终执行 RBAC 与资源隔离，前端隐藏管理入口不作为安全判断。
- IndexedDB outbox 按 `userId` 分区，只保存各账号尚未被服务器确认的最新写操作，确认后立即删除。
- 学习状态读取、保存和旧数据迁移都携带 `X-Expected-User-Id`；会话若已切换到其他账号，服务端返回 `409`，避免旧异步请求写入新账号。

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
