export const SUPPLEMENTAL_360_AI_MARKDOWN = `# 操作系统进阶

## Q78：进程状态、PCB 与上下文切换如何协同？
**短回答：**

进程状态描述“现在能不能运行以及在等什么”，PCB 保存“内核管理这个执行实体所需的信息”，上下文切换则完成“暂停一个执行实体并让另一个继续”。以常见模型看，进程会在运行、就绪、阻塞、停止和终止等状态间迁移；但这些名称不是所有系统都完全一致，Linux 还区分可中断睡眠、不可中断睡眠、跟踪停止和僵尸等状态。时钟中断、主动阻塞或更高优先级任务到来时，调度器可能保存当前任务的寄存器上下文，更新调度状态，再恢复下一个任务。状态迁移不等于每次都发生进程切换，进程切换也不等于把整个 PCB 复制一遍。

**原理：**

PCB 是概念名，在 Linux 中相关信息分散在 task_struct 及其引用的内存、文件、凭据和调度结构中。它通常包含标识、调度信息、保存的 CPU 上下文、地址空间引用、打开文件、信号状态和统计信息。就绪任务已经具备运行条件，只差 CPU；阻塞任务在等待 I/O、锁、定时器或事件，等待条件满足后只是回到可运行队列，并不保证立刻执行。调度器依据策略从可运行任务中选择下一个任务，底层切换代码保存和恢复程序计数器、栈指针及体系结构要求的寄存器；浮点或向量状态可能按体系结构策略延迟或按需处理。

同一进程的线程切换通常共享地址空间和文件表，但仍需切换寄存器、栈和线程局部状态；不同进程切换还可能更换页表根及相关内存上下文。不能简单断言“换进程就清空 TLB”，因为现代处理器可用 ASID/PCID 标记地址空间，内核也会避免不必要的失效。上下文切换有直接成本，也有缓存、TLB 和分支预测器热度下降等间接成本。僵尸进程已经不再执行，只保留退出状态和少量记账信息等待父进程回收，因此不能把僵尸等同于阻塞。

**代码 / 场景：**

排查“服务 CPU 不高但延迟抖动”时，不要只看进程总 CPU。先同时记录可运行队列长度、非自愿上下文切换、I/O 等待和线程状态，再把现象对齐到时间线：

~~~text
请求线程运行
  -> 读取磁盘：进入等待队列
  -> I/O 完成：被唤醒并进入可运行队列
  -> 调度器选中：恢复寄存器与内存上下文
  -> 继续处理请求
~~~

Linux 上可用 \`ps -eo pid,stat,ni,pri,psr,wchan:24,comm\` 看状态与等待点，用 \`/proc/<pid>/stat\` 或 \`/proc/<pid>/status\` 读取调度和切换计数，再用 \`perf sched\` 或跟踪点观察唤醒到真正上 CPU 的间隔。若线程已被唤醒却长期排队，重点看 CPU 饱和、优先级和绑核；若长期处于不可中断睡眠，则应继续追查具体 I/O 或内核等待点，而不是盲目增加线程。

**递进追问：**

1. **状态迁移和上下文切换为什么不是一一对应？**

   运行任务可能被中断后仍继续运行，此时只经历内核态处理而未换到另一任务；阻塞任务被唤醒时只变为可运行，是否立即执行取决于调度。反过来，两个可运行线程之间可以发生切换，而它们在抽象状态图上都只表现为“运行/就绪”变化。
2. **线程切换一定比进程切换便宜吗？**

   通常同地址空间线程避免了部分内存上下文切换，成本更低，但不是绝对结论。真正成本取决于工作集、缓存局部性、体系结构、调度位置和共享数据竞争；线程在不同核之间迁移也可能产生明显缓存一致性开销。
3. **PCB 越大，上下文切换就一定越慢吗？**

   不一定。切换不会逐字节复制整个 PCB，只保存和恢复当前路径需要的机器状态并更新少量调度结构。更应观察实际切换频率、缓存失效和运行队列等待，而不是用 PCB 结构体大小直接推导性能。

**易错点：**

- 不要把“就绪”说成正在运行；它只表示可以运行，CPU 仍可能由其他任务占用。
- 不要说上下文切换必然保存所有硬件状态、刷新全部缓存或清空全部 TLB，这些行为受体系结构和内核实现影响。
- 不要把用户态到内核态的模式切换都叫进程切换；一次系统调用可以返回原线程继续执行。
- 不要用单一五状态图解释所有系统实现；先说明抽象模型，再补充目标系统的实际状态。

**参考来源：**

- [Linux proc_pid_stat(5)：进程状态与统计字段](https://man7.org/linux/man-pages/man5/proc_pid_stat.5.html)
- [Linux 内核文档：CFS 调度器设计](https://www.kernel.org/doc/html/latest/scheduler/sched-design-CFS.html)
- [Linux 内核文档：体系结构相关的调度支持](https://www.kernel.org/doc/html/latest/scheduler/sched-arch.html)

## Q79：IPC、线程同步与 CPU 调度分别解决什么问题？
**短回答：**

IPC 解决进程或隔离组件之间“怎样交换数据与通知事件”，线程同步解决并发执行者之间“怎样维护顺序、互斥和可见性”，CPU 调度解决多个可运行任务之间“谁在何时占用处理器”。三者会在同一系统里配合，但不能互相替代：共享内存提供传输载体，不自动保证并发正确；互斥锁保护临界区，不负责给线程分配 CPU；调度器让线程运行，也不会替应用消除数据竞争。回答时应先按问题域分类，再讨论管道、套接字、共享内存、互斥锁、条件变量、信号量和调度策略的取舍。

**原理：**

IPC 的边界通常是不同地址空间。管道和消息队列以复制或内核缓冲换取清晰的消息边界；本地或网络套接字适合流式、跨主机或语言无关通信；共享内存减少大块数据复制，但参与者必须另行定义所有权、发布时序和一致性协议；信号适合有限的异步通知，不适合承载复杂业务数据。说“共享内存必须加锁”过于绝对：只读快照、单生产者单消费者环形队列、正确使用原子操作的无锁结构可以不用互斥锁，但只要多个执行者并发修改普通数据，就必须有能建立 happens-before 关系的同步方案。

线程同步发生在共享状态周围。互斥锁保证同一时刻只有一个持有者进入临界区；条件变量让线程在谓词不成立时休眠，并要求在锁保护下循环检查谓词，以处理虚假唤醒和条件变化；信号量用计数表达可用资源或完成事件，不应一律等同于锁；原子操作适合小而明确的状态转换，却不能自动维护多个字段组成的不变量。CPU 调度只考虑可运行实体，按普通分时、实时优先级、期限或平台策略分配 CPU。锁竞争会使线程阻塞，唤醒后进入可运行队列，再由调度器决定何时真正执行，这正是三者的交汇点。

**代码 / 场景：**

假设视频处理服务由多个进程共享一块帧缓冲区。控制消息通过 Unix domain socket 传递，像素数据放共享内存，槽位所有权用信号量和原子索引维护，进程内工作线程再用条件变量等待任务：

~~~text
生产进程：等待空槽 -> 写入完整帧 -> 发布写索引 -> 通知“有数据”
消费进程：等待有数据 -> 取得槽位 -> 处理帧 -> 归还空槽
调度器：只在生产者或消费者处于可运行状态时为其分配 CPU
~~~

设计时给每个槽位定义 FREE、WRITING、READY、READING 状态，并规定只有完成写入后才能以 release 语义发布 READY，消费者用 acquire 语义观察它。进程异常退出还要有超时、代次号或重建策略，否则普通 POSIX 信号量并不会自动修复业务不变量。压测时分别记录吞吐、阻塞时间、运行队列等待和上下文切换；如果共享内存很快但线程仍排队，瓶颈可能是调度或锁竞争，而不是 IPC 带宽。

**递进追问：**

1. **条件变量为什么必须配合谓词循环，而不是收到通知就直接继续？**

   通知只表示“条件可能变化”，不是把条件所有权交给某个线程。线程醒来前其他线程可能再次改变状态，系统也允许虚假唤醒，因此应在互斥锁保护下使用 \`while (!predicate) wait()\`，醒来后重新验证共享状态。
2. **信号量、互斥锁和消息队列怎样选择？**

   保护单一临界区优先用互斥锁；表达 N 个同类资源或事件计数可用信号量；若业务需要保留每个事件的载荷、顺序和失败边界，则使用消息队列更清楚。工具名称不是目标，关键是要表达的数据所有权和不变量。
3. **提高线程优先级能修复竞态或死锁吗？**

   不能。优先级只影响获得 CPU 的机会，竞态来自缺少同步，死锁来自等待环。某些实时系统还需处理优先级反转，可用优先级继承等协议缓解，但它仍不能替代正确的锁顺序和超时设计。

**易错点：**

- 不要把 IPC 限定为共享内存，也不要把线程间的普通函数调用误称为 IPC。
- 不要说“用了 volatile 就线程安全”；可见性、原子性、顺序性和复合不变量需要分别判断。
- 不要在条件变量外修改谓词，或用一次 \`if\` 检查替代循环检查。
- 不要认为调度器会理解业务事务；它调度执行实体，不知道订单、帧或队列项是否处于一致状态。

**参考来源：**

- [POSIX pthread_cond_wait：条件变量等待语义](https://pubs.opengroup.org/onlinepubs/9799919799/functions/pthread_cond_wait.html)
- [Linux shm_overview(7)：POSIX 共享内存](https://man7.org/linux/man-pages/man7/shm_overview.7.html)
- [Linux sched(7)：调度策略与优先级](https://man7.org/linux/man-pages/man7/sched.7.html)

# Java 与面向对象

## Q80：封装、继承和多态分别解决什么问题？
**短回答：**

封装把状态、操作和不变量放在明确边界内，让调用者依赖公开契约而不是内部表示；继承表达稳定的“是一个”类型关系，让子类型复用或扩展父类型契约；多态让同一调用点面向抽象工作，运行时由实际对象选择实现。三者不是“代码复用三件套”：继承首先是可替换性承诺，复用只是可能的结果；多态也不只来自类继承，Java 接口与组合往往能提供更低耦合的实现。设计时通常先封装变化，再提取接口形成多态，只有存在真正稳定的子类型关系时才使用实现继承。

**原理：**

封装不等于把所有字段改成 private。有效封装还要求构造阶段建立合法状态、公开操作维护不变量、返回可控视图，并避免可变内部对象从 getter 泄漏。例如账户对象公开 debit 方法而不是让调用者任意修改 balance，方法可以统一检查额度、记录审计并保证失败时不产生半更新。不可变对象是强封装的一种形式，但并非所有对象都必须不可变。

继承包含类型继承和实现继承。子类覆写实例方法后，Java 的动态方法分派根据运行时类型选择实现；但字段访问、静态方法和重载不遵循同一套运行时多态规则。正确继承必须满足父类型契约：不能加强前置条件、削弱后置条件或破坏可观察不变量。仅仅因为两个类“有一些相同字段”就建立继承，容易形成脆弱基类问题；组合把可变策略作为协作者注入，通常更易替换和测试。

多态的价值是把变化收敛到实现端。调用者依赖 PaymentGateway 接口，新增实现时无需在每个调用处添加按类型分支。但接口并不会自动产生良好设计：过宽接口会迫使实现类提供无意义方法，缺少语义约束的接口也无法保证可替换。抽象应围绕业务能力和失败语义，而不是机械地为每个类生成一个接口。

**代码 / 场景：**

支付场景可把“校验订单、记录结果”封装在应用服务，把支付渠道变化放进接口：

~~~java
interface PaymentGateway {
    Receipt charge(Money amount, IdempotencyKey key);
}

final class CheckoutService {
    private final PaymentGateway gateway;
    Receipt checkout(Order order, IdempotencyKey key) {
        order.ensurePayable();
        return gateway.charge(order.total(), key);
    }
}
~~~

CardGateway 与 WalletGateway 都实现同一契约，CheckoutService 只依赖抽象，这体现多态；gateway 通过构造器组合进服务，没有为了复用几行代码建立 CheckoutService 子类。若不同渠道确有共同、稳定且不泄漏内部细节的算法骨架，可以谨慎抽取基类；若只是参数不同，优先用策略对象或配置。测试时用假实现验证重复幂等键、失败重试和金额不变量，而不是只断言调用了某个方法。

**递进追问：**

1. **重载和覆写都算多态吗？**

   广义上都可称多态，但面试中应区分：重载由编译器依据静态参数类型选择签名，覆写后的实例方法通过动态分派按运行时对象类型选择实现。字段隐藏和静态方法隐藏也不是实例方法覆写。
2. **为什么常说“组合优于继承”？**

   组合只暴露协作接口，可在运行时替换策略，也不会把父类的受保护状态和生命周期耦合给子类；继承则绑定父类契约和实现演进。不过当领域确有稳定子类型关系并需要可替换性时，继承仍然合理，不能把这句话理解成禁止继承。
3. **把字段设为 private 后为什么仍可能破坏封装？**

   getter 若直接返回可变集合，外部仍可绕过校验修改内部状态；构造器若保存调用方传入的可变对象引用也一样。可以使用防御性复制、不可变集合、只读视图和表达业务动作的方法保护边界。

**易错点：**

- 不要把封装简化成访问修饰符，也不要为所有字段机械生成 getter/setter。
- 不要把继承当作默认复用手段；先验证子类型能否在所有父类型使用位置保持契约。
- 不要说 Java 所有方法调用都是动态绑定，静态方法、字段和重载的解析规则不同。
- 不要为了“面向接口”制造只有一个实现、没有变化理由且语义空洞的接口层。

**参考来源：**

- [Oracle Java 教程：面向对象概念](https://docs.oracle.com/javase/tutorial/java/concepts/)
- [Java 语言规范：覆写与隐藏](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html#jls-8.4.8)
- [Oracle Java 教程：接口作为类型](https://docs.oracle.com/javase/tutorial/java/IandI/interfaceAsType.html)

## Q81：Java 集合体系应如何选型？
**短回答：**

Java 集合选型应先看语义，再看性能：是否需要重复元素、键值映射、插入顺序、排序、优先级、双端操作、空值以及并发访问；随后用真实的读取、插入、删除和遍历比例验证实现。一般顺序数据从 ArrayList 开始，去重用 Set，键查找用 Map，先进先出或栈用 ArrayDeque，按优先级取元素用 PriorityQueue。HashMap/HashSet 适合无序查找，LinkedHashMap/LinkedHashSet 保留可预测迭代顺序，TreeMap/TreeSet 提供按比较规则排序；并发场景再依据读写模型选择 ConcurrentHashMap、CopyOnWriteArrayList 或显式同步，而不是看到多线程就统一套 synchronized。

**原理：**

List 表达有序、可重复的序列；Set 表达唯一成员；Map 表达键到值的关联，它不继承 Collection；Queue/Deque 表达消费顺序和两端操作。接口决定调用者能依赖的语义，具体实现决定复杂度、内存布局和并发保证。HashMap 的 get/put 在良好散列下是期望常数时间，但不是无条件最坏 O(1)；键的 equals 与 hashCode 必须一致，而且键放入后不应修改参与散列的字段。TreeMap 基于比较顺序，常见操作 O(log n)，比较器还必须与期望的键相等语义协调。

LinkedHashMap 用额外链维护插入或访问顺序，适合可预测遍历和 LRU 骨架；EnumMap/EnumSet 在键或成员是固定枚举时通常更紧凑；PriorityQueue 只保证队头是优先元素，不保证迭代器输出全局排序。并发集合的语义也不同：ConcurrentHashMap 支持高并发访问且不允许 null 键值；CopyOnWriteArrayList 每次写入复制底层数组，适合小集合、读远多于写且需要快照遍历的场景，不适合高频更新；Collections.synchronizedList 提供同步包装，但复合操作和迭代仍需按文档在外部同步。选型最终应包含容量、对象开销、局部性和数据规模，而不仅是一张复杂度表。

**代码 / 场景：**

假设实现“按用户保存最近 100 条事件，并能并发读取”。外层键查询可用 ConcurrentHashMap，单个用户的有界事件缓冲不能只写成“先 size 再 remove 再 add”的三个独立线程安全调用，因为复合不变量仍会竞争。可以让每个用户拥有一把细粒度锁和 ArrayDeque：

~~~java
final class RecentEvents {
    private final ArrayDeque<Event> deque = new ArrayDeque<>();
    synchronized void add(Event event) {
        if (deque.size() == 100) deque.removeFirst();
        deque.addLast(event);
    }
    synchronized List<Event> snapshot() {
        return List.copyOf(deque);
    }
}
~~~

如果需求改为“按分数持续取最高项”，应换 PriorityQueue，而不是每次把 List 全量排序；如果要求按时间范围检索，单纯 Map 也许不是正确数据结构，应考虑 NavigableMap 或数据库索引。基准测试要用接近生产的数据分布，预热 JVM，并把构建集合、查询和 GC 成本分开测量，避免拿十个元素的微基准推导百万级行为。

**递进追问：**

1. **HashMap、LinkedHashMap 与 TreeMap 的核心差异是什么？**

   HashMap 关注基于散列的查找且不承诺迭代顺序；LinkedHashMap 在其上维护插入或访问顺序；TreeMap 按自然顺序或 Comparator 维护有序树，可做范围查询。选择依据是顺序语义和操作模式，不是简单地比较谁“最快”。
2. **ConcurrentHashMap 的单次操作线程安全，为什么业务仍可能出错？**

   “读取余额、判断、再扣减”是跨多个调用的复合操作，其他线程可在中间插入。应使用 compute、merge 等原子组合 API，或在更高层用锁、事务和不可变值表达完整不变量。
3. **需要排好序的结果时，为什么 PriorityQueue 不一定够？**

   它只保证 peek/poll 取到当前优先元素，迭代顺序没有排序保证。若要完整有序输出，可反复 poll 到副本、最终排序，或根据更新与范围查询需求选择 TreeSet/TreeMap。

**易错点：**

- 不要把 HashMap 描述成始终 O(1)，也不要依赖其未承诺的迭代顺序。
- 不要修改已作为 HashMap 键的对象中参与 equals/hashCode 的字段。
- 不要把“并发集合”理解为所有复合业务操作都自动原子，也不要忽略迭代时的具体一致性语义。
- 不要为了去重随手换 Set 后丢失顺序和重复次数；数据结构必须保留业务真正需要的信息。

**参考来源：**

- [Java 21 API：Collections Framework 概览](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/doc-files/coll-overview.html)
- [Java 21 API：Map 接口](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html)
- [Java 21 API：ConcurrentHashMap](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

## Q82：ArrayList、LinkedList 与 ArrayDeque 如何选择？
**短回答：**

需要按索引读取、顺序遍历或在尾部追加时，默认选 ArrayList；需要真正的队列、栈或双端队列时，默认选 ArrayDeque；LinkedList 只有在已经持有迭代器位置并频繁在该位置插删、或确实需要 List 与 Deque 的组合契约时才可能合适，实际业务中比直觉少。ArrayList 中间插删要搬移元素，ArrayDeque 不支持随机索引，LinkedList 虽有 get(index) API 但要沿节点遍历。不能只背 Big-O：连续数组的缓存局部性和更少对象分配，常使 ArrayList/ArrayDeque 在中等规模下明显优于链表。

**原理：**

ArrayList 以可扩容数组保存引用，get/set 是常数时间，尾部 add 是摊销常数时间；扩容时会分配新数组并复制已有引用，中间插删则移动后续区间，因此是 O(n)。预知规模时可设置初始容量或 ensureCapacity 降低扩容次数，但不应为偶发峰值长期预留巨量空间。clear 会移除元素引用，却不承诺把容量缩回初始值。

LinkedList 是双向链表。已知节点位置后连接或拆除节点是常数操作，但公共 List API 的 get(index)、add(index) 和 remove(index) 需要从头或尾遍历到位置，整体仍是 O(n)；每个元素还有前驱、后继引用和独立节点对象，带来内存与 GC 成本，指针跳转也不利于 CPU 缓存。因此“中间插入多就用 LinkedList”只有在位置查找不计入成本、且基准证明收益时才成立。

ArrayDeque 为两端操作设计，addFirst/addLast/removeFirst/removeLast 通常为摊销常数时间，不允许 null 元素。它没有按索引随机访问语义，却通常比用 ArrayList 的 remove(0) 更适合 FIFO，也比遗留 Stack 更适合 LIFO。三者的普通迭代器都是 fail-fast 的尽力检测机制，ConcurrentModificationException 不能作为并发正确性保障；跨线程共享时仍需外部同步或选择并发队列。

**代码 / 场景：**

同一批任务可因操作语义选择不同容器：

~~~java
List<Task> page = new ArrayList<>(expectedSize); // 构建后按索引渲染
Deque<Task> ready = new ArrayDeque<>();          // FIFO：尾部入、头部出
Deque<Route> path = new ArrayDeque<>();          // LIFO：push / pop
~~~

若要维护最近 100 项，ArrayDeque 在满时 removeFirst、再 addLast，不会像 ArrayList.remove(0) 那样每次移动其余元素。若编辑器需要在长文档光标附近持续插入，直接使用 LinkedList 也未必理想：从字符偏移查找节点仍然线性，分段缓冲、rope 或专用文本结构可能更适合。比较实现时至少测量目标数据规模、头尾与中间操作比例、遍历速度和分配量；不要在基准中把随机数生成、日志或 I/O 混进被测路径。

**递进追问：**

1. **为什么 LinkedList 的“中间插入 O(1)”经常误导？**

   这个结论假设已经拿到目标节点或 ListIterator。若调用 add(index, value)，寻找 index 本身是 O(n)。真实代码通常先按索引定位，因此总成本仍是线性的，还要承担节点分配和较差局部性。
2. **为什么不用 ArrayList 实现普通队列？**

   尾部 add 很合适，但从头部 remove(0) 会移动后续全部元素。ArrayDeque 专门提供两端操作，能避免这种搬移；若需要阻塞、容量限制或多生产者多消费者语义，则进一步选择 BlockingQueue 或并发队列。
3. **ArrayDeque 扩容时会不会失去队列顺序？**

   不会。实现会在扩容时按逻辑次序重新布置元素，对调用者仍保持从头到尾的 Deque 顺序。扩容某次操作可能是 O(n)，因此承诺通常是摊销常数时间，而非每一次都严格 O(1)。

**易错点：**

- 不要看到频繁插删就默认 LinkedList；先把定位位置、对象开销和遍历成本一起计算。
- 不要用 ArrayList.remove(0) 实现高频 FIFO，也不要继续用遗留 Stack 作为新代码的默认栈。
- 不要向 ArrayDeque 放 null；其 API 用 null 表示某些无元素结果，规范明确禁止 null 元素。
- 不要把 fail-fast 迭代器当作线程安全机制，它只用于尽早暴露部分错误修改，检测不作绝对保证。

**参考来源：**

- [Java 21 API：ArrayList](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayList.html)
- [Java 21 API：LinkedList](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/LinkedList.html)
- [Java 21 API：ArrayDeque](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayDeque.html)
`
