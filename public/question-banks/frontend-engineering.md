# 前端工程化、浏览器与 TypeScript

# 浏览器与事件循环

## Q1：浏览器从输入 URL 到页面可交互经历什么？

**短回答：**

依次涉及 URL 解析、DNS、连接与 TLS、HTTP、HTML 流式解析、资源加载、样式布局绘制和脚本执行；可交互还取决于主线程长任务。

**原理：**

浏览器先解析并规范化 URL，执行安全策略、缓存与 Service Worker 检查，再经 DNS 获得地址并按协议建立 TCP/TLS 或 QUIC 连接。收到 HTTP 响应后，网络层可流式交给 HTML 解析器构建 DOM；预加载扫描器并行发现样式、脚本、图片，CSSOM 与 DOM 共同形成渲染所需结构。同步脚本可能阻塞解析，样式又可能阻塞脚本；随后计算样式、布局、绘制与合成。DOMContentLoaded 只表示文档解析和 defer 脚本完成，不保证主线程空闲；真正可交互还取决于 hydration、事件绑定与是否存在长任务。应使用 Navigation Timing、Resource Timing、LCP 与 INP 分段验证，而不是用单个 load 时间概括。

![从输入 URL 到页面可交互的浏览器流水线图](/content/diagrams/frontend-engineering/browser-rendering-pipeline-v1.svg "网络、解析、样式布局、绘制与主线程任务共同决定可交互时间。")

**代码 / 场景：**

以下代码在页面加载后读取导航阶段和主线程时间；不同协议可能没有完整 DNS/TLS 字段，但总时序仍可核对。

~~~js
addEventListener("load", () => {
  const nav = performance.getEntriesByType("navigation")[0]
  console.table({
    dns: nav.domainLookupEnd - nav.domainLookupStart,
    connect: nav.connectEnd - nav.connectStart,
    ttfb: nav.responseStart - nav.requestStart,
    download: nav.responseEnd - nav.responseStart,
    domReady: nav.domContentLoadedEventEnd - nav.startTime
  })
})
~~~

若 domReady 很早但点击仍延迟，应继续用 Performance 面板定位 hydration 或长任务，而不是继续优化 DNS。

**递进追问：**

1. **DOMContentLoaded 与 load 分别等待什么？**

   DOMContentLoaded 等待 HTML 解析及 defer/module 脚本完成，不等待普通图片；load 还等待文档依赖资源，但两者都不保证后续主线程无长任务。

2. **缓存命中后是否完全跳过网络阶段？**

   强缓存可避免向源站验证，但仍有 Service Worker、内存/磁盘缓存查找与安全检查；协商缓存则仍会发送条件请求并等待响应。

**易错点：**

- 把页面可交互等同于 load 事件会漏掉事件绑定、客户端渲染和事件后的长任务。
- 真实浏览器会并行与投机执行多个阶段，流程图应表达依赖关系而非绝对串行时间线。

**参考来源：**

- [WHATWG HTML：Navigation and session history](https://html.spec.whatwg.org/multipage/nav-history-apis.html)
- [WHATWG HTML：Parsing HTML documents](https://html.spec.whatwg.org/multipage/parsing.html)
- [W3C Navigation Timing Level 2](https://www.w3.org/TR/navigation-timing-2/)

校验日期：2026-07-20

## Q2：浏览器进程和渲染进程如何分工？

**短回答：**

浏览器进程负责导航、网络和窗口，站点渲染进程运行 Blink 与 JavaScript；进程隔离可减少页面崩溃和跨站攻击影响。

**原理：**

现代多进程浏览器的具体实现不同，但以 Chromium 为例，浏览器进程管理窗口、导航决策、权限、网络服务与渲染进程生命周期；渲染进程在沙箱中运行 Blink、V8、DOM、样式与页面脚本，并通过 IPC 请求受限能力。站点隔离尽量让不同站点实例进入不同渲染进程，使跨站数据即使面对渲染器漏洞也有额外进程边界。GPU、网络和扩展还可能拥有独立进程。一个标签不必永久对应一个进程，iframe、导航、内存压力都会改变映射。多进程提高崩溃隔离与安全，但 IPC、内存和序列化有成本，前端性能问题仍需区分主线程、合成线程与网络服务。

**代码 / 场景：**

可用浏览器任务管理器与 Performance 面板验证，而不是根据“一个 Tab 一个进程”猜测。

~~~text
验证步骤：
1. 打开同源页面与包含跨站 iframe 的页面。
2. 在 Chrome 任务管理器观察 Renderer、GPU Process、Network Service。
3. 让某页面执行 3 秒 CPU 循环，记录对应 Renderer CPU 飙升。
4. 同时滚动另一个站点，确认隔离程度与是否仍可响应。
5. 在 DevTools Performance 中检查长任务位于 Main 轨道，而非 Network。
~~~

实验只能说明当前浏览器与配置，不能把观察结果写成所有浏览器固定进程模型。

**递进追问：**

1. **站点隔离为什么比同源策略多一层保护？**

   同源策略主要是逻辑访问检查；站点隔离把敏感跨站文档放到不同地址空间，即使渲染器被利用，直接读取另一进程内存仍更困难。

2. **页面崩溃为何有时不会让整个浏览器退出？**

   渲染器崩溃可由浏览器进程检测并替换，窗口与其他进程继续运行；若共享服务或浏览器进程自身故障，影响范围会更大。

**易错点：**

- 不要把“浏览器进程”泛指所有进程，Renderer、GPU、Network Service 的职责和权限边界不同。
- 进程隔离不是前端代码的安全许可证，XSS 仍能在目标源权限内读取和操作敏感数据。

**参考来源：**

- [Chromium：Multi-process Architecture](https://www.chromium.org/developers/design-documents/multi-process-architecture/)
- [Chromium：Site Isolation](https://www.chromium.org/Home/chromium-security/site-isolation/)
- [Chrome Developers：Inside look at modern web browser](https://developer.chrome.com/blog/inside-browser-part1)

校验日期：2026-07-20

## Q3：宏任务和微任务的执行顺序是什么？

**短回答：**

每个任务执行到调用栈清空后，事件循环会清空微任务队列，再给浏览器渲染机会并进入下一个任务；Promise 回调属于微任务。

**原理：**

HTML 事件循环从某个 task queue 选择一个可运行任务，执行其 JavaScript 直到调用栈清空，然后执行微任务检查点：按队列顺序持续运行 Promise reaction、queueMicrotask、MutationObserver 等微任务；微任务中新加入的微任务也会在本轮继续清空。完成后浏览器才可能更新渲染并选择下一个任务。setTimeout 回调是未来任务，不会插入当前栈；“宏任务”是教学俗称，规范使用 task。若微任务不断自我追加，渲染与输入任务可能长期得不到机会。async/await 在 await 后的继续执行通常也是 Promise reaction 微任务，因此分析时要按实际入队时刻，而非仅按源码上下顺序。

**代码 / 场景：**

以下输出严格展示当前脚本、微任务检查点和下一定时器任务的边界。

~~~js
console.log("A")
setTimeout(() => console.log("timeout"), 0)
Promise.resolve().then(() => {
  console.log("promise-1")
  queueMicrotask(() => console.log("nested-microtask"))
})
queueMicrotask(() => console.log("microtask-2"))
console.log("B")

// 输出：A、B、promise-1、microtask-2、nested-microtask、timeout
~~~

nested-microtask 虽后创建，仍在进入 timeout 任务前由同一个微任务检查点清空。

**递进追问：**

1. **为什么 Promise.then 比 setTimeout(..., 0) 先执行？**

   当前脚本任务结束后必须先完成微任务检查点，Promise reaction 在微任务队列；setTimeout 只能成为后续可选择的任务。

2. **如何避免微任务饥饿渲染？**

   不要用递归 queueMicrotask 处理无界工作；达到预算后主动让出到新的任务或调度 API，并用 Performance 记录输入和帧间隔。

**易错点：**

- 零毫秒定时器仍受最小延迟、嵌套钳制与任务队列影响，不等于调用栈结束后绝对立即执行。
- 浏览器可能在任务间选择渲染机会，但不是每个任务后必定绘制一帧，页面可见性也会影响调度。

**参考来源：**

- [WHATWG HTML：Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
- [WHATWG HTML：Perform a microtask checkpoint](https://html.spec.whatwg.org/multipage/webappapis.html#perform-a-microtask-checkpoint)
- [MDN：Microtask guide](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide)

校验日期：2026-07-20

## Q4：requestAnimationFrame 适合做什么？

**短回答：**

它在下一次绘制前调用，适合按刷新节奏更新动画；后台标签可能降频，时间推进应使用回调时间戳而不是假设固定帧率。

**原理：**

requestAnimationFrame 把回调登记到文档下一次更新渲染前的动画帧阶段，适合把视觉状态更新与显示刷新节奏对齐，减少无意义的高频定时器和中间帧。回调接收高精度时间戳，同一帧多个回调通常共享该时间值；动画位移应按时间差计算，不能假设始终 60Hz。页面后台或不可见时，浏览器可暂停或大幅降频，所以它不适合作为业务时钟、超时或可靠任务调度器。每次调用只登记一帧，连续动画要在回调中再次请求，并保存 ID 以便 cancelAnimationFrame。布局性能上应集中读取，再批量写 transform/opacity，并结合降级动效偏好。

**代码 / 场景：**

动画按真实时间推进 300 像素/秒；即使刷新率变化，速度仍近似一致，并在一秒后结束。

~~~js
const box = document.querySelector(".box")
let start
let frameId
function step(now) {
  start ??= now
  const elapsed = now - start
  const x = Math.min(300, elapsed * 0.3)
  box.style.transform = "translateX(" + x + "px)"
  if (x < 300) frameId = requestAnimationFrame(step)
}
frameId = requestAnimationFrame(step)
// 组件卸载时：cancelAnimationFrame(frameId)
~~~

若固定每帧加 5px，120Hz 屏幕会比 60Hz 屏幕运动更快。

**递进追问：**

1. **rAF 与 setTimeout 做动画有何差异？**

   rAF 与浏览器绘制时机对齐并可在后台降频，时间戳便于按时长计算；setTimeout 只按任务延迟排队，容易与帧边界错位。

2. **为什么一帧中应先读布局再写样式？**

   读写交错可能让后续读取迫使浏览器提前布局；先收集尺寸再统一写 transform 等属性，可减少强制同步布局。

**易错点：**

- rAF 不是固定 16.67ms 定时器，高刷新率、掉帧和后台标签都会改变间隔。
- 忘记在组件卸载时取消并停止递归登记，会让回调继续访问已销毁节点或状态。

**参考来源：**

- [WHATWG HTML：Animation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames)
- [MDN：requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [MDN：prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)

校验日期：2026-07-20

## Q5：什么是长任务，如何定位？

**短回答：**

主线程连续执行超过约 50ms 会阻塞输入和渲染；用 Performance 火焰图定位脚本、样式和布局热点，再拆分或移出主线程。

**原理：**

Long Tasks API 把主线程连续占用超过 50ms 的任务报告为 PerformanceLongTaskTiming；超过前 50ms 的部分会直接侵占用户输入、动画和渲染预算。它可能来自大段 JavaScript、同步 JSON 解析、样式/布局、第三方脚本或垃圾回收，不能看到 longtask 就只优化业务函数。定位时先用真实用户 INP、Total Blocking Time 或长任务率发现受影响页面，再在可复现设备上录制 DevTools Performance：从 Main 轨道展开任务、Bottom-up 与 Call tree，关联网络、样式重算和布局。通过 PerformanceObserver 可线上采样时长与基础归因，但详细调用栈通常需要本地性能剖析和 source map。

**代码 / 场景：**

观察器记录长任务开始时间与阻塞时长；测试按钮故意执行循环后，应出现 duration 大于 50ms 的条目。

~~~js
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log({
      start: Math.round(entry.startTime),
      duration: Math.round(entry.duration),
      blocking: Math.max(0, Math.round(entry.duration - 50))
    })
  }
})
observer.observe({ type: "longtask", buffered: true })

button.onclick = () => {
  const end = performance.now() + 120
  while (performance.now() < end) {}
}
~~~

修复后应在同设备和操作脚本下比较长任务数量、INP 分位数与功能正确性。

**递进追问：**

1. **把任务拆成多个微任务能消除长任务吗？**

   不一定。微任务检查点会持续清空，递归微任务仍阻塞渲染与输入；应真正让出到后续任务、Worker 或分块算法。

2. **线上 PerformanceObserver 为什么不能替代 DevTools？**

   它适合统计时长和有限归因，通常没有完整 JavaScript 调用栈与布局细节；定位根因仍需可复现录制和 source map。

**易错点：**

- 50ms 是 API 分类阈值，不是“49ms 就体验良好”；动画帧和低端设备预算往往更严格。
- 只在高性能开发机测平均值会漏掉长尾，真实用户应按设备、页面和高分位数分段分析。

**参考来源：**

- [W3C Long Tasks API](https://w3c.github.io/longtasks/)
- [MDN：PerformanceLongTaskTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming)
- [Chrome DevTools：Performance reference](https://developer.chrome.com/docs/devtools/performance/reference)

校验日期：2026-07-20

## Q6：重排和重绘有什么区别？

**短回答：**

几何或结构变化会触发布局计算并可能随后绘制，纯颜色等变化通常只需重绘；transform 和 opacity 常可交给合成线程。

**原理：**

“重排”通常指布局：当 DOM 结构、字体、盒模型尺寸或定位关系变化时，浏览器需重新计算受影响元素的几何位置与大小；布局结果变化后通常还要重新绘制像素。重绘是布局几何不变但视觉内容变化，例如背景色、阴影或文字颜色，需要重新生成绘制记录与栅格。若元素已提升到合成层，transform 和 opacity 动画常可只更新合成属性，避免主线程布局和大范围绘制，但层提升本身消耗内存且不是绝对保证。应在 Performance 的 Layout、Paint、Layers 轨道验证具体浏览器行为，并以帧时间和像素面积评估，而不是按 CSS 属性表机械下结论。

**代码 / 场景：**

用同一元素分别改变 width、background 与 transform，并在 DevTools 录制三次操作，可观察不同流水线阶段。

~~~js
const box = document.querySelector(".box")

box.style.width = "400px"
// 通常触发布局，随后绘制与合成

box.style.backgroundColor = "tomato"
// 几何不变，通常只需绘制与合成

box.style.transform = "translateX(100px)"
// 若已合成，通常只更新合成；以 Performance 记录为准
~~~

比较前先固定页面、设备与动画帧，否则缓存和首次层创建会污染结论。

**递进追问：**

1. **transform 为什么常比 left 动画流畅？**

   left 参与布局定位，可能引发布局和绘制；transform 作用于渲染后的几何变换，常可由合成线程更新，但仍需实测层与绘制范围。

2. **will-change 是否应提前加到所有元素？**

   不应。它只是提前提示并可能创建合成层，大量层会增加显存、上传和管理成本；应只对即将变化的热点短期使用。

**易错点：**

- 布局、绘制和合成的实际失效范围取决于引擎与页面结构，不能承诺某属性永远只触发一个阶段。
- 只追求“零布局”却创建大量合成层可能转移为内存和 GPU 瓶颈，需同时观察资源成本。

**参考来源：**

- [Chrome Developers：Rendering performance](https://web.dev/articles/rendering-performance)
- [MDN：CSS performance optimization](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/CSS)
- [CSS Transforms Level 1](https://www.w3.org/TR/css-transforms-1/)

校验日期：2026-07-20

## Q7：什么是强制同步布局？

**短回答：**

写入样式后立即读取 offsetWidth 等布局属性会迫使浏览器提前完成布局；循环中读写交错会形成 layout thrashing。

**原理：**

浏览器通常把样式变化批量延迟到渲染阶段处理。若脚本先写入可能影响几何的 DOM/CSS，再立即读取 offsetWidth、getBoundingClientRect、getComputedStyle 的某些值等布局依赖属性，引擎为了返回当前准确结果必须同步刷新样式和布局，这就是强制同步布局。单次读取有时不可避免，真正昂贵的是循环中“写一个、读一个”的 layout thrashing：每轮都让批处理失效，成本随元素和页面复杂度放大。优化方式是在帧开始集中读取所有需要的旧尺寸，计算后集中写入；或用 ResizeObserver 在尺寸变化后异步获知结果，避免用读取来探测每次写入。

**代码 / 场景：**

坏例子每轮写宽度后读取 offsetWidth；好例子先读一次基准，再批量写，DevTools 中 Layout 次数会明显减少。

~~~js
const items = [...document.querySelectorAll(".item")]

// 坏：每次写后读，可能重复强制布局
for (const item of items) {
  item.style.width = "200px"
  console.log(item.offsetWidth)
}

// 好：读取阶段与写入阶段分离
const widths = items.map((item) => item.getBoundingClientRect().width)
items.forEach((item, i) => {
  item.style.transform = "translateX(" + widths[i] + "px)"
})
~~~

录制 Performance 并比较 Recalculate Style、Layout 总次数和耗时，不能只凭代码外观判断。

**递进追问：**

1. **只读 offsetWidth 为什么有时也很慢？**

   前面若有尚未处理的样式或 DOM 写入，读取必须先刷新；若布局已是最新，读取可能便宜，因此要看完整调用序列。

2. **ResizeObserver 能完全替代布局读取吗？**

   不能。它适合在布局完成后获知尺寸变化，但回调也有时序和循环限制；确需同步定位时仍可能读取，只应控制频率。

**易错点：**

- 把读操作单独标成“坏 API”不准确，强制同步来自读取前存在待处理失效与对当前值的要求。
- 在 rAF 回调里读写交错仍会 thrash；rAF 只对齐帧，不会自动重排你的访问顺序。

**参考来源：**

- [CSSOM View：offset attributes](https://drafts.csswg.org/cssom-view/#extensions-to-the-htmlelement-interface)
- [Chrome Developers：Avoid large, complex layouts and layout thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing)
- [MDN：ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)

校验日期：2026-07-20

## Q8：Web Worker 的边界是什么？

**短回答：**

Worker 在独立线程执行脚本，不能直接操作 DOM；通过结构化克隆或 Transferable 消息通信，适合 CPU 密集任务而非所有异步请求。

**原理：**

Dedicated Worker 在独立全局环境和线程中执行脚本，不共享页面调用栈，不能直接访问 DOM、window 或页面组件状态；它可使用部分 Web API，如 fetch、crypto、定时器和 IndexedDB，并通过 postMessage 与创建者交换消息。普通对象按结构化克隆复制，不保留函数和部分原型语义；ArrayBuffer 等 Transferable 可转移底层所有权以避免复制，转移后发送方缓冲区会被分离。Worker 适合可切分的 CPU 密集解析、图像或搜索，不会让网络请求本身更快；消息序列化、启动、错误传播和取消都有成本。SharedArrayBuffer 还要求跨源隔离并需用 Atomics 正确同步。

**代码 / 场景：**

主线程把 8MB ArrayBuffer 转移给 Worker；发送后 byteLength 变为 0，证明所有权转移而非双份复制。

~~~js
// main.js
const worker = new Worker("./sum-worker.js", { type: "module" })
const buffer = new ArrayBuffer(8 * 1024 * 1024)
worker.postMessage(buffer, [buffer])
console.log(buffer.byteLength) // 0：已 detached
worker.onmessage = ({ data }) => console.log(data.sum)

// sum-worker.js
self.onmessage = ({ data }) => {
  const values = new Uint8Array(data)
  let sum = 0
  for (const value of values) sum += value
  self.postMessage({ sum })
}
~~~

若每毫秒发送小消息，通信开销可能超过计算收益，应批量传输并用指标比较。

**递进追问：**

1. **为什么 Worker 不能直接更新 DOM？**

   DOM 属于文档与渲染主线程的对象模型，跨线程共享会引入复杂竞态；Worker 只能计算结果，再让主线程按消息更新页面。

2. **结构化克隆与 JSON 序列化有何差异？**

   结构化克隆支持循环引用、Map、Set、TypedArray 等更多类型且可转移对象；函数和 DOM 节点仍不能克隆，错误需捕获。

**易错点：**

- 把所有异步请求移到 Worker 通常没有收益，fetch 已异步，真正要隔离的是占用 CPU 的回调处理。
- Transferable 转移后发送方不能继续读取原缓冲区，复用前必须重新设计所有权和生命周期。

**参考来源：**

- [WHATWG HTML：Web workers](https://html.spec.whatwg.org/multipage/workers.html)
- [WHATWG HTML：Structured serialize](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserialize)
- [MDN：Transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)

校验日期：2026-07-20

## Q9：浏览器存储如何选择？

**短回答：**

Cookie 随请求发送且容量小，localStorage 同步且仅字符串，IndexedDB 异步事务化存储较大结构数据；敏感凭据优先 HttpOnly Cookie。

**原理：**

选择应基于数据是否随请求发送、容量、事务、同步成本与威胁模型。Cookie 容量小且匹配域/路径时随 HTTP 请求发送，认证 Cookie 可设置 Secure、HttpOnly、SameSite，让脚本不能读取但仍要防 CSRF。localStorage 按源保存字符串，API 同步，会阻塞主线程，也缺少事务和过期机制，适合少量非敏感偏好而非大型缓存。sessionStorage 还按顶层浏览上下文会话隔离。IndexedDB 是异步、事务化的对象存储，适合结构化离线数据与索引，但需要版本迁移、配额和失败处理。任何脚本可读存储都可能在 XSS 下泄露，机密不是靠换一个前端存储就安全。

**代码 / 场景：**

以下决策表把需求映射到机制；实际配额和清理策略必须在目标浏览器验证。

| 需求 | 推荐起点 | 关键约束 |
| --- | --- | --- |
| 服务端会话凭据 | Secure + HttpOnly + SameSite Cookie | CSRF、过期、域与路径 |
| 主题/字号偏好 | localStorage | 同步、字符串、小数据 |
| 大量离线题目与 outbox | IndexedDB | 事务、升级、配额、清理 |
| 单标签临时向导状态 | sessionStorage | 标签会话边界 |

验证时应模拟无痕模式、配额失败、清理站点数据与跨标签并发，而不只测正常写入。

**递进追问：**

1. **为什么不建议把访问令牌长期放 localStorage？**

   同源任意成功执行的恶意脚本都能读取并外传；HttpOnly Cookie 可阻止脚本读取，但需配合 SameSite、CSRF 防护和短会话。

2. **IndexedDB 事务有什么价值？**

   它可让同一事务内多个对象存储更新原子提交或回滚，适合 outbox 与业务记录一致变更；事务生命周期仍受事件循环规则影响。

**易错点：**

- localStorage 写入与 JSON 序列化都在主线程同步执行，大对象会造成可见卡顿。
- HttpOnly 只阻止脚本读取 Cookie，XSS 仍可借当前会话发请求，不能替代输出编码和 CSP。

**参考来源：**

- [RFC 6265：HTTP State Management](https://www.rfc-editor.org/rfc/rfc6265)
- [WHATWG HTML：Web storage](https://html.spec.whatwg.org/multipage/webstorage.html)
- [W3C Indexed Database API 3.0](https://www.w3.org/TR/IndexedDB-3/)

校验日期：2026-07-20

## Q10：页面关闭前发送数据为什么常用 sendBeacon？

**短回答：**

它让浏览器在卸载阶段异步排队少量 POST 数据，比普通 fetch 更可能完成；仍有大小和方法头部限制，不能替代可靠业务提交。

**原理：**

navigator.sendBeacon 让用户代理把少量数据作为异步 POST 排队，并返回是否成功进入队列；浏览器可在文档进入隐藏或卸载后继续发送，因此比卸载处理器里的普通异步请求更可靠，也不会故意阻塞导航。它不提供读取响应、修改方法或任意请求头的接口，并与 keepalive 请求共享实现配额，数据过大可能返回 false。可靠触发点优先使用 visibilitychange 在页面转为 hidden 时发送，因为移动端可能根本不触发 unload/beforeunload。Beacon 只适合可丢、幂等或可聚合的遥测，不能承担订单、草稿等必须确认提交的业务；需要自定义方法/响应时可评估 fetch keepalive。

**代码 / 场景：**

页面隐藏时发送一小批 JSON 遥测，并检查排队结果；失败则保留在本地待下次会话重试。

~~~js
const pending = []
function flush() {
  if (!pending.length) return
  const body = new Blob([JSON.stringify(pending)], {
    type: "application/json"
  })
  const queued = navigator.sendBeacon("/telemetry", body)
  console.log({ queued, bytes: body.size })
  if (queued) pending.length = 0
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flush()
})
~~~

queued=true 不是服务器已持久化确认，服务端仍需幂等接收并监控丢失率。

**递进追问：**

1. **sendBeacon 与 fetch keepalive 如何选择？**

   只需小型 POST 且不读响应时 Beacon 更简单；需要自定义方法、部分头或 Promise 结果时用 fetch keepalive，但同样有配额与卸载限制。

2. **为什么不依赖 beforeunload？**

   移动系统结束进程、标签切后台等路径可能不触发，监听还会影响某些页面缓存；visibilitychange hidden 是更早且更常见的保存信号。

**易错点：**

- sendBeacon 返回 true 只表示用户代理接受排队，不表示网络成功或服务端已经处理。
- 把大日志一次塞进 Beacon 会触发配额失败，应限制批次、采样并保留重试与丢弃策略。

**参考来源：**

- [W3C Beacon](https://www.w3.org/TR/beacon/)
- [MDN：navigator.sendBeacon](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)
- [MDN：visibilitychange](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)

校验日期：2026-07-20

# HTTP、缓存与性能

## Q11：强缓存和协商缓存如何配合？

**短回答：**

Cache-Control max-age 或 immutable 让客户端直接复用；过期后用 ETag/If-None-Match 或 Last-Modified 验证，未变化返回 304。

**原理：**

浏览器先依据 Cache-Control 判断缓存响应是否仍新鲜：max-age/s-maxage 定义有效期，immutable 可提示新鲜期内无需重新验证；命中新鲜缓存时通常不发请求。过期或响应声明 no-cache 时，客户端可携带 If-None-Match 对应 ETag，或 If-Modified-Since 对应 Last-Modified，服务器判断表示是否仍相同；未变化返回 304 与更新后的缓存元数据，客户端复用原响应体，变化则返回新 200。ETag 验证通常优先于日期，no-store 才是不存储。还要区分 private 与共享缓存、Vary 键、授权响应和启发式缓存，不能把“强缓存/协商缓存”当成两个互斥开关。

**代码 / 场景：**

版本化 JSON 可短期新鲜并用 ETag 验证；开发者工具中第一次 200，过期后应看到带 If-None-Match 的请求与 304。

~~~http
HTTP/1.1 200 OK
Cache-Control: public, max-age=60
ETag: "catalog-v42"
Vary: Accept-Encoding

GET /catalog.json HTTP/1.1
If-None-Match: "catalog-v42"

HTTP/1.1 304 Not Modified
Cache-Control: public, max-age=60
ETag: "catalog-v42"
~~~

304 没有重新传完整正文，但仍有网络往返；高延迟环境不能把它当作零成本命中。

**递进追问：**

1. **Cache-Control: no-cache 是否表示完全不缓存？**

   不是。它允许存储响应，但每次复用前必须向源站验证；真正禁止存储通常使用 no-store，并仍需考虑浏览器历史等规范边界。

2. **弱 ETag 与强 ETag 有何区别？**

   强验证要求表示逐字节等价，弱 ETag 用 W/ 前缀表达语义等价，可用于缓存验证但不满足某些范围请求的强比较要求。

**易错点：**

- 服务端若忘记正确设置 Vary，共享缓存可能把不同语言、编码或授权上下文的响应混用。
- 304 仍会消耗 RTT 与服务器验证资源，静态不可变资源应优先用内容哈希加长期新鲜期。

**参考来源：**

- [RFC 9111：HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111)
- [RFC 9110：Conditional Requests](https://www.rfc-editor.org/rfc/rfc9110#name-conditional-requests)
- [MDN：HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

校验日期：2026-07-20

## Q12：为什么带内容哈希的静态资源适合长期缓存？

**短回答：**

内容变化会产生新 URL，旧 URL 可设置长期 immutable，HTML 保持短缓存并引用新哈希，从而兼顾命中率和发布更新。

**原理：**

构建器把文件内容摘要写入文件名，例如 app.a1b2.js；内容不变时 URL 稳定，内容变化时产生新 URL。服务器可对这类资产设置很长的 max-age 与 immutable，因为同一 URL 按发布约定永不换内容；浏览器和 CDN 可长期复用，不必协商。入口 HTML 与 manifest 则应短缓存或每次验证，它们负责引用当前哈希资产。发布必须先上传全部新资产，再切换 HTML，并保留旧资产至少覆盖缓存、灰度和回滚窗口，否则用户拿到旧 HTML 时会请求已删除 chunk。内容哈希解决缓存失效，不自动保证供应链完整性；还应记录制品、压缩变体和 source map 的映射。

**代码 / 场景：**

Vite 构建后入口引用带哈希文件；服务器对 HTML 与资产采用不同缓存策略。

~~~http
GET /index.html
Cache-Control: no-cache

<script type="module" src="/assets/app.a1b2c3.js"></script>
<link rel="stylesheet" href="/assets/app.d4e5f6.css">

GET /assets/app.a1b2c3.js
Cache-Control: public, max-age=31536000, immutable
~~~

部署 v2 时先上传新哈希资产，再原子切换 index；回滚只需恢复旧 HTML 指针。

**递进追问：**

1. **为什么 index.html 不应同样缓存一年？**

   它是版本指针；长期新鲜会让用户持续引用旧资产与旧应用。应短缓存或验证，同时让哈希资产承担长期缓存。

2. **发布后能否立即删除旧 chunk？**

   不能。旧标签页、CDN 节点和回滚版本仍可能引用旧 URL；应按最大会话与回滚窗口保留，并监控 404 后再清理。

**易错点：**

- 对无哈希固定 URL 设置 immutable 后又原地替换内容，会让客户端长期无法获得更新。
- HTML 与资产非原子发布会产生新 HTML 指向未上传文件或旧 HTML 指向已删除文件的窗口。

**参考来源：**

- [RFC 8246：HTTP Immutable Responses](https://www.rfc-editor.org/rfc/rfc8246)
- [Vite：Static Asset Handling](https://vite.dev/guide/assets.html)
- [Vite：Backend Integration manifest](https://vite.dev/guide/backend-integration.html)

校验日期：2026-07-20

## Q13：HTTP/2 相比 HTTP/1.1 改进了什么？

**短回答：**

二进制分帧和单连接多路复用减少应用层队头阻塞，并支持头部压缩；TCP 丢包仍会影响同连接多个流。

**原理：**

HTTP/2 把消息编码成二进制 frame，并在一条连接上用 stream ID 多路复用多个请求与响应，避免 HTTP/1.1 每连接一次只能按序处理所造成的应用层队头阻塞和大量并行连接。HPACK 压缩重复头字段，流控与优先级机制允许协调资源传输；语义仍沿用 HTTP 方法、状态码和缓存。它底层通常是一个 TCP 连接，某个 TCP 包丢失时，内核必须按序交付字节，因此连接中所有 HTTP/2 流都可能暂时等待，这就是传输层队头阻塞。多路复用也不等于资源越多越好，服务端拥塞窗口、主线程和资源依赖仍会形成瓶颈。

**代码 / 场景：**

在 DevTools Network 固定相同网络条件，对比协议与连接列；H2 请求应复用连接但丢包时多个流可能一起停顿。

~~~text
验证步骤：
1. 准备 30 个小资源，分别通过 HTTP/1.1 与 HTTP/2 端点提供。
2. 禁用缓存，设置相同 RTT、吞吐与 2% 丢包。
3. 导出 HAR，记录 connection ID、protocol、TTFB 与总完成时间。
4. H2 中多个请求应显示 h2 且复用单连接。
5. 提高丢包后观察多个 stream 同时出现等待，证明 TCP HOL 仍存在。
~~~

结论必须来自相同证书、压缩与网络条件，不能只比较两个不同站点。

**递进追问：**

1. **HTTP/2 是否仍需要域名分片？**

   通常不需要，分片会增加 DNS、连接和 TLS 成本并削弱头压缩与拥塞共享；迁移前应按目标协议和 CDN 能力实测。

2. **HTTP/2 多路复用为何不能消除所有队头阻塞？**

   HTTP stream 相互独立，但都映射到同一有序 TCP 字节流；丢包后的后续字节必须等重传，因而多个流一起受阻。

**易错点：**

- 把 H2 简化为“请求无限并发”会忽略流控、优先级、拥塞控制和服务器并发上限。
- 协议升级不能修复过大的 JavaScript、主线程长任务或错误缓存策略，需分层量化瓶颈。

**参考来源：**

- [RFC 9113：HTTP/2](https://www.rfc-editor.org/rfc/rfc9113)
- [RFC 7541：HPACK](https://www.rfc-editor.org/rfc/rfc7541)
- [MDN：HTTP/2](https://developer.mozilla.org/en-US/docs/Glossary/HTTP_2)

校验日期：2026-07-20

## Q14：HTTP/3 为什么基于 QUIC？

**短回答：**

QUIC 在 UDP 上实现可靠流、TLS 1.3 和连接迁移，不同流的丢包彼此隔离，减少传输层队头阻塞和握手成本。

**原理：**

HTTP/3 把 HTTP 语义映射到 QUIC stream。QUIC 运行在 UDP 之上，但自身实现可靠传输、拥塞控制和流控，并把 TLS 1.3 握手集成进协议；不同流拥有独立有序字节空间，一个流丢包通常不会阻塞其他已有数据的流，从而缓解 TCP 连接级队头阻塞。QUIC 使用 connection ID，可在客户端 IP/端口变化时继续验证并迁移连接，适合移动网络；恢复连接还可减少握手，0-RTT 数据则有重放风险，只能用于可安全重放请求。所有流仍共享连接拥塞控制和网络容量，UDP 被阻断时客户端需回退 H2/H1，部署必须监控实际协商率而非只看服务器开关。

**代码 / 场景：**

用浏览器网络面板与服务端日志同时验证 Alt-Svc、协议和回退；不要只凭 URL 认为使用了 H3。

~~~http
HTTP/2 200 OK
Alt-Svc: h3=":443"; ma=86400

# 后续连接若成功协商：DevTools Protocol 显示 h3
# 服务端记录 QUIC connection ID 与 0-RTT 是否接受
# 测试矩阵：正常 UDP、阻断 UDP/443、Wi-Fi 切换移动网络
# 指标：H3 协商率、握手时长、请求失败率、回退到 h2 比例
~~~

网络切换不断线不是无条件保证，路径验证、NAT、服务器配置与应用超时都会影响结果。

**递进追问：**

1. **为什么不能把 QUIC 称为“不可靠 UDP”？**

   UDP 只提供报文承载，QUIC 在用户态自行实现确认、重传、拥塞控制和加密，向 HTTP/3 提供可靠的独立流。

2. **0-RTT 为什么有安全限制？**

   早期数据可能被攻击者重放，服务端不能假设请求只执行一次；应仅允许幂等可重放操作并结合防重放策略。

**易错点：**

- 不同 QUIC 流不互相等待丢包，不代表共享链路没有拥塞与带宽竞争。
- 只开放 TCP 443 而未正确放行和负载均衡 UDP 443，会让 H3 静默回退而难以发现。

**参考来源：**

- [RFC 9000：QUIC](https://www.rfc-editor.org/rfc/rfc9000)
- [RFC 9114：HTTP/3](https://www.rfc-editor.org/rfc/rfc9114)
- [RFC 9001：Using TLS to Secure QUIC](https://www.rfc-editor.org/rfc/rfc9001)

校验日期：2026-07-20

## Q15：DNS 预解析、preconnect 和 preload 有何区别？

**短回答：**

dns-prefetch 只解析域名，preconnect 提前建立连接和 TLS，preload 以高优先级声明当前页面确定需要的资源。

**原理：**

dns-prefetch 是资源提示，只提前解析指定主机名，降低未来 DNS 延迟，不建立传输连接。preconnect 进一步尝试完成 DNS、TCP 和 TLS（或相应协议连接）准备，适合很快会向关键第三方发请求，但会占用 socket、CPU 和电量，应只用于少量高价值源。preload 则声明当前页面确定需要某个具体资源，浏览器立即以较高优先级按 as、type、crossorigin 等属性发起获取，并把响应放入对应缓存供真正消费者复用；属性不匹配可能导致下载两次，预加载后未使用还会告警。三者不保证一定执行，浏览器可按资源与网络条件调整；未来导航资源通常是 prefetch 而非 preload。

**代码 / 场景：**

字体来自第三方 CDN：先建立连接，再用匹配的 crossorigin 预加载具体字体；主图同源直接 preload。

~~~html
<link rel="dns-prefetch" href="//cdn.example.com">
<link rel="preconnect" href="https://cdn.example.com" crossorigin>
<link rel="preload"
      href="https://cdn.example.com/fonts/ui.woff2"
      as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/hero.avif" as="image"
      fetchpriority="high">
~~~

在 Network 面板确认 Initiator 为 preload 且真正 CSS/图片消费时没有第二次请求。

**递进追问：**

1. **为什么不能对所有第三方域名都 preconnect？**

   每个预连接都会消耗连接槽、握手计算和电量，若资源很晚或根本不用，成本高于节省；应按关键路径和命中率筛选。

2. **字体 preload 为什么常需要 crossorigin？**

   字体获取采用 CORS 模式，即使同源策略细节不同，预加载请求的凭据模式必须与 CSS 实际请求匹配，否则缓存不能复用。

**易错点：**

- preload 的 as/type/crossorigin 错配会改变请求模式与优先级，常导致同一 URL 被重复下载。
- 资源提示只优化“发现与连接”，不能替代压缩、缓存和减少非关键资源。

**参考来源：**

- [WHATWG HTML：Link type preload](https://html.spec.whatwg.org/multipage/links.html#link-type-preload)
- [WHATWG HTML：Link type dns-prefetch](https://html.spec.whatwg.org/multipage/links.html#link-type-dns-prefetch)
- [MDN：rel=preconnect](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preconnect)

校验日期：2026-07-20

## Q16：Core Web Vitals 关注什么？

**短回答：**

LCP 衡量主要内容加载，INP 衡量交互响应，CLS 衡量意外布局偏移；优化应基于真实用户分位数而非只看单次实验室分数。

**原理：**

Core Web Vitals 用三类用户体验信号衡量页面：LCP 记录视口内最大候选内容元素完成绘制的时间，关注加载；INP 汇总用户交互从输入到下一次绘制的延迟并取接近最慢的代表值，关注响应；CLS 累积没有近期用户输入的意外布局偏移窗口，关注视觉稳定。当前常用“良好”阈值分别为 LCP 不超过 2.5 秒、INP 不超过 200ms、CLS 不超过 0.1，评估通常看真实用户第 75 百分位并按移动/桌面与页面类型分段。实验室 Lighthouse 可诊断但无法覆盖真实交互和设备长尾；优化必须关联业务样本量、版本和具体元素。

**代码 / 场景：**

用 web-vitals 库上报带 attribution 的真实样本，再在报表按页面和设备计算 p75，而不是对所有访问求平均。

~~~js
import { onCLS, onINP, onLCP } from "web-vitals/attribution"

function report(metric) {
  navigator.sendBeacon("/rum", JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
    page: location.pathname
  }))
}
onLCP(report)
onINP(report)
onCLS(report)
~~~

报表需按用户会话去重和版本标记，并对样本不足页面显示置信限制。

**递进追问：**

1. **为什么看 p75 而不是平均值？**

   平均值会被大量快速设备稀释，p75 更能约束较慢用户体验；仍应继续分设备、网络和页面定位长尾根因。

2. **实验室 INP 为什么难以代表线上？**

   实验室通常只执行预设少量交互，线上用户操作类型、会话时长和设备负载更复杂；实验室适合复现诊断，字段数据用于结果。

**易错点：**

- 只优化 Lighthouse 总分可能牺牲真实页面路径，必须验证字段数据和业务错误率。
- 把所有路由合并成一个 p75 会掩盖慢页面，应至少按模板、设备、国家或版本分段。

**参考来源：**

- [web.dev：Web Vitals](https://web.dev/articles/vitals)
- [web.dev：How Core Web Vitals thresholds were defined](https://web.dev/articles/defining-core-web-vitals-thresholds)
- [web-vitals 官方库](https://github.com/GoogleChrome/web-vitals)

校验日期：2026-07-20

## Q17：如何优化 LCP？

**短回答：**

先确认 LCP 元素，缩短 TTFB，避免关键资源发现延迟，压缩并预加载主图或字体，减少阻塞 CSS/JS 和客户端瀑布。

**原理：**

先从字段数据和 Performance 记录确认具体 LCP 元素与四段耗时：TTFB、资源加载延迟、资源下载时长和元素渲染延迟。若是服务器文本，优先降低 TTFB、流式输出并减少阻塞 CSS/字体；若是主图，应让 URL 在初始 HTML 或 CSS 中尽早可发现，使用正确尺寸与现代格式，必要时 preload 或 fetchpriority=high，避免懒加载首屏 LCP。客户端渲染常把资源发现推迟到 JavaScript 下载、执行和接口返回之后，应评估 SSR/预渲染。压缩资源只是下载阶段，不能解决排队和主线程阻塞；每次修改要对同一页面比较 LCP 子阶段和视觉正确性。

**代码 / 场景：**

观察 LCP 条目并记录元素与资源 URL；主图在 HTML 中直接发现且明确高优先级，不使用 loading=lazy。

~~~html
<link rel="preload" href="/hero-1280.avif"
      as="image" fetchpriority="high">
<img id="hero"
     src="/hero-1280.avif"
     srcset="/hero-640.avif 640w, /hero-1280.avif 1280w"
     sizes="100vw" width="1280" height="720"
     fetchpriority="high" alt="产品主视图">
<script>
new PerformanceObserver((list) => {
  console.log(list.getEntries().at(-1))
}).observe({ type: "largest-contentful-paint", buffered: true })
</script>
~~~

若资源很早下载完但 LCP 仍晚，应转查 CSS 可见性、字体或主线程渲染延迟。

**递进追问：**

1. **为什么首屏主图不应默认 lazy-load？**

   懒加载会等布局与可见性判断后才请求，增加资源加载延迟；已知 LCP 候选应在初始文档尽早发现并给予适当优先级。

2. **TTFB 很高时压缩主图能改善多少？**

   只能减少后续下载时长，无法补回等待首字节；应先量化各子阶段，并并行处理服务端、CDN与资源优化。

**易错点：**

- 给多张图片都 preload/high priority 会相互争抢带宽，反而推迟真正 LCP 和关键 CSS。
- LCP 候选可能随响应式布局变化，优化桌面主图后仍需在移动设备字段数据验证。

**参考来源：**

- [web.dev：Optimize LCP](https://web.dev/articles/optimize-lcp)
- [W3C Largest Contentful Paint](https://www.w3.org/TR/largest-contentful-paint/)
- [MDN：fetchpriority](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/fetchPriority)

校验日期：2026-07-20

## Q18：如何降低 CLS？

**短回答：**

为图片、广告和嵌入预留尺寸，字体使用合理回退和加载策略，避免在已有内容上方动态插入未占位元素。

**原理：**

CLS 来自可见元素在两帧之间发生非用户预期的位置变化，浏览器按影响范围与移动距离计算 layout-shift value，并在会话窗口内累计。降低它首先要为图片、视频、广告和嵌入提供 width/height 或 aspect-ratio，让布局在资源到达前就保留空间；动态提示尽量在已有占位区更新，或在用户操作后就近出现，避免向页面顶部插入。字体应选择度量接近的回退、合理 preload 与 font-display，并可用 size-adjust 等覆盖减少交换偏移。transform 动画通常不改变布局。用 PerformanceObserver 查看 sources，并过滤 hadRecentInput，才能定位具体节点而不是只看总分。

**代码 / 场景：**

图片提前声明宽高，异步横幅使用固定最小高度；观察器输出没有近期输入的偏移源。

~~~css
.hero { width: 100%; height: auto; aspect-ratio: 16 / 9; }
.notice-slot { min-height: 48px; }
~~~

~~~html
<img class="hero" src="hero.avif" width="1600" height="900" alt="">
<div class="notice-slot" id="notice"></div>
~~~

~~~js
new PerformanceObserver((list) => {
  for (const e of list.getEntries()) {
    if (!e.hadRecentInput) console.log(e.value, e.sources)
  }
}).observe({ type: "layout-shift", buffered: true })
~~~

修复后在慢网和字体首次加载场景复测，缓存命中可能掩盖偏移。

**递进追问：**

1. **用户点击展开内容产生偏移也计入 CLS 吗？**

   近期用户输入后的部分偏移会被 hadRecentInput 排除，但持续太晚或并非预期响应仍可能计入，体验设计仍应控制。

2. **font-display: swap 为什么可能增加 CLS？**

   回退字体先绘制后替换，若字宽、字高差异大就改变换行和盒尺寸；应匹配字体度量并观察真实偏移。

**易错点：**

- 只给图片 max-width:100% 不会自动预留高度，HTML 宽高或 aspect-ratio 才提供初始比例。
- 在本地缓存字体和图片后测不到首次加载偏移，必须使用冷缓存与慢网条件复现。

**参考来源：**

- [WICG：Layout Instability API](https://wicg.github.io/layout-instability/)
- [web.dev：Optimize CLS](https://web.dev/articles/optimize-cls)
- [MDN：aspect-ratio](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio)

校验日期：2026-07-20

## Q19：前端请求并发控制如何实现？

**短回答：**

维护最大并发数和等待队列，任务结束后启动下一个；配合 AbortController、超时、重试和幂等性，而不是无上限 Promise.all。

**原理：**

并发控制需要一个明确上限、等待队列和任务结束后的补位逻辑：提交任务时若 active 小于 limit 立即启动，否则排队；每个任务无论成功、失败或取消都在 finally 减少 active 并启动下一项。调用方还应传入 AbortSignal，区分用户取消、超时和真实网络失败；重试只用于幂等且可恢复错误，并采用退避与抖动，不能在队列外无上限复制任务。限流维度可按源、接口或用户操作拆分，优先级与公平性要显式定义。Promise.all 只聚合已经启动的 Promise，不能自己限制并发。验证应记录 active 峰值、排队时长、错误率和服务端 429，而不只是总耗时。

**代码 / 场景：**

这个最小池保证 active 从不超过 2；每个工厂函数被调度时才真正发起 fetch。

~~~js
async function runPool(factories, limit) {
  const results = new Array(factories.length)
  let next = 0
  async function worker() {
    while (true) {
      const i = next++
      if (i >= factories.length) return
      results[i] = await factories[i]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, factories.length) }, worker))
  return results
}

const jobs = urls.map((url) => () => fetch(url).then((r) => r.json()))
const data = await runPool(jobs, 2)
~~~

生产版本还需保存每项错误、接入 AbortSignal，并决定失败是否停止后续任务。

**递进追问：**

1. **为什么 urls.map(fetch) 后再放进池无效？**

   fetch 在 map 时已经启动，池只能等待既有 Promise；必须排队函数或惰性任务，让调度器决定何时调用。

2. **并发上限应该固定为多少？**

   没有通用固定值。并发增加会先提高吞吐，但当服务端或网络接近容量后，排队与资源竞争会让 P95 上升，并触发 429/503；HTTP/2 多路复用也不等于后端能无限处理。应在代表性网络和设备上逐级提高并发，记录吞吐、在途数、排队时间、错误率和尾延迟，选择收益拐点并服从 Retry-After；还可按接口成本和连接类型动态降档。

**易错点：**

- 任务 reject 后若没有 finally 补位，active 计数可能永久占用，队列随后全部卡死。
- 对非幂等写请求自动重试可能重复创建数据，必须使用幂等键或明确业务补偿。

**参考来源：**

- [WHATWG DOM：AbortController](https://dom.spec.whatwg.org/#interface-abortcontroller)
- [WHATWG Fetch Standard](https://fetch.spec.whatwg.org/)
- [ECMAScript：Promise.all](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.all)

校验日期：2026-07-20

## Q20：Promise.allSettled 适合什么业务？

**短回答：**

批量任务彼此独立且需要收集每项成功失败时使用；它不会短路，也不会自动重试，关键链路仍需明确整体成功条件。

**原理：**

Promise.allSettled 适合一组任务彼此独立、调用方必须等全部结束并逐项展示结果的场景，例如多文件上传、批量检查或并行读取多个可选数据源。它先把每个输入通过 Promise.resolve 规范化，最终 Promise 在所有项 fulfilled 或 rejected 后履行，结果数组保持输入顺序；每项是 {status:"fulfilled", value} 或 {status:"rejected", reason}。它不会遇到第一个失败就短路，也不会取消、重试、回滚或定义整体成功标准。关键交易若任一失败就不应继续，可能更适合 Promise.all 加主动取消；批量部分成功则要显式统计、重试可恢复项并向用户展示。

**代码 / 场景：**

三个上传中一个失败，allSettled 仍返回三项；代码按输入顺序生成可重试列表。

~~~js
const uploads = [
  Promise.resolve({ file: "a.png", id: 1 }),
  Promise.reject(new Error("quota exceeded")),
  Promise.resolve({ file: "c.png", id: 3 })
]

const settled = await Promise.allSettled(uploads)
console.table(settled.map((item, index) => ({
  index,
  status: item.status,
  detail: item.status === "fulfilled" ? item.value.file : item.reason.message
})))
// 输出顺序始终对应 a、b、c，不按完成先后排序
~~~

失败项是否重试要结合错误类型与幂等性，不能盲目再次执行全部上传。

**递进追问：**

1. **allSettled 与 all 的核心差异是什么？**

   all 在任一输入拒绝时尽快拒绝聚合 Promise，但其他任务不会自动取消；allSettled 等全部结束并返回每项状态。

2. **如何为 allSettled 中失败请求重试？**

   保存任务工厂与索引，筛选可恢复且幂等的 rejected 项，按退避和并发上限重新调用；不能对旧 Promise 本身“再执行”。

**易错点：**

- allSettled 返回 fulfilled 不代表业务成功，HTTP fetch 对 404/500 默认也会履行，仍需检查 response.ok。
- 等待全部任务可能拖慢关键路径，独立可选内容应考虑流式展示而不是统一等最慢项。

**参考来源：**

- [ECMAScript：Promise.allSettled](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.allsettled)
- [MDN：Promise.allSettled](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled)
- [WHATWG Fetch Standard：HTTP status handling](https://fetch.spec.whatwg.org/)

校验日期：2026-07-20

# Vite、构建与发布

## Q21：Vite 开发环境为什么启动快？

**短回答：**

它利用浏览器原生 ESM 按需提供源码，依赖预构建减少请求和 CommonJS 兼容成本，不必先打完整 bundle。

**原理：**

Vite 的冷启动路径不要求先把整个应用打成一个 bundle。浏览器请求入口后，开发服务器按需转换当前访问到的源码，并把裸模块导入改写成可由浏览器获取的 URL；尚未进入导入图的页面代码不会阻塞启动。依赖部分通常变化较少，Vite 8 使用 Rolldown 做依赖预构建，把 CommonJS/UMD 转为 ESM，并合并拥有大量内部模块的包，降低浏览器请求数量。热更新时，服务器沿模块图只传播受影响边界，不必重建全部资源。快来自“原生 ESM、按需转换、依赖缓存与精确 HMR”的组合，不等于完全没有编译。

**代码 / 场景：**

用一个含 30 个路由、但首屏只导入 2 个路由的项目验证：清除浏览器缓存后执行命令，并在 Network 面板观察首次请求。

~~~sh
npm run dev -- --debug
~~~

首屏只应请求入口及其可达模块；打开懒加载路由时才出现对应源码请求。再修改一个叶子组件，记录控制台 HMR 时间。若修改 vite.config.ts 或锁文件，依赖缓存会失效；需要人工复验缓存时可执行 vite --force。这样能把“启动快”落实为请求图和更新时间，而不是主观感受。

**递进追问：**

1. **为什么依赖仍要预构建？**

   浏览器不能直接消费部分 CommonJS/UMD 包，而且某些 ESM 依赖包含数百个内部文件。预构建既完成兼容转换，也把这些文件聚合，避免一个 import 引发大量网络往返。

2. **Vite 的 HMR 为什么可能退化成整页刷新？**

   当更新无法在模块图中找到可接受更新的边界，或插件转换结果破坏边界判断时，Vite 会回退到 full reload。框架插件通常负责注册组件级 HMR 接受逻辑。

**易错点：**

- 把开发服务器冷启动速度等同于生产性能；生产环境仍需独立构建、压缩和真实网络测试。
- 把 node_modules 中所有依赖都手工加入 optimizeDeps；过度配置会延长预构建并掩盖包的兼容问题。

**参考来源：**

- [Vite：为什么选择 Vite](https://vite.dev/guide/why)
- [Vite：依赖预构建](https://vite.dev/guide/dep-pre-bundling)
- [Vite：HMR API](https://vite.dev/guide/api-hmr)

校验日期：2026-07-20

## Q22：生产构建为什么仍需要 bundler？

**短回答：**

部署需做 tree shaking、代码分割、压缩、兼容转换和内容哈希，减少请求与运行开销，因此 Vite 生产阶段使用打包器。

**原理：**

开发期按需提供 ESM 优先缩短反馈时间，但直接把庞大的源码模块图交给生产浏览器，会产生过多请求、深层导入瀑布、重复依赖和不可控缓存边界。生产 bundler 能在全局导入图上做 tree shaking、公共依赖抽取、代码分割、资源指纹、目标语法转换和压缩，并输出稳定 manifest 供服务端或 CDN 引用。Vite 8 的生产构建底层是 Rolldown，早期 Vite 版本则使用 Rollup；版本差异必须以当前项目文档和配置项为准。构建结果仍需通过浏览器测试，因为开发与生产的解析、压缩和 chunk 时序并不相同。

**代码 / 场景：**

在 Vite 8 项目中显式生成 manifest 和隐藏 source map，再比较开发请求数与 dist 产物：

~~~ts
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    manifest: true,
    sourcemap: "hidden",
    rolldownOptions: { output: { entryFileNames: "assets/[name]-[hash].js" } }
  }
});
~~~

执行 vite build 后，检查 dist/.vite/manifest.json 中的入口、动态 imports 和 CSS 映射；再用预览服务器测首屏请求数与压缩后体积。若团队仍在 Vite 7 或更早版本，应使用该版本支持的 rollupOptions，而不是照抄 Vite 8 配置。

**递进追问：**

1. **既然 HTTP/2 能多路复用，为什么还要合并模块？**

   多路复用减少了连接阻塞，却没有消除每个请求的头部、调度、解析与模块求值成本，也无法自动打破动态导入瀑布。合理 bundling 仍能优化传输和执行路径。

2. **生产构建和 vite preview 分别解决什么？**

   vite build 生成静态产物；vite preview 只用于本地检查这些产物，不是为生产设计的高可用服务器。正式环境仍应使用 CDN、反向代理或应用服务器托管。

**易错点：**

- 根据旧版文章断言当前 Vite 永远使用 Rollup；Vite 8 已将生产构建切换为 Rolldown。
- 只确认构建命令成功，不检查动态导入、旧浏览器目标、CSS 顺序和资源基路径在生产环境是否正确。

**参考来源：**

- [Vite：生产构建](https://vite.dev/guide/build)
- [Vite 8 发布说明](https://vite.dev/blog/announcing-vite8)
- [Vite：为什么生产仍需打包](https://vite.dev/guide/why)

校验日期：2026-07-20

## Q23：tree shaking 生效需要什么条件？

**短回答：**

依赖静态 ESM 导入导出和可判定副作用；动态访问、CommonJS 或错误 sideEffects 声明会阻碍删除未使用代码。

**原理：**

tree shaking 依赖构建器能够静态建立“导出—引用”关系，因此标准 ESM 的静态 import/export 最友好。构建器从入口标记可达绑定，再删除未使用且可证明无副作用的代码；它不是运行时分支求值器，也不能安全猜测任意函数调用是否纯净。模块顶层写全局变量、注册监听器、导入 CSS，或包混用 CommonJS 和动态属性访问，都会限制删除。package.json 的 sideEffects 元数据和纯函数注释可提供额外证明，但声明错误会把必要初始化一并裁掉。是否生效必须看生产产物和行为，而非只看源码“似乎没被使用”。

**代码 / 场景：**

建立一个最小模块并观察构建结果：

~~~ts
// math.ts
export const add = (a: number, b: number) => a + b;
export const unused = () => 42;
console.info("module initialized");

// main.ts
import { add } from "./math";
document.body.textContent = String(add(1, 2));
~~~

生产构建通常可删除 unused，但必须保留顶层 console.info，因为导入模块会执行它。删除该副作用后再次构建，用产物搜索和 gzip 大小确认差异；随后运行页面，确保行为相同。这个实验能区分“删除未引用导出”和“误删模块副作用”。

**递进追问：**

1. **sideEffects: false 表示什么？**

   它向构建器承诺包内模块在仅被导入而未使用导出时可以安全删除。若包含 CSS 导入、polyfill 或顶层注册，必须用数组模式保留这些文件，否则会造成生产故障。

2. **动态 import 会妨碍 tree shaking 吗？**

   动态 import 通常创建独立 chunk，但 chunk 内仍可做静态分析。真正困难的是运行时拼接未知路径、CommonJS require 或通过对象动态枚举导出，因为依赖集合不再明确。

**易错点：**

- 把压缩器删除 if (false) 与 tree shaking 混为一谈；前者是常量折叠，后者围绕模块导出可达性。
- 为了缩包盲目设置 sideEffects: false，导致样式、polyfill、全局注册或监控初始化只在生产丢失。

**参考来源：**

- [Rollup：Tree-shaking](https://rollupjs.org/introduction/#tree-shaking)
- [webpack：Tree Shaking 与 sideEffects](https://webpack.js.org/guides/tree-shaking/)
- [MDN：JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

校验日期：2026-07-20

## Q24：代码分割过细有什么问题？

**短回答：**

小 chunk 过多增加请求调度、压缩字典损失和加载瀑布；应以路由、低频重功能和共享依赖为边界并结合分析报告。

**原理：**

代码分割的目标是把非关键代码推迟到需要时加载，但每个 chunk 都会引入请求调度、响应头、缓存元数据、解压、解析、编译和模块求值成本。粒度过细还会缩小压缩字典、产生共享依赖碎片，并在动态导入之间形成串行瀑布；HTTP/2/3 只能降低部分传输开销，不能消除主线程执行和依赖发现延迟。另一方面，过大的公共 chunk 会因小改动频繁失效。合理边界通常贴合路由或独立业务能力，并结合命中率、变更频率和用户路径决定，而不是追求 chunk 数量越多越先进。

**代码 / 场景：**

先以路由为边界做动态导入，再用真实构建清单核对：

~~~ts
const routes = {
  home: () => import("./pages/home"),
  report: () => import("./pages/report"),
  admin: () => import("./pages/admin")
};
await routes.report();
~~~

比较两次构建：A 将 60 个小组件分别动态导入，B 只按三个路由拆分。通过浏览器 Performance/Network 记录 report 首次打开的请求数、JS 传输体积、脚本解析时间和交互延迟。若 A 少传 15 KB 却新增几十次模块求值和明显瀑布，就应合并边界。

**递进追问：**

1. **如何判断公共依赖应该单独成 chunk？**

   观察它是否被多个入口复用、体积是否显著、变更频率是否低，以及拆出后是否减少重复下载。还要检查首次访问是否反而多出关键路径请求，不能只看缓存理论。

2. **预加载能完全修复过细分割吗？**

   modulepreload 可以提前发现部分依赖，却仍有带宽竞争、解析执行和缓存管理成本；错误预加载还会挤占 LCP 资源，所以它只能优化已验证的关键 chunk。

**易错点：**

- 以每个组件一个异步 chunk 作为固定规则，忽略用户导航路径、压缩率和低端设备解析成本。
- 只看未压缩文件大小决定分割，未同时记录请求瀑布、gzip/Brotli 体积和主线程脚本时间。

**参考来源：**

- [Vite：Chunking Strategy](https://vite.dev/guide/build#chunking-strategy)
- [MDN：import()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)
- [web.dev：Reduce JavaScript payloads with code splitting](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting)

校验日期：2026-07-20

## Q25：source map 上线有什么安全与调试权衡？

**短回答：**

它能还原压缩堆栈，可私有上传到监控平台；公开 map 可能暴露源码和路径，但隐藏 map 仍需妥善访问控制。

**原理：**

source map 用映射段把压缩产物的位置还原到源文件、符号和源码行，大幅提高线上堆栈的可读性以及版本归因能力。但 map 常包含 sourcesContent、目录结构、注释和内部模块名称；只要公开可下载，攻击者也能用它理解实现。hidden source map 仅是不在产物尾部写 sourceMappingURL，并不自动阻止对 .map 路径的猜测。稳妥做法是构建与发布版本一一对应，把 map 上传到受控错误平台，限制访问并从公共静态目录移除，同时验证错误事件携带 release/commit。是否公开应基于威胁模型，而非认为源码本身就是安全边界。

**代码 / 场景：**

Vite 构建生成隐藏映射，并在发布流水线中先上传、后删除公共副本：

~~~ts
// vite.config.ts
import { defineConfig } from "vite";
export default defineConfig({ build: { sourcemap: "hidden" } });
~~~

流水线应以 commit SHA 创建 release，上传 dist/**/*.map 后校验平台能把一条测试异常定位到原 TypeScript 行，再从对外发布目录删除 map。最后直接请求预期 .map URL，确认返回 404；仅检查 JS 中没有 sourceMappingURL 并不足够。

**递进追问：**

1. **关闭 sourcesContent 就没有泄露风险了吗？**

   没有。映射仍可能暴露源文件名、路径和符号，而且公开部署的未压缩模块或许可证信息也能辅助分析。它只是减少直接还原完整源码的程度。

2. **为什么 source map 必须绑定 release？**

   相同文件名在不同构建中映射完全不同。若错误平台拿错 map，会把行列号映射到错误源码，形成比无堆栈更危险的误导，因此需用 commit、版本和资产散列关联。

**易错点：**

- 把 hidden 当作访问控制并继续公开上传 .map；扫描器仍可根据 JS 文件名或目录规则找到它。
- 发布后重新构建再上传 source map；即便源码相同，压缩顺序和映射段也可能变化，无法准确还原。

**参考来源：**

- [ECMA-426：Source Map Format](https://tc39.es/ecma426/)
- [Vite：build.sourcemap](https://vite.dev/config/build-options#build-sourcemap)
- [MDN：SourceMap 响应头](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/SourceMap)

校验日期：2026-07-20

## Q26：环境变量为什么不能存前端密钥？

**短回答：**

进入客户端 bundle 的变量任何用户都可查看；前端只放公开配置，私钥和第三方机密必须由服务端保管并代理调用。

**原理：**

前端代码最终要交付到不受信任的用户设备执行，构建时注入的环境变量会被替换进 JavaScript、HTML 或 source map，运行时变量也能在 Network、DevTools 和内存中读取。因此变量名前带 VITE_、REACT_APP_ 或是否压缩，都不构成保密措施。真正的密钥必须留在受控服务端，由服务端完成鉴权、配额和第三方 API 调用；前端只持有可公开的配置或短期、最小权限凭证。若供应商要求浏览器端公开 key，还必须配合域名限制、权限范围、速率限制和监控，不能把它当成传统 secret。

**代码 / 场景：**

下面的写法会把值直接放进产物，任何访问者都能搜索到：

~~~ts
const secret = import.meta.env.VITE_PAYMENT_SECRET;
await fetch("https://pay.example/charge", {
  headers: { Authorization: "Bearer " + secret }
});
~~~

构建后对 dist 做字符串扫描即可复现泄露。正确方案是浏览器调用自己服务器的 /api/charge，服务器从密钥管理系统读取凭证并校验当前用户和金额。CI 还应对构建产物运行 secret scanner，并在发现泄露后立即撤销旧密钥，而不是只删除 Git 提交。

**递进追问：**

1. **后端下发一个临时 token 就一定安全吗？**

   仍需限定有效期、受众、操作范围和可用资源，并在服务端验证。若临时 token 可执行所有管理操作，泄露后的风险与长期密钥并没有本质区别。

2. **为什么删除仓库中的密钥还不够？**

   密钥可能已进入 Git 历史、CI 日志、构建缓存、浏览器缓存和 CDN。处置必须以轮换或吊销为核心，再清理传播副本并审计是否被使用。

**易错点：**

- 认为 .env 文件未提交就安全；只要变量被前端构建引用，它仍会出现在可下载产物中。
- 用字符串混淆、Base64 或分段拼接隐藏密钥；这些仅增加阅读成本，无法建立可信安全边界。

**参考来源：**

- [Vite：环境变量与模式](https://vite.dev/guide/env-and-mode)
- [OWASP：Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [OWASP：REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)

校验日期：2026-07-20

## Q27：如何设计前端发布回滚？

**短回答：**

构建不可变制品并记录提交与配置，静态资源使用哈希，入口版本可快速切换；数据库/API 变更需向前兼容才能独立回滚前端。

**原理：**

可靠回滚首先要求每次发布产物不可变且可寻址：HTML 入口按版本保存，带内容哈希的静态资源长期保留，发布记录绑定 commit、构建参数和后端兼容范围。切流时使用原子地更新入口或 CDN 指针，而不是覆盖同名 JS；发生故障后恢复上一入口即可。前端与 API 还要遵循向后兼容窗口，因为用户可能长期打开旧标签页，Service Worker 或 CDN 也可能继续提供旧资源。数据库或接口已经发生不可逆变化时，单纯回滚前端并不能恢复系统，所以方案应包含 feature flag、灰度指标和“向前修复”条件。

**代码 / 场景：**

一次可验证的蓝绿发布可保留两个目录：

~~~text
/releases/20260720-a/index.html
/releases/20260720-a/assets/app-8ad1.js
/releases/20260720-b/index.html
/releases/20260720-b/assets/app-31c4.js
/current -> /releases/20260720-b
~~~

先让 5% 流量进入 b，观察 10 分钟的 JS 错误率、LCP、接口 5xx 和关键转化；若超过阈值，原子切回 a 并清除 HTML 的 CDN 缓存，但保留两版哈希资源。用一个发布前已打开的旧标签页复测 API，确认兼容窗口真实存在。

**递进追问：**

1. **为什么不能回滚时直接删除新版本资源？**

   已经拿到新版 HTML 的客户端仍会请求那些哈希资源，删除会制造 404 和白屏。应保留若干版本资源，先切入口并等待缓存和会话窗口结束。

2. **什么情况下应优先 feature flag 而不是整版回滚？**

   当故障集中在一个可隔离功能，而其余修复或安全更新必须保留时，关闭服务端控制的开关影响更小；前提是开关本身经过测试且默认值安全。

**易错点：**

- 只保存 Git 标签，不保存实际构建产物；依赖、环境或构建器变化会使重新构建结果不同。
- 新旧前端与 API 没有兼容策略，导致切回旧入口后因字段或接口已删除而继续失败。

**参考来源：**

- [Google SRE：Canarying Releases](https://sre.google/workbook/canarying-releases/)
- [MDN：Cache-Control immutable](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
- [web.dev：Service worker lifecycle](https://web.dev/articles/service-worker-lifecycle)

校验日期：2026-07-20

## Q28：CI/CD 中前端质量门禁包括什么？

**短回答：**

锁依赖安装、类型检查、lint、单元与 E2E、构建和包体预算，部署后做健康检查与冒烟，再逐步放量。

**原理：**

质量门禁应按失败成本分层：先做可快速确定的格式、lint、类型检查和单元测试，再做构建、依赖与密钥扫描、组件/契约测试，最后在接近生产的预览环境执行 E2E、可访问性和性能预算。门禁必须有明确阈值、稳定输入和可追踪报告；“跑了工具”不等于有效，例如只检查总覆盖率会掩盖核心模块未覆盖。发布环节还需验证产物完整性、版本元数据、迁移兼容和回滚入口。高波动指标适合趋势告警或多次采样，不宜用一次偶然 Lighthouse 分数阻断所有提交。

**代码 / 场景：**

一个最小 PR 流水线可以设置这些可验证条件：

~~~yaml
gates:
  - "eslint: 0 errors"
  - "tsc --noEmit: success"
  - "unit: critical modules >= 90% branch coverage"
  - "build: success and no secret findings"
  - "bundle: entry gzip <= 180 KiB, increase <= 10 KiB"
  - "e2e: login and core read flow pass"
  - "a11y: no critical violations"
~~~

将每个结果作为 PR 可见报告，并保留构建产物。性能测试固定设备、网络和样本页面，连续三次取中位数；若失败，报告具体超预算 chunk，而不是只给红灯。

**递进追问：**

1. **覆盖率越高是否代表测试越好？**

   不是。覆盖率只表示代码被执行，不能证明断言有价值。应优先覆盖风险高的状态转换、异常路径和契约，同时用变异测试或评审检查测试是否真正能发现错误。

2. **哪些门禁适合放在合并后而不是每个 PR？**

   耗时很长、依赖大规模真实环境或统计采样的全量兼容与性能回归可在主干持续执行；PR 保留快速代表集，但主干失败必须有阻止发布和归责机制。

**易错点：**

- 把所有检查串行执行，导致反馈过慢且开发者绕过流水线；应按依赖关系并行化并尽早失败。
- 允许无期限 flaky 重试而不记录首次失败；绿灯会掩盖不稳定性，最终让真实回归也被忽略。

**参考来源：**

- [TypeScript：tsconfig noEmit](https://www.typescriptlang.org/tsconfig/noEmit.html)
- [Playwright：CI](https://playwright.dev/docs/ci)
- [web.dev：Performance budgets](https://web.dev/articles/performance-budgets-101)

校验日期：2026-07-20

## Q29：Module Federation 适合什么场景？

**短回答：**

多团队需要独立部署前端模块且可接受运行时依赖协调时有价值；会增加版本、共享依赖、故障隔离和本地开发复杂度。

**原理：**

Module Federation 允许一个构建在运行时加载另一个独立部署构建暴露的模块，并协商共享依赖，适合多团队确实需要独立发布、同一页面又要组合能力的微前端平台。它解决的是部署与所有权边界，不是普通代码复用；单仓库或统一发布的应用通常用包、workspace 和路由分割更简单。联邦运行时还引入远端可用性、版本协商、单例依赖、样式隔离、安全信任和观测问题。采用前应明确 shell 与 remote 的契约、失败降级、兼容策略和发布责任，否则只是把编译期问题推到用户运行时。

**代码 / 场景：**

假设招聘平台的主壳与报表由不同团队发布，可定义最小远端契约：

~~~ts
export type ReportRemote = {
  mount(el: HTMLElement, input: { userId: string; traceId: string }): () => void;
};

async function loadReport(): Promise<ReportRemote> {
  const remote = await import("analytics/report");
  if (typeof remote.mount !== "function") throw new Error("remote contract mismatch");
  return remote;
}
~~~

测试远端正常、超时、404、版本不兼容四种情况；超时后主壳应显示可重试占位而非白屏。灰度时分别记录 remote 加载成功率、额外 LCP 和共享依赖重复体积。

**递进追问：**

1. **共享 React/Vue 为什么常设为 singleton？**

   框架运行时若出现多份实例，context、hooks、依赖注入或响应式对象可能跨边界失效。但 singleton 又会放大版本冲突，因此必须定义兼容版本并在集成测试中验证。

2. **远端模块失败时由谁负责降级？**

   通常主壳负责超时、错误边界和用户级降级，远端负责自身初始化错误与资源清理；双方契约应规定遥测字段、重试语义和不允许抛到全局的错误。

**易错点：**

- 仅为“技术先进”拆成多个 remote，却仍由同一团队同步发布，徒增网络、版本和调试复杂度。
- 把所有依赖都设为共享 singleton，造成远端被主壳版本隐式绑死，无法真正独立部署。

**参考来源：**

- [webpack：Module Federation](https://webpack.js.org/concepts/module-federation/)
- [Module Federation：Runtime API](https://module-federation.io/guide/basic/runtime/runtime-api)
- [Module Federation：Shared](https://module-federation.io/configure/shared)

校验日期：2026-07-20

## Q30：如何分析前端包体？

**短回答：**

用构建产物可视化确认大依赖、重复版本和不可摇树模块，再按加载时机、替代库、动态导入和服务端能力逐项优化。

**原理：**

包体分析要区分源码大小、构建后原始大小、gzip/Brotli 传输大小以及浏览器解析执行成本。首先从入口和各异步路由建立基线，再用构建可视化定位大模块、重复依赖、意外引入的 locale 或 polyfill；随后结合 coverage 和真实用户路径判断代码是否首屏需要。缩小文件并不总能改善体验，例如把代码转为大量小 chunk 可能增加瀑布，使用更紧凑但执行更慢的库也可能增加主线程时间。结论应落实到具体 import 路径、预算变化和页面指标，并在 CI 中防止回归。

**代码 / 场景：**

对同一次生产构建记录一张基线表：入口 JS 420 KiB raw / 132 KiB gzip，首屏未使用 48%，最大依赖 editor 170 KiB raw。把编辑器改为进入编辑页时动态导入后再测：

~~~ts
document.querySelector("#edit")?.addEventListener("click", async () => {
  const { openEditor } = await import("./editor");
  openEditor();
});
~~~

重新构建并用 bundle visualizer 确认 editor 离开入口；在相同网络/CPU 下记录首页 LCP、Total Blocking Time 与编辑器首次打开延迟。若首页改善但编辑页出现长瀑布，应预取或重新划分边界。

**递进追问：**

1. **为什么只比较 gzip 大小不够？**

   压缩体积反映网络传输，却不代表解压后的解析、编译和执行成本。两个同为 100 KiB gzip 的脚本可能因语法结构和初始化逻辑产生完全不同的主线程耗时。

2. **如何发现同一依赖被打入多份？**

   在可视化产物中查看模块路径和 chunk 归属，并检查锁文件是否安装多个版本。还应看动态入口是否各自包含相同代码，再通过版本收敛或公共 chunk 验证去重效果。

**易错点：**

- 看到 node_modules 模块很大就直接删除或替换，未确认其是否在关键路径、是否可 tree shake 以及替代品执行成本。
- 每次构建使用不同依赖锁或压缩配置比较体积，基线不可比，容易把工具变化误判为优化收益。

**参考来源：**

- [Vite：Performance](https://vite.dev/guide/performance)
- [Rollup Plugin Visualizer](https://github.com/btd/rollup-plugin-visualizer)
- [web.dev：JavaScript performance](https://web.dev/learn/performance/javascript)

校验日期：2026-07-20

# TypeScript 类型系统

## Q31：any、unknown 和 never 的区别是什么？

**短回答：**

any 关闭大部分检查，unknown 使用前必须收窄，never 表示不可能出现的值，常用于穷尽检查和永不返回函数。

**原理：**

any 会关闭该值附近的大部分静态检查：它既能赋给多数类型，也允许任意属性和调用，错误会继续向下游传播。unknown 表示“类型尚未确认”，任何值都能赋给它，但读取属性、调用或赋给具体类型前必须收窄，因此适合 JSON、异常和外部输入边界。never 表示不可能出现的值，是空联合；永不返回的函数、穷尽分支后的变量会得到 never。三者不是“宽松程度递进”：unknown 是安全顶层类型，never 是底层类型，any 则有意绕过类型系统。选择关键在于是否掌握证据和是否需要证明分支穷尽。

**代码 / 场景：**

下面的代码可用 tsc --noEmit 验证三者差异：

~~~ts
const raw: unknown = JSON.parse('{"id": 7}');
// raw.id; // 编译错误：必须先收窄
if (typeof raw === "object" && raw !== null && "id" in raw) {
  console.log((raw as { id: unknown }).id);
}

function fail(message: string): never { throw new Error(message); }
type Status = "idle" | "done";
function label(s: Status) {
  if (s === "idle") return "等待";
  if (s === "done") return "完成";
  const exhaustive: never = s;
  return fail(String(exhaustive));
}
~~~

给 Status 新增 "error" 后，never 赋值会立即报错，证明穷尽检查生效。

**递进追问：**

1. **catch 变量为什么适合 unknown？**

   JavaScript 可以抛出字符串、对象或任意值，不能默认拥有 message。使用 unknown 会迫使代码先做 instanceof Error 或结构校验，再安全读取错误信息。

2. **返回 never 与返回 void 有什么不同？**

   void 函数会正常返回，只是不提供有意义的返回值；never 函数在任何路径都不能到达调用点之后，通常因为抛错、退出进程或无限循环。

**易错点：**

- 用 any 暂时消除一个边界错误，却让不安全值贯穿业务层；应在边界用 unknown 并尽早校验。
- 用类型断言把 unknown 直接写成目标类型；断言没有运行时检查，只是绕过了收窄要求。

**参考来源：**

- [TypeScript：The unknown Type](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown)
- [TypeScript：The never Type](https://www.typescriptlang.org/docs/handbook/2/functions.html#never)
- [TypeScript：any](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#any)

校验日期：2026-07-20

## Q32：interface 和 type 如何选择？

**短回答：**

interface 擅长对象契约与声明合并，type 可表达联合、交叉和映射；项目应按能力和一致性选择，不必争论绝对优劣。

**原理：**

interface 主要描述对象、函数和类可实现的形状，支持 extends，并且同名声明会合并，适合需要由使用者扩展的公共对象契约。type 是任意类型表达式的别名，可表示联合、交叉、元组、原始类型及映射/条件类型，表达组合能力更强。两者描述普通对象时能力大量重叠，选择应服务于扩展策略和团队一致性，而非性能传言。若 API 不希望被外部声明合并，type 往往更明确；若发布库有意提供 augmentation 点，interface 更自然。无论选择哪种，都要避免交叉或继承产生不可满足属性。

**代码 / 场景：**

同一文件用 tsc 验证声明合并与联合能力：

~~~ts
interface User { id: string }
interface User { name: string }
const user: User = { id: "u1", name: "Linda" };

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function print(result: Result<User>) {
  return result.ok ? result.data.name : result.error;
}
~~~

删除 name 后 User 赋值会报错，证明 interface 已合并；Result 则直接表达互斥分支。若把公共接口改为 type，同名重复定义会报错，这正是是否允许开放扩展的设计差异。

**递进追问：**

1. **interface extends 和 type 交叉完全等价吗？**

   不完全等价。interface 继承遇到不兼容同名属性会直接报错；交叉类型可能把冲突属性计算成 never，错误延迟到使用点，诊断方式和可读性不同。

2. **库作者什么时候需要声明合并？**

   当框架明确允许插件扩充请求上下文、主题或路由元数据时，可暴露 interface 作为 augmentation 点；若没有此扩展契约，意外合并反而可能隐藏命名冲突。

**易错点：**

- 用“interface 更快”或“type 更现代”作为绝对规则，忽略真正决定选择的开放扩展与类型表达需求。
- 对不兼容对象盲目使用交叉类型，得到某属性为 never 的不可构造结果，却直到赋值处才发现。

**参考来源：**

- [TypeScript：Interfaces](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [TypeScript：Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
- [TypeScript：Type Aliases](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-aliases)

校验日期：2026-07-20

## Q33：泛型相比 any 的价值是什么？

**短回答：**

泛型在输入和输出之间保留类型关系，调用方仍得到具体类型；any 会丢失约束和自动补全。

**原理：**

泛型把调用点的具体类型作为参数带入函数、类或接口，使输入与输出之间的关系在编译期得到保留；any 只表示放弃检查，返回后类型关系已经丢失。泛型的价值不是“接受任意值”，而是对一族类型复用同一算法，同时维持成员、键和值之间的约束。类型参数应出现在至少两个需要关联的位置，否则可能只是多余抽象。推断可以让调用者少写类型参数，约束和默认值则帮助表达可操作能力。泛型仍不会自动验证运行时数据，外部 JSON 必须先校验再进入泛型逻辑。

**代码 / 场景：**

比较两种 first 的调用结果：

~~~ts
function firstAny(items: any[]): any { return items[0]; }
function first<T>(items: readonly T[]): T | undefined { return items[0]; }

const unsafe = firstAny([1, 2]);
unsafe.toUpperCase(); // 编译通过，运行时报错

const safe = first([1, 2]);
// safe.toUpperCase(); // 编译错误
const value = safe?.toFixed(2);
console.log(value);
~~~

运行 unsafe 行会得到 TypeError；注释它后，safe 被推断为 number | undefined，调用者既保留元素类型，又被迫处理空数组。

**递进追问：**

1. **什么时候泛型参数是多余的？**

   若类型参数只在一个参数位置出现，既不关联返回值也不约束其他成员，直接使用具体类型或 unknown 通常更清晰。泛型应表达真实类型关系，而非装饰函数。

2. **泛型能保证后端返回 T 吗？**

   不能。fetchJson<T>() 中的 T 只影响编译器，网络响应仍可是任意结构。必须通过 schema 或类型守卫做运行时验证，验证成功后才能得到可信 T。

**易错点：**

- 编写 request<T>() 后直接把 JSON 断言为 T，误以为泛型完成了数据校验，生产中仍会因字段缺失失败。
- 堆叠过多无法推断的类型参数，迫使调用者重复写实现细节，使 API 比几个明确重载更难使用。

**参考来源：**

- [TypeScript：Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript：Guidelines for Writing Good Generic Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html#guidelines-for-writing-good-generic-functions)
- [TypeScript：Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html)

校验日期：2026-07-20

## Q34：extends 泛型约束解决什么问题？

**短回答：**

它限制类型参数必须具备某些结构，使函数体可安全访问对应成员，同时保留调用方更具体的类型信息。

**原理：**

泛型默认只知道 T 可以是任何类型，因此实现体不能安全访问 length、id 等成员。T extends Constraint 把可接受集合限制为满足某个结构的类型，使实现可以使用约束声明的能力，同时返回值仍保留调用者传入的更具体类型。约束也能建立类型参数关系，例如 K extends keyof T 表示键必须来自对象。它是编译期的结构约束，不会生成运行时检查；来自网络的值即使被断言为受约束类型，也可能不满足条件。约束应只包含算法真正需要的最小能力，过宽失去保护，过窄则拒绝本来可用的数据。

**代码 / 场景：**

一个只需要 length 的算法不必限定为数组：

~~~ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

const text = longest("TS", "TypeScript"); // 类型仍为 string
const list = longest([1], [1, 2, 3]);     // 类型仍为 number[]
// longest(10, 20); // 编译错误：number 没有 length
console.log(text, list.length);
~~~

tsc 会拒绝数字调用；合法调用的返回值仍保留字符串或数组能力，说明约束既给实现提供证据，又没有像直接写 { length: number } 那样丢失具体类型。

**递进追问：**

1. **T extends object 能否保证对象拥有某字段？**

   不能，它只排除多数原始值，没有声明具体键。需要访问 id 时应约束为 T extends { id: string }，并根据是否允许额外字段决定 API 设计。

2. **为什么约束不能替代运行时校验？**

   TypeScript 类型在编译后会被擦除，JSON、localStorage 和第三方脚本都可产生不符合声明的值。约束只检查已知静态类型，边界数据仍需实际解析。

**易错点：**

- 为了访问一个字段把 T 约束成完整业务实体，导致轻量对象无法复用；应声明算法所需的最小结构。
- 用 extends 把未经验证的 API 响应强制断言进泛型，编译器会信任断言，但运行时不存在保护。

**参考来源：**

- [TypeScript：Generic Constraints](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-constraints)
- [TypeScript：Using Type Parameters in Generic Constraints](https://www.typescriptlang.org/docs/handbook/2/generics.html#using-type-parameters-in-generic-constraints)
- [TypeScript：Type Erasure](https://www.typescriptlang.org/docs/handbook/2/classes.html#type-only-field-declarations)

校验日期：2026-07-20

## Q35：keyof 与 indexed access 如何配合？

**短回答：**

keyof 得到对象键联合，T[K] 取得对应属性类型，可构造安全的 get、表单字段和配置映射 API。

**原理：**

keyof T 产生对象类型 T 的键联合，T[K] 则取得键 K 对应的值类型；把 K 约束为 keyof T 后，可以建立“传入哪个键，就返回该键值类型”的关联。它常用于安全的属性访问、表格列配置和事件映射，避免把键写成普通 string 后丢失信息。若 K 本身是键联合，T[K] 也会得到对应值的联合。需要注意 JavaScript 对象键可能包含 string、number、symbol，索引签名会让 keyof 变宽；可选属性的 indexed access 还会包含 undefined，并受 noUncheckedIndexedAccess 等配置影响。

**代码 / 场景：**

用 getProperty 验证键和值的关联：

~~~ts
type User = { id: number; name: string; active?: boolean };

function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user: User = { id: 7, name: "Linda" };
const id = getProperty(user, "id");       // number
const active = getProperty(user, "active"); // boolean | undefined
// getProperty(user, "email"); // 编译错误
console.log(id.toFixed(), active ?? false);
~~~

把 key 改为普通 string 会无法安全执行 obj[key]；而泛型约束既拒绝 email，又保留了 id 与 number 的精确关系。

**递进追问：**

1. **为什么 keyof 带字符串索引签名的类型可能得到 string | number？**

   JavaScript 会把数字属性名转换为字符串，因此声明 { [key: string]: X } 时，obj[0] 与 obj["0"] 指向同一项，TypeScript 会在 keyof 中反映这种行为。

2. **如何只允许对象的字符串键？**

   可使用 Extract<keyof T, string> 或 keyof T & string 收窄，但应先确认 symbol/number 键确实不属于业务契约，避免静默排除合法字段。

**易错点：**

- 把列字段定义成 string 再用 as keyof T 强断言；拼写错误会逃过检查，应让配置本身泛型化并由编译器推断。
- 忽略可选属性和 noUncheckedIndexedAccess，直接调用 T[K] 的方法，运行时可能遇到 undefined。

**参考来源：**

- [TypeScript：keyof Type Operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- [TypeScript：Indexed Access Types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
- [TypeScript：noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html)

校验日期：2026-07-20

## Q36：类型收窄有哪些常用方式？

**短回答：**

typeof、instanceof、in、判别字段、相等判断和自定义类型谓词；收窄必须有真实运行时检查支撑。

**原理：**

类型收窄是利用运行时可观察证据，把联合类型缩小到当前分支可能的成员。常见证据包括 typeof、instanceof、in、严格相等判断、真值检查、Array.isArray，以及控制流中的提前 return。自定义类型谓词 value is T 可以封装判断，但函数体由开发者负责，写错会欺骗编译器；断言函数 asserts 则适合失败时抛错的边界。收窄依赖变量当前的控制流和赋值历史，别名、回调或后续写入可能让结果失效。最稳妥的设计是让联合成员带稳定判别字段，并让运行时判断与真实数据结构一致。

**代码 / 场景：**

这个函数同时演示 typeof、in 和 Array.isArray：

~~~ts
type Input = string | string[] | { message: string } | null;

function normalize(input: Input): string {
  if (input === null) return "";
  if (typeof input === "string") return input.trim();
  if (Array.isArray(input)) return input.join(",");
  if ("message" in input) return input.message;
  const unreachable: never = input;
  return unreachable;
}

console.log(normalize(["a", "b"])); // a,b
~~~

逐个删除判断并运行 tsc，可观察剩余分支类型如何变化；最后的 never 还会在新增联合成员但忘记处理时报告错误。

**递进追问：**

1. **为什么 typeof null 不能用于判断对象？**

   JavaScript 历史行为使 typeof null 返回 "object"。对象分支必须先排除 null，否则读取属性会发生运行时错误，TypeScript 也不会把它安全收窄为普通对象。

2. **自定义类型谓词有什么风险？**

   编译器不会证明谓词实现与 T 一致。若只检查一个脆弱字段就返回 value is User，下游会无条件信任；边界数据更适合由可测试 schema 统一解析。

**易错点：**

- 用 Boolean(value) 或双感叹号过滤值后假设所有 falsy 都是无效；数字 0 和空字符串可能是合法业务数据。
- 在异步回调中依赖外层对象属性的旧收窄，却允许其他代码重新赋值；应复制稳定局部值或重新检查。

**参考来源：**

- [TypeScript：Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript：Using Type Predicates](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
- [MDN：typeof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)

校验日期：2026-07-20

## Q37：判别联合为什么适合状态机？

**短回答：**

每个分支有唯一字面量 tag，switch 后字段被精确收窄，default 可用 never 检查遗漏状态。

**原理：**

判别联合让每个状态使用同一个字面量字段区分，并把该状态才合法的数据放在对应成员里。例如 loading 不携带 data，success 必须携带 data，failure 必须携带 error。这样可以从类型层面排除“既加载又成功”“失败但没有错误”等非法组合；switch 判别字段后，控制流会自动得到精确成员，配合 never 还能检查穷尽性。它适合有限状态和事件协议，但并不会自动限制所有状态迁移；若要保证 idle 不能直接跳 success，还需要把事件、转移函数或 reducer 的输入同样建模并测试。

**代码 / 场景：**

把远程请求状态写成互斥联合：

~~~ts
type State<T> =
  | { status: "idle" }
  | { status: "loading"; startedAt: number }
  | { status: "success"; data: T }
  | { status: "failure"; error: Error };

function render(state: State<string>): string {
  switch (state.status) {
    case "idle": return "未开始";
    case "loading": return "已等待 " + (Date.now() - state.startedAt) + "ms";
    case "success": return state.data;
    case "failure": return state.error.message;
    default: { const neverState: never = state; return neverState; }
  }
}
~~~

尝试构造 { status: "success", error: new Error() } 会失败；新增 cancelled 状态后，default 中的 never 会提醒补 UI。

**递进追问：**

1. **判别字段为什么最好使用字面量而不是多个 boolean？**

   三个 boolean 会产生八种组合，其中多数可能无意义；单个字面量联合只允许列出的状态，并能在分支中关联该状态专属字段，消除非法组合。

2. **如何把事件也建模？**

   可建立 START、RESOLVE、REJECT 等判别事件联合，并让 reducer 根据当前状态和事件返回新状态。对严格迁移还可为不同当前状态定义允许事件映射。

**易错点：**

- 虽然定义了联合，却在组件中把 status、data、error 拆成互不关联的独立 state，重新引入非法组合。
- 在 switch 的 default 直接返回空界面，导致新增状态时无编译提示；应使用 never 做穷尽检查。

**参考来源：**

- [TypeScript：Discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- [TypeScript：The never type and exhaustiveness checking](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking)
- [TypeScript：Union Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types)

校验日期：2026-07-20

## Q38：映射类型和条件类型分别解决什么？

**短回答：**

映射类型遍历键变换属性，条件类型按可赋值关系选择类型；组合可实现库级通用工具但应控制可读性。

**原理：**

映射类型遍历 PropertyKey 联合，常以 keyof 某对象为输入，对每个属性统一改变只读、可选或值类型，也可用 as 重映射键；它解决“按字段批量变换对象形状”。条件类型写成 T extends U ? X : Y，根据类型关系选择结果，常结合 infer 从函数、Promise 或数组中提取内部类型；裸类型参数遇到联合时会分发。两者可以组合生成高级工具类型，但复杂度会直接影响错误信息和编译时间。应先确认变换代表稳定领域规则，否则几个清晰接口比递归条件类型更易维护。

**代码 / 场景：**

下例分别把字段变成可编辑状态，并提取 Promise 的结果：

~~~ts
type FieldState<T> = {
  [K in keyof T]: { value: T[K]; dirty: boolean };
};

type AwaitedValue<T> = T extends Promise<infer U> ? U : T;

type User = { id: number; name: string };
const form: FieldState<User> = {
  id: { value: 1, dirty: false },
  name: { value: "Linda", dirty: true }
};
type Loaded = AwaitedValue<Promise<User>>; // User
console.log(form.name.value);
~~~

把 id.value 改成字符串会编译失败；Loaded 仍保持 User 结构，证明变换没有退化为 any。

**递进追问：**

1. **条件类型为什么会对联合分发？**

   当判断左侧是裸类型参数 T 时，T 为 A | B 会分别计算条件再合并结果。若不希望分发，可将两侧包进元组，如 [T] extends [U]。

2. **映射类型如何删除 readonly 或 optional？**

   可在修饰符前使用减号，例如 -readonly [K in keyof T]-?: T[K]。这只是静态形状变化，不会在运行时复制、冻结或补齐对象字段。

**易错点：**

- 把递归条件类型用于普通业务 DTO，得到难以理解的深层实例化错误和明显编译性能成本。
- 以为映射类型会修改运行时对象；TypeScript 类型会擦除，实际转换仍需 JavaScript 代码执行。

**参考来源：**

- [TypeScript：Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [TypeScript：Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript：Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)

校验日期：2026-07-20

## Q39：satisfies 与类型断言有何区别？

**短回答：**

satisfies 校验表达式符合目标类型同时保留推断的具体字面量，as 直接告诉编译器按目标看待，可能掩盖错误。

**原理：**

satisfies 检查一个表达式能否赋给目标类型，但表达式自身仍保留更具体的推断，例如属性字面量和不同键的值类型；它适合校验配置完整性而不把变量整体扩宽。类型注解同样检查兼容性，却通常让变量采用注解类型。as 类型断言则告诉编译器“按此类型看待”，在允许的重叠范围内可以跳过原本缺失的证据，也可能丢失精度；双重断言甚至能绕过更多检查。三者都不产生运行时验证。satisfies 的核心是“验证而不改写表达式结果类型”，不是更安全的 JSON 解析器。

**代码 / 场景：**

用 tsc 查看属性推断和拼写检查：

~~~ts
type RouteName = "home" | "admin";
type Route = { path: string; secure: boolean };

const routes = {
  home: { path: "/", secure: false },
  admin: { path: "/admin", secure: true }
} satisfies Record<RouteName, Route>;

const adminPath = routes.admin.path; // string
const isSecure = routes.admin.secure; // true
// routes.admn; // 编译错误

const forced = { path: 123 } as unknown as Route;
console.log(forced.path.toUpperCase()); // 运行时报错
~~~

satisfies 会检查缺键、多余拼写和字段类型；强断言示例则编译通过但运行失败。

**递进追问：**

1. **satisfies 和显式类型注解如何选择？**

   若变量后续应被当成统一抽象类型使用，注解更直接；若需要检查配置契约，同时保留每个属性的精确推断和字面量信息，satisfies 更合适。

2. **satisfies 能检查 API JSON 吗？**

   不能，它只在编译期检查源码表达式的静态类型。JSON.parse 默认产生 any，网络值也不可知，必须由 schema 或手写守卫在运行时解析。

**易错点：**

- 把 satisfies 当作类型转换，期望它在运行时补字段、过滤多余属性或抛出校验错误。
- 遇到错误就使用 as unknown as 目标类型，虽然消除编译提示，却把结构不匹配推迟为生产异常。

**参考来源：**

- [TypeScript 4.9：satisfies Operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)
- [TypeScript：Type Assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)
- [TypeScript：Literal Inference](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-inference)

校验日期：2026-07-20

## Q40：为什么运行时仍需要 Zod 等校验？

**短回答：**

TypeScript 类型编译后被擦除，网络、存储和用户输入仍是未知数据；边界处要解析验证后才能进入内部类型系统。

**原理：**

TypeScript 类型在编译输出中会被擦除，它只能约束参与同一次静态检查的代码，无法保证网络响应、表单、localStorage、消息事件或第三方脚本的数据真实符合接口。Zod 等 schema 库在运行时读取 unknown，检查字段、范围、格式与联合分支，并返回成功值或结构化错误；许多库还能从 schema 推导 TypeScript 类型，减少静态声明和校验规则漂移。校验应放在信任边界并定义失败策略，而不是每层重复解析。还需区分“结构合法”和“业务授权”：字段形状正确并不代表当前用户有权执行操作。

**代码 / 场景：**

把 API 响应先作为 unknown，再解析为可信值：

~~~ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  age: z.number().int().min(0).max(150),
  role: z.enum(["learner", "admin"])
});
type User = z.infer<typeof UserSchema>;

async function loadUser(): Promise<User> {
  const raw: unknown = await fetch("/api/me").then(r => r.json());
  return UserSchema.parse(raw);
}
~~~

用 { id: "7", age: -1, role: "root" } 做契约测试，应得到包含三个字段路径的失败信息，而不是让无效值进入组件后才崩溃。

**递进追问：**

1. **parse 与 safeParse 如何选择？**

   parse 在失败时抛出异常，适合统一错误边界；safeParse 返回判别联合，适合表单逐字段展示。无论哪种，都应记录安全的上下文而避免把敏感原值写入日志。

2. **前后端都校验是否重复？**

   两端信任边界不同。前端校验改善错误处理和用户体验，服务端校验负责真正的安全与数据完整性；攻击者可以绕过前端，所以后端绝不能省略。

**易错点：**

- 从 schema 推导出类型后就停止服务端校验；浏览器代码可被绕过，前端检查不是授权或安全边界。
- 对超大响应在多个组件重复完整 parse，增加主线程成本；应在数据进入应用的边界解析一次并传递可信结果。

**参考来源：**

- [Zod：Basic usage](https://zod.dev/basics)
- [TypeScript：Type Declarations](https://www.typescriptlang.org/docs/handbook/2/type-declarations.html)
- [OWASP：Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

校验日期：2026-07-20

# 架构、测试与可维护性

## Q41：前端分层如何避免业务逻辑散落组件？

**短回答：**

组件负责交互与展示，领域服务表达规则，数据访问封装协议，状态层协调生命周期；依赖方向应清晰且可替换测试。

**原理：**

组件应主要负责把状态映射为界面、接收用户意图和管理纯展示交互；业务规则放进不依赖 DOM 或框架的领域函数/用例，远程调用与存储则封装在基础设施适配器中。页面通过明确的应用服务组合这些层，使“是否允许提交、如何计算进度、失败如何重试”只有一个权威实现。分层不是按文件名机械分目录，而是限制依赖方向：领域层不导入 React/Vue、fetch 或 localStorage，组件也不直接拼接每个 API。这样规则能单测、渠道能替换，多个页面复用时不会复制后逐渐分叉。

**代码 / 场景：**

把“完成率至少 80% 才解锁模拟面试”写成纯用例，再由组件调用：

~~~ts
// domain/progress.ts
export function canUnlock(done: number, total: number): boolean {
  if (!Number.isInteger(done) || total <= 0 || done < 0 || done > total) return false;
  return done / total >= 0.8;
}

// application/getDashboard.ts
export async function getDashboard(repo: ProgressRepo, userId: string) {
  const p = await repo.load(userId);
  return { ...p, unlocked: canUnlock(p.done, p.total) };
}
~~~

用 79/100、80/100、0/0 三个单测验证规则；组件只渲染 unlocked。将 REST repo 换成内存 fake 后用例仍可运行，证明业务层没有绑定网络和框架。

**递进追问：**

1. **所有逻辑都应抽成 service 吗？**

   不需要。只被单个组件使用的展示格式和局部交互可留在组件或 composable。应抽取的是跨页面规则、需要独立测试的状态转换和外部副作用边界。

2. **如何防止分层最后只剩透传文件？**

   每层必须有明确职责和稳定接口。若某 service 只是把同名参数原样转给 fetch，没有策略、转换或边界价值，就应合并而不是为了目录结构保留。

**易错点：**

- 把所有代码搬进一个巨大 useXxx hook 就称为分层；业务、缓存、网络和视图状态仍然耦合在一起。
- 领域层直接导入浏览器 API 或框架响应式对象，使其无法在 Node 测试、Worker 或其他界面复用。

**参考来源：**

- [React：Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [Redux：Style Guide](https://redux.js.org/style-guide/)
- [Vue：Composables](https://vuejs.org/guide/reusability/composables.html)

校验日期：2026-07-20

## Q42：什么是依赖倒置在前端的应用？

**短回答：**

业务逻辑依赖接口而非 fetch、localStorage 等具体实现，通过参数或 provider 注入，测试可替换为内存适配器。

**原理：**

依赖倒置要求高层业务策略不直接依赖 fetch、浏览器存储或某个 SDK 的具体实现，而依赖由业务需要定义的抽象端口；具体适配器在应用装配处注入。前端可把 Repository、Clock、Analytics、PaymentGateway 写成小接口，生产环境接真实实现，测试接 fake，Electron/小程序则接另一个平台实现。重点不是使用 DI 容器，而是抽象的所有权和依赖箭头：接口应表达“业务需要什么”，不能原样复制供应商庞大 API。运行时仍要在 composition root 明确选择实现、生命周期和错误语义。

**代码 / 场景：**

业务用例只依赖自己定义的端口：

~~~ts
interface Clock { now(): number }
interface InviteRepo { create(input: { expiresAt: number }): Promise<string> }

class CreateInvite {
  constructor(private repo: InviteRepo, private clock: Clock) {}
  execute(days: number) {
    return this.repo.create({ expiresAt: this.clock.now() + days * 86_400_000 });
  }
}

const fakeClock: Clock = { now: () => Date.UTC(2026, 6, 20) };
~~~

测试注入内存 repo 和固定时钟，断言 3 天邀请的 expiresAt 精确值；生产装配再注入 fetchRepo 与系统时钟。测试无需假 timer 或真实网络。

**递进追问：**

1. **React Context 或 Vue provide/inject 就等于依赖倒置吗？**

   它们只是传递依赖的机制。若 Context 暴露具体 SDK 单例，高层仍依赖实现；只有当业务面向自有小接口、具体实现从外部装配时，依赖方向才真正反转。

2. **什么时候不值得抽象端口？**

   一次性、无替换需求且无业务策略的简单调用可能直接封装即可。抽象应围绕变化边界和可测试性，而不是为每个函数制造 interface 与工厂。

**易错点：**

- 先从供应商 SDK 自动生成一个巨大接口，高层仍被其命名和错误模型锁定，抽象没有隔离变化。
- 在每个组件内 new 具体实现，导致连接、缓存和监听器生命周期不一致，也无法集中替换测试 fake。

**参考来源：**

- [Angular：Dependency Injection](https://angular.dev/guide/di)
- [TypeScript：Interfaces](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [React：Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context)

校验日期：2026-07-20

## Q43：单例请求缓存如何避免重复请求？

**短回答：**

已完成结果按 key 与过期策略缓存，进行中 Promise 单独去重并在 finally 清除；失败不应永久污染数据缓存。

**原理：**

去重缓存应在请求发起时就按规范化 key 存入“进行中的 Promise”，而不是等响应完成后才存数据；这样同一时间的调用共享一次网络请求。成功后可按 TTL、ETag 或主动失效策略保留结果，失败则通常移除条目以允许重试。key 必须包含所有影响响应的维度，如用户、语言、查询参数和权限，敏感用户数据不能跨会话共享。还需明确取消语义：多个消费者共享请求时，一个组件卸载不应随意 abort 所有消费者；可用引用计数或让调用者只忽略自己的结果。单例也应限定在应用/请求作用域，SSR 全局单例可能造成跨用户泄露。

**代码 / 场景：**

这个最小缓存把进行中的 Promise 立即写入 Map，并在成功或失败后都清理；完成结果若要缓存，应另建带 TTL 的 result cache：

~~~ts
const inflight = new Map<string, Promise<unknown>>();

function getOnce<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = inflight.get(key) as Promise<T> | undefined;
  if (hit) return hit;
  const pending = load().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, pending);
  return pending;
}

const a = getOnce("user:u1", () => fetch("/api/users/u1").then(r => r.json()));
const b = getOnce("user:u1", () => Promise.reject(new Error("不应执行")));
console.log(a === b); // true
~~~

在 Network 面板应只看到一次并发请求；这批 Promise 结束后再次调用必须重新请求。若业务要复用成功结果，应写入独立的 result cache，并为其设置 TTL/ETag 与主动失效。

**递进追问：**

1. **缓存 Promise 与只缓存结果有什么差异？**

   只缓存完成结果无法合并同时到达的调用，它们会在第一个响应前各自发请求。缓存进行中的 Promise 才能覆盖这段竞争窗口，并让调用者共享成功或失败。

2. **何时需要 stale-while-revalidate？**

   当允许先显示稍旧数据以换取快速响应时，可返回缓存并后台刷新；必须标明陈旧状态、限制 TTL，并在权限或关键交易数据上谨慎使用。

**易错点：**

- 请求失败后仍永久缓存 rejected Promise，导致所有后续尝试立即失败，页面只能刷新才能恢复。
- 缓存 key 只用 URL，却忽略 Authorization、租户和语言，可能把一个用户的数据返回给另一个用户。

**参考来源：**

- [MDN：Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
- [MDN：Using the Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [HTTP Caching 标准](https://httpwg.org/specs/rfc9111.html)

校验日期：2026-07-20

## Q44：错误处理为什么要区分可恢复与不可恢复？

**短回答：**

校验失败、超时可提示重试或修正，权限和版本冲突需专门流程，未知程序错误进入边界并上报，不能统一 toast。

**原理：**

错误类型决定用户动作和系统策略。可恢复错误通常是暂时网络中断、超时、可修正输入或令牌刷新，界面应保留用户上下文，给出明确重试/修改入口，并采用有上限和抖动的退避。不可恢复错误包括前端不变量破坏、资源版本不兼容、权限永久拒绝或数据解析契约失效，应停止危险操作、进入错误边界、记录版本与 trace，并提供安全退出或刷新。分类必须基于错误码、响应语义和业务阶段，不能把所有异常都“重试三次”；非幂等提交的盲重试可能造成重复交易。用户提示、遥测严重度和告警责任也应随分类不同。

**代码 / 场景：**

为请求层返回可判别错误，再由界面决定动作：

~~~ts
type AppError =
  | { kind: "validation"; fields: Record<string, string> }
  | { kind: "temporary"; retryAfterMs: number }
  | { kind: "unauthorized" }
  | { kind: "contract"; cause: unknown };

function actionFor(error: AppError) {
  switch (error.kind) {
    case "validation": return "标记字段，不丢表单";
    case "temporary": return "显示重试并按上限退避";
    case "unauthorized": return "保存安全草稿后登录";
    case "contract": return "进入错误边界并上报 release";
  }
}
~~~

契约测试分别输入 422、503、401 和畸形 200 JSON，断言界面不会把它们都显示成同一个“未知错误”。

**递进追问：**

1. **网络请求失败都可以自动重试吗？**

   不可以。GET 等幂等操作通常更适合受控重试；已发送的支付或创建请求可能服务端已成功，必须使用幂等键、查询状态或人工确认，避免重复副作用。

2. **错误边界能捕获所有前端错误吗？**

   框架错误边界通常针对渲染树错误，不一定捕获事件处理器、异步回调、服务端渲染或边界自身异常。请求层和全局遥测仍需各自处理。

**易错点：**

- catch 后只弹“操作失败”并吞掉错误码、release 和 trace，既无法指导用户，也无法线上定位。
- 对权限拒绝或 schema 不兼容无限重试，造成请求风暴，同时把不可恢复故障伪装成网络抖动。

**参考来源：**

- [web.dev：Fetch API error handling](https://web.dev/articles/fetch-api-error-handling)
- [React：Catching rendering errors with an error boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [HTTP Semantics：Status Codes](https://httpwg.org/specs/rfc9110.html#status.codes)

校验日期：2026-07-20

## Q45：如何设计前端日志关联后端请求？

**短回答：**

前端为操作生成或透传 trace/request ID，记录版本、路由和匿名会话，后端日志用同一 ID 串联但避免采集敏感正文。

**原理：**

关联的核心是让同一次用户操作、浏览器请求和后端链路共享稳定标识。采用 W3C Trace Context 时，受信任的入口生成或继续 traceparent，后端和网关按规范传播 trace-id/span-id；前端还可生成 operationId 关联一次点击产生的多个请求。服务端应在响应中返回可向客服展示的 request ID，并通过 CORS expose headers 允许浏览器读取。日志需要携带 release、路由、匿名会话、操作类型和时间，但不得记录 token、密码或完整敏感题答。采样策略应保留错误链路，并考虑 trace header 跨来源传播的信任与隐私风险。

**代码 / 场景：**

前端为一次保存操作生成操作标识，并读取服务端响应 ID：

~~~ts
async function saveDraft(payload: unknown) {
  const operationId = crypto.randomUUID();
  const response = await fetch("/api/drafts", {
    method: "POST",
    headers: { "content-type": "application/json", "x-operation-id": operationId },
    body: JSON.stringify(payload)
  });
  const requestId = response.headers.get("x-request-id");
  console.info("draft_result", { operationId, requestId, status: response.status });
}
~~~

服务端应记录同一 operationId，并返回 Access-Control-Expose-Headers: X-Request-ID（跨源时）。在日志平台用 requestId 查询，应能跳到对应后端 trace；同时检查 payload 未被输出。

**递进追问：**

1. **前端应该自己构造 traceparent 吗？**

   可以由符合规范的 OpenTelemetry SDK 创建，但不要手写错误格式。还要遵守后端采样与传播策略，对不信任的外部 origin 谨慎传递，避免泄露关联信息。

2. **request ID 和 trace ID 有什么区别？**

   request ID 常标识单个 HTTP 请求，trace ID 关联跨服务的一整条调用链。一个用户操作可能有多个 request ID，但可共享 operation ID 或落在同一 trace 中。

**易错点：**

- 把 Authorization、Cookie、表单正文和完整用户答案写进前端错误日志，造成二次敏感数据泄露。
- 只在前端生成 correlation ID 却不让网关和后端记录，最终日志平台仍无法从浏览器事件跳到服务端请求。

**参考来源：**

- [W3C：Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry：Browser instrumentation](https://opentelemetry.io/docs/languages/js/getting-started/browser/)
- [MDN：Access-Control-Expose-Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Expose-Headers)

校验日期：2026-07-20

## Q46：契约测试解决什么问题？

**短回答：**

它验证前后端对字段、状态码和兼容规则的共同理解，可由 OpenAPI 生成或在提供方/消费方流水线校验。

**原理：**

契约测试验证服务提供方与消费方对请求、响应和错误语义的共同约定，重点发现“双方各自单测通过，但字段名、必填性、枚举或状态码已不兼容”的集成故障。schema-first 可用 OpenAPI 校验真实实现；consumer-driven contract 则由前端记录自己实际依赖的交互，提供方在 CI 中逐一验证。它比完整 E2E 更快、更容易定位，但不验证网络拓扑、鉴权基础设施、多个服务组合或真实数据迁移，因此不能取代少量集成/E2E。契约还应覆盖错误响应、可选字段和兼容演进，不能只固定一份成功 JSON 快照。

**代码 / 场景：**

前端真正依赖的是 GET /users/u1 的最小契约：

~~~json
{
  "request": { "method": "GET", "path": "/users/u1" },
  "response": {
    "status": 200,
    "body": { "id": "u1", "displayName": "Linda", "role": "learner" }
  }
}
~~~

提供方 CI 用测试数据启动 API 并验证该交互，同时另测 404 的标准错误结构。若后端把 displayName 改成 name 或新增未约定字段，前者应阻断、后者通常允许；匹配规则必须表达消费方真实需要，而不是对整个 JSON 做脆弱精确相等。

**递进追问：**

1. **OpenAPI 校验和消费者驱动契约有什么差异？**

   OpenAPI 以统一服务规范为中心，适合生成与通用验证；消费者驱动契约记录每个消费者实际使用的交互，更能判断某次提供方变更是否会破坏具体客户端。

2. **为什么契约测试不能取代 E2E？**

   它通常在受控进程和模拟边界验证消息形状，不覆盖 DNS、代理、Cookie、CORS、真实身份流程和多服务时序。关键用户路径仍需少量真实集成测试。

**易错点：**

- 把某次完整响应录成不可变快照，新增无害字段也失败，团队最终只能频繁更新快照而不理解兼容性。
- 只测试 200 正常响应，遗漏 401、404、422 和限流格式，前端遇到真实错误仍无法正确分支。

**参考来源：**

- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [Pact：How Pact works](https://docs.pact.io/getting_started/how_pact_works)
- [Pact：Consumer tests](https://docs.pact.io/implementation_guides/javascript/docs/consumer)

校验日期：2026-07-20

## Q47：测试替身中的 stub、spy 和 mock 有何区别？

**短回答：**

stub 提供固定行为，spy 记录调用，mock 同时预设交互期望；应优先测试可观察结果，避免过度绑定内部调用。

**原理：**

spy 主要观察真实调用发生了什么，例如次数、参数和顺序，通常不改变原实现；stub 用可控实现替代真实依赖，预设返回值、异常或时间，目的是把测试置于确定状态；mock 在常见框架中往往同时表示替代对象和预先声明的交互期望，测试结束验证协议是否满足。不同库命名并不完全一致，因此团队应说明测试意图，而不是争论术语。替身越靠近内部实现，测试越脆弱；优先对外部副作用端口使用 stub，对重要协作协议使用有限 spy/mock，对纯函数直接断言结果。

**代码 / 场景：**

以下 Vitest 测试用 stub 控制 API，用 spy 验证通知，但不检查无关内部函数：

~~~ts
import { expect, test, vi } from "vitest";

test("保存成功后通知", async () => {
  const api = { save: vi.fn().mockResolvedValue({ id: "d1" }) }; // stub
  const notify = vi.fn(); // spy/mocked collaborator
  await saveDraft({ api, notify }, { title: "A" });
  expect(api.save).toHaveBeenCalledWith({ title: "A" });
  expect(notify).toHaveBeenCalledWith("已保存");
});
~~~

把 api 改为 reject 后应断言保留草稿且不发送成功通知。若重构内部辅助函数而外部行为不变，此测试不应修改。

**递进追问：**

1. **什么时候 spy 会调用真实实现？**

   取决于工具。许多 spyOn 默认仍调用原方法，除非显式 mockImplementation；如果原方法会发网络、写存储或收费，测试必须先确认并替换，避免意外副作用。

2. **为什么过多验证调用次数会让测试脆弱？**

   调用次数常是实现细节。缓存、批处理或重试重构可能改变次数但不改变用户行为；只在协议本身重要，例如审计事件必须恰好一次时才应严格断言。

**易错点：**

- 把所有依赖全部 mock，测试只证明 mock 按自己设定运行，真实模块接口已经变化也无法发现。
- spyOn 后未恢复全局方法或时间，状态泄漏到后续测试，导致依赖执行顺序的间歇性失败。

**参考来源：**

- [Vitest：Mocks](https://vitest.dev/guide/mocking.html)
- [Jest：Mock Functions](https://jestjs.io/docs/mock-functions)
- [Sinon：Stubs](https://sinonjs.org/concepts/stubs/)

校验日期：2026-07-20

## Q48：E2E 测试为什么会不稳定？

**短回答：**

异步等待、共享数据、时间和外部依赖会导致竞态；使用语义定位、确定数据、条件等待和隔离环境，不靠固定 sleep。

**原理：**

E2E 同时经过浏览器、网络、后端、数据库、动画和异步任务，任何共享状态、竞态或外部依赖波动都可能造成非确定结果。常见根因包括固定 sleep、依赖 CSS/DOM 结构定位、测试账号互相污染、未等待真实可交互条件、时间和随机数不受控，以及第三方接口限流。治理应使用面向用户的稳定 locator、框架自动等待、每测隔离数据、可控时钟/网络、失败 trace 和明确重试统计。重试只能收集证据或缓解基础设施偶发，不应把首次失败从质量数据中抹掉；长期 flaky 用例需要隔离、归责和修复。

**代码 / 场景：**

脆弱测试等待固定 2 秒后点击；稳定版本等待可访问角色和业务响应：

~~~ts
import { test, expect } from "@playwright/test";

test("访客查看题目", async ({ page }) => {
  await page.goto("/banks/frontend-engineering");
  const response = page.waitForResponse(r =>
    r.url().includes("/api/question-banks") && r.status() === 200
  );
  await response;
  await expect(page.getByRole("heading", { name: /浏览器/ })).toBeVisible();
  await page.getByRole("button", { name: "查看答案" }).click();
  await expect(page.getByText(/事件循环/)).toBeVisible();
});
~~~

循环运行 30 次并保留 trace；若失败率从 8% 降至 0，再检查是否仍依赖共享账号数据。

**递进追问：**

1. **为什么 data-testid 不一定是坏选择？**

   当元素没有稳定角色或文本、且测试标识属于明确公共契约时，它比 CSS 层级稳定。但用户可感知控件应优先用 role/label，也能顺便暴露可访问性问题。

2. **允许自动重试多少次合适？**

   没有通用数字。可在 CI 保留少量重试以收集 trace，但必须记录首次失败率并设治理阈值；若只看最终通过，任意次数都会掩盖真实不稳定。

**易错点：**

- 用 waitForTimeout 增大等待时间修复竞态，流水线更慢，低负载通过但高负载仍随机失败。
- 多个并行用例复用同一账号和固定记录，删除、修改或登录状态相互干扰，导致顺序依赖。

**参考来源：**

- [Playwright：Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright：Auto-waiting](https://playwright.dev/docs/actionability)
- [Playwright：Test Isolation](https://playwright.dev/docs/browser-contexts)

校验日期：2026-07-20

## Q49：如何做渐进式重构？

**短回答：**

先用测试或监控建立行为基线，抽边界和适配层，按垂直业务切片迁移，每一步可发布回滚。

**原理：**

渐进式重构把大改拆成可独立验证、可回滚的小步，并在每一步维持用户可用。先用特征测试、日志和性能基线锁定现状，再确定边界：路由、组件、接口适配层或数据模型；新旧实现通过 facade、branch by abstraction 或 feature flag 并存，按用户/流量灰度。数据和 API 采用 expand-and-contract：先让生产者/消费者兼容新旧格式，迁移完成后再删除旧字段。每一步都应减少风险或复杂度，设定删除旧路径的负责人和日期，否则双轨会永久化。重构期间应避免同时改变行为和结构到无法归因。

**代码 / 场景：**

把旧题库页面迁移到新实现时，先建立同一接口和开关：

~~~ts
type QuestionPage = { mount(el: HTMLElement, bankId: string): () => void };

export function selectPage(flags: { newQuestionPage: boolean }): QuestionPage {
  return flags.newQuestionPage ? newPage : legacyPage;
}
~~~

阶段 1 对两实现运行同一契约测试；阶段 2 内部账号 100%、访客 5% 灰度，比较错误率、LCP、答案打开率；阶段 3 扩到 100% 后保留一版回滚窗口；阶段 4 删除旧代码与开关。每个阶段有独立 commit 和回滚条件。

**递进追问：**

1. **特征测试和普通单元测试有何差异？**

   特征测试首先记录旧系统当前可观察行为，即使行为未必理想，用来防止无意变化；完成安全重构后，再通过独立需求变更有意识地修正行为。

2. **feature flag 为什么也会形成技术债？**

   开关让两条路径同时存在，组合数、测试和认知成本会增长。每个迁移开关应有负责人、到期日、遥测和自动清理任务，不能长期遗留。

**易错点：**

- 一次 PR 同时改架构、视觉、接口和业务规则，出现指标回退时无法判断是哪一类变化造成。
- 新旧实现共用同一可变全局状态但生命周期不同，灰度切换后监听器重复、缓存污染或数据丢失。

**参考来源：**

- [Martin Fowler：Branch By Abstraction](https://martinfowler.com/bliki/BranchByAbstraction.html)
- [Martin Fowler：Feature Toggles](https://martinfowler.com/articles/feature-toggles.html)
- [GitHub Docs：GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow)

校验日期：2026-07-20

## Q50：技术方案评审应写哪些内容？

**短回答：**

明确问题、约束、候选方案、数据流、失败模式、安全、迁移回滚和验证指标，让决策可追溯而非只列技术栈。

**原理：**

可评审方案应先写清问题、目标、非目标和成功指标，再说明现状约束、候选方案及为何选择；核心设计需要覆盖组件/数据流、接口契约、状态与一致性、权限威胁模型、容量/性能、可访问性和兼容性。实施部分应列迁移步骤、灰度、观测、回滚、测试和所有者，并把关键取舍、未决问题与假设显式记录。文档目的不是堆术语，而是让评审者能反驳假设、比较替代方案并验证完成标准。小改可用一页模板，大变更才需要深度设计；篇幅应随不可逆性和影响面增长。

**代码 / 场景：**

一个“开放游客读题”方案至少应包含以下可验证条目：

~~~text
问题：未登录用户现在被路由守卫阻断。
目标：游客可读题库；批注、进度、收藏触发登录。
非目标：本期不开放游客写入或离线同步。
方案：读接口匿名可用，写接口保持鉴权；前端按 action gate 登录。
指标：游客题目加载成功率 >= 99.9%，写接口匿名请求 100% 返回 401。
风险：缓存混用登录态；抓取流量；敏感管理字段泄露。
发布：5% 灰度，监控 4xx/5xx、LCP、登录转化；开关可回滚。
~~~

评审时逐项要求证据，并把决策和负责人写入 ADR；上线后用指标核对假设，而非只标记“开发完成”。

**递进追问：**

1. **为什么必须写非目标？**

   它明确本次不解决什么，防止评审不断扩张范围，也避免读者把未设计能力误认为已承诺。非目标不是永久拒绝，而是当前决策边界。

2. **什么决策值得单独记录 ADR？**

   影响多个模块、难以逆转或未来容易被质疑的选择，例如存储引擎、认证边界和构建平台。ADR 应包含上下文、决策、替代项和后果。

**易错点：**

- 只写最终架构图，不写问题、替代方案和失败条件，评审无法判断复杂度是否值得。
- 把“可扩展、高性能、安全”当目标却没有负载、延迟、权限或回滚指标，上线后无法验收。

**参考来源：**

- [AWS Prescriptive Guidance：ADR process](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html)
- [C4 Model：Diagrams](https://c4model.com/diagrams)

校验日期：2026-07-20

# 安全与跨端边界

## Q51：XSS 的主要类型和防护是什么？

**短回答：**

存储型、反射型和 DOM 型都来自不可信数据进入可执行上下文；按上下文转义、避免危险 sink、消毒富文本并配置 CSP。

**原理：**

XSS 的共同结果是攻击者控制的数据被浏览器当成当前站点脚本或活动内容执行。存储型载荷先进入数据库再影响多个访问者；反射型载荷由请求参数立即回显；DOM 型问题发生在前端把 location、postMessage 等不可信值送入 innerHTML、eval 或危险 URL。首要防线是按输出上下文编码并使用 textContent、框架默认转义等安全 sink；确需 HTML 时用成熟 sanitizer 和严格允许列表。CSP 与 Trusted Types 可降低遗漏的利用面，但不是替代输入/输出处理。HttpOnly 只能保护 Cookie 不被读取，无法阻止脚本以用户身份发请求。

**代码 / 场景：**

搜索页不能把 q 直接拼进 innerHTML：

~~~ts
const params = new URLSearchParams(location.search);
const q = params.get("q") ?? "";
const result = document.querySelector("#result");
if (!(result instanceof HTMLElement)) throw new Error("missing result");

// 安全：内容按文本节点处理
result.textContent = "搜索：" + q;
~~~

用 ?q=%3Cimg%20src=x%20onerror=alert(1)%3E 验证页面只显示文本。若业务必须渲染富文本，应先用受维护 sanitizer 清洗，再配 CSP 报告与 Trusted Types；测试还要覆盖属性、URL 和 CSS 上下文，因为不同上下文编码规则不同。

**递进追问：**

1. **框架使用模板后是否不会有 XSS？**

   默认插值通常会转义，但 dangerouslySetInnerHTML、v-html、动态 href、第三方 DOM 插件和服务端模板仍可能建立危险 sink。安全取决于完整数据流，不只取决于框架。

2. **CSP 中允许 unsafe-inline 有什么影响？**

   它允许大量内联脚本执行，会显著削弱 script-src 防线。更好的做法是使用 nonce/hash、移除内联处理器，并逐步通过 Report-Only 收集兼容问题。

**易错点：**

- 对输入做一次 HTML 转义后到处复用；进入 JavaScript、URL、属性或 CSS 上下文时需要不同处理。
- 自写正则删除 script 标签，遗漏事件属性、SVG、协议和解析器差异；应使用上下文安全 API 与成熟清洗库。

**参考来源：**

- [OWASP：Cross Site Scripting Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP：DOM based XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [MDN：Trusted Types API](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API)

校验日期：2026-07-20

## Q52：CSRF 为什么 HttpOnly 不能单独防住？

**短回答：**

浏览器仍会自动携带 Cookie，攻击页不需读取它；应使用 SameSite、Origin/CSRF token 并保证 GET 无副作用。

**原理：**

CSRF 利用浏览器会自动把目标站点 Cookie 附加到跨站请求这一行为，诱导已登录用户执行非本人意愿的状态修改。HttpOnly 只禁止 JavaScript 读取 Cookie，却不会阻止浏览器在请求中发送它，因此攻击页无需知道会话值也能触发请求。防护应组合 SameSite Cookie、不可预测且与会话绑定的 CSRF token、Origin/Referer 或 Fetch Metadata 校验，并确保 GET 不产生副作用。对于 Cookie 认证的 JSON API，还要限制可接受 Content-Type 与 CORS。XSS 可能读取页面内 token 或直接发同源操作，因此 CSRF 防线不能替代 XSS 防护。

**代码 / 场景：**

服务端设置会话 Cookie，并要求写请求同时携带 token：

~~~http
Set-Cookie: session=...; Path=/; Secure; HttpOnly; SameSite=Lax

POST /api/profile
Content-Type: application/json
X-CSRF-Token: 7b2f...（与当前会话绑定）
Origin: https://interview.example
~~~

安全测试从 evil.example 提交普通 form，请求即便可能携带某些 Cookie，也应因 Origin/token 缺失返回 403；同站表单带正确 token 应成功。若业务必须 SameSite=None，则 Secure、token 与来源校验更重要。

**递进追问：**

1. **SameSite=Lax 是否能覆盖所有 CSRF？**

   不能。它对多数跨站子资源和 POST 有帮助，但顶级安全方法导航、同站不同源攻击、旧客户端及业务兼容例外仍需考虑，敏感操作应保留 token/来源校验。

2. **Bearer token 放 Authorization 后还需要 CSRF 吗？**

   若凭证不会被浏览器自动附加、攻击站也无法读取，传统 CSRF 风险较低；但 token 存储会引入 XSS 风险，且 Cookie 中的刷新凭证仍可能需要 CSRF 防护。

**易错点：**

- 看到 Cookie 有 HttpOnly 就宣布已防 CSRF；该属性保护机密性，不控制跨站请求是否自动携带。
- 让 GET /delete 或图片 URL 触发写操作，绕过只对 POST 增加 token 的防线，也破坏 HTTP 安全方法语义。

**参考来源：**

- [OWASP：CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN：Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
- [MDN：Fetch Metadata request headers](https://developer.mozilla.org/en-US/docs/Glossary/Fetch_metadata_request_header)

校验日期：2026-07-20

## Q53：CORS 是什么安全边界？

**短回答：**

它是浏览器限制脚本读取跨源响应的机制，不阻止服务器、curl 或表单发送请求，也不能替代鉴权。

**原理：**

同源策略默认限制一个 origin 的脚本读取另一个 origin 的响应；CORS 是服务器通过响应头选择性放宽这种读取权限的协议。对非简单请求，浏览器先发 OPTIONS 预检，确认方法和请求头；带凭证时服务器必须明确返回具体 Origin，并设置 Access-Control-Allow-Credentials，不能使用通配符。CORS 不是身份认证、防火墙或阻止请求发送的机制：表单、图片及某些简单请求可能照样到达服务器，非浏览器客户端也不受它约束。服务端必须独立执行认证、授权和 CSRF 防护，且动态回显 Origin 前要用严格允许列表。

**代码 / 场景：**

只允许管理前端带 Cookie 读取 API，可返回：

~~~http
Access-Control-Allow-Origin: https://admin.example
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST
Access-Control-Allow-Headers: Content-Type, X-CSRF-Token
Vary: Origin
~~~

分别从 admin.example 与 evil.example 用 fetch(..., { credentials: "include" }) 测试：前者通过，后者的响应不可读且服务端仍应拒绝未授权写入。检查 CDN 缓存含 Vary: Origin，避免把一个来源的许可头错误复用给另一个来源。

**递进追问：**

1. **预检失败是否意味着请求永远没到服务器？**

   预检 OPTIONS 已到服务器；而简单请求可能无需预检就先发送，只是浏览器不让脚本读取响应。因此有副作用的端点绝不能依赖 CORS 作为授权。

2. **为什么带凭证时不能返回 Access-Control-Allow-Origin: *？**

   规范禁止通配 origin 与凭证模式组合，否则任何站点都可能读取用户凭证下的响应。服务器必须验证并返回具体受信任 Origin。

**易错点：**

- 把请求被浏览器 CORS 报错当作后端没执行；若端点产生写副作用，数据可能已经改变。
- 无条件把请求 Origin 回显到允许头并开启 credentials，等于允许任意网站读取登录用户的敏感响应。

**参考来源：**

- [Fetch Standard：CORS protocol](https://fetch.spec.whatwg.org/#http-cors-protocol)
- [MDN：Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [OWASP：REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)

校验日期：2026-07-20

## Q54：点击劫持如何防护？

**短回答：**

使用 CSP frame-ancestors 或 X-Frame-Options 限制被第三方 iframe 嵌入，并对敏感操作提供明确确认。

**原理：**

点击劫持把目标页面放进透明或错位 iframe，上层展示诱导界面，让用户实际点击转账、授权等目标控件。主要防线由目标站通过 CSP frame-ancestors 限制哪些父级可以嵌入；X-Frame-Options DENY/SAMEORIGIN 可作为旧客户端兼容，但表达能力较弱。高风险操作还应要求重新认证、展示不可伪造的交易详情和二次确认，以降低单次误点后果。前端 frame-busting 脚本可能被 sandbox、脚本禁用或竞态绕过，不能代替响应头。若业务确需合作方 iframe，应列出精确 HTTPS origin，并同时验证 postMessage 来源和嵌入场景。

**代码 / 场景：**

默认禁止所有页面嵌入管理端：

~~~http
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
~~~

建立 evil.example 测试页：<iframe src="https://admin.example/account"></iframe>，浏览器应阻止加载并在控制台报告 frame-ancestors。若某公开组件允许 partner.example 嵌入，应改为 frame-ancestors https://partner.example，并单独测试其他子域仍被拒绝；不要用宽泛 *.example 自动信任所有子域。

**递进追问：**

1. **frame-src 与 frame-ancestors 有什么区别？**

   frame-src 控制当前页面可以加载哪些 iframe；frame-ancestors 控制哪些父页面能嵌入当前页面。防点击劫持应在被保护响应上设置 frame-ancestors。

2. **SameSite Cookie 能否防点击劫持？**

   不能作为主要方案。同站或某些导航场景仍可能携带 Cookie，而且攻击目标是诱导真实用户点击。应直接限制嵌入并为敏感操作增加确认。

**易错点：**

- 只写 window.top !== window.self 后跳转，攻击者可通过 sandbox、脚本限制或覆盖行为绕过。
- 为了嵌入一个公开页面而在整个站点删除 X-Frame-Options/CSP，连管理和支付页面也暴露。

**参考来源：**

- [MDN：CSP frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)
- [MDN：X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options)
- [OWASP：Clickjacking Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)

校验日期：2026-07-20

## Q55：前端如何安全处理 JWT？

**短回答：**

短期访问令牌放内存并配合刷新机制，或使用 HttpOnly Cookie；必须防 XSS、CSRF、过期和撤销，不能只解析 payload 当鉴权。

**原理：**

JWT 是带声明和签名的令牌格式，不是天然安全的存储方案。前端可以解码 header/payload 用于展示，但不得据此做最终授权；服务端必须验证签名算法、issuer、audience、exp/nbf，并拒绝不期望的算法。浏览器端没有同时免疫 XSS 与 CSRF 的长期存储：localStorage 易被注入脚本读取，HttpOnly Secure SameSite Cookie 降低读取风险但需处理 CSRF。常见方案是短期 access token 只放内存，刷新凭证放受限 HttpOnly Cookie并执行轮换；或完全采用服务端会话/BFF。登出、撤销、设备丢失和并发刷新也必须设计，不能只看 token 是否过期。

**代码 / 场景：**

一个 BFF 模式响应可以只把会话放 Cookie，前端不接触刷新 token：

~~~http
Set-Cookie: __Host-session=opaque-value; Path=/; Secure; HttpOnly; SameSite=Lax
Cache-Control: no-store
~~~

前端调用 /api/me 使用 credentials: "same-origin"，遇到 401 进入登录，不把 Cookie、JWT 或完整响应写日志。安全测试应确认 document.cookie 读不到会话、跨站 POST 被 CSRF 防线拒绝、服务端对过期/错误 aud 的 token 返回 401，且登出后旧刷新凭证无法再次使用。

**递进追问：**

1. **JWT payload 使用 Base64URL，是否等于加密？**

   不等于。普通 JWS payload 任何拿到 token 的人都能解码，签名只帮助检测篡改。不要在其中放密码、秘密或不必要的敏感个人信息。

2. **为什么不能只在前端检查 role 决定管理员权限？**

   前端代码和状态可被用户修改，解码值也可能来自伪造 token。界面隐藏只是体验；每个管理 API 都必须由服务端验证令牌并执行对象级授权。

**易错点：**

- 把长期高权限 JWT 存 localStorage 并认为框架已防 XSS；任一依赖或危险 DOM sink 被利用都可窃取。
- 服务端根据 token 自带 alg 自动选择验证方式，未固定允许算法、issuer 和 audience，扩大伪造风险。

**参考来源：**

- [IETF：JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725)
- [OWASP：JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)
- [MDN：Secure cookie configuration](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies)

校验日期：2026-07-20

## Q56：postMessage 如何避免跨窗口攻击？

**短回答：**

发送时指定精确 targetOrigin，接收时校验 event.origin、source 和消息结构，不使用通配符处理敏感数据。

**原理：**

postMessage 能跨 origin 传递结构化克隆的数据，因此发送方必须把 targetOrigin 写成接收方的精确 scheme、host、port；使用 * 可能把敏感消息交给导航后变成恶意站点的窗口。接收方要同时验证 event.origin 是否在严格允许列表、必要时验证 event.source 是否就是预期 iframe/window，并把 event.data 当作 unknown 做 schema 校验。origin 比较不能用 endsWith 等模糊规则，也不要信任消息里的自报来源。协议应有版本、消息类型、requestId 与最小数据，敏感动作再检查当前会话和权限；移除监听器并避免把 DOM/HTML 字符串送入危险 sink。

**代码 / 场景：**

父页面只向指定 iframe 发送，并验证回包来源、窗口和结构：

~~~ts
const frame = document.querySelector<HTMLIFrameElement>("#payment");
const paymentOrigin = "https://pay.example";

frame?.contentWindow?.postMessage({ v: 1, type: "status", requestId: "r1" }, paymentOrigin);

window.addEventListener("message", event => {
  if (event.origin !== paymentOrigin) return;
  if (event.source !== frame?.contentWindow) return;
  const data: unknown = event.data;
  if (!data || typeof data !== "object" || !("type" in data)) return;
  if ((data as { type: unknown }).type === "paid") console.log("paid");
});
~~~

从 evil.example 发同结构消息应被拒绝；再把 iframe 导航到其他 origin，精确 targetOrigin 会阻止敏感发送。

**递进追问：**

1. **为什么只检查 event.origin 仍可能不够？**

   同一受信任 origin 内可能有多个窗口或被攻陷页面。验证 event.source 可绑定预期窗口；对于高风险操作，还要验证消息协议、会话状态和服务端权限。

2. **什么时候 targetOrigin 可以使用 *？**

   只有接收方 origin 本质不可知且消息完全不敏感时才可谨慎使用，例如某些 data URL 场景；正常业务应使用精确 origin，并避免发送 token 或个人数据。

**易错点：**

- 使用 origin.endsWith("example.com")，会错误接受 notexample.com；应解析并做完整 origin 精确比较。
- 收到消息后直接把 data.html 赋给 innerHTML，跨窗口来源验证即使正确也可能把被污染数据变成 XSS。

**参考来源：**

- [MDN：Window.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [HTML Standard：Cross-document messaging](https://html.spec.whatwg.org/multipage/web-messaging.html)
- [OWASP：HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)

校验日期：2026-07-20

## Q57：Service Worker 的缓存风险是什么？

**短回答：**

它可长期控制同源请求，错误缓存会让旧版本滞留；更新需版本化缓存、清理旧项并设计激活与刷新提示。

**原理：**

Service Worker 位于页面与网络之间，能长期控制其 scope 下的请求；错误缓存策略会把旧 HTML 与新 JS 混配、缓存 401/个人响应、让撤销内容继续离线可见，甚至在被注入后形成持久供应链攻击。Cache API 不自动遵守业务权限或过期策略，cache-first 也不会自行更新。设计应按资源类型区分：带哈希静态资源可 cache-first，导航可 network-first/受控回退，认证 API 通常不进共享缓存；缓存名带版本并在 activate 清理明确旧版本。更新流程要理解 waiting/clients.claim 的时机，避免无条件 skipWaiting 让同一标签页中途切换代码版本。

**代码 / 场景：**

只缓存构建期公开资源，并显式拒绝 API：

~~~js
const CACHE = "app-static-v3";
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (event.request.destination === "script" || event.request.destination === "style") {
    event.respondWith(caches.open(CACHE).then(async cache =>
      (await cache.match(event.request)) ?? fetch(event.request).then(response => {
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      })
    ));
  }
});
~~~

注销用户后断网重开，个人 API 不应从缓存出现；发布 v4 后检查旧 v3 被清理且已打开页面不会产生 HTML/JS 版本错配。

**递进追问：**

1. **为什么不能把所有 GET 都 cache-first？**

   GET 也可能是用户私有、快速变化或撤销敏感的数据。cache-first 会长期绕过网络授权和更新；策略应基于资源语义，而不是只看 HTTP 方法。

2. **skipWaiting 有什么权衡？**

   它让新 worker 立即激活，但现有页面可能仍运行旧 JS，随后的请求却被新 worker 处理。若协议不兼容，应提示刷新或设计跨版本兼容，而非无条件接管。

**易错点：**

- 缓存键只看 URL，不考虑授权上下文，把某个登录用户的响应在退出或换账号后继续返回。
- 更新时删除所有 Cache Storage 名称，包括其他应用或功能缓存；清理应限制为本应用明确前缀和旧版本。

**参考来源：**

- [MDN：Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web.dev：Service worker lifecycle](https://web.dev/articles/service-worker-lifecycle)
- [MDN：Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache)

校验日期：2026-07-20

## Q58：PWA 离线写入如何保证一致性？

**短回答：**

先写本地 outbox，网络恢复按幂等键重放，服务器确认后删除；冲突需版本或合并策略，不能把缓存当权威数据库。

**原理：**

离线写入不能只把失败请求稍后重放，因为重复发送、乱序、账号切换和并发编辑都会破坏一致性。客户端应把操作以稳定 operationId、用户/租户、实体版本、创建时间和状态持久化到 IndexedDB，并在本地事务中同时更新队列与乐观视图。服务器用幂等键去重，依据版本号/ETag 检测冲突，并返回权威结果；客户端按依赖顺序同步，区分可重试网络失败、永久校验失败和需要用户合并的 409。Background Sync 只是触发机会，平台可能延迟或不支持，因此页面启动和网络恢复也要主动排队，且退出账号时隔离或清除对应队列。

**代码 / 场景：**

一条批注操作可使用如下信封，服务端以 operationId 幂等处理：

~~~ts
type PendingAnnotation = {
  operationId: string;
  userId: string;
  questionId: string;
  baseVersion: number;
  text: string;
  createdAt: number;
  attempts: number;
};

const op: PendingAnnotation = {
  operationId: crypto.randomUUID(), userId: "u1", questionId: "q7",
  baseVersion: 4, text: "复习事件循环", createdAt: Date.now(), attempts: 0
};
~~~

测试断网保存、浏览器重启、同一操作发送两次和服务端已到 version 5 四种情况：重复请求只创建一次；版本冲突进入可见合并界面，而不是静默覆盖。

**递进追问：**

1. **最后写入者胜出为什么不总合适？**

   它简单但会静默丢失另一设备的修改。对可替换偏好项可以接受，对长文本批注、订单或关键状态应使用版本冲突、合并算法或人工选择。

2. **Background Sync 是否保证请求一定执行？**

   不保证。浏览器可因权限、节电、平台限制或存储回收而延迟甚至不触发。应用需要可见队列状态、手动重试和前台恢复路径，不能只依赖该事件。

**易错点：**

- 把完整旧 HTTP Request 无期限存入队列，其中包含过期 Authorization，重放时既失败又泄露凭证。
- 用户退出后仍同步旧账号队列，新的登录用户可能看到或提交前一用户的离线数据。

**参考来源：**

- [MDN：Background Synchronization API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [MDN：IndexedDB transactions](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)
- [HTTP Semantics：If-Match](https://httpwg.org/specs/rfc9110.html#field.if-match)

校验日期：2026-07-20

## Q59：小程序与 H5 的核心运行差异是什么？

**短回答：**

小程序有宿主提供的逻辑层/渲染层、页面栈和权限 API，H5 依赖浏览器 DOM 与 Web API；跨端需通过适配层和条件编译隔离。

**原理：**

H5 运行在标准浏览器页面模型中，脚本直接面对 DOM、CSSOM、URL 导航及浏览器 Web API，发布后通常通过 URL 即时访问。小程序运行在宿主应用定义的容器和生命周期内，常把逻辑层与渲染层分离，通过宿主桥接 API 操作界面、网络、登录和设备能力；它没有完整通用 DOM，包体、分包、域名、权限与后台生命周期受平台约束，并可能经过平台审核。两者都用 JavaScript/CSS 类技术不代表 API 或性能模型相同。架构选择应检查目标平台规范、更新机制、能力授权和退出后台后的状态恢复，跨端框架只能抽象公共层，无法抹平宿主边界。

**代码 / 场景：**

同样选择节点，H5 可以直接调用标准 DOM，小程序则使用宿主选择器 API/模板数据驱动（接口名称因平台而异）：

~~~js
// H5
const title = document.querySelector("#title");
title.textContent = "题库";

// 小程序思路：更新页面数据，由宿主渲染层同步
Page({
  data: { title: "" },
  onLoad() { this.setData({ title: "题库" }); }
});
~~~

验证方案要分别测首包大小、逻辑到渲染通信成本、后台 5 分钟后恢复、网络域名白名单和平台登录，而不能只在桌面 Chrome 中跑一次响应式页面。

**递进追问：**

1. **跨端框架能否让一套代码完全一致运行？**

   通常只能复用业务与部分组件。DOM、路由、授权、支付、文件和生命周期仍由宿主决定；遇到性能或能力差异时需要平台适配层和各端真实测试。

2. **为什么小程序频繁 setData 可能有性能问题？**

   在逻辑与渲染分离的平台中，数据需要序列化并跨上下文传递。高频、大对象更新会增加桥接和渲染成本，应缩小更新范围并按平台工具测量。

**易错点：**

- 把小程序 WebView 等同普通浏览器，直接移植依赖 window/document 的库，直到运行时才发现 API 不存在。
- 只用开发者工具验收，忽略真机宿主版本、后台回收、授权弹窗和网络域名策略造成的差异。

**参考来源：**

- [W3C：MiniApp Standardization White Paper](https://www.w3.org/TR/mini-app-white-paper/)
- [微信开放文档：小程序框架](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [MDN：Document Object Model](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)

校验日期：2026-07-20

## Q60：如何评估引入第三方 npm 包的风险？

**短回答：**

检查维护活跃度、许可证、依赖树、包体和安全公告，锁定版本并最小权限；小功能不应无评估引入高风险依赖。

**原理：**

评估应同时覆盖必要性、代码与维护、供应链和运行权限。先确认标准 API 或现有依赖能否解决，比较生产体积、性能和兼容性；再检查维护者与发布历史、最近变更、开放问题、许可证、依赖树、install scripts、网络/文件权限以及是否有安全公告。锁文件固定解析结果但不能证明包可信，npm audit 也只覆盖已知漏洞。优先选择版本明确、最小依赖、可审计且支持 provenance 的包；在隔离环境查看 tarball，CI 使用 npm ci、受控 registry 和最小 token 权限。高风险包应封装在适配层，准备替换/移除方案并持续监控，而不是只在引入当天审查。

**代码 / 场景：**

对候选包先做只读检查，再在临时分支安装：

~~~sh
npm view candidate-package version dist.unpackedSize license maintainers scripts dependencies
npm view candidate-package time --json
npm pack candidate-package --dry-run
npm audit --omit=dev
npm ls candidate-package
~~~

记录精确版本、压缩后增量、是否执行 preinstall/postinstall、传递依赖数和许可证。安装后检查 lockfile 差异与产物，运行核心兼容/性能测试；若包仅为 10 行工具函数却新增 40 个依赖或请求广泛权限，应拒绝或自行实现。

**递进追问：**

1. **npm audit 为零是否代表供应链安全？**

   不代表。它主要匹配已公开漏洞数据库，无法发现新植入恶意代码、被接管维护者、许可证风险或包在安装脚本中的异常行为，仍需来源与内容审查。

2. **锁文件能防什么，不能防什么？**

   它固定版本和完整性散列，减少不同安装解析漂移；但若首次锁定的内容本身恶意、registry 被信任链攻破或更新 PR 未审查，锁文件不能证明安全。

**易错点：**

- 只根据 GitHub star 或周下载量判断可信；流行度不能替代维护者、发布内容、权限和已知漏洞检查。
- 依赖更新机器人自动合并所有补丁版本，却不构建审查 tarball 和 install scripts，供应链攻击可直接进入生产。

**参考来源：**

- [npm Docs：About audit reports](https://docs.npmjs.com/about-audit-reports)
- [npm Docs：Generating provenance statements](https://docs.npmjs.com/generating-provenance-statements)
- [OWASP：Software Supply Chain Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Software_Supply_Chain_Security_Cheat_Sheet.html)

校验日期：2026-07-20
