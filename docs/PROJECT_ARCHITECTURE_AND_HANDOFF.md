# 面试边注：当前架构与开发交接

更新时间：2026-09-09

先读：

- [体验优化计划](OPTIMIZATION_PLAN_2026-09-09.md)
- [跨会话精简上下文](CURRENT_CONTEXT.md)
- [最近验收记录](ACCEPTANCE_2026-09-09.md)

## 项目定位

面试边注是面向前端、Java 后端和 AI 应用开发的技术面试学习平台。游客可以阅读题库、搜索题目、练习和体验 AI；登录用户可以同步进度、收藏、批注、复习计划和评分历史；管理员维护题库、账号、邀请、反馈、审计和备份。

当前边界：不做 Service Worker 离线首开；不引入 Redis；SQLite 只有一个生产写节点；邮件、QQ 和开放注册保持关闭。

## 当前生产拓扑

```text
浏览器
  ├─ 主站 https://interview.linsk27.dpdns.org
  │    └─ Cloudflare Tunnel → ECS Nginx/Express → SQLite
  └─ 备用站 https://interview-margin.vercel.app
       └─ 静态前端 + 公开题库快照；动态 API 仍指向 ECS
```

生产唯一写节点是阿里云 ECS，不要重新启用历史个人电脑写节点，也不要启动第二个 SQLite writer。

| 项目 | 当前值 |
| --- | --- |
| 代码 | `/opt/interview-margin/current` |
| 数据库 | `/var/lib/interview-margin/data/interview.db` |
| 备份 | `/var/lib/interview-margin/backups` |
| 环境 | `/etc/interview-margin/app.env` |
| 应用服务 | `interview-margin.service` |
| Tunnel | `cloudflared-interview-margin.service` |
| 备份定时器 | `interview-margin-backup.timer` |
| 健康检查定时器 | `cloudflared-healthcheck.timer` |
| 内部端口 | `127.0.0.1:4173` |

详细发布和 systemd 操作见 [`ops/linux/README.md`](../ops/linux/README.md)。发布命令是 `npm run deploy:ecs`，会远端安装依赖、构建、测试、`db:check`、生成上线前备份、原子切换、健康检查和确认；失败时保留回滚状态。

## 技术结构

### 前端

- React + TypeScript + Vite。
- `src/App.tsx`：路由、学习状态、登录态、抽屉和页面组合。
- `src/components/Reader.tsx`：单页/双页阅读、分页和练习模式。
- `src/components/QuestionBankHub.tsx`：题库中心、方向筛选和入口。
- `src/components/AiAssistant.tsx` / `AiAssistantDialog.tsx`：当前题目 AI 对话。
- `src/components/NotesPanel.tsx`：总结、复习、批注和本题反馈。
- `src/components/AdminPanel.tsx`：题库、题目、账号、邀请、反馈和备份管理。
- `src/lib/api.ts`：同源 API 客户端；`src/lib/outbox.ts`：按用户隔离的 IndexedDB 待同步状态。
- `src/styles.css`：全站布局、颜色、字体、响应式和焦点样式。

### 后端

- `server/index.js`：加载环境并启动 Express。
- `server/app.js`：路由、中间件、RBAC、题库 API、AI 入口和静态文件。
- `server/auth.js`：Argon2id 密码、HttpOnly Cookie 会话和权限。
- `server/database.js`：SQLite 迁移、角色、题库种子和 FTS 搜索表。
- `server/repository.js`：题库、学习状态、批注、搜索和审计读写。
- `server/ai-usage.js`：AI 预占、日额度、全局预算、结算和管理员汇总。
- `server/backup-service.js`：在线 SQLite 备份和保留策略。
- `server/content/`：题库源、生成器、来源、富题解和质量门禁。

### 数据边界

- Git 中的 Markdown/JS 内容源是内置题库的可重复种子。
- 生产 SQLite 是运行时权威，包含账号、进度、批注、审计和后台编辑。
- Vercel 快照只包含公开、未归档题库；不包含账号、会话、批注或生产数据库。
- 数据库恢复必须使用 SQLite 在线一致性备份；不能复制 `.db-wal` 或 `.db-shm`。
- `.env`、AI Key、Tunnel token、`data/`、`backups/` 和生成快照不提交到 Git。

## 公开 API 约定

- `GET /api/catalog`、`GET /api/catalog/index`：公开题库索引。
- `GET /api/catalog/search` 和兼容路径 `GET /api/search`：跨题库搜索。
- `GET /api/catalog/:bankId`：题库正文索引。
- `GET/PUT /api/me/state`：登录用户学习状态；使用 `X-Expected-User-Id` 防止跨账号竞态写入。
- `POST /api/ai-chat`：流式 AI 对话；`POST /api/ai-score`：评分并记录登录用户历史。
- `GET /api/admin/ai-usage`：管理员用量汇总。
- `POST /api/contact-requests`、`PATCH /api/admin/contact-requests/:id`：反馈闭环。

游客 AI 每日聊天 20 次、评分 3 次；登录用户聊天 100 次、评分 20 次。AI 入口统一走 ECS，浏览器不接触密钥。预占额度、供应商 usage、估算费用和错误状态都会进入 SQLite 账本。

## 内容基线

- 14 个题库、50 个章节、762 道当前公开题。
- 固定四个方向：前端开发、后端开发、AI 应用开发、求职专项。
- 质量门禁检查结论、机制、实践、边界、追问、来源、代码和图解。
- `npm run db:check` 是题库数量和结构质量的唯一事实源。
- 当前仍有编辑提醒：376 道正文超过 1800 字，637 道短答超过 160 字，78 道短答超过 240 字；这不阻断发布，但属于体验优化计划的 P2。

## 本地开发与验证

```text
npm ci
npm run dev
npm run build
npm test -- --maxWorkers=1
npm run db:check
git diff --check
```

修改内容源后运行 `npm run content:generate` 或对应专项生成命令；不要直接编辑生成的公开快照。新增或修改题目必须通过内容质量门禁，并保持旧题目 ID 稳定。

## 当前已知缺口

1. 真实浏览器 E2E、Lighthouse、移动 4G 和 CLS 还没有形成稳定验收证据。
2. 清爽主题仍可能预加载装饰字体，分享图仍为 PNG。
3. AI 预占估算需要把系统提示词和完整上下文纳入，避免并发时低估全局预算。
4. ECS 整机重启、真实发布回滚、外部告警和异机灾备尚未演练。
5. 长题目和旧版简历题库仍需要按优化计划分批精修。

## 接手顺序

1. 阅读 `CURRENT_CONTEXT.md` 和 `OPTIMIZATION_PLAN_2026-09-09.md`。
2. 运行 `git status`、`git log -3`，确认工作树和线上版本。
3. 先做 P0 阅读体验与性能，不重做已通过的题库生成和部署脚本。
4. 每批改动独立测试、备份、部署和验证；不要把浏览器未验证写成“全链路通过”。
