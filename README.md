# 面试边注

面向技术面试复习的本地优先阅读工作台。题库正文来自 `public/interview.md`，原 Markdown 内容保持不删减；学习状态、阅读位置、收藏、总结和文字批注保存在当前浏览器。

## 本地运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run test
npm run build
```

## 使用入口

- 左侧题库：全文搜索、章节浏览、复习/收藏/掌握筛选。
- 正文选区：选择高亮颜色，或打开边注编辑器记录理解。
- 右侧边注：本题总结、复习日期和全部文字批注。
- 学习概览：阅读、掌握、复习、时长、14 天活动和章节进度。
- 数据备份：在学习概览中导出或导入 JSON 记录。
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

部署时只需将 `npm run build` 生成的 `dist` 目录发布到任意静态托管平台。

## AI 学习助手

右侧边注顶部和阅读器工具栏都可打开 AI 学习助手。它会自动携带当前题目的题干、正文及本题对话，适合追问“为什么”“用项目怎么讲”“继续追问什么”。

为防止 API Key 出现在浏览器端，AI 请求会通过 Vercel 的 `api/ai-chat.js` 转发。部署到 Vercel 后，在 Project Settings → Environment Variables 设置：

```bash
OPENAI_API_KEY=你的密钥
OPENAI_BASE_URL=https://code.rayinai.com/v1
OPENAI_MODEL=gpt-5.6-terra
```

以上为 RayinAI 中转配置。`OPENAI_BASE_URL` 也可以改为其他支持 Chat Completions 的兼容服务地址。变量配置后重新部署；本地仅运行 Vite 时 `/api/ai-chat` 不会存在，因此会提示服务未连接。
