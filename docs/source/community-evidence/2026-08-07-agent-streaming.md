# Agent 与实时通信题源证据（2026-08-07）

本文件只记录公开帖子中可见的面试主题、规范化题目和技术校验来源。原帖图片不复制进仓库；回答内容由官方规范重新核验，不把社区答案当作技术定论。

## 准入规则

- “真实面经题干”只用于证明该主题确实被公开面经提及，不代表能够独立验证面试录音。
- 多个原始追问合并成一道规范题时，必须写明“规范化”或“工程安全延伸”。
- OWASP、RFC、MDN、MCP、Agent Skills 等资料只用于校验答案，不能替代社区题源。
- 无法稳定访问正文、只有搜索摘要或无法确定题干的页面不作为本轮主来源。

## 证据记录

| 平台 | 帖子 | 可见原始主题（转述） | 规范化入库题 | 证据级别 |
| --- | --- | --- | --- | --- |
| 小红书 | [淘天 AI Agent 一面](https://www.xiaohongshu.com/explore/6a677c95000000001302f0fb) | MCP 工具接口与入参出参、MCP 前的工具调用链、MCP 流式结果、多 Agent State、Checkpoint、失败重试与降级 | Q79、Q80 | 登录态下直接查看帖子题目图片 |
| 小红书 | [AI 应用开发一面](https://www.xiaohongshu.com/explore/6a342fec00000000210215bc) | MCP 执行流程、MCP 与 Tool Calling、Skill 与原有工具模式、Agent 外部工具 | Q78、Q79 | 登录态下直接查看帖子题目图片 |
| 牛客 | [23 个 Agent 连续追问](https://www.nowcoder.com/discuss/864153617182355456) | Function Call、MCP、Tool、Skill 的区别，如何写好 Tool | Q78 | 公开正文 |
| 牛客 | [AI 应用开发进阶面](https://www.nowcoder.com/discuss/908750485325086720) | Tool Calling 机制、MCP 架构、Skill 与 MCP、工具层定义和调用流程 | Q78、Q79 | 公开正文 |
| 牛客 | [第四范式 Agent 实习面经](https://www.nowcoder.com/feed/main/detail/77a81a03b55143c89d1caf76833676d9) | MCP 适配、ReAct Agent、写操作确认节点 | Q80 | 公开正文 |
| 牛客 | [字节 SSE / WebSocket 追问](https://www.nowcoder.com/discuss/888046680824639488) | SSE 与 WebSocket 的区别、为什么 AI 回答使用 SSE、为什么指数退避优于固定重连 | Q81 | 公开正文 |
| 牛客 | [网易互娱 SSE、长连接与鉴权](https://www.nowcoder.com/feed/main/detail/fcdbf2d6868347bc8256068c60dd70a0) | SSE 与 Streamable HTTP、长连接失效、网关切断、鉴权设计 | Q81 | 公开正文 |
| 牛客 | [WebSocket 如何鉴权](https://www.nowcoder.com/discuss/comment/14201373) | WebSocket 鉴权 | Q82 的原始问题起点 | 公开题目列表 |
| CSDN | [WebSocket 握手、消息鉴权与限流](https://blog.csdn.net/jam_yin/article/details/154494892) | 握手鉴权、逐消息授权、速率限制和空闲清理 | Q82 工程安全校验 | 社区工程实践，不标为原面试题 |

## 技术校验

- [Agent Skills 规范](https://agentskills.io/specification)
- [MCP 架构](https://modelcontextprotocol.io/docs/learn/architecture)
- [MCP Lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
- [MCP Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [MCP Transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [MCP Authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
- [OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)
- [MDN：Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [MDN：WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [RFC 6455](https://www.rfc-editor.org/rfc/rfc6455.html)

## 明确未采用

- 没有拿到可稳定核验题干的脉脉页面，本轮不伪造“脉脉来源”。
- 小林 Coding 用于基础知识校准，不用于证明 Agent / MCP 或 WebSocket 安全题真实出现。
- “CSWSH、消息洪泛、连接耗尽”标为从真实鉴权问题扩展的工程安全追问，不宣称是社区帖子逐字原题。
