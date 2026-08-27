import { GUIDE, OFFICIAL, withSources } from './sources.js'

export const JAVA_FOUNDATION_V2_MODERN = {
  title: '五、现代 Java 与高频补全（10 题）',
  questions: [
    withSources({
      title: 'Lambda 表达式和函数式接口是什么？',
      summary: 'Lambda 是对“可作为值传递的一段行为”的简洁表达；它的目标类型必须是函数式接口，即只有一个抽象方法的接口，default、static 和与 Object 等价的方法不计入这个数量。',
      mechanism: '理解 Lambda 要抓住“目标类型”和“捕获变量”：\n- 编译器从赋值、参数或返回值位置推断目标函数式接口，再把参数与返回值对齐到它的单一抽象方法。\n- `@FunctionalInterface` 不是必需条件，但能让编译器校验接口以后仍只有一个抽象方法。\n- Lambda 可以捕获外层局部变量，但该变量必须是 final 或事实上不再赋值的 effectively final；成员字段不受这条局部变量规则限制。\n- Lambda 没有独立的 `this`，其中的 `this` 指向外围实例；这与匿名内部类不同。\n- 方法引用只是满足目标类型时对既有方法的更紧凑写法，不会改变调用语义。',
      example: '把订单筛选规则声明为 `Predicate<Order> paid = order -> order.isPaid()`，再传给通用过滤方法，调用方无需创建只使用一次的实现类。若 Lambda 捕获局部阈值 `limit`，后续不能再给 limit 赋值；需要可变计数时应重新设计状态归属，而不是用单元素数组绕过限制。',
      followUps: [
        { question: '函数式接口可以有多个方法吗？', answer: '可以有多个 default、static 或 private 方法，但只能有一个需要实现的抽象方法；否则不能作为 Lambda 的目标类型。' },
        { question: 'Lambda 和匿名内部类的 this 有何区别？', answer: 'Lambda 的 this 继承外围词法作用域，匿名内部类的 this 指向新建的匿名类实例。' },
      ],
      pitfalls: ['认为 Lambda 天然异步；它只是行为表示，是否换线程取决于调用它的 API。', '在 Lambda 中堆叠大量分支与副作用，使简洁语法掩盖复杂业务流程。'],
    }, GUIDE.java8Features, OFFICIAL.functionPackage, OFFICIAL.jlsExpressions),
    withSources({
      title: 'Stream 的执行模型是什么，什么时候不适合使用？',
      summary: 'Stream 是一次性的声明式数据处理管道：中间操作通常惰性组装，终止操作才触发遍历；它强调无干扰、少副作用，不等同于集合，也不会默认并行。',
      mechanism: '一条 Stream 管道由数据源、中间操作和终止操作组成：\n- `map`、`filter`、`sorted` 等中间操作返回新流，通常在终止操作出现前不读取全部数据。\n- `collect`、`reduce`、`forEach`、`count` 等终止操作消费流；同一流终止后不能再次复用。\n- 无状态操作可以逐个元素融合执行；`sorted`、`distinct` 等有状态操作可能缓存较多数据。\n- 短路操作如 `findFirst`、`anyMatch` 可以提前结束，但是否有序影响可并行程度。\n- parallelStream 使用公共 ForkJoinPool，只有数据量、任务粒度和关联规约都合适时才可能获益。',
      example: '统计有效订单总额可写成 `orders.stream().filter(Order::isValid).map(Order::amount).reduce(BigDecimal.ZERO, BigDecimal::add)`。如果处理过程需要逐步修改多份共享状态、频繁阻塞远程接口，显式循环或受控线程池通常更清晰，也更容易限流与排障。',
      followUps: [
        { question: 'map 和 flatMap 的区别是什么？', answer: 'map 把一个元素映射成一个结果；flatMap 把一个元素映射成流，再把多层流摊平成单层。' },
        { question: '并行流一定更快吗？', answer: '不一定。拆分、合并、线程竞争和公共线程池干扰都可能让它更慢，必须用真实数据和负载验证。' },
      ],
      pitfalls: ['在 peek、map 或 forEach 中修改外部共享集合，破坏无干扰要求并引入并发错误。', '把数据库查询、网络调用直接放进并行流，失去线程池隔离、超时和背压控制。'],
    }, GUIDE.java8Features, OFFICIAL.streamPackage),
    withSources({
      title: 'Optional 应该怎样使用，为什么不建议到处使用？',
      summary: 'Optional 用显式的“可能没有结果”替代部分裸 null 返回值，适合方法返回边界；它不是通用字段容器，也不应靠 get 或层层包装掩盖数据模型问题。',
      mechanism: 'Optional 的价值来自调用协议而非消灭所有 null：\n- `of` 要求值非空，`ofNullable` 接受 null，`empty` 明确表示没有值。\n- `map` 适合普通映射，映射函数本身返回 Optional 时用 `flatMap` 避免嵌套。\n- `orElse` 会先计算备用值，即使当前有值；备用计算昂贵或有副作用时用惰性的 `orElseGet`。\n- `orElseThrow` 适合把“缺失”转换为清晰异常，`ifPresentOrElse` 适合显式处理两条分支。\n- 参数、DTO/实体字段和集合元素通常仍应通过约束、空集合或领域类型表达，而非全部改成 Optional。',
      example: '仓储接口可返回 `Optional<User>`，服务层用 `orElseThrow(() -> new UserNotFoundException(id))` 转成领域错误。不要写 `optional.isPresent()` 后紧接 `get()` 模拟 null 判断；可以用 map、flatMap 或显式分支直接表达后续动作。',
      followUps: [
        { question: 'orElse 和 orElseGet 有什么关键差别？', answer: 'orElse 的参数会立即求值，orElseGet 的 Supplier 只在 Optional 为空时调用。' },
        { question: '为什么返回 Optional<List<T>> 往往没有必要？', answer: '集合本身可以用空集合表达“没有元素”，再套 Optional 通常增加一种无业务价值的缺失状态。' },
      ],
      pitfalls: ['直接调用 get 而不证明值存在，把空值错误推迟为 NoSuchElementException。', '把 Optional 用作所有实体字段和方法参数，增加序列化、框架兼容与调用复杂度。'],
    }, GUIDE.java8Features, OFFICIAL.optional),
    withSources({
      title: 'Java 注解、元注解和保留策略分别是什么？',
      summary: '注解是附着在程序元素上的结构化元数据；元注解约束注解自身的使用方式，其中 Retention 决定信息保留到源码、class 文件还是运行时。',
      mechanism: '常见元注解需要成组理解：\n- `@Target` 限定可标注的位置，如类型、方法、字段、参数或 TYPE_USE。\n- `@Retention(SOURCE)` 只在源码阶段存在，CLASS 会写入 class 但运行时反射不可见，RUNTIME 才能被反射读取。\n- `@Documented` 控制是否进入生成文档，`@Inherited` 只影响类级注解沿父类继承，不会自动作用于接口或方法。\n- `@Repeatable` 允许同一位置重复出现同类注解，底层需要容器注解。\n注解本身通常只是元数据，真正行为来自编译器、注解处理器、字节码工具或运行时框架。',
      example: '运行时路由框架若要通过反射读取自定义 `@Route`，必须把保留策略设为 RUNTIME，并把 Target 设为 METHOD 或 TYPE。编译期生成代码的注解可以使用 SOURCE 或 CLASS，再由 annotation processor 处理，不必为运行时反射付出成本。',
      followUps: [
        { question: '@Inherited 能让接口上的注解被实现类继承吗？', answer: '不能。它只影响类上的注解沿超类关系查询，不适用于接口实现、字段或方法。' },
        { question: 'RUNTIME 注解会自动执行逻辑吗？', answer: '不会。RetentionPolicy.RUNTIME 只保证注解元数据保留到运行期并可被反射读取，它不会注册回调或自动调用任何业务方法；必须由框架在扫描、创建代理或处理请求等明确生命周期中读取注解并执行约定逻辑。编译期 annotation processor 则在另一阶段消费 SOURCE/CLASS 元数据。没有任何消费者时，RUNTIME 注解只是惰性元数据，可用 isAnnotationPresent 或框架启动日志验证它是否被真正发现和处理。' },
      ],
      pitfalls: ['忘记设置 RUNTIME，却在生产中用反射读取，结果始终拿不到注解。', '把注解当成业务能力本身，忽略真正执行逻辑的处理器、代理与生命周期。'],
    }, GUIDE.basics03, OFFICIAL.annotation, OFFICIAL.retention),
    withSources({
      title: 'Queue、Deque 和 BlockingQueue 有什么区别？',
      summary: 'Queue 抽象队列访问，Deque 支持两端插入删除并可实现栈，BlockingQueue 则为生产者—消费者增加阻塞等待和容量协作语义。',
      mechanism: '三类接口的关键区别在操作端与失败策略：\n- Queue 通常按 FIFO 使用，`add/remove/element` 失败时抛异常，`offer/poll/peek` 用返回值表示失败或空。\n- Deque 增加 first/last 两端操作；作为栈时优先用 `push/pop/peek`，不推荐遗留 Stack。\n- BlockingQueue 提供 `put/take` 的可中断阻塞操作，以及带超时的 `offer/poll`，适合在线程间传递任务。\n- 有界阻塞队列不仅存数据，还提供背压；无界队列可能把处理能力不足转化成内存压力。\n- BlockingQueue 不接受 null，因为 null 常被 poll 用来表示当前无元素。',
      example: '日志生产者可向 `ArrayBlockingQueue` 执行带超时 offer，消费者用 take 获取；队列满时记录丢弃、降级或回压指标。需要头尾都操作的滑动窗口可使用 ArrayDeque，但它不是线程安全容器。',
      followUps: [
        { question: 'ArrayDeque 和 LinkedList 作为队列通常怎样选？', answer: '一般优先 ArrayDeque，连续数组局部性更好且不接受 null；只有确实需要 LinkedList 的其他链表特性时再选。' },
        { question: 'BlockingQueue 能代替线程池吗？', answer: '不能。它只协调任务传递，线程创建、执行、异常、关闭与拒绝策略仍需执行器或专门组件管理。' },
      ],
      pitfalls: ['使用无界队列却没有监控积压，让突发流量最终表现为 OOM。', '混用抛异常与返回特殊值的两组 Queue API，漏掉空队列或队满分支。'],
    }, GUIDE.collections01, OFFICIAL.queue, OFFICIAL.deque, OFFICIAL.blockingQueue),
    withSources({
      title: 'LinkedHashMap 和 TreeMap 的适用场景有什么不同？',
      summary: 'LinkedHashMap 在哈希查找基础上维护插入序或访问序，TreeMap 按自然顺序或 Comparator 维护有序键；前者适合稳定遍历与简单 LRU，后者适合排序和范围查询。',
      mechanism: '选择时同时比较顺序语义与复杂度：\n- LinkedHashMap 通过双向链表串联条目，常规查找平均仍为 O(1)，可配置 accessOrder 并重写 removeEldestEntry 做简单容量淘汰。\n- TreeMap 基于红黑树，查找、插入、删除通常为 O(log n)，提供 floorKey、ceilingKey、subMap 等导航与范围视图。\n- TreeMap 的比较结果决定键是否相同：Comparator 返回 0 的两个键会占同一映射位置，即使 equals 为 false。\n- 两者默认都不是线程安全；视图通常与原映射联动，不是独立副本。',
      example: '接口需要按用户提交顺序输出字段时使用 LinkedHashMap；做价格区间索引并查找不高于目标价的最近档位时使用 TreeMap.floorEntry。简单本地 LRU 可借助访问序 LinkedHashMap，但并发缓存、过期和统计应交给专门缓存库。',
      followUps: [
        { question: 'HashMap 能保证某种遍历顺序吗？', answer: '不能。HashMap 迭代的是当前内部 table 的桶以及桶内链表或树节点，表观顺序会受到 key 哈希、容量、扩容、树化和具体 JDK 实现影响；某组数据多次运行看起来稳定，也不构成 API 契约，插入或删除一个键就可能改变结果。需要插入序或访问序应明确使用 LinkedHashMap，需要按键比较规则排序则使用 TreeMap；测试和序列化输出不能依赖偶然的 HashMap 顺序。' },
        { question: 'TreeMap 的 Comparator 为什么要与 equals 一致？', answer: '若比较为 0 但 equals 为 false，Map 会按同一个键处理，容易产生违反调用方直觉的覆盖和查询结果。' },
      ],
      pitfalls: ['用 LinkedHashMap 手写生产级缓存，却遗漏并发、过期、权重与命中率治理。', 'Comparator 只比较一个非唯一字段，导致多个业务键被 TreeMap 当作同一键。'],
    }, GUIDE.collections01, OFFICIAL.linkedHashMap, OFFICIAL.treeMap),
    withSources({
      title: '进阶：CopyOnWriteArrayList 为什么适合读多写少？',
      summary: '这是并发容器进阶题。CopyOnWriteArrayList 写入时复制底层数组并发布新快照，读取无需写锁且迭代稳定，适合规模有限、读取远多于修改的场景。',
      mechanism: '它的成本和语义来自写时复制：\n- get 等读取直接访问当前数组快照，不需要为普通读取获取写锁。\n- add、set、remove 会复制数组再修改，时间与额外内存开销随数组规模增长。\n- 迭代器持有创建时的快照，不会抛 ConcurrentModificationException，也看不到迭代开始后的新增删除。\n- 元素对象本身并不会被深拷贝；若元素可变，仍需处理对象内部的并发安全。\n- 复合操作不能自动由多个单独方法组成原子事务，应使用专门方法或外部同步。',
      example: '事件总线保存几十个、很少变化的监听器时，分发线程可遍历稳定快照，不必与偶发注册争用。若订单明细每秒更新成千上万次，写时复制会产生大量数组和 GC 压力，应换成更匹配的并发结构。',
      followUps: [
        { question: '它的迭代器为什么不支持 remove？', answer: '迭代器面对的是不可变历史快照，直接删除无法清晰映射到当前底层数组，因此该操作不受支持。' },
        { question: '读无锁是否代表所有操作都无锁？', answer: '不是。修改操作需要序列化并复制数组，优势只集中在普通读取和快照遍历。' },
      ],
      pitfalls: ['只看到“线程安全”就用于高频写入的大列表，造成复制和内存分配放大。', '误以为快照会深拷贝元素，对可变元素的并发修改仍可能产生竞态。'],
    }, GUIDE.concurrent02, OFFICIAL.copyOnWriteArrayList),
    withSources({
      title: '进阶：AQS 的核心思想是什么？',
      summary: '这是并发原理进阶题。AQS 让子类定义同步状态的获取与释放规则，由框架统一处理等待队列、阻塞唤醒以及独占或共享传播。',
      mechanism: '回答 AQS 可以沿“state—队列—模板方法”展开：\n- 一个 volatile int state 表示同步状态，子类通过 getState、setState 和 CAS 修改它。\n- 获取失败的线程进入 FIFO 风格的 CLH 等待队列，后继线程在合适条件下被挂起和唤醒。\n- 独占模式同一时刻只允许一个持有者，共享模式可让多个线程同时成功并向后传播。\n- 子类实现 tryAcquire、tryRelease 或共享版本，AQS 的 final 模板方法处理排队、取消与中断。\n- ConditionObject 使用独立条件队列；await 先释放同步状态，signal 只把节点转移到同步队列，重新竞争成功后才能继续。',
      example: 'ReentrantLock、Semaphore、CountDownLatch 都可借助 AQS，但 state 语义不同：锁可表示重入次数，信号量表示许可数，倒计时器表示剩余计数。业务代码通常使用这些成熟同步器，而不是直接继承 AQS。',
      followUps: [
        { question: 'AQS 队列是否严格公平？', answer: '不保证。具体同步器的公平策略由获取逻辑决定，非公平实现允许新线程在排队线程前抢占。' },
        { question: 'signal 后等待线程会立刻执行吗？', answer: '不会。它先从条件队列转移到同步队列，仍需重新获取锁后才能从 await 返回。' },
      ],
      pitfalls: ['把 AQS 简化成一个普通阻塞队列，忽略 state 与获取/释放模板才是同步语义核心。', '在业务代码自行继承 AQS，却没有完整处理重入、取消、中断和序列化契约。'],
    }, GUIDE.concurrent02, OFFICIAL.aqs),
    withSources({
      title: 'CompletableFuture 怎样组织异步任务和异常处理？',
      summary: 'CompletableFuture 同时表示异步结果和可组合阶段，可串行转换、并行汇合与统一恢复；正确使用的重点是线程池、依赖关系、异常和超时，而不只是把任务丢到后台。',
      mechanism: '常用组合按依赖关系选择：\n- `thenApply` 转换结果，`thenCompose` 串联异步步骤，`thenCombine` 或 `allOf` 汇合独立任务。\n- `exceptionally` 提供失败替代值，`handle` 统一处理成败，`whenComplete` 观察结果但不自动吞掉异常。\n- 非 Async 阶段可能由前序完成线程执行；Async 默认使用公共池，阻塞任务应传入隔离的 Executor。\n- 超时方法只约束 Future 的等待结果，不保证底层 I/O 已被取消。',
      example: '查询用户和权限互不依赖，可分别 supplyAsync 到隔离线程池，再用 thenCombine 组装视图；依赖用户 ID 再查订单时用 thenCompose。出口通过 orTimeout 限制等待，并在 handle 中区分超时、业务失败和成功，避免一律返回空对象。',
      followUps: [
        { question: 'thenApply 和 thenCompose 的区别是什么？', answer: 'thenApply 做同步映射；thenCompose 摊平返回 CompletionStage 的异步映射，类似 Stream 的 flatMap。' },
        { question: 'join 和 get 有何差别？', answer: '两者都会等待；get 抛受检的 ExecutionException/InterruptedException，join 用非受检 CompletionException 包装失败。' },
      ],
      pitfalls: ['所有任务都使用公共 ForkJoinPool，阻塞 I/O 抢占其他并行任务并且难以隔离容量。', '只给最外层 Future 加超时，却误认为远程请求和占用资源会自动停止。'],
    }, GUIDE.concurrent03, OFFICIAL.completableFuture),
    withSources({
      title: '进阶：JVM 解释执行和 JIT 编译是怎样配合的？',
      summary: '这是 JVM 执行引擎进阶题。HotSpot 通常先解释执行字节码，再依据运行时画像把热点代码编译为优化机器码；假设失效时还可能去优化并回退。',
      mechanism: '从启动到峰值性能可以分层理解：\n- class 字节码由 JVM 执行，解释器启动快并收集调用次数、分支和类型等运行时信息。\n- 热点代码达到阈值后进入即时编译，分层编译在较快的 C1 与更激进的 C2 优化之间平衡启动和吞吐。\n- JIT 可做内联、逃逸分析、标量替换和锁消除等优化；这些依赖真实调用分布，而非只看源码。\n- 基于“某调用点只有一种实现”等假设生成的代码，会保留守卫；类加载或类型分布改变时可能触发去优化。\n- 冷代码未必值得编译，短生命周期应用也可能还未充分预热就结束。',
      example: '基准测试若只运行一次，测到的主要是类加载、解释执行和编译预热，不代表稳态吞吐。应使用 JMH 处理预热、迭代和防止无用代码消除；线上则结合 JFR、编译日志和延迟分位数判断是否真是 JIT 问题。',
      followUps: [
        { question: '为什么 Java 不能简单归类为解释型语言？', answer: '源码先编译为字节码，运行时既可解释，也会把热点代码即时编译为本机机器码。' },
        { question: 'JIT 编译后的机器码会永久保持不变吗？', answer: '不一定。依赖的类型或分支假设失效时，JVM 可以使其失效并回退，再按新画像重新优化。' },
      ],
      pitfalls: ['把 JIT 描述成启动时一次性编译全部代码，忽略热点探测、分层编译和去优化。', '用手写微基准直接比较代码快慢，未预热也未防止常量折叠与无用代码消除。'],
    }, GUIDE.xiaolinJvm, OFFICIAL.hotspotPerformance, OFFICIAL.jvmsRuntime),
  ],
}
