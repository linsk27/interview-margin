# 面试题库：跨会话精简上下文

更新：2026-09-09（Asia/Shanghai）。这是续接入口；先读本文件，再按需读架构文档和代码，避免重新装入整段旧聊天。

## 当前任务

原任务名称「面试题库」，ID `019f756d-390f-7700-83ff-c1889eaa829f`。当前请求：**按体验优化计划继续改动，并说清楚改前、改后和实际验证效果**。全链路验收缺口继续保留。
2026-09-08 在新会话恢复历史并续接；旧任务最近多次失败信息为 `Selected model is at capacity`，不能据此判定是上下文超长。本文件是人工提炼的交接摘要，不是对旧会话底层上下文执行压缩。

## 项目与运行位置

- 本地：`D:/软硬件项目/interview-margin`；Git：`linsk27/interview-margin`，分支 `main`。
- 主站：`https://interview.linsk27.dpdns.org`，工作台 `/app`。
- Vercel：`https://interview-margin.vercel.app`，公开静态快照备用站；AI 统一通过 ECS 的公开 API。
- React / TypeScript / Vite；Express / better-sqlite3 / Zod；Argon2id + Cookie 会话 + RBAC。
- ECS 是唯一生产写节点，**不是个人电脑**。`root@47.98.121.191` 可通过现有 SSH 身份连接。
- 当前发布链接 `/opt/interview-margin/current`；生产 DB `/var/lib/interview-margin/data/interview.db`；备份 `/var/lib/interview-margin/backups`。
- 环境文件 `/etc/interview-margin/app.env`、Tunnel token `/etc/cloudflared/interview-margin.token`。只记录路径，不输出或提交其中凭据。
- 服务：`interview-margin`、`cloudflared-interview-margin`；定时器：`interview-margin-backup.timer`、`cloudflared-healthcheck.timer`。
- 发布：`npm run deploy:ecs`；脚本从干净 Git 提交打包，远端构建、测试、DB 预检、备份、切换、健康检查与确认。

## 用户已确定的边界

- 优化六项：字体性能、AI 费用/限额、内容质量、分类搜索、模拟面试、反馈申请闭环。
- 暂不做离线首开 / Service Worker；不引入 Redis 或多实例 SQLite。
- 游客可阅读和体验 AI；草稿和游客练习在本地，登录后按客户端 ID 幂等合并。
- 每日额度：游客聊天20/评分3；登录用户聊天100/评分20。保留短时限流。
- 管理员后台处理反馈、关联邀请；邮件/QQ 通知只保留空接口，不发送消息。
- 旧题质量提醒进入精修待办，不一次性下线。题目 ID、用户数据与编辑内容必须保留。
- 不把代码存在、结构门禁通过等同于完整生产验收通过。

## 已完成基线

- 恢复时本地与 ECS 均为 `c44862f9df49f3da7d337cedf7552e919177abe5`；本地领先 `origin/main` 9 个提交。
- 基础修复版本 `4b7d78e34d18a4952dde96a58bb9dcbb0afaef76` 于2026-09-09 00:26（上海）完成发布确认；P0 首批版本 `f66dfc3` 随后上线，移除全局装饰字体 preload、补充题库层级和加载反馈。最新运行版本需用 `/opt/interview-margin/current` 核实，不沿用历史版本号。
- 旧回归：59 文件 / 453 项通过。用户最近要求修的反馈页滚动、卡片等高、面包屑/标签间距已在该版本上线。
- 14 题库 / 50 章节 / 762 当前公开题；数据库中保留归档题，不能把总行数当公开题数。
- 2026-09-09 `db:check` 再次通过：762 唯一 ID，762 题带来源，1949 引用 / 1166 唯一来源 URL；576 题含代码，53 题含图解；缺段/重复模板/示例修复项均为0。
- 非阻断提醒仍在：376 题正文超过1800字，637 题短答超过160字，其中78题超过240字。来源链接未全量实时检查。
- 已有主要功能：每日 AI 账本与预占、重试/备用模型、FTS 搜索、评分历史与本地合并、反馈/申请/邀请、学习同步、内容质量门禁。

## 本次续接进展

- 补 `/api/search`，复用 `/api/catalog/search` 的同一个处理函数，兼容旧前端。
- 修复无上游 usage 时输入 Token 被重复计入输出费用的估算问题。
- 相同请求 ID 在处理中再次到达时返回409，防止重复调用供应商。
- 新增 `server/ai-usage.test.js`、`server/acceptance-api.test.js`，14项专项测试通过：日额度、UTC跨日、预算预占、结算幂等、失败/取消、缺失usage、并发重复请求、搜索兼容/权限/分页与管理员统计。
- ECS 四项服务/定时器均 active、enabled。
- 完成真实备份的隔离恢复启动演练：备份 `interview-2026-09-07_19-04-54-230.db`，integrity_check=ok；恢复应用首页200、health正常、14/762；启动前后关键表行数相同。临时DB已清理，生产DB未被替换。
- 本地与ECS最终均为61文件/467项测试通过；构建、db:check、diff检查通过。原先积压9个提交与本次修复均已推送GitHub。
- 发布前生成新备份 `interview-2026-09-08_16-25-49-335.db`，正式首页、health、新旧搜索及SEO资源通过公网验证；Vercel快照经系统网络请求返回200。
- 新版本真实AI冒烟通过：聊天200/SSE delta与DONE完整、剩余19次；评分200/78分、剩余2次。两条账本事件均completed、cost_source=provider，分别7687/6158个实际Token；费用仍按本地配置费率估算，不是供应商账单。

## 尚未取得验收证据

- 最新本地浏览器已验证320px窄屏：搜索“索引”显示124条、第二页可访问、Enter打开未预载题库正文、AI切题草稿隔离和返回恢复。桌面完整E2E、Lighthouse、移动4G与CLS仍未实测，不能写成全链路通过。
- 全局装饰字体 preload 已移除；分享图仍为PNG。性能预算尚未闭环。
- AI预占额度仍需纳入系统提示词和完整上下文；本批只改搜索与AI交互，未修改费用模型。
- 生产整机重启与实际版本回滚没有演练；服务 enabled 只证明配置，不证明重启结果。
- 外部独立告警和异机灾备未建立。邮件/QQ通知原计划明确后置，不能擅自启用。

## 最短续接路径

先查看 `git status` 与 `git log -3`，确认本轮是否已提交；阅读 `docs/ACCEPTANCE_2026-09-09.md` 的最新结论。
按 `OPTIMIZATION_PLAN_2026-09-09.md` 继续学习同步状态、后台密度、AI预算预占和性能验收。全站搜索现已接入服务端全文检索并分页；AI已修复切题草稿串写、过期请求回写，新增连接/等待/生成状态、输入框旁错误与回到最新回答。不要重做已完成的题库生成或扩大到离线阅读。
