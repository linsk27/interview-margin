/**
 * Concrete teaching examples for the legacy interview bank.
 *
 * These entries intentionally cover questions whose authored Markdown does not
 * have a section that the learning reader recognises as practice. The content
 * stays separate from the global formatter so another bank can never inherit a
 * resume-specific or project-specific example by accident.
 */
const LEGACY_EXAMPLES = new Map([
  ['1', `**示例场景：**

用同一个“给用户对象新增 age”小实验对照 Vue2 和 Vue3：页面先显示 \`name=小林\`，点击按钮后执行 \`user.age = 18\`。在 Vue2 中，直接新增的属性可能不会触发视图更新，需要 \`Vue.set(user, 'age', 18)\`；在 Vue3 的 \`reactive\` 对象中，Proxy 能拦截这次新增，页面会直接显示 \`age=18\`。

再做一个数组实验：把第一项从“待办”改成“完成”。Vue2 要特别留意按下标赋值的响应式限制；Vue3 可以拦截数组下标与 length 的变化。这个对照不是为了证明 Vue3 一定更快，而是观察两代响应式的“拦截范围”不同。

**对照结果：**

如果新增属性和数组下标修改都能自动更新页面，说明 Vue3 的代理覆盖了这些操作；Vue2 需要专用 API 的现象，则说明它只能预先劫持已有属性。`],

  ['2', `**示例场景：**

做一个只显示姓名的 Vue3 组件，状态是 \`reactive({ name: '小林', age: 24 })\`。第一次渲染时模板只读取 \`user.name\`，可以把它理解成 track 记录了“这个组件依赖 name”。随后分别执行两次操作：

1. 把 \`age\` 改成 25：页面不用重渲染，因为当前组件没有读取 age。
2. 把 \`name\` 改成“小陈”：trigger 找到依赖 name 的组件并安排更新，页面才重新显示姓名。

~~~ts
// 示例重点：只让副作用订阅 name，修改无关的 age 不应触发这次输出
const user = reactive({ name: '小林', age: 24 })
watchEffect(() => console.log('姓名：', user.name))
user.age = 25
user.name = '小陈'
~~~

**对照结果：**

控制台首次打印“小林”，修改 age 时不新增日志，修改 name 时才打印“小陈”；这说明 track 负责建立精确依赖，trigger 只通知相关依赖。`],

  ['3', `**示例场景：**

假设代理一个带继承关系的对象：target 是真正被代理的原对象，key 是本次读取的属性名，receiver 是“这次访问最初从哪个对象发起”。先读取 \`proxy.price\`，再让 \`child = Object.create(proxy)\` 并读取 \`child.price\`，两次 target 和 key 相同，但第二次 receiver 是 child。

| 操作 | target | key | receiver 的意义 |
| --- | --- | --- | --- |
| \`proxy.price\` | 原商品对象 | \`"price"\` | proxy |
| \`child.price\` | 原商品对象 | \`"price"\` | child |
| \`proxy[listSymbol]\` | 原商品对象 | Symbol | proxy |

这个例子也说明 key 不一定是字符串，它还可能是 Symbol；使用 \`Reflect.get(target, key, receiver)\` 能把正确的 receiver 继续传给 getter。

**对照结果：**

当属性是普通值时 receiver 看起来不明显；一旦 getter 读取 \`this\` 或对象存在继承关系，传错 receiver 就可能让 getter 读到错误对象。`],

  ['4', `**示例场景：**

给商品对象定义一个 getter：\`finalPrice\` 会读取 \`this.discount\`。再创建 child 继承代理对象，并把 child.discount 设为 0.8。若 Proxy 的 get 里直接写 \`target[key]\`，getter 的 this 可能绑定到 target，得到原对象的折扣；改用 \`Reflect.get(target, key, receiver)\`，getter 才会从 child 读取 0.8。

~~~js
// 示例重点：把 receiver 继续传下去，保证 getter 内的 this 指向访问发起者
const product = { price: 100, discount: 1, get finalPrice() { return this.price * this.discount } }
const proxy = new Proxy(product, { get: (target, key, receiver) => Reflect.get(target, key, receiver) })
const child = Object.create(proxy)
child.discount = 0.8
console.log(child.finalPrice) // 80
~~~

**对照结果：**

输出 80 说明 getter 使用了 child 的折扣；如果错误地固定从 target 取值，常会得到 100，这就是 Proxy 中优先配合 Reflect 的实际原因。`],

  ['6', `**示例场景：**

用一个 300 字段的供应商表单做对照。旧实现 \`watch(form, handler, { deep: true })\`：只改“国家”字段，也会遍历整棵 form，并重新计算所有联动。新实现把规则写成依赖关系：\`supplierType → country\`、\`country → taxRate\`，国家改变时只计算 taxRate。

验收时连续切换国家 20 次，记录三项数据：规则执行次数、组件更新数、最长主线程任务。还要快速执行“中国→美国→中国”，确认美国税率请求即使后返回，也不会覆盖当前中国选项。

**对照结果：**

若新实现每次只命中与 country 有关的规则，渲染和请求数量随“受影响字段数”增长，而不是随全部 300 个字段增长，就证明字段级订阅真正缩小了更新范围。`],

  ['9', `**示例场景：**

后端把订单金额从数字改成字符串 \`"199.00"\`，但前端接口仍声明 \`price: number\`。TypeScript 编译不会请求真实接口，所以代码能通过编译；运行后执行 \`price + 1\` 却得到 \`"199.001"\`。这说明 TS 保护的是开发时的代码关系，不会自动验证网络里的 JSON。

~~~ts
// 示例重点：unknown 先经过运行时校验，成功后才获得可信的 Order 类型
const raw: unknown = await response.json()
const parsed = OrderSchema.safeParse(raw)
if (!parsed.success) throw new Error('订单响应格式不符合约定')
renderPrice(parsed.data.price + 1)
~~~

另一个直接收益是重构：把 \`userId\` 改名为 \`ownerId\` 时，编译器能列出所有漏改位置，而不是等用户点到那个页面才报错。

**对照结果：**

运行时 schema 能在数据入口明确拒绝 \`price: "199.00"\`，TS 则继续保证校验后的 Order 在组件和函数间正确传递；两者配合才覆盖完整链路。`],

  ['15', `**示例场景：**

比较两个真实需求。需求 A 是“用户发一句问题，服务端连续返回 300 个文本增量，停止回答另走一个 HTTP 接口”；这是一次请求、单向长响应，fetch 流就够。需求 B 是“20 人协同白板，每个人的鼠标、选择框和编辑操作都要随时双向广播”；双方都高频发送，WebSocket 更合适。

| 观察项 | AI 问答 fetch 流 | 协同白板 WebSocket |
| --- | --- | --- |
| 上行 | 开始时一次 POST | 连接期间持续发送 |
| 下行 | 服务端持续推文本 | 双方都持续推事件 |
| 取消 | AbortController + 取消接口 | 自定义消息或关闭连接 |
| 恢复 | 用 runId/seq 续传或重试 | 自己设计重连和状态同步 |

**对照结果：**

AI 问答不因为“逐字出现”就必须用 WebSocket；只有客户端也需要在同一通道高频推送，或需要二进制/双向实时协作时，WebSocket 的复杂度才有明确收益。`],

  ['16', `**示例场景：**

假设服务端每 100ms 发一条事件：\`data: {"delta":"你"}\n\n\`、\`data: {"delta":"好"}\n\n\`。响应会一直保持打开 8 秒。若一开始调用 \`await response.json()\`，浏览器会等整个 body 结束后才尝试把所有字节当成一个 JSON，既看不到逐步输出，也会因多条 data 事件不是单个 JSON 而解析失败。

~~~ts
// 示例重点：response.body 是持续到达的字节流，要逐块读取而不是等完整 JSON
const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()
while (true) {
  const { value, done } = await reader.read()
  if (done) break
  pending += value
  pending = consumeCompleteSseEvents(pending)
}
~~~

**对照结果：**

逐块读取时“你”“好”会按到达时间显示，并能保留半条事件到下一轮；response.json() 只适合响应结束后整体就是一个合法 JSON 的普通接口。`],

  ['17', `**示例场景：**

以“公司差旅超过 500 元需要谁审批？”为例，RAG 链路可按 6 步观察：

1. 离线把《2026 差旅制度》按章节切成小段，并保存文档名、页码、版本和部门权限。
2. 为每段生成向量并建立索引，同时保留“500 元”“审批”等关键词字段。
3. 用户提问后，先按租户、权限和有效版本过滤，再做关键词 + 向量召回。
4. 对候选重排，选出“住宿报销”章节，而不是旧版制度。
5. 把问题和 3 段证据交给模型，要求只据此回答并给出处。
6. 页面显示“直属经理审批”，同时链接到制度第 4.2 节；证据不足则明确说无法确认。

再做一个反例：把另一租户的制度设成语义最相近。若权限过滤正确，它即使相似度第一也绝不能进入 Prompt。

**对照结果：**

能命中正确版本、阻断越权片段、回答中带可核对出处，才说明完整 RAG 链路成立；只把向量搜索结果拼进 Prompt 还不够。`],

  ['24', `**示例场景：**

面试官说“这个采购单项目不就是 CRUD 吗”，不要急着反驳。可以拿“撤回采购单”这一条链路回答：表面是把 status 从 SUBMITTED 改回 DRAFT，实际要同时满足“当前用户是申请人、审批尚未开始、版本号未变化”，并写审计记录；若审批人刚好同时通过，更新必须有一个失败并提示刷新。

可以这样组织 40 秒回答：

1. **事实：** 页面当然包含增删改查。
2. **约束：** 撤回不是任意改状态，还受角色、当前状态与并发版本约束。
3. **行动：** 前端禁用重复提交，后端用 \`WHERE id=? AND status='SUBMITTED' AND version=?\` 条件更新。
4. **证据：** 并发测试里只能有一个请求影响 1 行，另一个返回 409。

**对照结果：**

这样的回答没有否认 CRUD，而是用业务不变量、失败路径和可验证数据说明工程难点；只说“项目很复杂、做了很多组件”仍然回答不到面试官真正关心的贡献。`],

  ['25', `**示例场景：**

用“供应商准入申请”说明 SRM 的复杂度。采购员选择“海外供应商”后，页面要显示国家和海关编码；财务只能看税务字段；法务驳回后申请人可修改指定区块；审批通过后关键字段锁定。两人同时编辑时还要避免后保存的人覆盖先保存结果。

把同一业务拆成四层核对：

| 层 | 具体约束 | 失败表现 |
| --- | --- | --- |
| 表单 | 字段联动、异步校验 | 旧请求覆盖新输入 |
| 权限 | 字段级可见与可编辑 | 隐藏按钮却仍能调接口 |
| 流程 | 状态机与审批角色 | 已生效单据又被提交 |
| 数据 | 版本、审计、幂等 | 并发覆盖或重复建单 |

**对照结果：**

如果只完成表格和保存接口，它确实接近普通 CRUD；只有把字段、权限、流程和并发约束落到前后端并能验证失败路径，才体现 SRM 的业务复杂度。`],

  ['30', `**示例场景：**

三个组件在同一时刻都要读取“国家字典”。第一次请求创建 Promise 放进 \`pendingMap\`，后两次复用它，所以网络面板只出现 1 个请求；成功后结果进入带过期时间的 cache，并从 pendingMap 删除。5 分钟内再次打开弹窗直接读 cache，不再请求。

~~~ts
// 示例重点：pendingMap 合并正在飞行的请求，cache 复用已经成功的结果
async function getDictionary(key: string) {
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.value
  if (pendingMap.has(key)) return pendingMap.get(key)!
  const task = api.loadDictionary(key).then(value => {
    cache.set(key, { value, expiresAt: Date.now() + 5 * 60_000 })
    return value
  }).finally(() => pendingMap.delete(key))
  pendingMap.set(key, task)
  return task
}
~~~

再验证失败路径：第一次请求返回 500 后，pendingMap 必须清掉；点击重试应发出新请求，而不是永远复用一个 rejected Promise。

**对照结果：**

并发三次只有一个网络请求、成功后可命中缓存、失败后还能重新请求，才说明“请求去重”和“结果缓存”各自承担了正确职责。`],

  ['32', `**示例场景：**

把 AMZ123 假设成“选择产品→填写地址→确认→完成”的 4 步流程。用户在第 2 步刷新页面时，从 sessionStorage 恢复草稿并校验版本；用户直接把 URL 改成第 4 步时，守卫检查前置步骤未完成，把他送回第 1 步并解释原因；第 3 步连续点击两次提交，只允许一个请求进入服务端。

再走三条异常路径：

1. 地址接口超时：保留用户输入并允许重试，不推进 step。
2. sessionStorage 是旧 schemaVersion：迁移成功才恢复，否则安全回到初始状态。
3. 提交成功但跳转前刷新：用服务端订单状态恢复为“完成”，避免重复下单。

**对照结果：**

刷新、越级、连点和接口失败后都能恢复到一个合法步骤，并且不丢输入、不重复提交，才证明纯前端多步骤流程不只是切换几个组件。`],

  ['34', `**示例场景：**

用“员工问 2026 年报销规则”区分普通聊天壳和 ContextForge。普通聊天壳只把问题发给模型；ContextForge 先识别租户和用户权限，再检索当前生效的制度片段，把文档标题、章节和引用一起送入生成，并通过 SSE 返回答案。

验收准备 20 组固定问题，每组标明“应该命中的文档与段落”。记录四个阶段：正确文档是否入库、是否进入召回 Top 5、是否排到上下文前列、最终答案是否被引用支持。再放入一份已失效制度和一份其他租户制度，二者都不能出现在答案证据中。

**对照结果：**

能展示权限过滤、检索命中、引用出处和分层指标，才证明 ContextForge 有知识链路；只有一个输入框、模型接口和流式打字效果，仍然只是普通聊天壳。`],

  ['36', `**示例场景：**

让用户通过 STEMM 小程序给设备配置 Wi-Fi，可以按一次完整操作演示：扫描到序列号末四位为 1027 的设备→建立 BLE 连接→发现目标 service 和 write/notify characteristic→把中文 SSID 与密码编码成字节并分片写入→设备逐片 ACK→设备连接路由器→云端确认 online。

同时演示两个失败案例：

1. 第 3 片 2 秒未 ACK：只重传第 3 片，最多 3 次，而不是从头盲发。
2. 手机蓝牙已连接但云端未上线：把界面停在“设备连 Wi-Fi/云端确认”阶段，提示检查 2.4GHz、密码和网络，而不是误报“蓝牙失败”。

**对照结果：**

用户能看到当前阶段，分片可确认和重试，BLE 成功与设备上云成功被明确区分，才说明配网流程具备可恢复性，而不是一条无法定位的 loading。`],

  ['38', `**示例场景：**

当面试官说“你技术面很广，但每块都不深”，可以选一个真正负责过的闭环来回答，而不是逐个罗列名词。例如：“我的职责边界主要在前端，但我把 AI 流式链路从接口接到可恢复 UI。最初中文会因半包乱码，我用增量解码和 buffer 分帧，加入取消与错误状态；用固定 50 条长回答回归后，未再出现解析错误。Embedding 和模型部署由后端同事负责，我能解释接口边界，但不把它说成自己的成果。”

再准备一个不会的追问：若被问到 CUDA 调优，可直接说明没有实操，然后关联到自己做过的浏览器流式消费与监控，避免编造。

**对照结果：**

回答同时给出职责边界、一个技术纵深、行动与验证证据，就能化解“广而不深”；继续堆名词或把团队成果全部算给自己，反而会降低可信度。`],

  ['41', `**示例场景：**

用户名输入框做异步唯一性校验。用户先输入 \`lin\`，旧请求需要 800ms；紧接着输入 \`linsk27\`，新请求只需 100ms 并返回“可用”。如果不处理乱序，800ms 后旧响应会覆盖页面，错误显示 \`lin\` 的结果。

~~~ts
// 示例重点：序号只允许最后一次输入对应的响应更新当前错误状态
let validationVersion = 0
async function validateName(name: string) {
  const version = ++validationVersion
  const result = await api.checkName(name)
  if (version !== validationVersion) return
  nameError.value = result.available ? '' : '用户名已存在'
}
~~~

生产中还可以用 AbortController 取消旧请求，但即使取消失败，版本号仍能阻止旧结果落地。防抖只能减少请求次数，不能保证网络返回顺序。

**对照结果：**

快速输入 20 次后，界面只展示最后一个值 \`linsk27\` 的校验结果；人为让旧请求最后返回也不改变 UI，才说明乱序覆盖已被解决。`],

  ['46', `**示例场景：**

固定问题“差旅住宿超过 500 元谁审批？”，并预先标记应命中《差旅制度 2026》第 4.2 节。分层查看一次失败：

1. 原文根本没入库：修解析或发布流程。
2. 已入库但 Top 10 没出现：查切块、关键词、Embedding 和权限过滤。
3. Top 10 有但排得很后：查混合召回与重排。
4. 正确片段已进 Prompt 但被截断：查 token 预算和组装顺序。
5. 证据完整但答案仍错：再查提示约束、引用校验和模型。

每层记录一个指标：文档覆盖率、Recall@10、MRR、上下文包含率和引用支持率。这样换 Embedding 或改 Prompt 后能用同一组问题复测。

**对照结果：**

只有定位到“正确片段在哪一层丢失”才算找到根因；一看到错误答案就换模型或改 Prompt，无法修复未入库、未召回或被权限过滤掉的问题。`],

  ['47', `**示例场景：**

Embedding 服务连续 3 次超时后，索引任务进入 DEGRADED 状态：新文档保存原文并排入待处理队列，检索临时退化为 BM25 关键词搜索，页面明确提示“语义检索暂不可用”，而不是返回空白。每条任务带 documentId、contentHash、modelVersion 和 retryCount，避免恢复后重复写入。

服务恢复时先用 100 条探针请求验证延迟和向量维度，再按 5%→25%→100% 逐步放量；消费待处理队列时限制并发 4，失败进入死信列表。旧索引继续服务，直到新向量覆盖率和检索回归通过。

**对照结果：**

故障期间资料不丢、查询有明确降级，恢复后没有请求洪峰或新旧维度混写，才说明 Embedding 故障被工程化处理；仅在进程里无限重试会放大雪崩。`],

  ['48', `**示例场景：**

服务端依次发送两条 SSE 事件，其中“你”这个 UTF-8 字符被网络拆成两次 read()，第二条 JSON 也只到了一半。前端用同一个 TextDecoder 以 stream 模式增量解码，把未遇到空行的尾部留在 pending buffer；下一块到达后再拼接并解析。每条事件带 \`runId=7\`、\`seq=18\`，断线重连后重复收到 seq=18 时直接去重。

~~~ts
// 示例重点：网络块不是业务消息；先连续解码，再按空行切出完整 SSE 事件
const decoder = new TextDecoder()
let pending = ''
for await (const bytes of readChunks(response.body!)) {
  pending += decoder.decode(bytes, { stream: true })
  const { events, rest } = splitCompleteEvents(pending)
  pending = rest
  events.forEach(applyEventOnce)
}
~~~

点击停止时 AbortController 同时取消 fetch、reader 和服务端上游任务，不能只让按钮消失。

**对照结果：**

在开发者工具里模拟任意分片、中文半字节、断线和重复事件后，页面仍无乱码、不漏字、不重复追加，并能真正终止上游生成，流式链路才算稳定。`],

  ['56', `**示例场景：**

同一详情页线上 LCP 为 4.8 秒，不要立刻把原因归给 SSR。用一次请求瀑布拆解：DNS+连接 120ms，TTFB 900ms，HTML 下载 80ms，首屏 JS 1.2MB 下载和执行 1.6s，主图直到 3.9s 才完成。再看服务端 trace，900ms TTFB 中有 650ms 在等三个串行接口。

按证据逐项实验：把独立接口改为并行后 TTFB 降到 380ms；路由级拆包后首屏 JS 降到 420KB；给主图预加载并固定尺寸后 LCP 降到 1.9s。每次只改一个变量，用相同设备、网络和页面数据复测 p50/p75/p95。

**对照结果：**

这个案例中 SSR 只是渲染方式，真正瓶颈分别在服务端数据瀑布、客户端脚本和 LCP 资源发现；指标分段后才能把优化动作对应到真实耗时。`],

  ['59', `**示例场景：**

商品详情缓存 TTL 到期时，2000 个并发请求同时到达。无保护版本会让 2000 次查询一起打到数据库；受控版本只有第一个请求用唯一 token \`a8f...\` 获得重建锁，其余请求短暂返回旧值或等待，数据库只执行 1 次查询。重建完成后，用“key 的值仍等于自己的 token”这个条件原子释放锁。

压测要故意覆盖三种情况：重建需要 3 秒、持锁进程在 1.5 秒时崩溃、旧请求完成时锁已过期且被新请求拿到。监控数据库 QPS、缓存命中率、等待请求数和接口 p99，而不只看平均响应。

**对照结果：**

若缓存失效峰值下数据库查询仍接近 1 次、锁持有者崩溃后能恢复，而且旧持有者不会删掉新锁，就证明重建方案既抗击穿又避免了误解锁。`],

  ['60', `**示例场景：**

用户把昵称从“林一”改成“林二”。采用 cache-aside 时，服务先提交数据库事务，再删除用户缓存；下次读取回源数据库并写入“林二”。这能缩小不一致窗口，但仍存在竞态：读请求可能在更新提交前读到“林一”，却在删除缓存后才把旧值重新写回。

可用延迟双删、消息通知、版本号或缩短 TTL 处理具体容忍度，并用故障注入验证“数据库成功但删缓存超时”。Redis AOF/RDB 只负责 Redis 自身重启后的数据恢复，不知道数据库事务，也不会自动让两份数据一致。

**对照结果：**

重启 Redis 后缓存能恢复不代表昵称一定是最新值；只有把读写时序、失败重试和允许的不一致时长讲清，才能说明缓存一致性策略，而不是把持久化当成分布式事务。`],

  ['61', `**示例场景：**

给租户 t1 的设备 d42 设计 Topic：遥测上报用 \`tenant/t1/device/d42/telemetry\`，云端命令用 \`tenant/t1/device/d42/command\`，命令回执用 \`tenant/t1/device/d42/ack\`。设备证书绑定 tenantId 和 deviceId，ACL 只允许 d42 发布自己的 telemetry/ack、订阅自己的 command，禁止 \`tenant/+/device/+/command\` 这类越界通配符。

上线前做两个反例：让 d42 尝试订阅 d43 的命令，应在 Broker 侧拒绝；伪造 payload 里的 deviceId=d43，也不能改变连接身份。Topic 保持稳定路由维度，高频变化的温度、版本等数据放 payload，不无限扩张 Topic 层级。

**对照结果：**

合法设备只能看到自己的命令，改 payload 或使用通配符都无法越权，并且服务端可按租户/设备稳定路由，才说明 Topic 结构和 ACL 是一起设计的。`],

  ['62', `**示例场景：**

平台向设备发送“打开阀门”命令，生成唯一 \`commandId=cmd-20260829-001\`。设备执行前先在本地持久化表查询 commandId；第一次不存在，于是记录 RECEIVED、执行动作并写 DONE，再回 ACK。网络抖动导致 QoS 1 重投同一消息时，设备读到 DONE，只重发原结果，不再次打开阀门。

状态可按 \`RECEIVED → EXECUTING → DONE/FAILED\` 设计，并保存 payloadHash：相同 commandId 却带不同参数时直接拒绝。还要测试“动作成功但 ACK 丢失”“执行中重启”“过期命令晚到”三条路径。

**对照结果：**

重复投递 10 次最终只产生一次物理动作，重启后仍能识别已处理命令，冲突参数不会被接受，才算业务幂等；MQTT QoS 只保证传输语义，不能替代这层约束。`],

  ['63', `**示例场景：**

假设抢购接口平时 200 QPS，活动瞬间达到 5000 QPS，而数据库稳定能力只有 800 QPS。先按链路逐层处理：CDN 承担静态资源；网关按用户和 IP 限流；接口快速校验活动与资格；库存资格在 Redis 原子扣减；成功请求进入消息队列削峰；消费者按订单号幂等落库；数据库以唯一约束和库存条件更新兜底。

压测不能只看“扛住 5000 QPS”，还要同时记录成功率、p95/p99、队列积压、数据库连接数和库存一致性。再杀掉一个消费者，验证消息可重试但不重复建单；队列超过阈值时要明确拒绝，而不是无限堆积。

**对照结果：**

流量超过数据库能力时，系统仍能把进入核心链路的请求限制在可承受范围，积压可观测、失败可恢复且库存不出错，才体现完整的高并发治理。`],

  ['64', `**示例场景：**

商品库存只有 1，两位用户同时下单。错误实现是先 SELECT 得到 stock=1，再分别 UPDATE stock=0，于是两单都成功。正确实现使用题目下方已有的“库存大于 0 才扣减”条件更新，只允许一个请求影响 1 行；另一个影响 0 行并返回售罄。

| 时间 | 用户 A | 用户 B | 数据库库存 |
| --- | --- | --- | --- |
| T1 | 发起条件扣减 | 发起条件扣减 | 1 |
| T2 | 影响 1 行，继续下单 | 等待或重试判断 | 0 |
| T3 | 订单成功 | 影响 0 行，返回售罄 | 0 |

若前面用 Redis 预扣，还要准备“Redis 扣成功但订单入库失败”的补偿消息，并让补偿本身按 reservationId 幂等。用 1000 个并发请求抢 100 件，最终订单数、数据库库存和有效预占数必须互相对得上。

**对照结果：**

并发后最多 100 个有效订单、库存不小于 0，重复消息和补偿都不会二次增减库存，才证明防超卖不是只加一个前端按钮锁。`],

  ['66', `**示例场景：**

查询“用户 42 在最近 30 天、状态 PAID 的订单，按 created_at 倒序取 20 条”：\`WHERE user_id=42 AND status='PAID' AND created_at>=? ORDER BY created_at DESC LIMIT 20\`。候选联合索引可从 \`(user_id, status, created_at)\` 开始，因为前两列等值过滤，第三列既做范围又匹配排序。

不要只凭规则下结论。用真实分布准备两个用户：普通用户 50 条订单、热点用户 50 万条订单；分别执行 EXPLAIN ANALYZE，观察实际扫描行数、回表次数、是否 filesort 和耗时。再对比只有 \`(status)\` 的索引，PAID 占 90% 时选择性很低，可能几乎扫描全表。

**对照结果：**

候选索引让目标查询扫描的行数接近返回的 20 行，并避免额外排序，同时没有给写入增加不可接受成本，才有证据说这个 SQL 的索引有效。`],

  ['67', `**示例场景：**

表上有索引 \`idx_user_status_time(user_id, status, created_at)\`。不要只背“最左前缀”，实际跑三条查询：A 只按 user_id；B 按 user_id+status 并按 created_at 排序；C 只按 status。给每条执行 EXPLAIN ANALYZE，并记录 estimated rows、actual rows、loops、排序方式和总耗时。

预期 A、B 更容易从索引左端定位，C 通常不能高效利用首列缺失的联合索引。但即使 B 显示 Using index，也要看扫描 30 万行后返回 20 行的情况；“用了索引”不等于“访问数据少”。

**对照结果：**

只有执行计划估算与实际行数接近、扫描量显著降低、排序和回表成本可接受，才能证明联合索引适配真实查询；单看 key 列出现索引名会误判。`],

  ['68', `**示例场景：**

用浏览器请求 \`https://api.example.com/orders/42\` 串起各层：应用层生成 HTTP GET 与 Cookie；TLS 在传输前提供加密和身份校验；TCP 建立可靠字节流并处理重传；IP 把数据包路由到目标主机；链路层在每一跳局域网里传递帧；网卡最终发送电/光/无线信号。

排错时也按层观察：DNS 解析失败时还没到 HTTP；TCP 443 端口拒绝时应用请求无法建立；TLS 证书域名不匹配时 TCP 已通但安全握手失败；拿到 HTTP 401 则说明网络链路基本已经到达应用。

**对照结果：**

看到 401 不能再笼统归因于“TCP 不通”，而应处理应用鉴权；能把一次 API 请求的现象定位到 HTTP、TLS、TCP/IP 等对应层，才真正理解分层模型。`],

  ['69', `**示例场景：**

浏览器访问 \`https://interview.example.com\` 报 ERR_CONNECTION_CLOSED。按同一个时间点执行：DNS 查询确认域名解析；\`Test-NetConnection interview.example.com -Port 443\` 验证 TCP；\`curl -vk\` 查看 TLS 和响应头；服务器检查 Nginx 监听、错误日志、上游健康和安全组；最后用 requestId 对齐代理与应用日志。

假设 ping 能通、443 也能连上，但 curl 显示 TLS 握手后连接立即关闭，而 Nginx 日志没有请求。此时优先查证书/SNI、负载均衡或前置代理，不要去改页面 JavaScript。若 Nginx 有 502，再继续查 upstream，而不是继续测 DNS。

**对照结果：**

每一步都把故障范围缩小到下一层，并找到“连接在哪个节点被关闭”的证据，才算完成 ERR_CONNECTION_CLOSED 排查；ping 只说明 ICMP 可达，不代表 443、TLS 和应用都正常。`],

  ['70', `**示例场景：**

一次手工执行 \`npm start\` 后网站能打开，但关闭 SSH 窗口进程就退出；这只能证明“某一刻启动成功”。把它改成持续服务要补齐：systemd/Docker 托管进程并自动重启、健康检查确认依赖可用、反向代理与证书、日志和磁盘轮转、监控告警、开机启动、可回滚发布。

做三个验收动作：重启应用进程，确认 30 秒内恢复；重启整台 ECS，确认域名仍可访问；把数据库地址改错，健康检查应失败且告警，而不是因为端口还监听就报健康。发布新版本失败时一条命令回到上个镜像。

**对照结果：**

进程退出和主机重启后能自动恢复，依赖故障可被发现，失败发布可回滚，才说明网站具有持续可用的部署闭环；“我刚才访问成功”只是一次冒烟测试。`],

  ['71.1', `**示例场景：**

AI 服务本地每 100ms 输出一个 SSE 事件，但部署到 Nginx 后浏览器等 20 秒一次显示全部文字。用 \`curl -N\` 直连应用能逐条看到，经过域名访问却被聚合，说明应用已经 flush，缓冲发生在代理层。只对流式路由关闭 buffering，并保留普通 JSON/静态资源的缓存策略。

~~~nginx
# 示例重点：只让 /api/chat/stream 关闭代理缓冲，避免把整站缓存能力一起关掉
location /api/chat/stream {
    proxy_pass http://app;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 300s;
    add_header X-Accel-Buffering no;
}
~~~

还要验证响应 Content-Type 是 \`text/event-stream\`、应用每条事件以空行结束、链路有心跳，并在客户端取消时关闭上游连接。

**对照结果：**

通过域名访问也能按 100ms 左右看到事件，断线和空闲超时行为符合预期，同时普通接口仍可缓冲，才说明 Nginx 的 SSE 配置粒度正确。`],

  ['72', `**示例场景：**

手机给温度计配网时先建立 BLE 连接，再在 GATT 中发现 Environment service；其中 temperature characteristic 可 read/notify，wifi-config characteristic 可 write。service 像功能分组，characteristic 像组里的具体数据或命令入口，每个入口由 UUID 和读写/通知权限描述。

实际操作按“扫描→连接→发现 service→发现 characteristic→订阅 notify→写配置→收 ACK”记录状态。反例是 UUID 找对但属性不允许 write-without-response，调用错误写法就会失败；另一个反例是手机连上 BLE 后设备仍未连云端，二者是不同链路。

**对照结果：**

能根据 service/characteristic 的 UUID 与属性选择正确读写方式，并把 BLE 本地配置链路和设备后续 MQTT 上云分开说明，才算讲清 GATT，而不是只背三个名词。`],

  ['73', `**示例场景：**

在 ContextForge 上传一份 12 页《报销制度 v3.pdf》，链路依次记录可观察产物：解析得到 12 页文本和页码；清洗去掉重复页眉；按标题和段落切出 46 个 chunk；每个 chunk 保存 documentId、page、contentHash、租户与 ACL；Embedding 成功后写入向量索引；搜索“住宿上限”返回第 4 页片段并带出处。

再测试一个边界：表格标题在第 4 页末、数值在第 5 页首。若固定字符切块把二者分开，搜索只命中标题却没有金额；改成结构感知切块或设置重叠，再用同一问题复测。更新 v4 时先构建新版本，查询切换成功后再清旧索引，避免先删旧 chunk 导致空窗。

**对照结果：**

每一步都能查看输入、输出和元数据，关键表格不会因切块丢语义，版本更新期间仍可检索，才说明“从资料到上下文”是一条可验证的数据链路。`],

  ['74', `**示例场景：**

同一份“Hello”文件上传两次，SHA-256 一样，可以识别字节内容完全重复；但 Word 文档只改一个不可见元数据字段，hash 就完全不同，即使正文相同。反过来，两段正文不同但清洗后都变成空字符串，若只对清洗文本算 hash，也可能被错误合并。

真正增量去重可分层：原文件 hash 判断完全重复；规范化正文 hash 判断内容版本；chunk 使用 \`documentId + version + position + chunkHash\` 保持身份；写库时用唯一约束保证并发下不会重复插入。仍要保留租户和权限，不能因跨租户 hash 相同就共享不可见内容。

**对照结果：**

完全相同文件能跳过重复处理，正文变化会生成新版本，位置和权限不同的 chunk 不会被误合并，才算业务去重；单独保存 content_hash 只是提供比对依据。`],

  ['75', `**示例场景：**

旧索引使用 model-v1 的 768 维向量，新模型 model-v2 输出 1024 维。迁移时新建独立索引 v2，后台按文档版本重算，同时线上仍查询 v1；达到 10%、50%、100% 覆盖率时用固定 100 条问题比较 Recall@10、延迟和错误率。通过后把少量查询影子发送到 v2，再逐步切读流量。

若 v2 的召回指标变差或服务超时，只切路由回 v1，不需要重新计算旧向量。数据库必须保存 embeddingModel、dimension、indexVersion 和 documentVersion，禁止把 1024 维结果写进 768 维索引。

**对照结果：**

迁移期间查询不中断，新旧向量不会混写，指标不达标可立即回到 v1，且切换后能追溯每条结果来自哪个模型版本，才算可回滚的 Embedding 迁移。`],

  ['76', `**示例场景：**

同一个问题分别做 BM25 和向量检索。BM25 排名是 A、B、C，向量排名是 C、D、A；两边原始分数一个在 0~20、一个在 0~1，不能直接相加。RRF 只看各自名次，A 和 C 因为两边都靠前而获得更高融合分。接着候选里有三段几乎重复的 A，MMR 会在“相关性”和“与已选结果的差异”间取舍，留下 A、C、D。

先用 50 条带标准证据的问题对比“当前加权融合、RRF、RRF+MMR”的 Recall@5、重复率和延迟。若当前简单方案已经满足指标，就保留它；不要为了名词高级直接增加两个算法。

**对照结果：**

RRF 解决不同检索器分数不可直接比较的问题，MMR 解决候选过于相似的问题；只有离线指标显示融合或去重确有收益，才有理由替换当前实现。`],

  ['77', `**示例场景：**

模型上下文上限假设为 8192 Token，先给输出保留 1200，再为系统提示留 600、用户问题留 200、最近对话留 1500，检索证据最多可用 4692。候选 chunk 估算分别为 900、1600、2300 Token，按相关度先放 900 和 1600；第三块放不下时不从中间硬切一句，而是尝试它的较小父段摘要或跳到下一个完整候选。

请求完成后读取 API 返回的 input_tokens/output_tokens，与本地估算比较；若中文长期低估 25%，就调整安全系数。还要记录哪些 chunk 因预算被舍弃，排查答案缺证据时才能知道是未召回还是未装入上下文。

**对照结果：**

输入始终不挤占输出预留，完整高分证据优先进入，实际 token 用量能反过来校准估算，才算预算控制；只按字符数粗暴截断可能切掉关键条件。`],

  ['78', `**示例场景：**

Flask 先发送一条完整的 delta 事件，但代理把它拆成两次网络读取。Vue 端第一次只拿到半句“报销上”，第二次才收到“限是 500 元”和事件空行。可以在现有解析代码旁打印一张只用于测试的状态表，观察 buffer 如何保存半包：

| read 次数 | 本次收到 | 解析前 buffer | 可派发事件 | 剩余 buffer |
| --- | --- | --- | --- | --- |
| 1 | \`data: {…报销上\` | 空 | 0 条 | 半条 JSON |
| 2 | \`限是500元…}\\n\\n\` | 半条 JSON | 1 条 delta | 空 |
| 3 | 完整 done 事件 | 空 | 1 条 done | 空 |

点击“停止生成”时 AbortSignal 既传给 fetch，也通知 Flask 取消下游模型请求；否则前端不显示了，服务器仍在花 token。

**对照结果：**

把网络分片点随机打散 100 次后仍不乱码、不丢事件，done 状态只在完整事件到达后出现，取消还能终止服务端生成，才说明 Flask→Vue 流式链路完整。`],

  ['79', `**示例场景：**

用户发起 AI 对话时，routes 只读取 HTTP 参数、身份和 requestId；services 校验额度、组织 RAG 与模型调用；repositories 用明确方法读取会话和保存消息；db schema 用外键、索引和约束保证数据成立。若同一请求重复到达，service 用 idempotencyKey 判断，repository 在事务里执行，route 不直接拼 SQL。

用三个改动验证边界是否真的存在：响应从 JSON 改成 SSE 时主要修改 route；关键词检索改成向量召回时主要修改 service；MySQL 表增加租户过滤时修改 repository 和 schema。若每个改动都要同时重写所有层，说明职责仍然耦合。另用假的 repository 返回 3 个片段，单测 service 是否按 token 预算只选前 2 个，而无需启动真实数据库。

测试时可用假的 repository 单测额度和重试规则，再用集成测试验证事务与唯一约束；更换 Flask 路由或数据库驱动时不必重写核心流程。

**对照结果：**

HTTP、业务规则、数据访问和数据约束能分别测试与替换，失败能定位到对应层，才体现分层价值；若 routes 仍包含模型编排和 SQL，只是换了文件名。`],

  ['80', `**示例场景：**

给 Agent 一个只读工具 \`get_order_status(orderId)\`。用户问“我的订单 42 到哪了”，模型先输出结构化调用意图；Host 校验参数、确认订单 42 属于当前用户、设置 3 秒超时并记录 toolCallId；工具返回 \`SHIPPED\`，结果作为 tool message 回填，模型再生成“已发货”。若模型随后尝试调用未注册的 \`refund_order\`，Host 直接拒绝。

| 审计步骤 | 关键记录 | 本例结果 |
| --- | --- | --- |
| 模型提议 | toolCallId、工具名、原始参数 | 请求查询订单 42 |
| Host 校验 | 用户、资源归属、schema | 当前用户有读取权限 |
| 工具执行 | 开始/结束时间、超时、状态 | 84ms，返回 SHIPPED |
| 结果回填 | toolCallId 与结果摘要 | 关联到同一次模型决策 |
| 非法调用 | 拒绝原因 | refund_order 不在白名单 |

当前 ContextForge 若只有检索和 SSE，应明确说尚未实现这个工具闭环，不能把普通 RAG 描述成 Agent。

**对照结果：**

合法只读调用可追踪、越权和未知工具被拒绝、循环有步数与超时上限，才是受控 Agent；模型输出一段“我已经退款”文字不代表真实工具执行。`],
])

function questionNumber(title) {
  return String(title ?? '').match(/^Q(\d+(?:\.\d+)?)(?=[：:\s])/i)?.[1]
}

export function legacyExampleSupplementFor(title) {
  const number = questionNumber(title)
  return number ? LEGACY_EXAMPLES.get(number) : undefined
}

export function legacyExampleSupplementCount() {
  return LEGACY_EXAMPLES.size
}

export function legacyExampleSupplementEntries() {
  return [...LEGACY_EXAMPLES.entries()]
}
