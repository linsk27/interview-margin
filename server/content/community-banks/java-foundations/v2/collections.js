import { GUIDE, OFFICIAL, withSources } from './sources.js'

export const JAVA_FOUNDATION_V2_COLLECTIONS = {
  title: '二、Java 集合高频（11 题）',
  questions: [
    withSources({
      title: 'List、Set、Map 和 Queue 有什么区别？',
      summary: 'List 表达有位置的有序序列，Set 表达不重复元素，Map 表达键值映射，Queue 表达待处理次序；应先按业务语义选接口，再比较实现性能。',
      mechanism: '四类接口解决不同问题：\n- List 允许重复，并通过索引维护元素顺序。\n- Set 按实现使用的相等或排序规则限制重复。\n- Map 不继承 Collection，它维护唯一键到值的关联。\n- Queue 用 offer、poll、peek 等方法描述入队和出队，具体实现可以是 FIFO、优先队列或双端队列。\n接口本身不自动承诺线程安全、排序方式和复杂度。选型应依次确认是否允许重复、是否需要稳定顺序、是否按键查询、是否有优先级与并发访问。',
      example: '订单明细需要保序且允许同一商品多行，可用 List；用户权限去重可用 Set；通过用户编号查资料用 Map；异步任务按优先级消费可用 PriorityQueue。不能因为“Map 查找快”就把所有数据都塞进 Map，否则可能丢失重复和顺序语义。',
      followUps: [
        { question: 'Map 的 values 方法为什么返回 Collection 而不是 Set？', answer: '不同键可以映射到相等的值，因此值视图不具备唯一性，不能承诺 Set 语义。' },
        { question: 'Queue 是否一定先进先出？', answer: '不一定。普通队列常是 FIFO，但 PriorityQueue 按比较规则出队，Deque 还能在两端操作。' },
      ],
      pitfalls: ['把接口契约和某个常见实现的数据结构、顺序保证混为一谈。', '只比较时间复杂度，不先确认重复、顺序和并发等业务语义。'],
    }, GUIDE.collections01, OFFICIAL.collections),
    withSources({
      title: 'ArrayList 和 LinkedList 有什么区别？',
      summary: 'ArrayList 基于连续逻辑数组，随机访问快且缓存友好；LinkedList 是双向链表，已定位节点后的插入删除便捷，但按索引访问和内存局部性较差。',
      mechanism: 'ArrayList 的 get、set 通常是常数时间，尾部追加摊销常数时间，中间插入删除需要搬移后续元素。LinkedList 按索引先从头或尾遍历，随机访问为线性时间；每个节点还保存前后引用，增加对象与缓存成本。所谓“链表插入 O(1)”只在已经持有目标节点位置时成立，通过 get(index) 定位仍是 O(n)。现代业务大多读多、遍历多且数据规模可预测，ArrayList 通常是默认选择；队列或频繁两端操作则优先考虑 Deque 实现。',
      example: '读取数据库后形成结果列表并按下标访问，使用 ArrayList 更合适。若任务只需不断在队首队尾加入移除，ArrayDeque 往往比 LinkedList 更紧凑。不要为了偶尔在中间删除一项就默认使用 LinkedList，应以真实访问模式和基准验证。',
      followUps: [
        { question: 'LinkedList 中间删除一定比 ArrayList 快吗？', answer: '不一定。若只有索引，定位节点先花 O(n)；元素规模较小时，数组搬移也可能因连续内存而更快。' },
        { question: '为什么 ArrayList 不适合无锁并发写？', answer: '扩容、size 更新和数组写入不是一个不可分割动作，并发修改可能丢失数据或破坏可见性。' },
      ],
      pitfalls: ['机械背诵“链表增删快”，漏掉查找节点和对象分配成本。', '用 LinkedList 实现栈，却忽略 ArrayDeque 通常是更合适的专用选择。'],
    }, GUIDE.collections01, OFFICIAL.arrayList, OFFICIAL.linkedList),
    withSources({
      title: 'ArrayList 的底层结构和扩容过程是什么？',
      summary: 'ArrayList 用 Object 数组保存元素，并记录实际 size；容量不足时创建更大的数组并复制旧元素，所以追加是摊销常数而非每次绝对常数。',
      mechanism: '空列表通常延迟到第一次加入元素时分配内部数组。add 会先确认所需容量，空间不足时计算新容量、申请新数组并复制已有引用，然后写入新元素并增加 size。常见 OpenJDK 实现按约 1.5 倍增长，但这是实现细节，API 不承诺固定倍率。扩容单次成本是 O(n)，多次追加摊销后通常为 O(1)。ensureCapacity 可在已知规模时减少重复扩容，trimToSize 可缩小闲置容量，但频繁收缩会增加复制。',
      example: '导入十万行数据且数量已知时，可使用 `new ArrayList<>(100000)` 或提前调用 ensureCapacity，减少扩容和瞬时旧数组。仅预估“可能很大”就一次分配极大容量也会浪费堆内存，应基于上限、常见值和监控选择。',
      followUps: [
        { question: 'ArrayList 的 size 和 capacity 是同一个概念吗？', answer: '不是。size 是逻辑元素数量，capacity 是内部数组当前可容纳的数量，容量通常不对外直接暴露。' },
        { question: '调用 clear 会立刻把内部数组容量降为零吗？', answer: '通常只清除元素引用并把 size 归零，不承诺收缩容量；是否回收数组取决于对象生命周期或显式策略。' },
      ],
      pitfalls: ['把某个 JDK 的 1.5 倍扩容写成 Java API 永久不变的规范。', '只看到预分配减少复制，却不评估超大空数组带来的内存浪费。'],
    }, GUIDE.collections01, OFFICIAL.arrayList),
    withSources({
      title: 'HashMap 的底层数据结构是什么？',
      summary: 'JDK 8 常见实现以数组作为桶表，桶内用链表解决哈希冲突，冲突严重且容量达到条件时可转换为红黑树以限制最坏查询成本。',
      mechanism: 'key 的 hash 会经过扰动后映射到长度为 2 的幂的桶数组。桶为空时直接放节点；多个键落在同一桶形成链表，达到树化阈值且整张表容量足够时转为红黑树，元素减少后还可能退化回链表。HashMap 允许一个 null 键和多个 null 值，不维护业务插入顺序，也不保证线程安全。平均查找接近 O(1) 的前提是哈希分布合理、负载受控且 equals 成本可接受。',
      example: '使用自定义 OrderKey 作为键时，应实现稳定的 equals 与 hashCode，并在入 Map 后不要修改参与计算的字段。若大量键故意返回同一 hash，所有请求会集中到少数桶，即使树化也会增加比较和内存开销。',
      followUps: [
        { question: '发生哈希冲突是否代表两个键相等？', answer: '不代表。hashCode 相同只表示落桶候选相同，还要通过 equals 判断是否是同一个逻辑键。' },
        { question: '为什么链表达到阈值后不一定立即树化？', answer: '当表容量较小时优先扩容通常更能分散冲突，只有容量达到最小条件才转换成树。' },
      ],
      pitfalls: ['只回答“数组加链表加红黑树”，说不清它们分别何时出现。', '把平均 O(1) 当成无条件保证，忽略哈希质量与冲突成本。'],
    }, GUIDE.xiaolinCollections, OFFICIAL.hashMap),
    withSources({
      title: 'HashMap 的 put 和 get 流程是什么？',
      summary: 'put 先计算哈希与桶索引，再按空桶、同键、链表或树分支新增或覆盖；get 用相同定位规则缩小候选范围并通过 equals 确认键。',
      mechanism: 'put 的关键步骤是：必要时初始化或扩容桶表；定位桶；空桶直接写入，非空桶先检查首节点，再遍历链表或树查找相同 key；找到则替换 value，未找到则追加节点并在需要时触发树化；最后按结构变化更新 size 并判断扩容。get 同样先计算 hash 和索引，比较首节点后再进入链或树。HashMap 判断键相等通常先比 hash，再满足引用相同或 equals 为 true，以减少昂贵比较。',
      example: '实现缓存覆盖时，put 同一个逻辑 key 会返回或替换旧 value，而不是新增第二个键。若 key 重写了 equals 却没有重写 hashCode，put 和 get 可能定位到不同桶，表现为“明明相等却取不到”。',
      followUps: [
        { question: 'HashMap 如何处理 null 键？', answer: '实现会为 null 键使用约定哈希并放入对应桶，仍只允许一个逻辑 null 键。' },
        { question: 'put 相同键会让 size 增加吗？', answer: '通常不会。找到相等键时只替换关联值，只有插入新映射节点才增加逻辑 size。' },
      ],
      pitfalls: ['只描述索引公式，不提 equals 在覆盖和查询中的决定作用。', '认为 put 总是新增元素，忽略同键覆盖并不增加映射数量。'],
    }, GUIDE.xiaolinCollections, OFFICIAL.hashMap, OFFICIAL.object),
    withSources({
      title: 'HashMap 为什么使用 2 的幂容量和默认负载因子？',
      summary: '2 的幂容量让索引可用位与高效计算，并简化扩容后的桶拆分；负载因子在空间占用与冲突概率之间取平衡，达到阈值后扩容。',
      mechanism: '容量为 2 的幂时，可用 hash 与 n-1 做位与映射到桶，并让低位分布都参与索引。容量翻倍后，节点只需检查新增的那一位：为 0 留在原索引，为 1 移到原索引加旧容量。负载因子越低，桶更稀疏、冲突通常更少但占用空间更多；越高则节省数组空间，却增加冲突与遍历成本。常见默认值 0.75 是通用折中，不是每个业务的理论最优值。初始容量还应结合预估条数和负载因子计算。',
      example: '预计保存 1000 个条目时，直接传入 1000 仍可能因阈值不足而扩容；可以按预期数量除以负载因子并向上取合适容量。若键分布极差，仅增加容量不能替代修复 hashCode。',
      followUps: [
        { question: '容量是 2 的幂就一定分布均匀吗？', answer: '不一定。仍依赖 key 的哈希质量和扰动结果，低位模式差的哈希可能集中到少数桶。' },
        { question: '负载因子是否越小越好？', answer: '不是。过小会让桶数组大量空置并增加内存与缓存压力，需要结合规模和冲突特征权衡。' },
      ],
      pitfalls: ['只说位与比取模快，漏掉扩容拆桶和哈希分布意义。', '为了避免冲突盲目降低负载因子，造成明显空间浪费。'],
    }, GUIDE.collections02, OFFICIAL.hashMap),
    withSources({
      title: 'HashMap 什么时候扩容和树化？',
      summary: '新映射数量超过容量乘负载因子的阈值时通常扩容；单桶冲突链达到树化阈值且表容量足够时才树化，否则优先扩容分散节点。',
      mechanism: '扩容一般把桶表容量翻倍，并将旧桶节点按新增哈希位拆成原位置和原位置加旧容量两组，避免逐个重新做通用取模。树化用于限制恶意或极端冲突下的线性查找。OpenJDK 8 至 21 的常见常量是：桶内节点达到 8 个时尝试树化；表容量小于 64 时优先扩容；树节点减少到 6 个附近时可退化为链表。8、64、6 都属于具体实现细节，回答时应同时说明“冲突严重且表已足够大”这一机制，而不是把常量当成 Map 接口规范。',
      example: '构造多个 hashCode 相同的键，在较小 HashMap 中连续加入，可能先看到整表扩容而不是立刻红黑树化；表足够大后继续冲突才会树化。生产排障应先检查键设计和输入分布，而不是依赖树化兜底。',
      followUps: [
        { question: '扩容时每个节点都要重新计算完整索引吗？', answer: 'JDK 8 常见实现利用容量翻倍的新增位，把节点拆到两个位置，不需要普通意义上的完整重算。' },
        { question: '红黑树为什么不能完全消除哈希攻击成本？', answer: '树操作仍有比较、对象和内存成本，而且比较规则、树化条件及大量输入本身仍会消耗资源。' },
      ],
      pitfalls: ['把链长达到 8 说成唯一树化条件，漏掉最小表容量。', '把具体阈值当作 Map 接口规范，忽略它属于实现细节。'],
    }, GUIDE.xiaolinCollections, OFFICIAL.hashMap),
    withSources({
      title: 'HashMap 为什么线程不安全？',
      summary: 'HashMap 没有为并发读写建立原子性与可见性保证，多个线程同时 put、resize 或遍历可能丢更新、读到不一致状态或触发迭代异常。',
      mechanism: '一次 put 涉及定位桶、链接节点、更新 size 和可能扩容等多个步骤，没有共同锁或适合并发协议。两个线程可基于同一旧状态写入而覆盖彼此；扩容期间表引用和桶迁移也不是对并发调用者承诺的安全快照。只有对象构建完成后安全发布且后续完全只读，普通 Map 才可被并发读取；只用 volatile 保存 Map 引用不能让其内部复合写入变安全。需要并发更新时应使用 ConcurrentHashMap 或外部同步。',
      example: '把 HashMap 作为单例缓存并在请求线程中边查边 put，即使压测偶尔正确也可能丢数据。改用 ConcurrentHashMap 后，仍不能用 get 后再 put 实现原子计数，应使用 compute、merge 或更合适的原子结构。',
      followUps: [
        { question: 'Collections.synchronizedMap 能解决什么？', answer: '它用共同互斥包装单次方法调用，但遍历和多步复合操作仍需按其约定在同一锁上同步。' },
        { question: '只读 HashMap 能安全跨线程共享吗？', answer: '构建后不再修改并通过 final、锁、volatile 等方式安全发布时，可以进行并发只读访问。' },
      ],
      pitfalls: ['用“JDK 8 已修复环形链表”推导 HashMap 变成线程安全。', '换成线程安全容器后继续用先读再写的非原子业务组合。'],
    }, GUIDE.collections02, OFFICIAL.hashMap, OFFICIAL.jlsThreads),
    withSources({
      title: 'HashSet 如何实现去重？',
      summary: 'HashSet 常以 HashMap 的键保存元素，先用 hashCode 定位候选桶，再用 equals 判断逻辑相等；因此元素必须遵守相等与哈希契约。',
      mechanism: '加入元素时，HashSet 把元素作为底层映射的 key，与一个占位值关联。若候选桶里已有 hash 相同且 equals 为 true 的键，本次 add 返回 false；否则新增。由此可知去重不是只看 hashCode，哈希冲突仍允许多个不相等元素共存。HashSet 不保证插入顺序，允许一个 null，且不是线程安全容器。作为集合元素期间修改参与 equals 或 hashCode 的字段，会让 contains 和 remove 无法按预期定位。',
      example: '邮箱地址值对象若按标准化邮箱重写 equals 与 hashCode，HashSet 可过滤重复地址。若只重写 equals，不重写 hashCode，相等对象可能进入不同桶而重复出现；若加入后修改邮箱字段，也可能再也无法正常删除。',
      followUps: [
        { question: '两个元素 hashCode 相同，HashSet 会只保留一个吗？', answer: '不一定。还要继续用 equals 判断；哈希相同但不相等的元素可以同时保留在冲突桶中。' },
        { question: '为什么 HashSet 不适合保存可变业务键？', answer: '键的哈希或相等字段变化后，当前桶位置与新计算结果不一致，查询和删除会失效。' },
      ],
      pitfalls: ['把去重机制简化成只比较 hashCode，忽略冲突后的 equals。', '加入集合后修改参与相等判断的字段，破坏容器内部定位。'],
    }, GUIDE.xiaolinCollections, OFFICIAL.hashSet, OFFICIAL.object),
    withSources({
      title: 'ConcurrentHashMap 如何保证并发安全，JDK 7 和 JDK 8 有何不同？',
      summary: 'JDK 7 主要通过 Segment 分段锁降低竞争；JDK 8 改为桶数组加 CAS、桶级 synchronized 和树结构，读取多为无锁，并支持线程协助扩容。',
      mechanism: 'JDK 7 的 Segment 本身近似一个可重入锁保护的子 Map，并发度受分段数量影响。JDK 8 取消固定 Segment：空桶写入先 CAS 安装节点，冲突桶修改同步桶头，树桶使用相应锁协议；table 与节点字段配合可见性规则，扩容时用转发节点标识并允许多个线程协助迁移。计数采用分散方式降低热点。它保证单次容器操作的线程安全，不自动让多个方法组成的业务步骤原子。',
      example: '并发累计标签次数时，用 map.merge(tag, 1, Integer::sum) 比 get 后 put 更可靠。若业务要求“仅当账户状态为启用时同时修改两个键”，仍需更高层锁、状态对象或持久层事务，不能仅靠 ConcurrentHashMap。',
      followUps: [
        { question: 'ConcurrentHashMap 为什么不允许 null 键和值？', answer: '并发读取返回 null 必须明确表示没有映射，否则无法区分真实 null 与并发删除后的不存在。' },
        { question: 'size 能否作为严格的并发控制条件？', answer: '不适合。并发变化期间统计用于监控较合理，不能据此决定只执行一次的关键业务分支。' },
      ],
      pitfalls: ['把 JDK 8 ConcurrentHashMap 简化成“仍然使用分段锁”。', '认为容器线程安全就能保证跨多个键或多个调用的业务事务。'],
    }, GUIDE.xiaolinCollections, OFFICIAL.concurrentHashMap, OFFICIAL.jlsThreads),
    withSources({
      title: '什么是 fail-fast，遍历集合时怎样安全删除元素？',
      summary: 'fail-fast 是迭代器发现集合被非预期结构修改后尽力快速抛出异常的诊断机制，不是线程安全保证；单线程删除当前项应使用 Iterator.remove。',
      mechanism: 'ArrayList 等迭代器会记录创建时的结构修改计数，next 或 remove 时检查实际计数。遍历期间若绕过迭代器直接 add、remove，计数不一致后通常抛出 ConcurrentModificationException。Iterator.remove 会在删除当前元素后同步内部期望值，因此是受支持路径；removeIf 适合表达批量过滤。fail-fast 是 best effort，不能依赖异常必然发生来做并发控制。并发遍历与修改应选择快照、外部锁或适合的并发集合，并理解其弱一致性语义。',
      example: '删除所有失效会话可写 sessions.removeIf(Session::expired)，或显式 Iterator 遍历后调用 iterator.remove。增强 for 中直接 sessions.remove(item) 可能抛异常。CopyOnWriteArrayList 适合读多写少的快照遍历，但每次写会复制数组，不适合高频更新。',
      followUps: [
        { question: '修改元素内部字段会触发 fail-fast 吗？', answer: '通常不会，结构修改计数关注容器增删等结构变化；但元素可变仍可能破坏排序或哈希契约。' },
        { question: 'ConcurrentHashMap 的迭代器会抛同样异常吗？', answer: '通常不会因并发更新抛出 ConcurrentModificationException。它不会锁住整张表，而是在遍历节点时读取可达状态，因此结果可能混合多个时刻：能看到部分迭代开始后的更新，也可能看不到另一些更新，但不能据此得到事务级快照。若导出、对账或权限判断要求稳定集合，应在业务边界使用版本、锁或受控复制，并校验遍历期间是否发生变化。' },
      ],
      pitfalls: ['把 ConcurrentModificationException 当作可靠的并发冲突检测器。', '在增强 for 中直接调用集合自身 remove，期待每次都能安全工作。'],
    }, GUIDE.collections01, OFFICIAL.iterator, OFFICIAL.arrayList),
  ],
}
