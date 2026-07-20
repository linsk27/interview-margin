# Vue 核心与源码

# 响应式系统

## Q1：Vue 3 为什么使用 Proxy？

**短回答：**

Proxy 可拦截对象级读取、写入、删除、in 和遍历等操作，无需预先遍历所有属性，也能处理新增属性和数组索引。

**原理：**

Vue 3 用 Proxy 包住整个对象，在 get、set、deleteProperty、has、ownKeys 等操作发生时统一收集或触发依赖，因此新增属性、删除属性、数组索引与 length 变化都能被观察，不必像 Vue 2 那样初始化时逐个把已有字段改造成 getter/setter。嵌套对象通常在读取时再按需转换为响应式代理，避免一开始递归遍历全部数据。Proxy 还能为 Map、Set 等集合建立专用拦截层。代价是代理对象与原对象身份不同、必须经代理访问才会追踪，而且 Proxy 无法被旧浏览器完整垫片。

**代码 / 场景：**

新增 count 和删除 name 都会经过代理陷阱，因此依赖它们的渲染可更新；直接修改 raw 则绕过代理，不会触发已建立的响应式通知。

~~~js
import { reactive, watchEffect } from 'vue'
const raw = { name: 'A' }
const state = reactive(raw)
watchEffect(() => console.log(state.count ?? 0))
state.count = 1 // 输出 1，新增属性可追踪
delete state.name
raw.count = 2   // 绕过代理，本次写入本身不触发 effect
~~~

**递进追问：**

1. **为什么 Proxy 仍不能自动观察任意局部变量？**

   Proxy 只能拦截经过代理对象的语言操作；局部变量重新赋值没有对象陷阱可进入，所以基本值或需要整体替换的值通常用 ref 的 getter/setter 包装。

2. **reactive(raw) 多次调用会生成多个代理吗？**

   Vue 会用内部 WeakMap 缓存原对象到代理的映射，重复传入同一原对象通常返回同一代理；传入已有代理也会避免无意义的重复包装。

**易错点：**

- 把原对象交给外部代码后继续直接修改，会绕过代理触发链并造成状态不同步。
- Proxy 能力更完整不等于任何场景都更快，性能仍取决于访问规模与依赖粒度。

**参考来源：**

- [Vue：Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- [Vue：reactive()](https://vuejs.org/api/reactivity-core.html#reactive)

校验日期：2026-07-20

## Q2：reactive、ref 和 shallowRef 如何选择？

**短回答：**

对象深层响应通常用 reactive，基本类型或可替换值用 ref，大型不可变对象或第三方实例用 shallowRef 避免深层代理成本。

**原理：**

reactive 适合以对象身份为核心、主要修改其内部字段的状态，它返回深层代理，读取嵌套对象时继续转为响应式；ref 用带 value getter/setter 的容器承载任意值，既能保存基本类型，也适合需要整体替换对象的状态，模板和 reactive 属性中还存在受规则限制的自动解包。shallowRef 只追踪 value 这一层，内部对象保持原样，只有替换 value 或显式 triggerRef 才通知依赖，适合大型不可变数据、外部状态机或第三方类实例。选择依据是更新边界和所有权，不是简单按“对象或基本类型”死记。

**代码 / 场景：**

修改 deep.nested.count 会触发依赖；直接改 shallow.value.count 不会，替换整个 value 才触发。该差异能把大型对象的更新成本固定在根引用边界。

~~~js
import { reactive, shallowRef, watchEffect } from 'vue'
const deep = reactive({ nested: { count: 0 } })
const shallow = shallowRef({ count: 0 })
watchEffect(() => console.log(deep.nested.count, shallow.value.count))
deep.nested.count++          // 触发
shallow.value.count++        // 不触发
shallow.value = { count: 2 } // 触发
~~~

**递进追问：**

1. **为什么可替换对象经常也使用 ref？**

   ref 的 value setter 能观察根引用替换；若把 reactive 变量直接重新赋成新对象，原代理的订阅关系不会自动转移，读取方可能仍持有旧代理。

2. **shallowRef 内部原地修改后如何主动通知？**

   可调用 triggerRef(shallow) 强制触发依赖，但更推荐把内部数据视为不可变并替换根值，让更新协议清楚且便于历史比较。

**易错点：**

- 解构 reactive 属性为普通局部值会失去该属性的代理访问，应使用 toRef 或 toRefs。
- 把所有对象都放 shallowRef 再频繁 triggerRef，会丢失精细依赖并掩盖状态边界。

**参考来源：**

- [Vue：Reactivity Fundamentals](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)
- [Vue：Advanced Reactivity APIs](https://vuejs.org/api/reactivity-advanced.html#shallowref)

校验日期：2026-07-20

## Q3：track 和 trigger 分别做什么？

**短回答：**

track 在活跃 effect 读取属性时记录 target-key-effect 关系，trigger 在写入后找到相关 effect 并交给调度器执行。

**原理：**

track 在响应式属性被读取且当前存在活跃 effect 时，把“目标对象、属性键、effect”关系登记到依赖图中；同一 effect 重复读取同一键只保留一次。trigger 在写入、删除、集合增删或数组长度变化后，根据目标、键和操作类型找出需要失效的 effect。它通常不盲目同步执行全部函数，而是调用 effect 的 scheduler，把组件更新、computed 失效或 watcher job 放进相应队列并去重。只有经过代理读取才会 track，只有值确实变化且符合操作语义才应 trigger；这让 Vue 从“状态变了”精确定位到受影响的派生值和组件。

**代码 / 场景：**

渲染 effect 读取 state.price 和 state.count 时建立两条依赖；修改无关的 state.note 不会重跑，修改 count 才输出新总价。

~~~js
import { reactive, watchEffect } from 'vue'
const state = reactive({ price: 10, count: 2, note: '' })
watchEffect(() => console.log(state.price * state.count)) // 20
state.note = 'memo' // 未被读取，不触发这条 effect
state.count = 3     // 输出 30
~~~

**递进追问：**

1. **为什么 trigger 需要知道操作是 ADD、SET 还是 DELETE？**

   新增或删除还会影响键遍历、数组 length、Map size 等依赖，而普通 SET 通常只影响具体键；区分操作才能既不漏更新又避免无效执行。

2. **scheduler 相比直接 effect.run 有什么价值？**

   scheduler 可把同一轮多次触发合并，按父子组件和 flush 阶段排序，并让 computed 先失效再由读取方重算，避免同步级联重复工作。

**易错点：**

- track 不是读取任意变量都生效，必须有活跃 effect 且读取经过响应式入口。
- trigger 找到依赖不等于立即更新 DOM，组件 job 通常会进入异步调度队列。

**参考来源：**

- [Vue：Reactivity in Depth—How Reactivity Works](https://vuejs.org/guide/extras/reactivity-in-depth.html#how-reactivity-works-in-vue)
- [Vue Core：effect.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/effect.ts)

校验日期：2026-07-20

## Q4：为什么依赖桶常用 WeakMap 到 Map 到 Set？

**短回答：**

WeakMap 以原对象为键便于垃圾回收，Map 区分属性键，Set 对同一 effect 去重并提供稳定的依赖集合。

**原理：**

依赖图需要从一次属性读取反查所有订阅者，因此常用 WeakMap<target, Map<key, Set<effect>>>。第一层以原对象为键；当对象在业务中不再可达时，WeakMap 不会单独阻止其回收。第二层 Map 区分 name、length、迭代键等不同依赖通道，同一对象的字段更新无需扫描其他字段。第三层 Set 保存订阅该键的 effect，可去重同一 effect 在一次执行中多次读取，并支持清理时快速删除。集合类型还会用专用的迭代依赖键表达 keys、values、size 等观察维度。这是概念结构，Vue 当前实现会用 Dep 等对象优化版本标记和链表操作。

![Vue 响应式读取 track 与写入 trigger 的依赖追踪图](/content/diagrams/vue-core/dependency-tracking-v1.svg "WeakMap → Map → Set 将目标、属性键与副作用关联起来。")

**代码 / 场景：**

两个 effect 分别读取不同键，概念依赖图会把它们放进不同 Set；修改 age 只需定位 targetMap.get(user).get('age')，不必遍历所有组件。

~~~js
// 概念模型，不是 Vue 完整源码
const targetMap = new WeakMap()
function getDep(target, key) {
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, depsMap = new Map())
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, dep = new Set())
  return dep
}
~~~

**递进追问：**

1. **为什么最外层不能简单使用普通 Map？**

   普通 Map 会强引用 target，即使应用丢弃对象，依赖图仍可能把它和关联 effect 留在内存；WeakMap 允许对象生命周期结束后整体回收该入口。

2. **Map 的迭代为何需要独立依赖键？**

   新增或删除键会改变 keys、values、entries 与 size，但修改已有键的值未必影响 key 迭代；独立通道才能按操作类型精准触发。

**易错点：**

- WeakMap 只解决 target 入口的弱引用，仍需在 effect 停止时清理它加入过的依赖。
- 不能把这个三层结构当作所有版本的逐行源码，具体实现会随性能优化演进。

**参考来源：**

- [Vue：Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- [Vue Core：dep.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/dep.ts)

校验日期：2026-07-20

## Q5：effectStack 解决什么问题？

**短回答：**

嵌套副作用执行时需要保存并恢复父 effect，否则内层结束后继续读取的数据会错误收集到内层依赖。

**原理：**

响应式副作用可以嵌套：组件渲染读取 computed，而 computed 内部又运行自己的 effect。系统必须在进入内层时保存外层活跃订阅者，离开后恢复，否则内层结束后的属性读取会错误登记到内层 effect，外层依赖则丢失。概念上的 effectStack 通过 push、设置 activeEffect、try/finally 执行、pop 和恢复父级维护这段动态作用域；当前 Vue 实现可能用 parent 链和运行标志达到相同目标。它还要避免同一 effect 在自己的触发链中无限递归，并保证即使用户函数抛错，活跃上下文也能恢复。

**代码 / 场景：**

outer 读取 price，又读取 computed total；total 的内部 effect 读取 count。computed 计算结束后必须恢复 outer，后续读取 tax 才会归到 outer，而不是错误归到 computed。

~~~js
import { reactive, computed, watchEffect } from 'vue'
const s = reactive({ price: 10, count: 2, tax: 1 })
const total = computed(() => s.price * s.count)
watchEffect(() => {
  console.log(total.value + s.tax) // 嵌套进入 computed 后仍要恢复渲染 effect
})
s.tax = 2 // 外层 effect 正确重跑并输出 22
~~~

**递进追问：**

1. **为什么恢复 activeEffect 必须放在 finally？**

   用户 effect 可能抛异常；若只在正常路径恢复，后续响应式读取会继续挂到错误订阅者上，污染整个依赖图并产生难复现更新。

2. **嵌套 effect 与递归 effect 有何区别？**

   嵌套是一个 effect 主动运行另一个不同 effect，需要保存父级；递归是当前 effect 在运行中又触发自己，通常需要保护或显式 allowRecurse。

**易错点：**

- 只用一个全局 activeEffect 而不保存父级，会在 computed 等嵌套场景收错依赖。
- effect 抛错后若上下文未恢复，后续无关读取也可能被错误追踪。

**参考来源：**

- [Vue Core：ReactiveEffect](https://github.com/vuejs/core/blob/main/packages/reactivity/src/effect.ts)
- [Vue：Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)

校验日期：2026-07-20

## Q6：为什么 effect 每次执行前要清理旧依赖？

**短回答：**

分支条件改变后旧字段不再被读取，若不从旧 Set 移除，旧字段变化仍会触发无效执行并造成依赖泄漏。

**原理：**

effect 的依赖由本次实际读取路径决定，条件分支变化后，上一轮读取的键可能不再相关。例如 enabled 为 true 时读取 text，切到 false 后只读取 fallback；若不从 text 的依赖集合移除该 effect，之后修改 text 仍会触发无效执行，并让依赖集合持续膨胀。实现会在重跑期间标记、比对或移除旧 Dep，再把本轮访问重新登记；现代 Vue 使用版本和链表等优化避免每次简单全量清空，但语义仍是让订阅集合与最新执行路径一致。停止 effect 时也必须解除剩余依赖并运行清理回调。

**代码 / 场景：**

关闭 enabled 后，effect 不再读取 text；正确清理后修改 text 不应再次输出，只有修改 fallback 才触发。可用调用次数验证是否存在幽灵依赖。

~~~js
import { reactive, watchEffect } from 'vue'
const s = reactive({ enabled: true, text: 'A', fallback: '-' })
let runs = 0
watchEffect(() => {
  runs += 1
  console.log(s.enabled ? s.text : s.fallback)
})
s.enabled = false // 输出 -
s.text = 'B'       // 当前分支不依赖 text，不应重跑
~~~

**递进追问：**

1. **为什么不能只不断新增依赖而从不删除？**

   动态分支会留下已经失效的订阅，导致无效计算、内存增长，甚至执行已不该发生的网络副作用；依赖图必须反映最近一次真实读取。

2. **watchEffect 的清理回调与依赖清理是一回事吗？**

   不是。内部依赖清理维护订阅图；用户注册的 onCleanup 用于取消请求、定时器等外部副作用，两者都在重跑或停止时发生但职责不同。

**易错点：**

- 条件分支中的读取会随运行改变，不能在首次执行后把依赖集合永久固定。
- 清理旧依赖时直接遍历并同步重加同一 Set，可能造成重复执行，需复制或调度。

**参考来源：**

- [Vue Core：effect.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/effect.ts)
- [Vue：Watcher Cleanup](https://vuejs.org/guide/essentials/watchers.html#side-effect-cleanup)

校验日期：2026-07-20

## Q7：computed 为什么能缓存？

**短回答：**

computed 内部是 lazy effect，依赖变化时只把 dirty 标为 true；下次读取 value 才重新求值并恢复缓存。

**原理：**

computed 内部把 getter 包装成惰性的响应式订阅者。首次读取 value 时运行 getter、收集 getter 使用的依赖并缓存结果；在依赖未变化期间再次读取直接返回缓存。上游依赖变化时，computed 的调度逻辑通常只把自身标记为脏并通知“有人依赖 computed.value”，而不是立即重复计算；下次真正读取才重新求值并恢复干净状态。computed 自己也有 Dep，使组件或外层 computed 能订阅它。缓存只基于响应式依赖，Date.now、普通全局变量等未被追踪的输入不会自动让缓存失效，因此 getter 应纯净且完整读取其真实响应式输入。

**代码 / 场景：**

getter 在两次连续读取中只运行一次；count 改变后先失效，下一次读取才第二次计算并得到 4。calls 清楚展示惰性缓存边界。

~~~js
import { ref, computed } from 'vue'
const count = ref(1)
let calls = 0
const doubled = computed(() => { calls += 1; return count.value * 2 })
console.log(doubled.value, doubled.value, calls) // 2 2 1
count.value = 2
console.log(calls)          // 1，尚未重新读取
console.log(doubled.value, calls) // 4 2
~~~

**递进追问：**

1. **computed getter 中为什么不应发请求？**

   getter 可能因读取时机、SSR 或依赖失效被多次执行，缓存语义也假设它是纯派生计算。网络副作用应放到 watch、action 或明确的资源层。

2. **computed 与方法调用的更新差别是什么？**

   模板每次重渲染都会重新调用方法；computed 只在其响应式依赖变化后重新求值，昂贵且可缓存的纯派生值更适合 computed。

**易错点：**

- computed 不会因非响应式输入变化自动失效，读取 Date.now 可能长期得到旧缓存。
- 在 getter 中修改它依赖的状态会形成循环和不可预测调度，应保持只读派生。

**参考来源：**

- [Vue：Computed Properties](https://vuejs.org/guide/essentials/computed.html)
- [Vue Core：computed.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/computed.ts)

校验日期：2026-07-20

## Q8：watch 和 watchEffect 有什么区别？

**短回答：**

watch 显式指定来源并能比较新旧值，watchEffect 立即运行并自动收集同步执行阶段读取的依赖，控制精度不同。

**原理：**

watch 把依赖来源与副作用分开：来源可为 ref、reactive、getter 或数组，只有来源值按规则变化后才调用回调，并能得到新旧值；默认并不立即运行，可配置 immediate、deep、once 和 flush。watchEffect 会立即执行函数，并自动追踪其同步执行阶段读取的响应式值，代码短但依赖较隐式。两者都支持失效清理和停止句柄。异步 watchEffect 只会追踪第一个 await 之前的同步读取，因为 await 后恢复时已离开本轮依赖收集上下文。flush 决定回调相对组件更新的阶段，而不是简单等同于 setTimeout。

**代码 / 场景：**

watch 只观察 query，并可对比新旧值；watchEffect 同时读取 query 与 page，任一变化都会重跑。清理函数在下一次请求前中止旧请求。

~~~js
const query = ref('vue')
const page = ref(1)
watch(query, (next, prev) => console.log(prev, '->', next))
watchEffect((onCleanup) => {
  const controller = new AbortController()
  fetch('/api?q=' + encodeURIComponent(query.value) + '&page=' + page.value, { signal: controller.signal })
  onCleanup(() => controller.abort())
})
~~~

**递进追问：**

1. **需要读取 DOM 更新后的尺寸时如何配置？**

   使用 flush: 'post' 让 watcher 在所属组件 DOM 更新后运行，或在更新触发后 await nextTick；默认 pre 阶段读取到的可能仍是旧 DOM。

2. **为什么业务关键依赖更适合显式 watch？**

   显式 source 能审查触发边界、比较新旧值和单独测试；watchEffect 中无意增加一次响应式读取就会新增触发源，复杂副作用更难维护。

**易错点：**

- watchEffect 在 await 后读取的 ref 不会成为本轮依赖，不能误以为全函数都自动追踪。
- watch(reactiveObject) 与 watch(() => object.field) 的深度和返回值语义不同。

**参考来源：**

- [Vue：Watchers](https://vuejs.org/guide/essentials/watchers.html)
- [Vue：watchEffect()](https://vuejs.org/api/reactivity-core.html#watcheffect)

校验日期：2026-07-20

## Q9：为什么不建议 deep watch 大对象？

**短回答：**

深度监听需要递归遍历属性以建立依赖，数据规模和更新频率高时会放大初始化与重复执行成本，应改为监听必要字段。

**原理：**

深度 watcher 为发现任意嵌套字段变化，需要遍历可达属性并读取它们以建立依赖；对象越大、层级越深、重跑越频繁，遍历和依赖维护成本越高。循环引用需要访问集合防止无限递归，Map、Set、数组还扩大观察面。嵌套属性原地修改时，回调里的 newValue 与 oldValue 往往仍指向同一对象，无法天然得到变更前快照。Vue 3.5 起 deep 可用数字限制最大遍历深度，但它仍不是字段级业务模型的替代。更好的做法是监听明确 getter、把表单拆成边界清楚的模块，或由写入 action 直接触发所需联动。

**代码 / 场景：**

只监听真正决定报价的 province 与 category，不会因 description、附件或其他无关字段变化遍历整份表单；数组 source 还能一次拿到两个字段的新旧组合。

~~~js
const form = reactive({
  address: { province: 'ZJ', detail: '' },
  category: 'A',
  description: '',
})
watch(
  () => [form.address.province, form.category],
  ([province, category]) => reloadQuote(province, category),
)
~~~

**递进追问：**

1. **deep watcher 的 oldValue 为什么常与 newValue 相同？**

   嵌套原地修改没有替换根对象，watcher 保存的是同一代理引用而非自动深快照；若要差异，应记录必要字段或显式生成不可变快照。

2. **什么时候 deep watch 仍然合理？**

   对象规模可控、任何嵌套变化确实触发同一轻量副作用，且有性能测量时可以使用；仍应设置清理并避免回调中再次改写整棵对象。

**易错点：**

- 不要为获得 oldValue 临时 JSON 深拷贝巨大对象，这可能把一次更新放大成明显长任务。
- deep: true 不是“遗漏依赖”的万能修复，往往说明状态边界和触发条件不清晰。

**参考来源：**

- [Vue：Deep Watchers](https://vuejs.org/guide/essentials/watchers.html#deep-watchers)
- [Vue：watch()](https://vuejs.org/api/reactivity-core.html#watch)

校验日期：2026-07-20

## Q10：toRef、toRefs 解决什么问题？

**短回答：**

直接解构 reactive 属性会失去属性访问代理，toRef 把单个属性包装为保持双向联系的 ref，toRefs 批量处理对象属性。

**原理：**

直接把 reactive 对象属性解构到局部变量，会在解构时读出普通值，之后访问局部变量不再经过代理，因此与原属性的响应式连接中断。toRef(object, key) 创建一个 ref，其 value getter/setter转发到该属性；toRefs 则把对象当前所有可枚举自有属性逐个转换，便于 composable 返回对象后仍可安全解构。它们不会复制值，写 ref 会回写源对象。toRefs 只处理调用时已存在的键，之后新增属性不会自动出现在返回结果；对可能不存在的单个键应直接 toRef。toRef 的规范化重载还可把 getter 转成只读 ref，或让已有 ref 原样返回。

**代码 / 场景：**

普通 destructured 是一次快照，而 countRef 始终连接 state.count。把 state.count 改成 2 后，快照仍为 0，countRef.value 为 2；写 ref 也会回写源对象。

~~~js
import { reactive, toRef } from 'vue'
const state = reactive({ count: 0 })
const { count: snapshot } = state
const countRef = toRef(state, 'count')
state.count = 2
console.log(snapshot)       // 0
console.log(countRef.value) // 2
countRef.value = 3
console.log(state.count)    // 3
~~~

**递进追问：**

1. **composable 返回 reactive 对象还是 toRefs 后对象？**

   若调用方整体使用对象，直接返回 reactive 更简单；若 API 期望调用方解构，可 return toRefs(state)，并在文档中保持返回字段稳定。

2. **toRef(props, "name") 是否允许修改 prop？**

   它仍受 props 只读约束，写入会警告或失败。需要双向更新时应使用 computed getter/setter 或 defineModel，并向父组件发出更新事件。

**易错点：**

- toRefs 只转换已有可枚举键，动态新增字段需要单独 toRef 或重新设计 schema。
- 把 toRefs 结果再随意解包为普通值，仍可能重新失去响应式访问路径。

**参考来源：**

- [Vue：toRef()](https://vuejs.org/api/reactivity-utilities.html#toref)
- [Vue：toRefs()](https://vuejs.org/api/reactivity-utilities.html#torefs)

校验日期：2026-07-20

# 渲染与调度

## Q11：虚拟 DOM 的价值是什么？

**短回答：**

它把声明式视图变为可比较的 JavaScript 节点，框架可批量调度并以平台无关方式计算最小必要 DOM 操作，但并非永远快于手写 DOM。

**原理：**

虚拟 DOM 把某次渲染结果表示为普通 JavaScript 节点树，组件状态变化后生成新树，渲染器比较新旧节点并把必要操作提交到真实 DOM。它让开发者用声明式模板描述“状态对应什么界面”，框架负责批处理、组件边界、跨平台渲染和状态与节点身份协调。价值不只是所谓“最小 DOM”，因为 diff 本身也有成本，手写精准 DOM 在局部可能更快。Vue 还依赖编译器给虚拟节点附加 patchFlag、静态提升和 block 动态子节点信息，避免每次盲目遍历整棵树；因此应把编译期优化与通用运行时 VDOM 一起理解。

**代码 / 场景：**

count 改变时模板重新得到一棵 VNode 树，但静态 h1 可被提升复用，渲染器只更新动态文本节点。开发者无需手写 querySelector 与 textContent 同步。

~~~vue
<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
<template>
  <section>
    <h1>固定标题</h1>
    <button @click="count++">{{ count }}</button>
  </section>
</template>
~~~

**递进追问：**

1. **为什么虚拟 DOM 不保证比手写 DOM 快？**

   它还要创建节点描述并比较新旧树；若业务已精确知道唯一变化，直接写 DOM 可少做工作。框架换取的是可维护性、调度和通用正确性。

2. **Vue 的编译器如何降低 VDOM diff 成本？**

   编译器可静态提升不变节点，用 patchFlag 标记动态字段，并建立 block 的 dynamicChildren 列表，让运行时跳过大量已知静态分支。

**易错点：**

- 不要把虚拟 DOM 描述成每次都复制浏览器 DOM，它只是框架自己的节点数据结构。
- “最小必要操作”取决于 key 与编译信息，错误节点身份仍会造成不正确复用。

**参考来源：**

- [Vue：Rendering Mechanism](https://vuejs.org/guide/extras/rendering-mechanism.html)
- [Vue Core：renderer.ts](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/renderer.ts)

校验日期：2026-07-20

## Q12：Vue 3 patchFlag 有什么作用？

**短回答：**

编译器标记动态文本、class、props 等变化类型，运行时更新 block 时只检查动态节点和目标字段，减少全量 diff。

**原理：**

patchFlag 是模板编译器写入 VNode 的位标志，用来告诉运行时一个节点哪些部分可能变化，例如动态文本、class、style、指定 props 或需要完整 props 比较。更新时 renderer 可按标志直接走针对性分支，不再逐项比较所有属性和子节点。正值常表达可组合的动态类型，某些负值用于 HOISTED、BAIL 等特殊情况；它还与 block tree 的 dynamicChildren 配合，只遍历编译器收集的动态节点。patchFlag 属于编译器与运行时的内部优化协议，不是业务组件应手写依赖的稳定公共 API；含动态插槽、运行时创建结构等情况仍可能退回更完整 diff。

**代码 / 场景：**

模板只有 class 与文本动态，编译结果会在相应 VNode 上附带标志，运行时更新 active 或 label 时可直达目标字段。下面是概念化输出，不应在业务代码硬编码数字。

~~~vue
<template>
  <button :class="{ active }">{{ label }}</button>
</template>
~~~

~~~js
// 概念：createElementBlock('button', { class: ... }, toDisplayString(label), CLASS | TEXT)
~~~

**递进追问：**

1. **patchFlag 与 key 分别解决什么问题？**

   patchFlag 描述同一 VNode 更新时哪些内容动态，key 帮助列表 diff 确认新旧节点身份；一个优化字段比较，一个解决跨位置复用。

2. **为什么手写 render 函数通常没有同等优化？**

   编译器能静态分析模板并证明哪些节点或属性不变，任意运行时代码很难做相同证明，因此手写 VNode 更可能走通用 diff 路径。

**易错点：**

- 不要在业务代码判断 patchFlag 数值，内部枚举和生成策略可能随 Vue 版本变化。
- 有 patchFlag 也不代表整个组件不重渲染，它只缩小提交阶段需要检查的范围。

**参考来源：**

- [Vue：Compiler-Informed Virtual DOM](https://vuejs.org/guide/extras/rendering-mechanism.html#compiler-informed-virtual-dom)
- [Vue Core：patchFlags.ts](https://github.com/vuejs/core/blob/main/packages/shared/src/patchFlags.ts)

校验日期：2026-07-20

## Q13：key 在列表 diff 中为什么重要？

**短回答：**

稳定且唯一的 key 表示节点身份，使算法能复用和移动正确的 DOM 与组件状态；索引 key 在插入排序时会产生错误复用。

**原理：**

key 是同一父节点下 VNode 的稳定身份。更新 keyed 列表时，Vue 用 key 建立新位置映射，把旧节点匹配到正确的新节点，从而决定复用组件实例和 DOM、移动、挂载或卸载。没有 key 时运行时更偏向按位置就地修补；使用数组索引作为 key 时，在头部插入、排序或过滤后，同一索引代表了不同业务实体，输入框值、组件局部状态和动画可能被错误复用。key 只需在兄弟范围内唯一，并应来自不会随排序变化的业务 ID。改变单个组件的 key 还会强制卸载旧实例并挂载新实例，但不应拿它掩盖状态同步问题。

**代码 / 场景：**

删除第一项后，索引 key 会让原来第 2 行组件被当成第 1 行继续复用；使用 user.id，组件状态才随用户移动。输入行最容易暴露这种错误。

~~~vue
<!-- 正确：身份来自稳定业务 ID -->
<UserRow
  v-for="user in users"
  :key="user.id"
  :user="user"
/>

<!-- 风险：排序或头部插入会改变 index 与实体的对应 -->
<UserRow v-for="(user, index) in users" :key="index" :user="user" />
~~~

**递进追问：**

1. **什么情况下索引 key 勉强可以接受？**

   列表顺序和成员永远不变、行没有局部状态且只做静态展示时风险较低；一旦会插入、删除、排序或输入，仍应使用稳定 ID。

2. **重复 key 会发生什么？**

   新旧映射失去一一对应，Vue 会警告，节点可能被错误复用或遗漏；数据进入渲染前应验证唯一性，而不是拼接随机数临时掩盖。

**易错点：**

- 每次渲染生成随机 key 会让所有行持续重建，状态丢失且性能显著变差。
- key 在兄弟节点中唯一即可，不必全应用唯一，但必须稳定代表同一业务实体。

**参考来源：**

- [Vue：Maintaining State with key](https://vuejs.org/guide/essentials/list.html#maintaining-state-with-key)
- [Vue API：key](https://vuejs.org/api/built-in-special-attributes.html#key)

校验日期：2026-07-20

## Q14：最长递增子序列在 Vue diff 中做什么？

**短回答：**

处理中间未知序列时，映射新旧索引后用最长递增子序列找出可保持位置的节点，其余节点再移动，降低 DOM 移动次数。

**原理：**

在 keyed 子节点中间未知区域完成首尾同步后，Vue 会把新节点映射到旧节点位置，形成“新序列每项对应的旧索引”数组。值为零的项需要新建；已匹配项中，最长递增子序列代表旧索引仍保持相对递增、可以留在原位的一组节点。运行时从后向前处理新列表，只移动不在该子序列中的已存在节点，并插入全新节点，从而减少真实 DOM move 次数。LIS 不是用来判断节点内容是否相等，也不处理组件内部 patch；它是在身份匹配和增删确定后优化移动集合，典型算法复杂度约为 O(n log n)。

**代码 / 场景：**

旧顺序 A B C D，新顺序 B C A D。按旧索引得到 [2,3,1,4]，递增子序列可保留 B、C、D，只需把 A 移到 C 后面，而不是重排四个节点。

~~~text
old: A(1) B(2) C(3) D(4)
new: B    C    A    D
map: 2    3    1    4
LIS: 2 -> 3 -> 4，移动 A 即可
~~~

**递进追问：**

1. **为什么处理移动时通常从右向左？**

   右侧节点已确定，可把它作为当前节点插入或移动的 anchor；从后向前能在一次遍历中稳定确定 insertBefore 的参考位置。

2. **无 key 列表还能使用这套 LIS 优化吗？**

   无法可靠把业务实体映射为旧索引，运行时主要按位置和类型修补；稳定 key 是建立映射并安全计算移动的前提。

**易错点：**

- LIS 优化的是移动次数，不代表列表更新完全不需要逐节点 patch。
- 不要在面试中只背 O(n log n)，应先说明旧索引映射和哪些节点可保持位置。

**参考来源：**

- [Vue Core：patchKeyedChildren](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/renderer.ts)
- [Vue：Virtual DOM](https://vuejs.org/guide/extras/rendering-mechanism.html#virtual-dom)

校验日期：2026-07-20

## Q15：nextTick 为什么不是 setTimeout 的同义词？

**短回答：**

Vue 把组件更新放进微任务调度队列去重，nextTick 等待当前刷新 promise 完成；setTimeout 是后续任务，时序更晚。

**原理：**

Vue 把响应式状态引起的组件更新 job 放入调度队列，并用一个微任务批量 flush。nextTick 返回的 Promise 会等待当前这轮 flushPromise 完成，或在没有待处理 flush 时落到已解决 Promise，因此它表达的是“等 Vue 已排队的 DOM 更新提交完”。setTimeout 则创建后续定时器 task，通常还要经过微任务检查点和可能的渲染机会，时序更晚且不与 Vue 队列建立语义联系。nextTick 不保证浏览器已经绘制像素，也不等待图片、网络或 CSS 动画；若要测绘制后的画面，可能还需 requestAnimationFrame。更精确的 watcher 场景可用 flush: 'post'。

**代码 / 场景：**

赋值后同步读取仍可能看到旧文本；await nextTick 后 Vue 已完成本轮 DOM patch，textContent 变为 1。无需用任意毫秒定时器猜更新时间。

~~~vue
<script setup>
import { ref, nextTick, useTemplateRef } from 'vue'
const count = ref(0)
const label = useTemplateRef('label')
async function increment() {
  count.value++
  console.log(label.value.textContent) // 旧值 0
  await nextTick()
  console.log(label.value.textContent) // 新值 1
}
</script>
<template><span ref="label">{{ count }}</span></template>
~~~

**递进追问：**

1. **nextTick 后一定完成浏览器布局和绘制吗？**

   不一定。它保证 Vue DOM 更新队列已刷新，浏览器何时计算布局和绘制由渲染流水线决定；读取几何会触发布局，等待一帧可用 requestAnimationFrame。

2. **为什么大量 nextTick 往往是设计信号？**

   若业务流程处处依赖 DOM 时序，可能把可由状态和声明式渲染表达的逻辑写成命令式步骤；应先检查是否可用 computed、watch post 或组件事件。

**易错点：**

- nextTick 只等待当前已排队更新，之后异步回调再改状态会开启新的刷新轮次。
- 用 setTimeout(0) 代替 nextTick 会引入更晚且不稳定的宿主任务时序。

**参考来源：**

- [Vue API：nextTick()](https://vuejs.org/api/general.html#nexttick)
- [Vue Core：scheduler.ts](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/scheduler.ts)

校验日期：2026-07-20

## Q16：组件更新为什么会批处理？

**短回答：**

同一同步调用栈内多次状态修改只需在微任务中执行一次去重后的更新，避免每次赋值都触发布局和渲染。

**原理：**

同一同步调用栈内可能连续修改多个 ref，若每次 trigger 都立即渲染，组件会反复生成 VNode 和操作 DOM，还可能暴露中间不一致状态。Vue 的 scheduler 把组件更新封装为 job，按身份去重，并在微任务中统一 flush；同一组件一轮通常只执行一次最终渲染。队列还按 job id 等规则让父组件通常先于子组件更新，已卸载子组件的 job 可被跳过，并分别处理 pre 与 post flush 回调。批处理只合并同一刷新窗口内的更新，不会把跨 await、定时器或下一用户事件的所有变化永久合并；同步 watcher 还可绕过默认批处理，所以必须谨慎。

**代码 / 场景：**

一次点击里 count 连续加三次，最终 DOM 显示 3，但组件更新钩子通常只为这一轮执行一次；渲染不会依次提交 1、2、3 三个中间界面。

~~~vue
<script setup>
import { ref, onUpdated } from 'vue'
const count = ref(0)
onUpdated(() => console.log('updated', count.value))
function addThree() {
  count.value += 1
  count.value += 1
  count.value += 1
}
</script>
<template><button @click="addThree">{{ count }}</button></template>
~~~

**递进追问：**

1. **await 前后两次改状态是否同一批？**

   通常 await 会让出当前调用栈，前一批可能在微任务中先刷新，恢复后修改再排入后续轮次；具体还要看 await 的位置和队列登记先后。

2. **父组件为何通常要先于子组件更新？**

   父渲染可能更新子 props 或直接卸载子组件；先处理父 job 可让子看到最新输入，并跳过已经不再存在的子更新。

**易错点：**

- 批处理不意味着状态赋值延迟，JavaScript 中立即读取 ref.value 已是最新值。
- flush: 'sync' watcher 会在每次变化时运行，密集数组修改可能造成大量重复工作。

**参考来源：**

- [Vue：Callback Flush Timing](https://vuejs.org/guide/essentials/watchers.html#callback-flush-timing)
- [Vue Core：scheduler.ts](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/scheduler.ts)

校验日期：2026-07-20

## Q17：v-if 和 v-show 如何选择？

**短回答：**

v-if 控制挂载销毁，切换成本高但未显示时无组件开销；v-show 保留节点只改 display，适合频繁切换。

**原理：**

v-if 是结构指令：条件为 false 时对应分支不创建，切换会挂载或卸载组件、DOM、监听器和该实例内的响应式副作用；初始 false 还具有惰性。v-show 始终创建并保留同一个节点或组件实例，只通过内联 display 样式控制可见性，因此初次渲染成本固定、切换成本低，组件状态也保留。低频切换、昂贵隐藏内容或不应在隐藏时运行的逻辑适合 v-if；高频显示隐藏且初始化可接受时适合 v-show。v-show 只能作用于单个实际元素或组件根展示，不能像 template v-if 那样条件化一组结构，也不能真正阻止隐藏内容占用内存。

**代码 / 场景：**

HeavyChart 使用 v-if 时首次关闭不会 mounted，每次重新打开都会创建新实例；HelpTip 用 v-show 只切换 display，输入与内部状态保持。应通过切换频率测量而不是固定口诀选择。

~~~vue
<template>
  <HeavyChart v-if="chartOpen" />
  <HelpTip v-show="helpVisible" />
</template>
~~~

**递进追问：**

1. **v-if 与 KeepAlive 组合能否保留状态？**

   动态组件在 KeepAlive 边界内被 v-if 移除时可转为 deactivated 并缓存实例，但是否命中还受组件类型、key、include、exclude 和 max 影响。

2. **v-show 隐藏后组件里的定时器会停止吗？**

   不会。组件仍处于 mounted 状态，watcher、订阅和定时器继续运行；若隐藏时必须暂停资源，应监听可见状态或改用卸载/停用生命周期。

**易错点：**

- 把含敏感数据的节点 v-show 隐藏不构成权限控制，内容仍在 DOM 中可读取。
- 频繁切换复杂 v-if 分支会重复挂载和销毁，可能比保持节点更昂贵。

**参考来源：**

- [Vue：v-if vs. v-show](https://vuejs.org/guide/essentials/conditional.html#v-if-vs-v-show)
- [Vue API：v-show](https://vuejs.org/api/built-in-directives.html#v-show)

校验日期：2026-07-20

## Q18：KeepAlive 的缓存边界是什么？

**短回答：**

它缓存组件实例与 DOM 子树并触发 activated/deactivated，不等于永久保存业务数据，应设置 include、exclude 或 max 控制资源。

**原理：**

KeepAlive 只缓存其直接动态子组件的实例和子树，而不是把所有路由、请求结果或任意后代永久保存。组件离开当前视图时通常从活跃容器移到隐藏存储并进入 deactivated，而非 unmounted；再次命中同一组件类型与 key 时恢复实例并触发 activated。include、exclude 根据组件 name 控制资格，max 形成类似 LRU 的容量淘汰，超出后最久未使用实例会真正卸载。缓存实例仍占内存，已有响应式状态和部分副作用可能继续存在；需要在 onActivated/onDeactivated 中恢复或暂停资源。路由使用时还要明确以组件类型还是 route key 区分页面实例。

**代码 / 场景：**

两个动态面板在切换后保留输入值；max=2 时打开第三个不同实例会淘汰最久未访问项。日志应区分 activated/deactivated 与 mounted/unmounted。

~~~vue
<KeepAlive :max="2" include="EditorPanel,PreviewPanel">
  <component :is="activePanel" :key="documentId" />
</KeepAlive>
~~~

~~~js
onDeactivated(() => pausePolling())
onActivated(() => resumePolling())
~~~

**递进追问：**

1. **为什么缓存路由时 key 设计很重要？**

   相同组件类型若不同参数应拥有独立状态，需要 route.fullPath 或业务 ID；若希望参数切换复用同实例，则应使用更稳定 key 并显式响应参数变化。

2. **deactivated 组件里的 watcher 一定停止吗？**

   不能一概而论。组件渲染副作用会停用，但自行创建的外部订阅、定时器和某些 watcher 仍需在停用钩子里明确暂停或清理。

**易错点：**

- KeepAlive 不是数据缓存层，接口结果的过期、失效和并发仍需独立策略。
- 没有 max 的大量参数化页面可能长期占内存，应根据真实访问模式设淘汰边界。

**参考来源：**

- [Vue：KeepAlive](https://vuejs.org/guide/built-ins/keep-alive.html)
- [Vue API：KeepAlive](https://vuejs.org/api/built-in-components.html#keepalive)

校验日期：2026-07-20

## Q19：Teleport 解决什么布局问题？

**短回答：**

组件逻辑归属不变，但 DOM 可渲染到 body 等目标，避免弹层受祖先 overflow、transform 和层叠上下文限制。

**原理：**

Teleport 让一段模板在逻辑上仍属于当前组件树，却把真实 DOM 挂到指定目标容器，典型用于 modal、toast、全局浮层。这样内容可避开祖先的 overflow:hidden、transform 形成的包含块和局部 stacking context，同时仍能访问父组件 props、provide/inject、插槽作用域并按 Vue 组件关系发出事件。to 目标必须能在挂载时解析到，多个 Teleport 可追加到同一目标；disabled 可在原位置和目标间切换，新版本的 defer 可推迟目标解析。DOM 位置改变会影响 CSS 继承、选择器、焦点管理和可访问性，因此 Teleport 只解决挂载位置，不自动实现弹窗的锁滚动、焦点圈和关闭语义。

**代码 / 场景：**

Modal 的模板写在业务组件内，但实际节点进入 body 下的 #modals，不再被 card 的 overflow 裁剪；close 事件仍按组件关系通知父组件。

~~~html
<body>
  <div id="app"></div>
  <div id="modals"></div>
</body>
~~~

~~~vue
<Teleport to="#modals">
  <Modal v-if="open" @close="open = false" />
</Teleport>
~~~

**递进追问：**

1. **Teleport 后 scoped CSS 还会生效吗？**

   编译后的 scoped 样式依靠元素上的作用域属性选择器，通常仍生效；依赖父子 DOM 结构或祖先继承的选择器则可能因真实位置变化而失效。

2. **为什么 Teleport 不能替代完整 Dialog 组件？**

   它只移动节点，不处理 aria-modal、焦点陷阱、Escape、背景 inert、滚动锁和返回焦点；这些仍需组件按可访问性规范实现。

**易错点：**

- to 目标挂载时不存在会产生警告或失败，应保证目标顺序或使用受支持的 defer。
- Teleport 改变真实 DOM 上下文，依赖祖先 z-index 和 CSS 变量时必须重新验证。

**参考来源：**

- [Vue：Teleport](https://vuejs.org/guide/built-ins/teleport.html)
- [Vue API：Teleport](https://vuejs.org/api/built-in-components.html#teleport)

校验日期：2026-07-20

## Q20：Suspense 在 Vue 中负责什么？

**短回答：**

它协调异步 setup 或异步依赖的 pending、fallback 与 resolved 展示；仍需自行处理请求失败和超时策略。

**原理：**

Suspense 在一个边界内协调异步依赖：默认插槽渲染时遇到带 async setup 的组件或可挂起的异步组件，边界先进入 pending，等待依赖解决，再一次性显示默认内容；期间可展示 fallback。它管理的是渲染就绪状态，不是通用请求缓存、重试器或错误边界。依赖拒绝时仍应通过 onErrorCaptured 或 app.config.errorHandler 处理。timeout 控制已显示内容切换到 fallback 的时机，嵌套 Suspense 还涉及 suspensible 与边界归属。该能力在 Vue 文档中仍标为实验性，生产使用要锁定版本并测试 SSR、hydration、路由切换和错误路径。

**代码 / 场景：**

AsyncProfile 的 setup 等待数据时先显示“加载中”，依赖兑现后整块替换为真实内容；请求失败不能依赖 fallback 永久兜底，应由错误状态或错误边界处理。

~~~vue
<Suspense>
  <template #default>
    <AsyncProfile :id="userId" />
  </template>
  <template #fallback>
    <p>加载中…</p>
  </template>
</Suspense>
~~~

~~~js
// AsyncProfile.vue 的 setup
const profile = await fetchProfile(props.id)
~~~

**递进追问：**

1. **Suspense 与异步组件 loadingComponent 有何区别？**

   异步组件选项管理单个组件加载器的延迟、超时和局部占位；Suspense 可协调边界内多个异步依赖并统一提交默认或 fallback 内容。

2. **Suspense 会自动捕获并展示请求错误吗？**

   不会把 fallback 当错误页。异步 setup 拒绝会进入 Vue 错误处理链，需要 errorCaptured、全局 errorHandler 或组件自身错误状态来呈现与重试。

**易错点：**

- fallback 表示等待状态而非失败状态，不能让拒绝请求无限停留在加载文案。
- Suspense 仍属实验性功能，升级 Vue 前应覆盖嵌套、SSR 和切换回归测试。

**参考来源：**

- [Vue：Suspense](https://vuejs.org/guide/built-ins/suspense.html)
- [Vue API：Suspense](https://vuejs.org/api/built-in-components.html#suspense)

校验日期：2026-07-20

# 组件与状态设计

## Q21：props 为什么强调单向数据流？

**短回答：**

父组件拥有状态并向下传值，子组件通过事件请求修改，避免多个组件暗中修改同一来源导致更新路径不可追踪。

**原理：**

props 由父组件拥有，父状态更新后在下一轮渲染把新值向下传给子组件。子组件拿到的是浅只读视图，不能直接给 prop 重新赋值，否则既违反所有权又会在父组件重渲染时被覆盖。单向流让“谁能修改状态、变化从哪里来”可追踪：子组件通过 emit 表达事件，父组件决定是否更新。对象或数组 prop 的嵌套字段仍可能因共享引用而被子组件改动，Vue 无法低成本深度只读，但这同样会形成隐蔽反向写，应通过事件或传入受控方法避免。需要基于 prop 的派生值用 computed；仅把初始值作为本地起点时再复制到 ref，并明确之后是否跟随父更新。

**代码 / 场景：**

子组件不写 props.count，而是发出 increment；父组件持有 count 并更新，随后新 prop 再向下流。这样日志和测试都能定位唯一写入点。

~~~vue
<!-- CounterButton.vue -->
<script setup>
const props = defineProps({ count: Number })
const emit = defineEmits(['increment'])
</script>
<template><button @click="emit('increment')">{{ props.count }}</button></template>

<!-- Parent.vue -->
<CounterButton :count="count" @increment="count++" />
~~~

**递进追问：**

1. **为什么 props 是浅只读而不是深只读？**

   深度代理和冻结任意对象成本高，也会破坏对象作为共享引用的正常用法；框架阻止顶层替换，嵌套所有权则由组件契约和类型约束管理。

2. **把 prop 复制到 ref 后为什么不再自动同步？**

   ref(props.initial) 只在 setup 当时读取一次值，之后是新的本地状态。若确实要持续同步，应使用 computed 或显式 watch，并处理双向覆盖规则。

**易错点：**

- 直接修改对象 prop 的嵌套字段不会总是报警，但会绕过父组件的状态所有权。
- 为了消除警告而无脑复制 prop，可能制造父子两份状态和同步竞态。

**参考来源：**

- [Vue：One-Way Data Flow](https://vuejs.org/guide/components/props.html#one-way-data-flow)
- [Vue：Component Events](https://vuejs.org/guide/components/events.html)

校验日期：2026-07-20

## Q22：组件的 v-model 如何实现？

**短回答：**

默认由 modelValue prop 与 update:modelValue 事件组成，也可通过参数定义多个双向绑定；子组件不应直接改 prop。

**原理：**

组件上的 v-model 本质是 prop 与更新事件的语法约定。默认情况下，父组件把值作为 modelValue prop 传入，并监听 update:modelValue；子组件不能直接改只读 prop，而应在输入变化时 emit 新值。Vue 3.4+ 可用 defineModel 宏生成对应 ref 与事件声明；更早版本显式 defineProps/defineEmits。v-model:title 会改用 title 与 update:title，因此一个组件可有多个模型；修饰符会通过 defineModel 的 modifiers 或 modelModifiers prop 传递并由组件解释。默认值要谨慎：父值为 undefined 而子 defineModel 有默认值时可能暂时不同步，最好让父状态明确初始化。模型值的最终所有权仍在父组件，子组件只是提出更新请求并渲染传回的新值。

**代码 / 场景：**

父组件的 title 与子输入形成受控双向协议。用户输入 B 时，子组件发 update:modelValue，父 title 变成 B，再以 prop 形式回传。

~~~vue
<!-- TitleInput.vue -->
<script setup>
defineProps({ modelValue: String })
const emit = defineEmits(['update:modelValue'])
</script>
<template>
  <input :value="modelValue" @input="emit('update:modelValue', $event.target.value)" />
</template>

<!-- Parent.vue -->
<TitleInput v-model="title" />
~~~

**递进追问：**

1. **一个组件如何同时支持 firstName 和 lastName 两个 v-model？**

   分别声明 firstName、lastName props 和 update:firstName、update:lastName 事件，或使用两个 defineModel('firstName') 与 defineModel('lastName')。

2. **自定义 trim 修饰符应在哪里处理？**

   子组件读取 modifiers，在 set 转换或 emit 前处理输入，并在文档中定义类型与时机；不要让父子两边重复 trim 导致光标或校验异常。

**易错点：**

- 子组件直接修改 modelValue prop 仍然违规，v-model 并未取消 props 只读规则。
- 事件名必须精确为 update:modelValue 或参数对应名称，大小写契约错误会失去同步。

**参考来源：**

- [Vue：Component v-model](https://vuejs.org/guide/components/v-model.html)
- [Vue API：defineModel()](https://vuejs.org/api/sfc-script-setup.html#definemodel)

校验日期：2026-07-20

## Q23：provide/inject 适合替代 Pinia 吗？

**短回答：**

它适合组件树范围内的依赖传递和插件能力；跨页面共享、调试、持久化和复杂业务状态通常更适合独立 store。

**原理：**

provide/inject 主要解决祖先向深层后代传递局部依赖，避免中间组件层层透传 props。解析按组件祖先链取最近 provider，适合表单上下文、主题、组件库服务或可替换接口；Symbol key 能防止大型应用中的名称冲突。提供 ref 或 reactive 值时，注入方可保持响应式，但最好把修改方法也由 provider 暴露，集中所有权。Pinia 面向跨页面、跨组件树的应用状态，提供明确 store 身份、action、getter、开发工具、插件、SSR 水合和测试能力。provide/inject 缺少统一目录、时间线和持久化约定，滥用会形成隐式依赖；Pinia 也不该替代只在单棵子树生效的上下文。

**代码 / 场景：**

FormRoot 提供只读状态与 updateField，任意深层 Field 可注入，但离开 FormRoot 就没有该上下文。这是局部依赖，不需要建立全局 Pinia store。

~~~js
// formContext.js
export const formKey = Symbol('form')

// provider
const state = reactive({ values: {} })
provide(formKey, { state: readonly(state), updateField: (k, v) => { state.values[k] = v } })

// descendant
const form = inject(formKey)
form.updateField('email', 'a@example.com')
~~~

**递进追问：**

1. **inject 的默认值什么时候使用？**

   祖先链找不到对应 key 时才使用默认值；若依赖是必需的，更应检测 undefined 并抛出清晰错误，避免组件静默在错误上下文运行。

2. **为什么推荐由 provider 暴露修改方法？**

   状态与变更规则留在同一所有者，后代不必知道内部结构，便于校验、审计和重构；可同时向后代暴露 readonly 状态。

**易错点：**

- 用字符串作为大量 inject key 容易冲突，库和大型项目应使用导出的 Symbol。
- 把所有全局状态塞进根 provide 会失去 Pinia 的调试、SSR 与模块边界优势。

**参考来源：**

- [Vue：Provide / Inject](https://vuejs.org/guide/components/provide-inject.html)
- [Pinia：Introduction](https://pinia.vuejs.org/introduction.html)

校验日期：2026-07-20

## Q24：Composable 应如何设计边界？

**短回答：**

围绕单一能力封装状态和副作用，参数使用 ref 或 getter 保持响应性，暴露最小 API，并在卸载时清理监听器。

**原理：**

Composable 应围绕一项可描述的有状态能力设计，而不是把组件代码随意搬进 useX 函数。输入应显式，可接受 ref、getter 或普通值时用 toValue 统一；输出以命名 ref、readonly 状态和操作方法表达稳定契约。它可复用 Vue 生命周期和响应式 API，但创建的监听器、事件、请求必须在作用域结束时清理，避免每次调用累积副作用。浏览器 API 要考虑 SSR，不应在模块顶层直接访问 window；跨请求状态也不能放进全局单例。网络、存储等外部依赖可参数注入，便于测试。一个 composable 可以组合更小能力，但不应同时负责视图、业务规则、缓存和全局通知。

**代码 / 场景：**

useOnlineStatus 只负责在线状态，挂载时注册、卸载时清理，并返回只读 ref；多次创建组件不会留下孤儿监听器，SSR 初始值也可受控。

~~~js
import { readonly, ref, onMounted, onUnmounted } from 'vue'
export function useOnlineStatus() {
  const online = ref(true)
  const sync = () => { online.value = navigator.onLine }
  onMounted(() => { sync(); window.addEventListener('online', sync); window.addEventListener('offline', sync) })
  onUnmounted(() => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync) })
  return { online: readonly(online) }
}
~~~

**递进追问：**

1. **Composable 可以在事件处理器里临时调用吗？**

   依赖生命周期注入的 composable 通常应在 setup 同步阶段调用，才能绑定当前组件作用域；事件中应调用它预先返回的方法，而非重新注册生命周期。

2. **如何让 composable 同时接受 ref 和 getter？**

   类型上接收 MaybeRefOrGetter，在 watchEffect 或 watch source 中通过 toValue 读取；不要在入口只 unref 一次，否则后续变化可能失去追踪。

**易错点：**

- 模块顶层创建共享 ref 会让所有调用者共用状态，SSR 时还可能跨用户泄漏。
- 只返回可写状态不提供操作语义，会让业务规则散落回每个调用组件。

**参考来源：**

- [Vue：Composables](https://vuejs.org/guide/reusability/composables.html)
- [Vue：toValue()](https://vuejs.org/api/reactivity-utilities.html#tovalue)

校验日期：2026-07-20

## Q25：Pinia 的 state、getter 和 action 各负责什么？

**短回答：**

state 保存源数据，getter 表达派生值，action 封装同步或异步业务变更；不要把可推导值重复写入 state。

**原理：**

state 保存 store 拥有的可变事实，应在定义时给出完整初始形状，便于响应式、SSR 和重置；getter 是基于 state 或其他 getter 的纯派生值，语义类似 computed，依赖不变时复用结果；action 表达有名称的业务操作，可同步或异步读取和修改 state、调用其他 action，并集中错误和并发策略。组件应读取 state/getter 并调用 action，而不是把复杂流程拆成多处直接赋值。Setup Store 用 ref、computed、function 分别映射这些角色，也必须返回需要 Pinia 追踪的状态。插件、订阅和持久化应建立在明确 store 边界上，不能把接口响应、表单草稿和所有临时 UI 状态都堆进一个全局 store。

**代码 / 场景：**

total 是纯派生 getter，checkout 是业务 action；组件无需自己复制总价公式或直接拼接结算步骤。action 中可统一防重复提交与错误转换。

~~~js
export const useCartStore = defineStore('cart', {
  state: () => ({ items: [], submitting: false }),
  getters: {
    total: (state) => state.items.reduce((sum, item) => sum + item.price * item.count, 0),
  },
  actions: {
    async checkout() {
      if (this.submitting) return
      this.submitting = true
      try { await api.checkout(this.items) } finally { this.submitting = false }
    },
  },
})
~~~

**递进追问：**

1. **为什么 getter 中不应修改 state？**

   getter 应是可缓存、可重复读取的派生计算；修改依赖会产生循环和隐藏副作用。状态变化应由 action 或明确的写入口执行。

2. **直接解构 Pinia store 为什么可能失去响应式？**

   state 和 getter 被普通解构后不再经 store 代理访问，应使用 storeToRefs；action 可直接解构，因为它们已绑定到 store。

**易错点：**

- 把远程请求直接放 getter 会让读取触发副作用，并破坏缓存和服务端渲染。
- 一个万能 store 会模糊生命周期与权限边界，应按领域和所有权拆分。

**参考来源：**

- [Pinia：State](https://pinia.vuejs.org/core-concepts/state.html)
- [Pinia：Getters and Actions](https://pinia.vuejs.org/core-concepts/getters.html)

校验日期：2026-07-20

## Q26：为什么 store 不应保存 DOM 节点和大型第三方实例？

**短回答：**

这类值不适合深层代理和序列化，生命周期也属于组件；需要共享时用 markRaw 或 shallowRef 并明确清理。

**原理：**

Pinia store 适合可序列化、可追踪并具有业务意义的共享状态。DOM 节点和编辑器、图表、地图等第三方实例通常包含循环引用、私有内部状态和宿主资源；被深层 reactive 代理后，身份判断、私有字段、this 绑定或库内部 WeakMap 可能失效，依赖遍历也增加成本。它们无法可靠 SSR 序列化、水合、持久化或显示在开发工具时间线中，生命周期还应跟随具体组件而非全局 store。更稳妥的是组件内用 shallowRef 或普通变量持有，必要时 markRaw，onUnmounted 销毁；store 只保存实例 ID、配置和可复现的业务状态。跨组件控制可提供窄接口，而不是暴露整个实例。

**代码 / 场景：**

图表实例留在组件 shallowRef 中，store 只保存筛选条件。卸载时 dispose 能与 DOM 生命周期一致；若把 chart 放进持久化 store，JSON 与 SSR 都会失败。

~~~js
const host = useTemplateRef('host')
const chart = shallowRef(null)
const filters = useChartFilterStore()
onMounted(() => {
  chart.value = markRaw(createChart(host.value))
  chart.value.setOption(buildOption(filters.current))
})
onUnmounted(() => { chart.value?.dispose(); chart.value = null })
~~~

**递进追问：**

1. **markRaw 与 shallowRef 分别解决什么？**

   markRaw 标记对象不再被转换为代理；shallowRef 只追踪根 value 替换、内部保持原样。第三方实例常组合使用，但仍必须显式管理销毁。

2. **多个组件确实要操作同一实例怎么办？**

   由拥有生命周期的 provider 或 service 暴露有限命令与状态，调用方注入接口；不要让任意组件直接读写第三方对象全部内部 API。

**易错点：**

- markRaw 只跳过代理，不会自动销毁实例、解绑事件或解决 SSR 中没有 DOM。
- 把实例挂进 store 可能污染持久化插件和开发工具，甚至导致循环序列化异常。

**参考来源：**

- [Vue：Reduce Reactivity Overhead](https://vuejs.org/guide/best-practices/performance.html#reduce-reactivity-overhead-for-large-immutable-structures)
- [Vue API：markRaw()](https://vuejs.org/api/reactivity-advanced.html#markraw)

校验日期：2026-07-20

## Q27：动态表单 schema 如何建模？

**短回答：**

schema 描述字段类型、默认值、校验和联动，运行时建立 source 到 target 的依赖索引，只在源字段变化时执行相关规则。

**原理：**

动态表单 schema 应描述稳定字段身份和声明式规则，而不是直接塞组件实例或可执行任意字符串。每个字段至少包含 id/name、类型、默认值、标签、校验规则引用、可见/禁用条件、选项来源和布局信息；运行时 values、errors、touched、pending 则与 schema 分离，避免改元数据时覆盖用户输入。渲染器通过受信组件注册表把 type 映射到组件，并对白名单 props 做转换。字段依赖最好形成可分析图，服务端仍按同一业务规则校验。schema 需要 version 与迁移策略，后端删除或改名字段时才能升级草稿；远程 schema 也必须做结构校验和权限过滤，不能把它当可执行代码。

**代码 / 场景：**

schema 只引用受控类型和规则 ID，values 独立保存。字段 component 由注册表选择，不能让服务端传任意模块路径；visibleWhen 可编译成受限表达式。

~~~js
const schema = {
  version: 2,
  fields: [
    { id: 'country', type: 'select', default: 'CN', optionsSource: 'countries' },
    { id: 'taxId', type: 'text', rules: ['requiredTaxId'], visibleWhen: { field: 'country', eq: 'CN' } },
  ],
}
const componentRegistry = { text: TextField, select: SelectField }
const values = reactive(createDefaults(schema))
~~~

**递进追问：**

1. **字段 ID 为什么不能直接使用显示标签？**

   标签会翻译和调整，而 ID 还关联草稿、校验、埋点和迁移；应使用稳定机器标识，显示文案通过 i18n key 或独立 label 管理。

2. **schema 升级后旧草稿如何处理？**

   按 version 运行显式迁移：重命名键、转换类型、补默认值并保留无法识别字段供审计；迁移失败要提示用户而非静默丢数据。

**易错点：**

- 远程 schema 中执行 eval 或任意函数会形成代码注入，应使用受限规则注册表。
- 把 errors 与 values 写回 schema 会混淆静态定义和每个用户的运行状态。

**参考来源：**

- [Vue：Dynamic Components](https://vuejs.org/guide/essentials/component-basics.html#dynamic-components)
- [JSON Schema：Specification](https://json-schema.org/specification)

校验日期：2026-07-20

## Q28：字段联动如何防止循环触发？

**短回答：**

构建依赖图时检测环，执行时记录批次和访问路径，变更前比较新旧值，并把规则限制为纯计算或显式动作。

**原理：**

字段联动应先建模为有方向的依赖图，尽量让可推导值使用 computed 而不是 watcher 相互写回。真正需要命令式更新时，规则要幂等：新值与旧值相同不写；一次用户变更作为事务处理，记录 change source 或本轮 visited 节点，按拓扑顺序传播，并在检测到回边时拒绝配置。若 A watch B、B 又 watch A，即使每次异步调度，也可能在格式转换或浮点舍入中来回震荡。批量更新还应区分“用户输入”和“系统推导”，避免系统写入再次触发同类远程请求。循环保护的最终边界不是随便设一个计数，而是明确图约束、稳定值比较与审计日志。

**代码 / 场景：**

fullName 纯粹由 firstName 和 lastName 推导，不写回源字段，因此没有循环。只有用户直接修改源字段才改变依赖方向。

~~~js
const firstName = ref('Lin')
const lastName = ref('Da')
const fullName = computed(() => firstName.value + ' ' + lastName.value)
// 避免：watch(fullName, splitAndWriteNames) 与反向 watch 同时存在
~~~

若业务必须允许编辑 fullName，应设计单一 setter，在一次事务中解析并比较后写两个源字段。

**递进追问：**

1. **为什么 equality guard 仍不能解决所有循环？**

   两个规则可能在不同规范化结果间振荡，例如一方四舍五入、一方补精度；需要统一规范化函数和有向无环依赖，而非只比较单步相等。

2. **如何在配置阶段发现循环？**

   把字段作为节点、依赖作为有向边，保存 schema 前做拓扑排序或深度优先搜索；发现回边就返回具体环路径供配置者修正。

**易错点：**

- 用两个 watcher 模拟双向 computed 很容易形成反馈环，应建立单一写入口。
- 简单增加“最多触发十次”只会截断症状，还可能留下部分更新的不一致状态。

**参考来源：**

- [Vue：Computed Setter](https://vuejs.org/guide/essentials/computed.html#writable-computed)
- [Vue：Watchers](https://vuejs.org/guide/essentials/watchers.html)

校验日期：2026-07-20

## Q29：异步校验如何避免旧请求覆盖新结果？

**短回答：**

为每次校验分配序号或 AbortController，结果返回时只接受最新序号，并区分取消、网络失败和业务不通过。

**原理：**

输入快速变化时，多次校验请求会并发，网络完成顺序不等于发起顺序。每次 watcher 运行应为请求创建 AbortController，并在失效清理中中止旧请求；同时递增序列号或保存本次输入快照，响应到达时只有仍是最新序列且字段值未变才允许写 errors。防抖只能减少请求数量，不能保证已发请求的返回顺序。还要区分 AbortError 与真实失败，避免把主动取消显示为校验错误；组件卸载和字段隐藏时同样清理。服务端最终保存仍必须再次校验，因为前端异步结果可能过期或被绕过。复杂表单可集中管理 pending、错误版本和缓存键。

**代码 / 场景：**

用户名从 lin 很快变为 linda 时，第一轮 watcher 被清理并 abort；即使旧服务未及时取消，ticket 比较也阻止旧结果覆盖 linda 的状态。

~~~js
let latest = 0
watch(username, async (value, _, onCleanup) => {
  const ticket = ++latest
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  try {
    const result = await api.checkName(value, { signal: controller.signal })
    if (ticket === latest && value === username.value) error.value = result.ok ? '' : result.message
  } catch (error) {
    if (error.name !== 'AbortError' && ticket === latest) validationFailure.value = true
  }
})
~~~

**递进追问：**

1. **只有序列号而不取消请求可以吗？**

   能防止旧结果提交，但旧请求仍占连接与服务端资源；接口支持 AbortSignal 时应同时取消，序列号则作为取消不可靠时的最终提交门。

2. **校验成功后提交为何还可能失败？**

   校验与提交之间状态可能改变，且唯一性等约束只能由数据库原子保证；提交接口必须重新校验并把冲突映射回字段错误。

**易错点：**

- 只加 debounce 不能消除竞态，已发出的慢请求仍可能最后返回。
- 把 AbortError 当普通错误展示会在每次正常输入切换时闪烁失败提示。

**参考来源：**

- [Vue：Side Effect Cleanup](https://vuejs.org/guide/essentials/watchers.html#side-effect-cleanup)
- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

校验日期：2026-07-20

## Q30：权限按钮为什么不能只在前端隐藏？

**短回答：**

前端隐藏改善体验但可被绕过，后端必须对每个写接口校验身份、资源范围和操作权限，返回一致的 401/403。

**原理：**

前端隐藏按钮只改善用户体验，不能建立授权边界。用户可修改客户端状态、直接调用 HTTP 接口、重放请求或构造自己的程序，前端打包代码与权限判断也都可读。服务端必须在每个受保护操作上验证真实会话，再检查角色/权限、资源所有权、租户、对象当前状态和字段级规则，并默认拒绝；数据库查询最好把授权条件纳入过滤，避免先取出再遗漏检查。前端可根据服务端返回的能力集合控制展示，但 403 仍要正确处理，因为权限会在页面打开后撤销或资源状态变化。CORS、路由守卫和 disabled 都不是授权替代品，审计日志还应记录高风险操作。

**代码 / 场景：**

路由 meta 与 v-if 只负责界面；删除接口仍调用服务端，服务端按用户和目标资源独立鉴权。攻击者即使手工 POST，也会得到 403。

~~~vue
<button v-if="ability.can('delete', project)" @click="remove(project.id)">删除</button>
~~~

~~~js
// 服务端概念代码
app.delete('/projects/:id', requireSession, async (req, res) => {
  const project = await repo.findAuthorized(req.user, req.params.id, 'delete')
  if (!project) return res.sendStatus(403)
  await repo.remove(project.id)
  res.sendStatus(204)
})
~~~

**递进追问：**

1. **后端已经鉴权，前端还需要权限控制吗？**

   需要用于减少无效入口、解释不可用原因并改善导航，但应消费服务端能力而非复制另一套规则；任何请求仍以服务端结果为准。

2. **返回 404 还是 403 如何选择？**

   对不应泄露资源存在性的场景可统一返回 404；需要明确权限不足时用 403。团队应统一威胁模型、日志和 API 契约，不能随意混用。

**易错点：**

- 前端路由守卫可被绕过，不能因页面不可见就省略接口鉴权。
- 只检查角色不检查资源所有权和租户，会形成水平越权漏洞。

**参考来源：**

- [OWASP：Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [Vue Router：Route Meta Fields](https://router.vuejs.org/guide/advanced/meta.html)

校验日期：2026-07-20

# 性能、工程与安全

## Q31：Vue 页面卡顿如何定位？

**短回答：**

先区分网络、脚本、渲染和内存，再用 Performance、Vue Devtools 与组件更新高亮定位长任务和过大更新范围。

**原理：**

定位卡顿要先把现象分成加载慢、输入响应慢、滚动掉帧或状态更新后长任务，再用浏览器 Performance 录制同一可复现操作。主线程火焰图可区分 JavaScript、样式计算、布局、绘制和垃圾回收；Network 判断是否其实在等接口或资源。Vue 可开启 app.config.performance，在支持环境留下组件初始化、渲染与 patch 标记，并用 Vue Devtools Profiler 找出高频或耗时组件。开发阶段的 onRenderTracked/onRenderTriggered 可解释具体哪个依赖让组件重渲染。找到热点后做最小实验，例如临时移除列表、图表或 watcher，并用相同数据前后对比 INP、长任务时长和更新次数，而不是先猜 computed 或 VDOM 有问题。

**代码 / 场景：**

对一次“输入筛选词后列表卡住”录制性能：若 180ms 都在 filter 与组件 patch，先记录列表长度和渲染行数，再切换虚拟列表复测；若时间在 Layout，则检查同步读写 DOM。

~~~js
// 开发诊断，不建议把详细依赖日志永久留在生产
onRenderTriggered((event) => {
  console.table({ type: event.type, key: String(event.key) })
})
~~~

结论应包含基线、改动、同一设备数据和未覆盖场景，而不是只说“用了缓存后更快”。

**递进追问：**

1. **为什么开发环境的耗时不能直接代表生产？**

   开发构建含警告、热更新和额外追踪，代码未压缩且 Vue 会做更多检查；应先在开发定位，再用生产构建和受控设备复测指标。

2. **看到组件重渲染次数多就一定是瓶颈吗？**

   不一定。轻量渲染即使次数多也可能成本很低，真正要看总耗时、提交 DOM 数量和用户交互延迟；优化应聚焦可测热点。

**易错点：**

- 不要同时开启大量 console 日志再测性能，日志本身会显著改变主线程时间。
- 只看平均 FPS 容易漏掉单次长任务，应关联具体交互、长任务和 INP。

**参考来源：**

- [Vue：Performance Best Practices](https://vuejs.org/guide/best-practices/performance.html)
- [Vue API：app.config.performance](https://vuejs.org/api/application.html#app-config-performance)

校验日期：2026-07-20

## Q32：大型列表为什么需要虚拟化？

**短回答：**

只渲染视口附近元素，把 DOM 数量从总数据量降为窗口大小；必须处理动态高度、键值和滚动位置恢复。

**原理：**

列表有数千到数万项时，即使数据过滤很快，为每项创建 VNode、组件实例和真实 DOM 也会放大挂载、patch、布局、绘制和内存成本。虚拟化只渲染视口附近的窗口与少量 overscan，用占位高度模拟完整滚动范围，并随 scroll 计算起止索引和元素偏移；因此 DOM 数量从总数据量 N 降到可见项 K。固定行高实现简单，动态行高需要测量缓存、锚点修正和避免滚动跳动。稳定 key、键盘焦点、屏幕阅读器的集合语义、搜索定位和滚动恢复也要专门设计。虚拟化优化的是展示，不应把所有远程数据一次加载到客户端；它可与服务端分页或游标并用。

**代码 / 场景：**

一万条记录、每屏约二十行时，只渲染起止索引周围三十行，并用上、下 spacer 保持滚动条比例。DOM 节点稳定在几十而非一万。

~~~js
const rowHeight = 40
const overscan = 5
const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2
const end = Math.min(items.length, start + visibleCount)
const windowItems = computed(() => items.slice(start, end))
const topPadding = start * rowHeight
~~~

**递进追问：**

1. **动态行高为什么比固定行高难？**

   未渲染行高度未知，实际测量后总高度和当前偏移会变化；实现需缓存尺寸、修正锚点并处理内容异步展开，否则滚动条会跳。

2. **虚拟列表如何保留输入焦点？**

   被滚出窗口的行可能卸载，焦点随之丢失。应定义焦点行保留策略、键盘导航和状态外置，并向辅助技术暴露正确索引与总数。

**易错点：**

- 仅用 v-for 加分页按钮不等于虚拟化，当前页过大仍会创建全部 DOM。
- 用数组索引作 key 会让回收行复用错误状态，必须使用稳定业务标识。

**参考来源：**

- [Vue：Virtualize Large Lists](https://vuejs.org/guide/best-practices/performance.html#virtualize-large-lists)
- [WAI-ARIA：aria-setsize](https://www.w3.org/WAI/ARIA/apg/practices/structural-roles/#aria-setsize)

校验日期：2026-07-20

## Q33：如何减少无效组件更新？

**短回答：**

稳定 props 引用、缩小响应式范围、把派生值放 computed、拆分组件并避免父模板中每次创建新对象或函数。

**原理：**

先让子组件接收稳定且最小的 props，而不是把整个频繁变化对象传下去。父组件可提前计算 active 布尔值，使未受影响行的 prop 保持不变；避免每次渲染新建等价对象、数组或匿名配置。把状态放在最低共同所有者，拆分真正独立的更新边界，但不要为了“组件化”制造过多层。对昂贵且条件明确的子树可用 v-memo，永久静态内容可用 v-once；大型不可变结构可用 shallowRef 降低深层代理成本。computed 在新版本可利用结果稳定性，但返回新对象会破坏这一点。最终要用 Profiler 验证更新次数与耗时，因为一次很便宜的重渲染通常不值得增加缓存复杂度。

**代码 / 场景：**

若每行接收 activeId，activeId 每变所有行 prop 都变；父组件改为传 active={item.id===activeId} 后，只有旧激活和新激活两行的 active 真正变化。

~~~vue
<!-- 更稳定的子组件输入 -->
<ListItem
  v-for="item in items"
  :key="item.id"
  :item="item"
  :active="item.id === activeId"
/>

<!-- 昂贵且依赖明确时才考虑 -->
<div v-for="item in items" :key="item.id" v-memo="[item.id, item.updatedAt]">…</div>
~~~

**递进追问：**

1. **为什么 computed 返回新对象会导致稳定性失效？**

   即使字段相同，每次创建的新对象引用也不相等，订阅者会把它视为变化；可返回基本值、复用旧对象或把字段拆成独立 computed。

2. **v-memo 的依赖漏写会怎样？**

   未列入数组的变化不会触发该子树更新，页面可能显示旧值；它是有正确性成本的手动优化，必须有测试和性能证据。

**易错点：**

- 不要为每个简单表达式加 computed 或 memo，维护成本可能超过节省的渲染时间。
- 把全部状态上移到根组件会扩大更新扇出，应按真实所有权缩小响应边界。

**参考来源：**

- [Vue：Props Stability](https://vuejs.org/guide/best-practices/performance.html#props-stability)
- [Vue API：v-memo](https://vuejs.org/api/built-in-directives.html#v-memo)

校验日期：2026-07-20

## Q34：静态字典缓存和请求去重如何配合？

**短回答：**

数据缓存保存已完成结果，pending Map 保存进行中的 Promise；请求完成后清 pending，但按失效策略保留数据缓存。

**原理：**

静态字典缓存解决“已有结果在有效期内直接复用”，请求去重解决“同一键正在加载时多个调用者共享一个 Promise”。缓存键必须包含真正影响结果的语言、租户、版本和查询参数；成功结果记录 fetchedAt、ETag 或版本，按 TTL、重新验证或显式发布事件失效。inFlight Map 在请求创建前登记 Promise，在 finally 删除；失败不能永久缓存成已完成数据。两者结合可避免页面多组件同时请求 countries 等字典，又允许过期后只有一条刷新请求。AbortSignal 所有权要谨慎：一个消费者取消不应误杀其他共享消费者，可让底层请求由缓存层管理，调用者只停止等待。SSR 缓存若跨请求共享还必须隔离用户与租户，公共字典才可进进程级缓存。

**代码 / 场景：**

相同 key 的并发调用拿到同一个 Promise；成功后进入 cache，后续在 TTL 内直接返回。失败或结束都从 inFlight 删除，下一次才有机会重试。

~~~js
const cache = new Map()
const inFlight = new Map()
async function getDictionary(key, ttl = 60_000) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ttl) return hit.value
  if (inFlight.has(key)) return inFlight.get(key)
  const request = api.dictionary(key)
    .then((value) => { cache.set(key, { value, at: Date.now() }); return value })
    .finally(() => inFlight.delete(key))
  inFlight.set(key, request)
  return request
}
~~~

**递进追问：**

1. **为什么不能只用 Pinia state 是否为空判断已加载？**

   空数组可能是合法结果，也无法区分 loading、失败、过期和不同参数键；应显式保存状态、时间与键，或由资源缓存层负责。

2. **字典发布新版本如何立即失效？**

   响应可携带版本或 ETag，后台发布后推送版本事件；客户端比较版本删除对应键并重新验证，而不是只能等固定 TTL。

**易错点：**

- 缓存键漏掉 locale 或 tenant 会把一个上下文的数据错误复用给另一个上下文。
- 把 rejected Promise 永久留在 inFlight 会让后续请求永远复用同一次失败。

**参考来源：**

- [MDN：HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)
- [Vue：State Management](https://vuejs.org/guide/scaling-up/state-management.html)

校验日期：2026-07-20

## Q35：异步组件和路由懒加载的区别是什么？

**短回答：**

路由懒加载按页面拆包，defineAsyncComponent 可细分非首屏重组件；都要配合 loading、error、超时和预加载策略。

**原理：**

defineAsyncComponent 包装一个返回组件 Promise 的 loader，在该组件真正进入渲染树时加载，并可配置 delay、loadingComponent、errorComponent、timeout、重试或由 Suspense 接管等待。路由懒加载是在路由记录的 component 字段提供动态 import，首次导航到该记录时由 Vue Router 解析组件，并与导航流程、代码分块和缓存相连。二者都可触发打包器拆包，但边界不同：异步组件可用于页面内任意重型控件，路由懒加载以页面导航为切分点。路由字段通常直接写 () => import(...)，不需要再套 defineAsyncComponent；页面内部的编辑器、图表则可独立异步。懒加载只延迟代码，数据预取、权限守卫和错误恢复仍需另行设计。

**代码 / 场景：**

Dashboard 在首次进入路由时加载；Dashboard 内的 HeavyEditor 只有用户打开编辑模式才加载，两级边界互不替代。

~~~js
// router.js
const routes = [
  { path: '/dashboard', component: () => import('./views/Dashboard.vue') },
]

// Dashboard.vue
const HeavyEditor = defineAsyncComponent({
  loader: () => import('../components/HeavyEditor.vue'),
  errorComponent: EditorLoadError,
  timeout: 10_000,
})
~~~

**递进追问：**

1. **代码分割越细越好吗？**

   不是。过多小 chunk 增加请求、调度和缓存元数据成本，也可能形成加载瀑布；应按用户路径、资源体积和复用率设计并实测。

2. **动态 import 失败后如何重试？**

   异步组件可在 onError 中按错误类型和次数调用 retry；路由层可捕获导航加载错误、刷新版本或提示重试，避免无限自动循环。

**易错点：**

- 路由 component 中再包 defineAsyncComponent 通常多余，还会模糊导航错误处理。
- 只展示永久 loading 而没有超时和失败界面，会让离线用户无法恢复。

**参考来源：**

- [Vue：Async Components](https://vuejs.org/guide/components/async.html)
- [Vue Router：Lazy Loading Routes](https://router.vuejs.org/guide/advanced/lazy-loading.html)

校验日期：2026-07-20

## Q36：Vue SSR 为什么会发生 hydration mismatch？

**短回答：**

服务端 HTML 与客户端首次渲染不同，例如时间、随机数、浏览器 API 或数据不一致；需保证确定性并把客户端逻辑推迟到挂载后。

**原理：**

hydration 要求客户端首次渲染的 VNode 结构与服务端已输出 DOM 相符，才能只绑定事件并复用节点。服务端与客户端使用不同数据快照，或模板在首次渲染读取 Date.now、Math.random、时区格式、window 尺寸、本地存储和仅客户端权限，就会产生文本或结构差异；无效 HTML 被浏览器自动纠正也会改变真实 DOM。Vue 会警告并尝试恢复，严重时丢弃节点重建，带来性能、闪烁和状态风险。解决方式是序列化同一初始状态、使用确定性 ID/时间/区域设置，把浏览器专属逻辑放到 onMounted，保证合法 HTML。确实不可避免的局部差异可谨慎使用 data-allow-mismatch，但不能拿它隐藏数据错误。

**代码 / 场景：**

服务端和客户端各自调用 Math.random 会得到不同文本。应由服务端生成 seed 并随初始状态注入，客户端首次复用同一值；挂载后再刷新客户端随机数。

~~~vue
<script setup>
// initialState.seed 来自 SSR 序列化，而不是在两端各自 Math.random()
const seed = ref(initialState.seed)
onMounted(() => {
  // 此后才执行真正只属于客户端的逻辑
})
</script>
<template><span>{{ seed }}</span></template>
~~~

**递进追问：**

1. **为什么仅用 v-if="typeof window !== undefined" 仍可能 mismatch？**

   服务端条件为 false、客户端首次渲染为 true，结构仍不同。应让首次客户端输出与服务端一致，再在 mounted 后切换。

2. **无效 HTML 如何导致水合差异？**

   浏览器解析器会自动插入或移动节点，例如错误嵌套 p、table 元素；客户端 VNode 仍按源码结构，因而无法逐节点对应。

**易错点：**

- 用 data-allow-mismatch 全局压警告会掩盖真实数据泄漏和结构错误。
- 水合恢复不是免费兜底，大量重建会抵消 SSR 的性能收益并导致闪烁。

**参考来源：**

- [Vue SSR：Hydration Mismatch](https://vuejs.org/guide/scaling-up/ssr.html#hydration-mismatch)
- [Vue API：data-allow-mismatch](https://vuejs.org/api/ssr.html#data-allow-mismatch)

校验日期：2026-07-20

## Q37：v-html 的主要风险是什么？

**短回答：**

它把字符串作为 HTML 注入，不编译 Vue 模板；不可信内容可能造成 XSS，必须在可信边界前使用成熟白名单消毒器。

**原理：**

v-html 把字符串直接交给 element.innerHTML，绕过模板的文本转义。若内容来自用户、URL、第三方接口或可被攻击者影响的后台，就可能形成 XSS：事件属性、危险 URL、SVG 等在站点源权限下执行或欺骗用户。插入内容不会由 Vue 编译，因此其中的指令、插值和组件不会工作；scoped CSS 也不一定覆盖动态 HTML 的内部节点。首选普通插值显示文本；确需富文本时，在明确的信任边界使用成熟白名单净化器，只允许业务需要的标签/属性，并配合严格 CSP、Trusted Types 和服务端存储规则。净化必须靠近危险 sink，不能净化一次后又拼接未处理片段。

**代码 / 场景：**

插值会把标签当文本，v-html 会解析节点。下面只允许经过 sanitizePolicy 的结果进入 v-html；策略测试应删除 onerror、javascript: URL 和未知 SVG，而不是只删 script。

~~~vue
<script setup>
import DOMPurify from 'dompurify'
const safeHtml = computed(() => DOMPurify.sanitize(props.html, {
  ALLOWED_TAGS: ['p', 'strong', 'em', 'a'],
  ALLOWED_ATTR: ['href', 'rel'],
}))
</script>
<template>
  <article v-html="safeHtml"></article>
</template>
~~~

**递进追问：**

1. **为什么服务端已过滤，前端仍要关注上下文？**

   内容可能经过迁移、拼接或进入不同 HTML/属性/URL 上下文，原编码不再适用；需要端到端定义格式并在最终 sink 前保证安全。

2. **CSP 能否替代 HTML 净化？**

   不能。CSP 是纵深防御，配置缺口或允许的脚本仍可能被利用，HTML 注入还可篡改界面；根本措施是避免或净化不可信 HTML。

**易错点：**

- 只过滤 script 标签无法阻止事件属性、SVG 和 javascript: URL 等载荷。
- 不要期待 v-html 内的 Vue 模板生效，运行时不会再次编译这些字符串。

**参考来源：**

- [Vue：Raw HTML](https://vuejs.org/guide/essentials/template-syntax.html#raw-html)
- [OWASP：XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

校验日期：2026-07-20

## Q38：错误边界如何设计？

**短回答：**

组件层可用 errorCaptured 收敛渲染错误，全局 handler 上报上下文；异步请求和事件回调仍要显式捕获并提供恢复路径。

**原理：**

Vue 组件可用 onErrorCaptured 或 errorCaptured 捕获后代在 render、setup、生命周期、watcher 等框架调用链中的错误，记录上下文并切换为局部 fallback；返回 false 可阻止错误继续传播，否则仍会到 app.config.errorHandler。边界应放在能独立恢复的功能区，如路由页、编辑器或第三方部件，而不是每个小组件。它要区分加载失败、权限错误、程序缺陷，提供重试或重建 key，并避免 fallback 自身再次抛错。并非所有错误都自动进入组件边界：脱离 Vue 调用链的定时器、未处理 Promise、资源加载和路由加载错误还需 window、unhandledrejection、router.onError 等入口。生产上要把错误与 release、route、component trace 和请求关联，但对用户显示安全文案。

**代码 / 场景：**

Boundary 捕获后代错误，发送一次脱敏报告并显示重试按钮；改变 childKey 可重建失败子树，而不是刷新整个应用。若返回 false，需确认全局监控不会因此漏报。

~~~js
const failed = ref(false)
const childKey = ref(0)
onErrorCaptured((error, instance, info) => {
  reportError(error, { info, route: route.fullPath })
  failed.value = true
  return false
})
function retry() {
  failed.value = false
  childKey.value += 1
}
~~~

~~~vue
<ProblemPanel v-if="failed" @retry="retry" />
<FeatureArea v-else :key="childKey" />
~~~

**递进追问：**

1. **边界捕获后为什么不一定要 return false？**

   允许继续传播可让全局 errorHandler 统一上报；若局部已经上报并返回 false，要做去重并确保不会让监控完全漏掉该错误。

2. **错误边界与 Suspense fallback 有何不同？**

   Suspense fallback 表示异步依赖尚未就绪；错误边界处理拒绝和程序异常。加载、失败和空数据应是三个独立 UI 状态。

**易错点：**

- fallback 组件复用同一故障依赖，可能再次抛错并让整个边界失效。
- 捕获错误后静默显示空白会掩盖数据损坏，应提供可恢复操作和关联编号。

**参考来源：**

- [Vue API：onErrorCaptured()](https://vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured)
- [Vue API：app.config.errorHandler](https://vuejs.org/api/application.html#app-config-errorhandler)

校验日期：2026-07-20

## Q39：Vue 应用如何做运行时监控？

**短回答：**

采集 JS 错误、未处理 Promise、接口失败、性能指标和版本信息，使用 source map 还原堆栈并按用户会话关联。

**原理：**

运行时监控应同时覆盖错误、性能和关键业务结果。用 app.config.errorHandler 接收 Vue 捕获的组件错误与 info，window error 和 unhandledrejection 补充宿主异步错误，router.onError 记录懒加载失败；上报 release/commit、route、组件轨迹、浏览器、时间和请求 correlation ID。生产 source map 应上传到受控监控服务而非公开暴露。性能侧采集 Core Web Vitals、长任务、资源和关键交互，并用 app.config.performance 或采样 profiler 在诊断环境关联组件。所有事件需采样、去重、限速与离线缓冲，严格脱敏输入、token、批注和响应正文。告警依据错误率、受影响用户和 SLO，而非单条异常；监控发送失败不能阻塞主业务。

**代码 / 场景：**

全局入口只规范化与排队，不在用户请求路径同步等待网络。事件带 release 和 route，服务端按 fingerprint 去重；敏感字段在进入队列前删除。

~~~js
app.config.errorHandler = (error, instance, info) => {
  monitor.enqueue({
    type: 'vue-error',
    error: normalizeError(error),
    info,
    route: router.currentRoute.value.fullPath,
    release: __APP_VERSION__,
  })
}
window.addEventListener('unhandledrejection', (event) => {
  monitor.enqueue({ type: 'unhandled-rejection', error: normalizeError(event.reason) })
})
~~~

**递进追问：**

1. **为什么监控必须带 release 版本？**

   同一错误在不同构建的堆栈和代码位置不同，release 能关联 source map、部署时间与回滚范围，并比较新版本是否引入回归。

2. **如何避免同一错误被局部和全局重复上报？**

   为事件生成基于错误、组件、路由和短时间窗的 fingerprint，或在局部标记已报告；服务端再做聚合而不是简单按消息文本计数。

**易错点：**

- 未经脱敏上传表单值和接口正文可能泄露密码、令牌及用户隐私。
- 同步 await 监控请求会放大故障，应使用异步队列、超时和失败丢弃策略。

**参考来源：**

- [Vue API：app.config.errorHandler](https://vuejs.org/api/application.html#app-config-errorhandler)
- [web.dev：Web Vitals](https://web.dev/articles/vitals)

校验日期：2026-07-20

## Q40：如何证明复杂表单不是普通 CRUD？

**短回答：**

用字段规模、联动图、权限状态、异步校验、草稿恢复和性能指标说明约束，再讲定位过程与可验证结果，而非堆技术名词。

**原理：**

复杂度应由可验证约束和状态转换证明，而不是字段数量或页面截图。先画出字段依赖图：哪些值派生、哪些规则会级联清空或重算；再列异步状态机：校验 pending、旧请求取消、草稿版本、提交冲突、离线恢复和权限变化。说明 schema 版本、服务端最终校验、错误如何定位到字段、批量更新如何保持原子，以及敏感字段如何审计和脱敏。性能上给出字段规模、依赖边数、首屏和输入 INP、无效 watcher 次数；质量上用规则单测、依赖环检测、竞态测试、草稿迁移和可访问性键盘测试覆盖边界。能指出未实现的保证和故障恢复路径，比泛称“动态表单引擎”更可信。

**代码 / 场景：**

以“国家改变后税号规则和省份选项同时变化”为例，证据应包含依赖图、旧请求取消和回归断言，而不是只展示 select。

~~~text
用户改 country
  -> 同步事务清空无效 province
  -> taxId 规则切换并重新校验
  -> options 请求版本 +1，取消旧 country 请求
  -> 只接受当前版本响应
  -> 保存时服务端按同一国家规则再次校验
~~~

测试应模拟旧请求后返回，断言不会覆盖当前选项，并检查键盘焦点仍停在可理解位置。

**递进追问：**

1. **面试中没有线上性能数据怎么办？**

   明确说明没有生产权限，不虚构指标；提供本地固定数据集、设备、测试步骤和结果，并说明上线后会观测哪些 SLI 与阈值。

2. **怎样证明规则系统可维护而非堆 watcher？**

   展示稳定 schema、规则注册表、依赖图环检测、单一更新事务和规则级测试；新增字段应只扩展配置与明确插件，不修改大量组件。

**易错点：**

- 把“字段多、组件多”当复杂度证据无法说明一致性、竞态与恢复能力。
- 声称支持离线、协同或动态规则却没有冲突协议和测试，会被追问迅速击穿。

**参考来源：**

- [Vue：Scaling Up](https://vuejs.org/guide/scaling-up/tooling.html)
- [WAI：Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/)

校验日期：2026-07-20

# 源码与边界追问

## Q41：Reflect.get 的 receiver 为什么重要？

**短回答：**

当属性是 getter 或来自原型链时，receiver 决定 getter 内 this；代理中传入 receiver 可让 this 指向代理并继续触发响应式读取。

**原理：**

Proxy 的 get 陷阱拿到 target、key 和 receiver。Reflect.get(target, key, receiver) 按普通属性读取语义查找 target，但若命中 getter，会把 getter 内的 this 绑定为最初接收访问的 receiver，通常就是响应式代理。这样 getter 内继续读取 this.firstName 时仍经过代理并收集 firstName 依赖。若直接写 target[key]，getter 的 this 常落到原对象，内部读取绕过代理，computed 或渲染只追踪了外层 name，却可能漏掉真正字段。receiver 在代理参与原型链时也代表最初访问者，使继承 getter/setter 的 this 语义与普通对象一致。它不是 track 的替代；陷阱仍需针对 key 建立依赖并避免内建 Symbol 等无关读取。

**代码 / 场景：**

fullName 是原对象 getter。用 Reflect.get 传 receiver 后，getter 里的 this.first 和 this.last 都从 proxy 读取；修改 first 能让依赖 fullName 的 effect 正确更新。

~~~js
const raw = {
  first: 'Lin',
  last: 'Da',
  get fullName() { return this.first + ' ' + this.last },
}
const proxy = new Proxy(raw, {
  get(target, key, receiver) {
    track(target, key)
    return Reflect.get(target, key, receiver)
  },
})
console.log(proxy.fullName) // Lin Da，内部读取仍经过 proxy
~~~

**递进追问：**

1. **Reflect.set 为什么也接收 receiver？**

   它让继承的 setter 以最初接收者作为 this，并处理原型链上的数据属性定义语义；代理还需判断是否由当前 target 真正完成写入，避免重复触发。

2. **所有内建对象都能直接用 Reflect.get 代理吗？**

   不是。Map、Set、Date 等方法依赖内部槽，方法以普通 Proxy 为 this 可能报不兼容接收者；Vue 对集合提供专门 instrumentation。

**易错点：**

- 用 target[key] 代替 Reflect.get 可能让 getter 内部访问绕过代理并漏收依赖。
- receiver 解决 this 语义，不会自动处理依赖追踪、只读和 ref 解包规则。

**参考来源：**

- [ECMAScript：Reflect.get](https://tc39.es/ecma262/multipage/reflection.html#sec-reflect.get)
- [Vue Core：baseHandlers.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/baseHandlers.ts)

校验日期：2026-07-20

## Q42：Proxy set 为什么要区分新增和修改？

**短回答：**

新增属性还会影响 ownKeys、for-in 和数组 length 等依赖，普通修改主要触发该 key，二者需要派发不同依赖集合。

**原理：**

新增键与修改已有键影响的依赖集合不同。已有 name 从 A 改 B，通常触发读取 name 的订阅者；新增 age 除了 age，还改变 Object.keys、for...in、in 运算和某些集合尺寸语义。数组写入超出原长度的索引还会影响 length 与数组迭代。set 陷阱因此先判断 key 是否原本属于目标：数组整数索引与普通对象规则不同，再用 Reflect.set 完成语言写入，并在写入成功、receiver 对应当前原目标时按 ADD 或 SET 触发；值比较常用 Object.is 避免同值无效更新。原型链上的 setter 可能让多个代理陷阱被经过，receiver/原始目标检查能减少重复通知。删除则是 DELETE，并只在键确实存在且删除成功时触发。

**代码 / 场景：**

effect A 只读 state.name，effect B 枚举所有键。修改 name 应重跑二者中的相关值观察；新增 age 必须让枚举 effect 也重跑，否则 UI 不会出现新字段。

~~~js
const state = reactive({ name: 'A' })
watchEffect(() => console.log('name:', state.name))
watchEffect(() => console.log('keys:', Object.keys(state).join(',')))
state.name = 'B' // SET：name 值变化
state.age = 18   // ADD：age 与键迭代都变化，keys 输出 name,age
delete state.age // DELETE：键迭代再次变化
~~~

**递进追问：**

1. **给数组 arr[5] 赋值为什么还要触发 length？**

   若原长度小于等于 5，该写入不仅新增索引，还把 length 扩到 6；依赖长度和数组迭代的视图都必须更新。

2. **为什么赋相同值通常不 trigger？**

   依赖观察到的结果没有变化，重跑只会浪费工作；使用 Object.is 还能正确处理 NaN 和正负零的变化语义。

**易错点：**

- 只按 key 是否为 undefined 判断新增会失败，因为已有属性的合法值也可能是 undefined。
- 忽略原型链与 receiver 检查可能让一次赋值经过父子代理时重复触发 effect。

**参考来源：**

- [Vue Core：MutableReactiveHandler.set](https://github.com/vuejs/core/blob/main/packages/reactivity/src/baseHandlers.ts)
- [ECMAScript：Proxy set](https://tc39.es/ecma262/multipage/reflection.html#sec-proxy-object-internal-methods-and-internal-slots-set-p-v-receiver)

校验日期：2026-07-20

## Q43：数组 includes 为什么需要对原数组重试？

**短回答：**

代理数组中元素可能是原对象而查询参数是代理对象，第一次查找失败时用原始数组重试可统一两种身份。

**原理：**

响应式数组存在原对象与代理对象两种身份。数组底层可能保存 rawObject，而调用者手里只有 reactive(rawObject)；原生 includes 按 SameValueZero 比较对象引用，用代理去 raw 数组中搜索会得到 false。Vue 为 includes、indexOf、lastIndexOf 提供搜索 instrumentation：先对数组迭代建立依赖并按正常参数搜索；若结果表示未找到且搜索参数是代理，再把参数 toRaw 后对原数组重试，从而让常见的 raw/proxy 两种入口都能命中。重试只解决代理身份差异，不做结构深比较。追踪数组迭代是必要的，因为后续替换、插入或删除元素应让依赖该搜索结果的 effect 更新。业务层仍应尽量统一身份或使用稳定 ID，避免同时长期暴露 raw 与 proxy。

**代码 / 场景：**

list 的底层存 raw，item 是它的代理；Vue instrumentation 让 list.includes(item) 返回 true。普通原生数组 [raw].includes(item) 则为 false，展示为何需要 raw 参数重试。

~~~js
import { reactive, toRaw } from 'vue'
const raw = { id: 1 }
const item = reactive(raw)
const list = reactive([raw])
console.log(list.includes(item))            // true，Vue 失败后以 raw 参数重试
console.log([raw].includes(item))           // false，原生只比较引用
console.log([raw].includes(toRaw(item)))    // true
~~~

**递进追问：**

1. **为什么不直接把数组中所有对象永久替换成代理？**

   代理转换通常按读取惰性发生，底层 raw 数据还用于身份缓存、序列化和避免重复包装；强制改写原数组会改变用户原始数据与赋值语义。

2. **对象按 ID 查找是否仍应使用 includes？**

   includes 只比较引用。业务上来自接口的两个独立对象即使 id 相同也不命中，应使用 some(item => item.id === id) 或维护 ID Set。

**易错点：**

- 原数组重试不是深相等，两个独立但字段相同的对象仍然不会匹配。
- 频繁调用 toRaw 并保存其结果会绕过响应式更新，不应作为普通状态入口。

**参考来源：**

- [Vue Core：arrayInstrumentations.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/arrayInstrumentations.ts)
- [Vue API：toRaw()](https://vuejs.org/api/reactivity-advanced.html#toraw)

校验日期：2026-07-20

## Q44：数组 push 为什么可能造成依赖递归？

**短回答：**

push 内部会读取并写 length，若 effect 同时因 length 收集又触发写入，可能自触发；实现会暂停特定跟踪或由调度器防重入。

**原理：**

原生 push 在内部会读取并写入数组 length。若一个正在收集依赖的 effect 执行 arr.push，读取 length 可能把该 effect 订阅到 length；随后 push 写新索引和 length 又 trigger 同一个 effect，使它在尚未完成时再次运行，形成递归或调度循环。Vue 对 push、pop、shift、unshift、splice 等变更方法做 instrumentation，在执行期间暂停不应产生的依赖追踪，并用批处理包住多步写入，结束后恢复追踪再统一通知。这个内部保护不意味着在 computed 或 watchEffect 中修改其依赖数组是好设计；副作用仍可能在组件间形成反馈。应把数组写入放在事件或 action，派生逻辑只读取。

**代码 / 场景：**

下面的 watchEffect 同时读写 items，是危险结构；它每次运行都 push，数组变化又使 effect 失效。即使框架阻止部分 length 自依赖，也会不断改变业务状态，应改成显式 addItem。

~~~js
const items = reactive([])
// 错误设计：派生 effect 内修改自己的依赖
// watchEffect(() => {
//   if (items.length < 3) items.push(items.length)
// })

function addItem(value) {
  items.push(value) // 由用户事件或 action 明确调用
}
const count = computed(() => items.length)
~~~

**递进追问：**

1. **pauseTracking 为什么不能简单等同于“不触发更新”？**

   它暂停的是执行期间的新依赖收集；数组写操作仍会触发已有订阅者，只是通过 batch 等机制在合适时机统一调度。

2. **允许 watcher 修改别的状态就一定安全吗？**

   不一定。若另一 watcher 又反向修改源状态，仍会形成跨 effect 环。要检查完整依赖图、保持幂等并设置清晰的单向写入规则。

**易错点：**

- 不要依赖 Vue 内部防递归机制来实现循环业务规则，它只保护响应式基础设施。
- computed getter 中 push 数组会破坏纯派生语义，并可能在每次读取时累积数据。

**参考来源：**

- [Vue Core：arrayInstrumentations](https://github.com/vuejs/core/blob/main/packages/reactivity/src/arrayInstrumentations.ts)
- [Vue Core：effect batching](https://github.com/vuejs/core/blob/main/packages/reactivity/src/effect.ts)

校验日期：2026-07-20

## Q45：Map 的响应式为什么比对象复杂？

**短回答：**

读取、设置、删除、迭代 key/value 和 size 具有不同依赖，set 还要区分新增与值变化，迭代需专用依赖键。

**原理：**

Map 的数据不通过普通属性 get/set 暴露，而是依赖 get、set、has、delete、clear、size、forEach 和迭代器，并使用引擎内部槽；把原生方法直接以 Proxy 作为 this 调用甚至会出现不兼容接收者错误。Vue 因此返回专门 instrumentation：把键和值在 raw 与 reactive 身份间规范化，读取 get/has 时按键追踪，set 时区分 ADD 与已有键 SET，delete/clear 触发相应依赖。观察 map.keys() 只关心键集合，values()/entries()/forEach 还关心值变化，size 关心增删，所以需要 ITERATE_KEY、MAP_KEY_ITERATE_KEY 等不同通道。迭代返回的对象值还要按 reactive/readonly/shallow 模式包装，同时保持迭代协议。

**代码 / 场景：**

effect A 读取指定键 a，effect B 迭代 keys。修改 a 的值应更新 A，但 keys 集合未变；新增 b 必须同时更新键迭代与 size。

~~~js
const scores = reactive(new Map([['a', 1]]))
watchEffect(() => console.log('a=', scores.get('a')))
watchEffect(() => console.log('keys=', [...scores.keys()].join(',')))
scores.set('a', 2) // 指定键值变化；keys 仍是 a
scores.set('b', 3) // ADD；keys 变成 a,b，size 也变化
scores.delete('a') // DELETE；指定键和迭代依赖都变化
~~~

**递进追问：**

1. **为什么 keys 与 values 不能共用完全相同依赖？**

   修改已有键的值会改变 values，却不改变 keys；若共用，键列表也会无效重跑。新增删除才需要同时通知两类迭代。

2. **Map 的对象键为何有 raw/proxy 身份问题？**

   同一个原对象和它的代理引用不同，Vue 会规范化常见操作并可能警告同时存在两种键；业务最好统一使用原始 ID 或单一对象入口。

**易错点：**

- 只拦截 proxy.key 无法观察 Map.set，因为集合数据不存成普通对象属性。
- 把 raw 与 proxy 同时作为 Map 键会形成两个逻辑入口，行为难以推理。

**参考来源：**

- [Vue Core：collectionHandlers.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/collectionHandlers.ts)
- [Vue：Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)

校验日期：2026-07-20

## Q46：readonly 是如何实现的？

**短回答：**

读取仍递归包装为只读代理，写入和删除被拦截并警告或拒绝；它是运行时访问约束，不等于深冻结原对象。

**原理：**

readonly 通过只读 Proxy handler 包装对象：get 仍递归返回只读包装的嵌套对象，并按需要解包 ref；set 和 deleteProperty 不执行真实修改，在开发环境给出警告并按代理不变量返回。集合类型也有只读 instrumentation，阻止 set、add、delete、clear。若 readonly 包住 reactive 源，源对象从合法入口变化时只读视图仍会更新，依赖它的组件可重渲染；只读限制的是通过该视图写入，不是冻结底层内存。readonly 是运行时开发约束和 API 所有权表达，不是安全边界：持有 raw 或原 reactive 引用的代码仍可改值，也不能阻止攻击者发请求。shallowReadonly 只保护根层，props 就具有类似浅只读语义。

**代码 / 场景：**

consumer 只能读 state，调用 consumer.count++ 会警告且不改变；owner 修改原 reactive state 后，consumer 立即看到新值。这样 provider 可暴露读取视图与命令方法。

~~~js
const state = reactive({ count: 0, nested: { ready: false } })
const consumer = readonly(state)
consumer.count++           // 开发环境警告，写入被阻止
console.log(state.count)   // 0
state.count = 2            // 所有者合法修改
console.log(consumer.count) // 2
~~~

**递进追问：**

1. **readonly 与 Object.freeze 有什么区别？**

   readonly 是深层按需代理视图，可随底层 reactive 更新；freeze 直接把对象自身设为不可扩展且属性不可写，并不自动提供响应式追踪。

2. **为什么 props 不是深 readonly？**

   深度保护任意对象成本高且会改变共享引用语义；Vue 阻止 prop 顶层赋值，嵌套对象所有权仍要由组件契约约束。

**易错点：**

- readonly 不能当授权机制，用户仍可绕过前端，服务端必须独立校验权限。
- shallowReadonly 的嵌套对象仍可写，不能按名字误以为整棵结构都被保护。

**参考来源：**

- [Vue API：readonly()](https://vuejs.org/api/reactivity-core.html#readonly)
- [Vue Core：baseHandlers.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/baseHandlers.ts)

校验日期：2026-07-20

## Q47：markRaw 和 toRaw 的风险是什么？

**短回答：**

markRaw 跳过代理，toRaw 取回原对象；长期混用原对象与代理会产生身份不一致，通常只用于第三方实例或短暂逃生。

**原理：**

markRaw 在对象上建立“不要转换为响应式代理”的标记，适合第三方实例或不应深度代理的大型不可变数据；但只保证被标记根对象本身，未标记的嵌套对象若后来进入 reactive 容器仍可能被代理。toRaw 从 Vue 创建的代理取回原对象，适合临时做身份比较、无追踪读取或与要求原对象的库交互。风险是身份分裂：raw !== proxy，两者进入 Set、Map 或严格相等判断会产生不同结果；通过 raw 写入会绕过 trigger，让 UI 保持旧状态。长期保存 raw 还破坏状态所有权和调试。它们是精确逃生舱，不是“提升性能”的默认开关，使用点应隔离并写测试。

**代码 / 场景：**

foo 被 markRaw 后放入 reactive 仍保持同一身份；foo.nested 没标记，单独放入 reactive 时会成为代理，出现嵌套身份差异。直接写 toRaw(state).count 不会通知 effect。

~~~js
const foo = markRaw({ nested: {} })
const box = reactive({ foo, nested: foo.nested })
console.log(box.foo === foo)                 // true
console.log(box.nested === foo.nested)       // false，nested 被代理

const state = reactive({ count: 0 })
const raw = toRaw(state)
raw.count = 1 // 绕过响应式触发，不应作为正常写入路径
~~~

**递进追问：**

1. **第三方实例应该 markRaw 还是 shallowRef？**

   常用 shallowRef 持有实例，使根替换可追踪、内部不深代理；可再 markRaw 明确实例不可代理。无论哪种都要随组件生命周期销毁。

2. **为什么 toRaw 适合临时使用而非缓存？**

   代理仍是应用的响应式入口，长期传播 raw 会让部分模块绕过追踪，并让同一实体同时出现两个引用身份，集合查找和更新都变复杂。

**易错点：**

- 通过 toRaw 返回值修改状态不会触发依赖，页面与真实对象可能暂时不一致。
- markRaw 不是递归标记，嵌套对象跨边界后仍可能出现 raw/proxy 身份分裂。

**参考来源：**

- [Vue API：markRaw()](https://vuejs.org/api/reactivity-advanced.html#markraw)
- [Vue API：toRaw()](https://vuejs.org/api/reactivity-advanced.html#toraw)

校验日期：2026-07-20

## Q48：effectScope 解决什么生命周期问题？

**短回答：**

它把多个 effect、computed 和 watch 归组，可一次停止，适合 composable、组件外状态或动态模块的集中清理。

**原理：**

effectScope 把在其 run 回调中同步创建的 computed、watch、watchEffect 等响应式 effect 收集为一个作用域，调用 scope.stop() 就能一次停止全部 effect 并执行 onScopeDispose 清理。组件 setup 本身已经运行在组件作用域中，所以组件卸载会自动清理同步创建的 watcher；effectScope 更适合无组件宿主的服务、可复用资源组、临时功能实例和需要整体启停的插件。嵌套 scope 默认随父 scope 停止，detached scope 则独立，必须由拥有者手动停止。异步回调里稍后创建的 watcher 可能不再处于原作用域，需要显式管理。作用域只治理响应式 effect；DOM 事件、socket、定时器仍要通过 onScopeDispose 注册释放。

**代码 / 场景：**

createFeature 创建两个 watcher 和一个定时器，调用 stop 后统一终止，不必向外暴露三个清理句柄。onScopeDispose 把非响应式资源也纳入相同所有权。

~~~js
function createFeature(source) {
  const scope = effectScope()
  scope.run(() => {
    watch(source, syncRemote)
    watchEffect(updateSummary)
    const timer = setInterval(refresh, 30_000)
    onScopeDispose(() => clearInterval(timer))
  })
  return { stop: () => scope.stop() }
}
const feature = createFeature(activeId)
feature.stop() // watcher 与 timer 一并释放
~~~

**递进追问：**

1. **detached effectScope 什么时候使用？**

   资源生命周期明确长于当前父作用域、由独立管理器负责时可用 effectScope(true)；拥有者必须保存句柄并在应用或资源结束时 stop。

2. **为什么 setTimeout 后创建的 watch 可能不会自动清理？**

   创建时已不在原组件 setup 的同步作用域收集阶段，watcher 可能成为孤儿；应同步创建并用条件控制，或保存停止函数显式清理。

**易错点：**

- scope.stop 只知道被收集的 effect，未注册的事件和资源不会自动神奇释放。
- detached scope 若没有明确 owner 和 stop 路径，会成为长期内存及网络泄漏。

**参考来源：**

- [Vue API：effectScope()](https://vuejs.org/api/reactivity-advanced.html#effectscope)
- [Vue RFC：Effect Scope](https://github.com/vuejs/rfcs/blob/master/active-rfcs/0041-reactivity-effect-scope.md)

校验日期：2026-07-20

## Q49：Vue 2 数组为什么要改写七个方法？

**短回答：**

Object.defineProperty 无法拦截数组索引和 length，Vue 2 通过原型增强 push、pop、shift、unshift、splice、sort、reverse 并观察新增元素。

**原理：**

Vue 2 基于 Object.defineProperty 劫持对象已有属性，但数组通过 arr[index] 直接赋值和 length 截断无法被统一拦截。常见变更又集中在 push、pop、shift、unshift、splice、sort、reverse 七个原型方法，于是 Observer 为被观察数组提供增强方法：先调用原生实现，识别 push/unshift/splice 插入的新元素并继续 observe，然后通过数组自己的 dep 通知订阅者。这样模板中常规增删排序可更新，但 arr[index] = value 与 arr.length = n 仍是检测盲区，需要 Vue.set、vm.$set 或 splice。它是 Vue 2 对语言能力限制的工程补偿，不表示原生数组方法本身具有响应式。数组被密封、跨原型环境等边界也需要额外验证。

**代码 / 场景：**

push 会经过增强方法并通知视图；直接写索引可能不更新。Vue.set 与 splice 都能把“替换索引 1”转换为可观察操作。Vue 3 的 Proxy 则可直接拦截索引写。

~~~js
// Vue 2
vm.items.push({ id: 3 })      // 可检测：增强 push 观察新项并 notify
vm.items[1] = { id: 9 }      // 检测限制：可能不触发更新
Vue.set(vm.items, 1, { id: 9 }) // 可检测
vm.items.splice(1, 1, { id: 8 }) // 可检测
~~~

**递进追问：**

1. **为什么 splice 还要 observe 插入项？**

   新对象若不递归建立 Observer，之后修改其字段不会触发 Vue 2 依赖；增强方法会提取新增片段并交给 observeArray。

2. **为什么 Vue 2 不能靠改写所有索引 setter？**

   初始化时可处理已有索引，但数组随时增加新索引和改变 length，defineProperty 无法拦截尚不存在属性的赋值；Proxy 才能覆盖对象级操作。

**易错点：**

- 七个方法是 Vue 2 实现细节和兼容方案，不能套到 Vue 3 Proxy 响应式。
- 直接设置 length 截断数组同样是 Vue 2 盲区，应使用 splice 表达删除。

**参考来源：**

- [Vue 2：Array Change Detection](https://v2.vuejs.org/v2/guide/list.html#Array-Change-Detection)
- [Vue 2 Source：array.js](https://github.com/vuejs/vue/blob/v2.7.16/src/core/observer/array.ts)

校验日期：2026-07-20

## Q50：从源码学习 Vue 时如何避免背实现细节？

**短回答：**

先画出读取、收集、写入、调度四步契约，再用最小实现验证边界，最后对照当前版本源码；面试中明确简化实现与官方实现差异。

**原理：**

先从一个可观察行为提出问题，例如“同一轮三次赋值为何只更新一次”，写最小示例和断言，再沿公开 API 进入对应包：reactivity 看依赖，runtime-core 看 scheduler/renderer，compiler-core 看生成信息。阅读时记录输入、不变量、状态转换和输出，而不是变量名；用断点或临时日志验证调用链，并锁定具体 tag/commit，因为 main 分支会演进。把结论分成三层：ECMAScript/DOM 规范约束、Vue 文档承诺的公开语义、当前版本为性能采用的内部策略。最后用反例测试边界，比较变更历史、RFC 和测试用例。面试回答先讲稳定机制与可观察结果，源码结构只作为证据；若版本未核实就明确说明。

**代码 / 场景：**

研究 nextTick 时，不从背 scheduler.ts 函数名开始，而是建立可重复实验，再逐步解释状态写入、job 去重、微任务 flush 和 DOM 可见时机。

~~~js
const count = ref(0)
let updated = 0
onUpdated(() => { updated += 1 })
count.value++
count.value++
count.value++
await nextTick()
console.assert(updated === 1)
~~~

随后在固定 Vue 版本对 scheduler 测试与源码打断点，若升级版本仍先跑该行为测试，而不是假设内部队列字段永远不变。

**递进追问：**

1. **源码和官方文档不一致时相信谁？**

   先确认版本和复现条件。公开 API 行为应以对应版本文档、测试与发布说明为契约；源码说明当前实现，发现真实缺陷再用最小复现提交 issue。

2. **如何判断一个源码细节值得记忆？**

   若它解释稳定的用户可见行为、性能边界或调试方法，就抽象为机制；纯变量名、容器替换和未经承诺的执行细节只需知道如何再次定位。

**易错点：**

- 直接阅读 main 分支却回答项目旧版本，容易把尚未发布实现当成现网事实。
- 只画调用图不写行为测试，无法判断自己理解的是必要语义还是偶然实现。

**参考来源：**

- [Vue：Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- [Vue Core：Contributing Guide](https://github.com/vuejs/core/blob/main/.github/contributing.md)

校验日期：2026-07-20
