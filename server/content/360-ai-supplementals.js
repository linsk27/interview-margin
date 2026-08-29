export const SUPPLEMENTAL_360_AI_MARKDOWN = `# Agent 工程：MCP、Skill 与 Tool

## Q78：MCP、Tool Calling 与 Skill 分别解决什么问题？
**短回答：**

- 这几个词不能互换，因为它们分别表示“可执行能力、模型的调用意图、连接能力的协议、完成任务的操作说明和负责编排的运行主体”。
- **Tool** 是可执行能力及其输入输出契约，例如查询订单、检索文档或写入工单。
- **Tool Calling** 是模型用结构化参数表达“要调用哪个 Tool”的机制，真正执行、鉴权和回填结果仍由宿主应用负责。
- **MCP** 是 Host、Client 与 Server 之间发现和调用 Tools、读取 Resources、使用 Prompts 的标准协议。
- **Skill** 是按需加载的操作说明与配套资源，通常包含说明、脚本、参考资料和模板；它教 Agent “怎样完成一类任务”，但本身不等于远程协议或已经执行的 Tool。
- **Agent** 负责理解目标、选择 Skill、决定是否调用 Tool，并控制循环、确认、失败恢复和停止条件。

**原理：**

因为一份“怎么排查事故”的说明不能自己读取线上告警，模型输出“调用 get_alerts”也不代表系统已经执行，所以 Skill、Tool Calling、Tool 与负责授权执行的宿主必须分层。只有宿主完成参数校验和真实调用，动作才发生。沿着这条边界看：

1. **模型层**：Tool Calling 产生工具名与 JSON 参数，输出只是调用意图，不应直接产生副作用。
2. **协议层**：MCP 用 JSON-RPC、生命周期与能力协商，把工具发现和调用从某一家模型 API 中解耦。
3. **知识层**：Skill 通过渐进披露加载说明；启动时只暴露名称与描述，命中任务后再读取完整步骤和所需资源。
4. **编排层**：Agent 把用户目标、上下文、Skill 指引、工具结果和停止条件串成一次可观测运行。

因此“接了 MCP 就有 Agent”“写了 Skill 就会自动执行”都不成立。MCP Server 可能只暴露一个只读 Tool；Skill 也可能完全不调用工具，只规范分析与交付格式。

**代码 / 场景：**

~~~text
用户：检查线上告警并生成复盘
  -> Agent 命中 incident-review Skill，读取排障步骤和复盘模板
  -> 模型选择 get_alerts Tool，并给出结构化参数
  -> Host 将调用映射到 MCP Client
  -> MCP Server 鉴权、执行并返回结果
  -> Agent 按 Skill 校验证据，必要时请求人工确认，再生成复盘
~~~

面试时可用“可移植排障流程”解释 Skill，用“统一连接告警平台”解释 MCP，用“get_alerts”解释 Tool，用“模型输出工具名和参数”解释 Tool Calling。

**递进追问：**

1. **Skill 中可以带脚本，那它是不是 Tool？**

   不必然。脚本是 Skill 的资源；只有宿主把它注册为可调用能力并定义输入、输出、权限与错误语义后，它才成为 Tool。不能因为目录里有脚本就绕过执行授权。
2. **MCP 与普通 REST API 是替代关系吗？**

   不是。MCP Server 经常在内部复用 REST、数据库或命令行能力；MCP 统一的是 AI Host 侧的发现和调用协议，业务服务是否继续提供 REST 是另一层决策。
3. **如何判断应该写 Skill 还是接 MCP？**

   可复用的步骤、规范和模板优先放 Skill；需要访问外部实时数据或执行动作时提供 Tool；当多个 Host 需要以统一协议发现这些能力时，再通过 MCP 暴露。

**易错点：**

- 不要把 Tool Calling 说成模型自己执行了函数；模型只生成调用意图。
- 不要把 MCP 说成 Agent 框架、模型或知识库。
- 不要宣称所有产品中的 Skill 都完全同构；应先说明所采用的 Skill 规范。
- 不要让 Skill 文本或 Tool 描述替代服务端鉴权、参数校验和人工确认。

**参考来源：**

- [社区题源｜小红书：AI 应用开发一面](https://www.xiaohongshu.com/explore/6a342fec00000000210215bc)
- [社区题源｜牛客：一场面试中的 Agent、MCP 与 Skill 问题](https://www.nowcoder.com/discuss/864153617182355456)
- [社区题源｜牛客：AI 应用开发进阶面](https://www.nowcoder.com/discuss/908750485325086720)
- [官方校验｜Agent Skills 规范](https://agentskills.io/specification)
- [官方校验｜MCP 架构](https://modelcontextprotocol.io/docs/learn/architecture)
- [官方校验｜OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)

## Q79：MCP 工具接口如何设计，发现、调用与流式结果怎样串起来？
**短回答：**

MCP 工具链要把“发现能力、模型选择、受控执行、结果回传”拆成四个明确阶段；模型只提出调用意图，Host 才负责参数校验、用户授权、执行和结果关联。完整链路是：

1. Client 与 Server 先执行 initialize，协商协议版本和 capabilities，再进入 operation。
2. Client 通过 tools/list 获取名称、描述和 input schema，Host 将它转换为模型可见的工具定义。
3. 模型生成工具调用后，Host 校验参数、用户权限和确认策略，再发 tools/call。
4. Server 返回结构化结果或错误；Host 把结果关联到原 call id，交给模型继续推理或直接展示。
5. 传输层可流式承载消息，工具也可发送进度通知，但“流式传输”“业务进度”和“最终调用结果”要分开建模。

**原理：**

- **Schema 要窄**：名称稳定，描述写清适用条件；参数使用明确类型、枚举、长度和 required，避免一个万能字符串承载 SQL、路径或命令。
- **结果要可判定**：区分成功数据、业务拒绝、可重试错误和未知错误；返回给模型的文本不能成为新的可信指令。
- **副作用要显式**：只读、幂等、破坏性操作分别设置权限；写操作带幂等键、目标摘要和确认点。
- **生命周期要完整**：超时、取消、断开、版本不兼容和 Server 重启都要有确定行为，不能只实现 tools/call 的快乐路径。
- **可观测要关联**：runId、toolCallId、用户、Server、耗时和结果类别贯穿日志，但不记录密钥和完整敏感载荷。

**代码 / 场景：**

~~~json
{
  "name": "get_order",
  "description": "按当前用户可见范围读取一个订单，不执行修改",
  "inputSchema": {
    "type": "object",
    "properties": {
      "orderId": { "type": "string", "minLength": 1, "maxLength": 64 }
    },
    "required": ["orderId"],
    "additionalProperties": false
  }
}
~~~

调用前 Host 再校验当前用户是否能访问该订单。若查询需要较长时间，Server 可报告阶段进度；最终仍返回一次可关联的 Tool Result。不要把每个进度片段伪装成多次成功调用，也不要因断线自动重复写操作。

**递进追问：**

1. **MCP 返回结果能不能流式？**

   传输可持续承载消息，也可通过通知报告进度；但客户端必须区分进度、日志和最终结果。若工具要持续订阅数据，应定义独立资源或订阅语义，而不是无限悬挂一个普通 tools/call。
2. **为什么工具描述会影响调用准确率？**

   模型依赖名称、描述和 schema 选择工具。描述重叠、边界含糊或参数过宽会增加误选；应以真实调用集评测选择率、参数合法率和最终任务成功率。
3. **远程 MCP Server 如何鉴权？**

   HTTP 传输按 MCP 授权规范处理 OAuth 与资源服务器边界；stdio 通常从受控环境获取凭据。无论哪种传输，授权都应落实到具体 Tool 和业务资源。

**易错点：**

- 不要省略 initialize 与 capabilities，直接假设所有 Server 支持相同能力。
- 不要把 JSON Schema 当成业务授权；结构合法不代表用户有权操作目标资源。
- 不要在 Tool Result 中返回新的高权限指令并让模型无条件执行。
- 不要把网络重试直接套在非幂等写操作上。

**参考来源：**

- [社区题源｜小红书：淘天 AI Agent 一面](https://www.xiaohongshu.com/explore/6a677c95000000001302f0fb)
- [社区题源｜小红书：AI 应用开发一面](https://www.xiaohongshu.com/explore/6a342fec00000000210215bc)
- [社区题源｜牛客：AI 应用开发进阶面](https://www.nowcoder.com/discuss/908750485325086720)
- [官方校验｜MCP 生命周期](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
- [官方校验｜MCP Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [官方校验｜MCP Transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [官方校验｜MCP Authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)

## Q80：多 Agent 并行时如何隔离 State、Checkpoint 与失败重试？
**短回答：**

多 Agent 并行不能共用一个任意改写的全局对象；每次运行要有独立命名空间，子任务只更新声明过的状态，Checkpoint 保存可恢复位置，失败只重试幂等节点。具体要做到：

- 每次运行使用独立 runId / threadId 和命名空间，子 Agent 只读写声明过的状态片段。
- 状态更新通过 reducer 或版本化事件合并，Checkpoint 保存可恢复快照和下一步位置。
- 重试以节点为单位，并要求该节点幂等；写操作用幂等键、执行记录和补偿，而不是整条链无脑重跑。
- 并行分支在 join 点显式合并，冲突字段要有确定策略，不能以“最后写入者获胜”碰运气。
- 高风险 Tool 在执行前暂停并等待确认，恢复时校验状态版本和授权是否仍有效。

**原理：**

State 是一次运行的业务事实，Checkpoint 是某个确定时刻可恢复的持久化表示，两者都不应等同于进程内全局变量。父 Agent 创建子任务时传入最小上下文和独立命名空间；子任务返回结构化产物，由父节点合并。并行写同一字段时，使用追加事件、集合并集、带版本 compare-and-set 或业务 reducer。

失败至少分四类：瞬时网络错误可有限重试；参数错误回到规划或人工修正；权限拒绝不得重试绕过；已有副作用但响应丢失时先用幂等键查询执行结果。Checkpoint 还应记录模型、Prompt、Tool 版本和关键配置，否则“恢复”可能在新配置下走出另一条路径。

**代码 / 场景：**

~~~text
run-42
  plan
   ├─ research / namespace=run-42:research
   └─ verify   / namespace=run-42:verify
  join(reducer: citations 去重 + conflicts 显式保留)
  await_approval(version=7)
  publish(idempotencyKey=run-42:publish:v7)
~~~

research 超时只重试 research；verify 已完成的结果从 Checkpoint 恢复。用户确认后若状态已从 version 7 变为 8，旧确认失效并重新展示影响范围，避免批准对象被替换。

**递进追问：**

1. **Checkpoint 越频繁越好吗？**

   不是。频繁持久化增加延迟和存储；应放在昂贵步骤后、人工确认前、外部副作用前后和可恢复边界上，并通过故障注入验证恢复点。
2. **子 Agent 能否共享同一个 Memory？**

   可以共享经过授权的只读事实或显式共享区，但会话草稿、工具凭据和临时推理不应默认广播。共享内容要有范围、版本、来源和清理策略。
3. **怎样证明重试没有重复执行？**

   对写 Tool 使用业务幂等键和执行表；测试“服务端成功但响应丢失”场景，重试后应读取同一执行结果，而不是创建第二次副作用。

**易错点：**

- 不要把所有状态塞进一个可变 Map，并让多个 Agent 任意覆盖。
- 不要把异常全部归为“再问一次模型”；权限和确定性参数错误不会因此消失。
- 不要只保存对话文本却遗漏节点位置、Tool 结果和配置版本。
- 不要在恢复后自动执行旧的人工确认，确认必须绑定具体版本与影响范围。

**参考来源：**

- [社区题源｜小红书：淘天 AI Agent 一面](https://www.xiaohongshu.com/explore/6a677c95000000001302f0fb)
- [社区题源｜牛客：第四范式 Agent 实习面试](https://www.nowcoder.com/feed/main/detail/77a81a03b55143c89d1caf76833676d9)
- [官方校验｜LangGraph Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- [官方校验｜OpenAI Agents SDK：Human in the loop](https://openai.github.io/openai-agents-js/guides/human-in-the-loop/)

# 实时通信可靠性与攻击防护

## Q81：SSE / WebSocket 长连接怎样鉴权，断线后如何避免重连风暴？
**短回答：**

长连接要同时解决“谁能连、能做什么、断了怎么恢复、很多客户端一起重连怎么办”。可靠方案包含五层：

1. 建连前完成身份认证，订阅或每条消息继续做资源级授权；连接成功不等于永久拥有所有操作权限。
2. 用心跳发现半开连接，并让心跳间隔小于链路中最短的空闲超时。
3. 断线后采用有上限的指数退避、随机抖动和总重试预算；401、403、协议错误不自动重试。
4. 重连携带 runId、事件游标或序号，服务端去重并从可重放窗口续发，避免重复启动模型或重复写操作。
5. 页面隐藏、网络切换和服务发布时只允许一个重连调度器运行，旧连接、定时器和监听器全部清理。

**原理：**

连接可能被浏览器休眠、移动网络切换、Nginx / 网关空闲超时、服务重启或中间 NAT 回收。固定间隔重试会让大量客户端在同一时刻再次冲击服务；指数退避降低频率，jitter 打散请求，但必须设置最大延迟和总时长。

原生 EventSource 主要使用 GET，不能随意设置 Authorization Header；可使用安全 Cookie、先创建一次性订阅票据再 GET，或改用 fetch 流。票据应短期、一次性并绑定用户、订阅目标与来源，不能把长期 Token 放进 URL、日志和 Referer。WebSocket 建连时校验身份与 Origin，握手后仍按消息类型和资源做授权。

**代码 / 场景：**

~~~text
POST /runs              -> 创建 runId（幂等）
GET  /runs/42/events    -> SSE，携带短期订阅凭据
断线 lastEventId=107
等待 min(cap, base * 2^attempt) + jitter
GET  /runs/42/events    -> 从 108 续发；不重新创建 run
~~~

若服务端返回 401 / 403，客户端停止自动重试并要求重新登录；若事件游标已过期，先拉取 run 快照再继续，而不是把新旧片段盲目拼接。

**递进追问：**

1. **心跳能替代业务消息确认吗？**

   不能。心跳只证明双方在某个时刻还能收发链路级数据，不证明某条业务消息已通过校验、持久化或完成副作用；ACK 还可能丢失，发送方重试会造成重复投递。每条业务事件应有 eventId/seq，消费端以幂等键提交并返回明确 ACK，重连后按游标补发；对扣款等关键动作还要查询权威状态。通过丢 ACK、重复事件和断线重连测试，验证结果只生效一次。
2. **为什么 jitter 仍需重试预算？**

   jitter 只打散时间，不能阻止永久故障下的无限请求。预算耗尽后应进入手动恢复或较低频探测。
3. **SSE 自动重连是否一定无损？**

   不一定。服务端必须保存可重放窗口并正确处理 Last-Event-ID；超出窗口时返回快照恢复策略，否则只能重新开始。

**易错点：**

- 不要把 Token 长期放在 EventSource URL 查询参数中。
- 不要对 401、403、参数错误和协议错误无限重试。
- 不要在重连时重新创建生成任务，导致重复计费或副作用。
- 不要只清理连接却遗漏重连定时器和网络、可见性监听器。

**参考来源：**

- [社区题源｜牛客：字节前端 SSE / WebSocket 追问](https://www.nowcoder.com/discuss/888046680824639488)
- [社区题源｜牛客：网易互娱 SSE、长连接与鉴权](https://www.nowcoder.com/feed/main/detail/fcdbf2d6868347bc8256068c60dd70a0)
- [社区题源｜牛客：Shopee WebSocket 心跳、重连与 JWT](https://www.nowcoder.com/feed/main/detail/e82a37ee238f4157af6e6c2d33fb31eb)
- [官方校验｜MDN：Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [官方校验｜Nginx：proxy read timeout](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [官方校验｜AWS：Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)

## Q82：WebSocket 如何防御 CSWSH、消息洪泛和连接耗尽？
**短回答：**

WebSocket 防护要分握手、消息和资源三层：握手校验 WSS、身份与 Origin；每条消息继续做 schema 和资源级授权；连接数、速率、消息大小和发送队列都必须有上限，超限就降级或断开。

- **跨站握手**：使用 WSS，严格等值校验 Origin allowlist；Cookie 会被浏览器自动带上时，要防跨站 WebSocket 劫持（CSWSH）。
- **授权绕过**：握手认证后，每条消息仍校验 action、目标资源和当前会话；退出、封禁或 Token 过期时主动断开。
- **资源耗尽**：设置全局、租户、用户和 IP 连接上限，握手与消息分别限流，并设置空闲与最大生命周期。
- **消息攻击**：只接受明确 schema，限制单帧、分片重组后完整消息和队列大小；持续超限直接关闭。
- **慢消费者**：监控发送缓冲和有界队列，合并非关键 delta；长期积压时取消上游或断开，不能无限占内存。
- **内容注入**：收到的文本和流式 AI 内容均按不可信数据处理，安全渲染 Markdown，禁止 eval 和原始危险 HTML。

**原理：**

CSWSH 类似针对 WebSocket 握手的跨站请求利用：恶意页面可能借受害者 Cookie 建连并读写数据。WebSocket 不依赖普通 CORS 预检作为安全边界，所以服务端要校验 Origin；但 Origin 也不能替代身份认证和消息级授权，因为非浏览器客户端可自行构造请求。

DoS 不只来自连接数。攻击者还可以频繁握手、发送超大分片消息、制造压缩放大、让服务端为未授权连接提前分配昂贵资源，或作为慢消费者让发送队列不断增长。防护要在昂贵操作之前完成认证、大小检查和配额判断。

**代码 / 场景：**

~~~text
Upgrade 请求
  -> WSS + Origin 精确白名单
  -> 认证会话 / 一次性票据
  -> 用户与 IP 连接配额
  -> 建连
每条消息
  -> 最大尺寸 -> JSON Schema -> action / resource 授权 -> 速率限制
发送侧
  -> 有界队列 -> 高水位降级 -> 持续积压则关闭并取消上游
~~~

关闭连接时使用明确的业务错误码，但发给客户端的信息保持最小；安全日志记录用户、来源、动作和拒绝原因，不写入 Token、Cookie 或完整敏感消息。

**递进追问：**

1. **为什么只校验 Origin 仍不安全？**

   Origin 主要约束浏览器跨站场景，脚本客户端可伪造；服务端仍需认证、资源级授权、速率限制和审计。
2. **经典 WebSocket API 的 bufferedAmount 能做什么？**

   它能提示客户端发送缓冲积压，可用于暂停非关键发送或断开；服务端还必须有自己的有界队列和慢消费者策略，不能只依赖浏览器指标。
3. **握手成功后用户退出登录怎么办？**

   服务端维护会话到连接的映射，注销或撤销时关闭相关连接；长连接也要周期性检查会话有效性，不能只在握手时验证一次。

**易错点：**

- 不要说“配置了 CORS 就能防 CSWSH”；WebSocket 握手必须单独校验 Origin。
- 不要只限制单帧大小而忽略分片重组后的完整消息。
- 不要在认证前创建模型任务、数据库订阅或大缓冲区。
- 不要把未消毒的流式片段直接写入 innerHTML。

**参考来源：**

- [社区题源｜牛客：WebSocket 如何鉴权](https://www.nowcoder.com/discuss/comment/14201373)
- [社区题源｜牛客：Shopee WebSocket、JWT、XSS 与 CSRF](https://www.nowcoder.com/feed/main/detail/e82a37ee238f4157af6e6c2d33fb31eb)
- [工程安全延伸｜CSDN：WebSocket 握手、消息鉴权与限流](https://blog.csdn.net/jam_yin/article/details/154494892)
- [官方校验｜OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)
- [官方校验｜RFC 6455](https://www.rfc-editor.org/rfc/rfc6455.html)
- [官方校验｜MDN：WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
`
