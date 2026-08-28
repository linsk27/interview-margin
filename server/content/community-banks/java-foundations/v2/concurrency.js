import { GUIDE, OFFICIAL, withSources } from './sources.js'

export const JAVA_FOUNDATION_V2_CONCURRENCY = {
  title: '三、Java 并发高频（14 题）',
  questions: [
    withSources({
      title: '进程和线程有什么区别，并发和并行又是什么？',
      summary: '进程是资源分配与隔离的运行实体，线程是进程内被调度的执行单元；并发强调任务交替推进，并行强调同一时刻真正同时执行。',
      mechanism: '同一进程内线程通常共享堆、类元数据和打开资源，每个线程拥有自己的程序计数器、虚拟机栈与本地方法栈。线程切换开销通常小于进程切换，但共享内存也带来竞态、可见性与故障扩散。单核通过时间片也能并发，多核才可能让多个可运行线程并行。线程数量不是越多越快：CPU 密集任务受核心数限制，I/O 密集任务可容纳更多等待，但最终仍受队列、连接和下游容量约束。',
      example: '图片压缩主要消耗 CPU，线程数接近有效核心数通常更合理；调用多个远程接口时，任务经常等待网络，可以提高受控并发度。无论哪种场景都应使用有界线程池，并用吞吐、p99、上下文切换和队列长度验证。',
      followUps: [
        { question: '一个进程崩溃是否一定会导致另一个进程崩溃？', answer: '通常有较强隔离，不会直接共享地址空间，但共享文件、网络依赖或操作系统资源仍可能造成连锁影响。' },
        { question: '协程或虚拟线程是否等同操作系统线程？', answer: '不等同。操作系统直接调度平台线程；Java 21 的虚拟线程由 JVM 调度器挂载到较少的载体平台线程上，多数受支持的阻塞 I/O 会先卸载虚拟线程，让载体继续运行其他任务。它降低的是大量等待型任务的线程占用，不会增加 CPU 核心或下游连接容量；CPU 密集任务仍受核心数限制，Java 21 中某些 synchronized 或 native 阻塞还可能固定载体线程，可结合 JFR 的虚拟线程固定事件验证。普通协程的调度与阻塞语义则由各语言运行时定义，不能与 Java 虚拟线程一概而论。' },
      ],
      pitfalls: ['把并发和并行当成同义词，无法解释单核交替执行。', '认为线程一定比进程“轻量且安全”，忽略共享状态竞态与调度成本。'],
    }, GUIDE.concurrent01, OFFICIAL.thread, OFFICIAL.jvmsRuntime),
    withSources({
      title: 'Java 线程有哪些状态，状态如何转换？',
      summary: 'Thread.State 包含 NEW、RUNNABLE、BLOCKED、WAITING、TIMED_WAITING 和 TERMINATED；它描述 JVM 视角状态，不等同操作系统调度状态。',
      mechanism: '新建未 start 的线程是 NEW，start 后进入 RUNNABLE，既可能正在 CPU 上运行，也可能等待操作系统调度。等待进入 synchronized 监视器会是 BLOCKED；Object.wait、Thread.join 等无期限等待进入 WAITING；带超时的 sleep、wait、join 进入 TIMED_WAITING。获得锁、被通知、超时或目标线程结束后回到可运行竞争，run 正常返回或抛出未捕获异常后进入 TERMINATED。线程终止后不能再次 start。',
      example: '线程 dump 中大量 BLOCKED 通常提示监视器竞争；大量 WAITING 不一定异常，线程池空闲工作线程可能在队列上等待。排障要结合锁拥有者、队列长度、CPU 和业务吞吐，而不是只看到某个状态就直接定性。',
      followUps: [
        { question: 'RUNNABLE 是否代表线程正在占用 CPU？', answer: '不一定。Java 把正在运行和等待操作系统调度的可运行线程都归入 RUNNABLE。' },
        { question: '线程进入 BLOCKED 和 WAITING 的原因有何不同？', answer: 'BLOCKED 专指等待进入 synchronized 监视器，WAITING 通常来自显式等待其他线程动作且没有超时。' },
      ],
      pitfalls: ['把 Java 的 RUNNABLE 一律翻译成“正在 CPU 上执行”。', '只看一次线程状态快照就判断死锁，不分析持锁关系与时间变化。'],
    }, GUIDE.concurrent01, OFFICIAL.thread),
    withSources({
      title: 'Thread、Runnable 和 Callable 有什么区别？',
      summary: 'Thread 表示线程及其生命周期，Runnable 表示无返回任务，Callable 可返回结果并抛受检异常；业务通常应提交任务给执行器而非手工管理线程。',
      mechanism: '继承 Thread 把“任务是什么”和“由哪个线程执行”耦合在一起，也占用单继承位置。实现 Runnable 可把同一任务交给不同 Thread 或 Executor 执行，但 run 没有返回值且不能直接声明受检异常。Callable.call 可返回泛型结果并抛 Exception，提交给 ExecutorService 后通常通过 Future 获取、取消或等待结果。调用 run 只是普通方法调用，只有 start 才请求 JVM 创建新的执行路径并最终调用 run。',
      example: '发送日志这类无需返回结果的工作可实现 Runnable；并行查询价格需要结果和异常时可提交 Callable。Web 服务不要为每个请求 new Thread，应由有界线程池统一控制并发、命名、拒绝和关闭。',
      followUps: [
        { question: '直接调用 thread.run 会启动新线程吗？', answer: '不会，它只是由当前线程执行普通方法；调用 start 才会建立新的线程生命周期。' },
        { question: 'Future.get 有什么风险？', answer: '它可能无限阻塞并传播包装异常，应设置超时、处理中断并避免在关键线程串行等待大量任务。' },
      ],
      pitfalls: ['把调用 run 当成启动新线程，实际任务仍在当前线程同步执行。', '大量直接 new Thread，缺少并发上限、统一命名和关闭策略。'],
    }, GUIDE.threadPool, OFFICIAL.thread, OFFICIAL.runnable, OFFICIAL.callable),
    withSources({
      title: '什么是线程安全，原子性、可见性和有序性分别指什么？',
      summary: '线程安全要求并发调用仍满足对象契约；原子性是不被中间观察的操作边界，可见性是写入能被其他线程看到，有序性是关键动作按约束顺序发生。',
      mechanism: '原子性并非“单行代码”即可保证，例如 count++ 包含读取、计算和写回。可见性问题来自各线程工作数据、缓存与编译器优化，线程 A 的普通写不保证线程 B 及时观察。有序性不要求所有指令严格按源码执行，而要求不能破坏线程内语义和跨线程 happens-before。synchronized、volatile、锁、原子类和并发容器分别提供不同组合保证。设计时先定义共享不变量与操作边界，再选择最小而完整的同步机制。',
      example: '库存扣减要求“检查大于零并减一”整体原子，只把库存字段声明 volatile 仍会超卖；可在同一锁内完成或用原子条件更新。配置快照是构建后整体替换引用，则 volatile 引用可提供发布可见性，但快照内部应不可变。',
      followUps: [
        { question: '单次 int 读写原子是否代表 count++ 线程安全？', answer: '不代表。自增是读、加、写的复合过程，多个线程可能都基于同一个旧值更新。' },
        { question: '不可变对象为什么更容易线程安全？', answer: '构造后状态不再变化，配合安全发布即可并发读取，减少需要同步的不变量。' },
      ],
      pitfalls: ['把线程安全简化成“没有抛异常”，忽略结果是否满足业务不变量。', '认为 volatile 能把任意复合操作自动变成原子操作。'],
    }, GUIDE.concurrent01, OFFICIAL.jlsThreads),
    withSources({
      title: 'synchronized 锁住的到底是什么？',
      summary: 'synchronized 互斥的是某个对象监视器：实例同步方法锁当前对象，静态同步方法锁对应 Class 对象，同步代码块锁显式给出的引用。',
      mechanism: '进入同步区域前线程必须获得同一个 monitor，退出时释放；同一线程可重入。只有竞争相同锁对象的代码才互斥，两个实例的实例同步方法彼此不阻塞，除非它们最终使用同一锁。锁既建立原子执行边界，也建立释放到后续获取之间的 happens-before，使锁内写入可见。应选择稳定、私有且生命周期清晰的锁对象，避免锁字符串常量、可变引用或公开对象导致意外共享。',
      example: '单例计数器的 synchronized 实例方法都锁单例本身；普通多实例服务若要保护共享静态缓存，锁 this 无效，应锁共同的私有 static final 对象或改用并发容器。不要写 `synchronized ("LOCK")`，字符串池可能让无关代码竞争同一对象。',
      followUps: [
        { question: 'synchronized 是否可重入？', answer: '可以。监视器记录拥有线程及其重入深度，同一线程再次进入同一个 monitor 时不会与自己竞争，而是增加持有计数；每退出一层同步区域计数减一，归零后其他线程才能获得该监视器。这保证递归调用或同步方法互调不会自我死锁，但只对同一锁对象成立，也不自动保证多个锁之间没有死锁；可用线程转储核对实际 monitor 的拥有者和等待者。' },
        { question: '锁对象引用改变会发生什么？', answer: '不同线程可能在新旧两个对象上分别加锁，互斥边界被拆开，因此锁引用通常应固定为 final。' },
      ],
      pitfalls: ['只说“锁方法”或“锁代码”，没有指出真正参与竞争的对象监视器。', '用 this 保护多个实例共同访问的静态共享状态，实际没有形成共同锁。'],
    }, GUIDE.concurrent02, OFFICIAL.jlsThreads, OFFICIAL.object),
    withSources({
      title: 'volatile 能保证什么，不能保证什么？',
      summary: 'volatile 保证对该变量的写对后续读可见，并参与限制相关重排序；它不为读取—计算—写回这样的复合操作提供整体原子性。',
      mechanism: '对 volatile 变量的写 happens-before 后续对同一变量的读，因此常用于发布不可变快照、状态标志和双重检查中的实例引用。它还通过内存语义约束前后普通读写的重排范围。单次读取和写入具有相应语义，但 count++、检查后执行、多个字段一致更新仍包含多个动作，需要锁、CAS 循环或更高层同步。volatile 也不等于把对象内部所有字段都自动变成同步变量；发布后继续并发修改内部可变状态仍需单独保护。',
      example: '后台线程循环检查 volatile boolean stopped，控制线程写 true 后能让它看到退出信号。并发计数不能只写 volatile int count 后执行 count++，应使用 AtomicInteger.incrementAndGet 或锁。配置对象若通过 volatile 引用整体替换，最好让配置本身不可变。',
      followUps: [
        { question: 'volatile 和 synchronized 的主要差异是什么？', answer: 'volatile 不提供互斥，适合单变量发布和状态通知；synchronized 可保护复合不变量并同时提供可见性。' },
        { question: '双重检查单例为什么需要 volatile？', answer: '它防止其他线程看到引用已经发布但对象初始化尚未按要求完成的状态，并提供可见性。' },
      ],
      pitfalls: ['看到字段是 volatile 就对它执行自增，误以为复合更新不会丢失。', '把 volatile 引用的可见性扩张成其内部任意可变对象都线程安全。'],
    }, GUIDE.concurrent02, OFFICIAL.jlsThreads),
    withSources({
      title: 'synchronized 和 ReentrantLock 有什么区别？',
      summary: '两者都能提供可重入互斥与可见性；synchronized 由语言结构自动释放，ReentrantLock 额外提供可中断、超时、公平策略和多个 Condition。',
      mechanism: 'synchronized 语法简单，正常返回或异常时 JVM 都会退出监视器，适合多数互斥场景。ReentrantLock 需要显式 lock 与 finally unlock，可用 lockInterruptibly 响应中断、tryLock 实现超时或非阻塞尝试，并通过多个 Condition 管理不同等待队列；可选公平锁通常降低饥饿风险但牺牲吞吐。两者都不能自动保证锁内业务设计正确。选择应由确实需要的能力驱动，不应仅凭“Lock 性能一定更好”的旧结论。',
      example: '普通账户状态更新用 synchronized 即可保持代码简洁。需要等待锁最多 100 毫秒并在超时后降级时，可使用 tryLock；成功后必须在 finally 里 unlock。多个条件队列的生产者消费者可用不同 Condition 减少无关唤醒。',
      followUps: [
        { question: 'ReentrantLock 为什么必须在 finally 中释放？', answer: '业务代码或等待过程可能抛异常，若未释放，后续线程会永久等待并造成锁泄漏。' },
        { question: '公平锁是否意味着线程严格按到达顺序执行？', answer: '它主要偏向等待时间最长的线程，仍受调度和 tryLock 等行为影响，不能理解为绝对 FIFO。' },
      ],
      pitfalls: ['离开 finally 手工 unlock，异常路径导致锁永远不释放。', '无条件宣称 ReentrantLock 比 synchronized 更快，忽略现代 JVM 优化与场景差异。'],
    }, GUIDE.xiaolinJuc, OFFICIAL.lock, OFFICIAL.jlsThreads),
    withSources({
      title: '什么是 Java 内存模型和 happens-before？',
      summary: 'Java 内存模型（JMM）规定多个线程读写同一份数据时，哪些结果必须彼此可见，以及编译器和 CPU 可以怎样调整执行顺序。happens-before 是其中的判断规则：如果动作 A 先于动作 B，那么 B 必须看见 A 已保证发布的结果；没有这条关系，就不能仅凭代码书写顺序推断线程间可见性。',
      mechanism: 'happens-before 不是墙钟时间，而是内存可见性与排序关系。常见规则包括：同一线程程序次序；监视器解锁先于后续对同一监视器加锁；volatile 写先于后续读；Thread.start 之前动作先于新线程动作；线程中动作先于其他线程成功 join 返回；关系可传递。若两个冲突访问之间没有这样的关系，程序可能存在数据竞争，观察结果不能用单线程直觉推导。JMM 允许编译器和处理器优化，只要不违反既定同步语义。',
      example: '主线程先写入配置对象，再调用 worker.start，工作线程可依据 start 规则看到此前写入。任务线程完成计算后退出，主线程 join 成功返回后可看到结果。单纯 sleep 一段时间不建立这种确定关系，不能用于发布共享数据。',
      followUps: [
        { question: 'happens-before 是否表示动作 A 现实时间一定先完成？', answer: '它主要是可见性与排序保证；部分规则用于推导可观察结果，不能简单等同物理时钟先后。' },
        { question: 'volatile 写与读为何能发布此前普通字段？', answer: 'volatile 写前的动作通过程序次序，加上该写到后续读的规则与传递性，使此前结果对读线程可见。' },
      ],
      pitfalls: ['把 happens-before 当作日志时间先后，而不讨论共享读写可见性。', '用“通常能看到”替代明确同步关系，让竞态只在压力下暴露。'],
    }, GUIDE.concurrent02, OFFICIAL.jlsThreads),
    withSources({
      title: 'wait、sleep 和 join 有什么区别？',
      summary: 'wait 在持有对象监视器时进入等待并释放该监视器，sleep 只让当前线程定时休眠且不释放已持有锁，join 用于等待目标线程结束。',
      mechanism: 'Object.wait 必须在拥有对应 monitor 的 synchronized 区域调用，调用后加入该对象等待集并释放 monitor；被 notify、notifyAll、中断或超时后，还要重新竞争锁才能继续。Thread.sleep 是静态方法，使当前线程进入定时等待，不与某个监视器协议绑定，所以不会主动释放锁。join 在语义上等待指定线程终止，并建立目标线程动作到 join 成功返回之间的可见性。三者都可能被中断，代码应恢复中断标志或按边界传播，而不是静默吞掉。',
      example: '生产者消费者使用 wait 时必须放在 while 条件循环中，醒来后重新检查队列，防止虚假唤醒和条件被其他线程抢先改变。不要在 synchronized 内 sleep 来“让出锁”，它会占着锁休眠。聚合子任务可 join，但生产代码通常优先使用 Future 或结构化执行。',
      followUps: [
        { question: '为什么 wait 条件应使用 while 而不是 if？', answer: '线程可能虚假唤醒，或被唤醒后条件已被其他线程改变，必须持锁重新检查。' },
        { question: 'notify 后等待线程是否立即开始执行？', answer: '不会保证。它先从等待集中被唤醒，仍需等通知线程释放 monitor 后再竞争获得锁。' },
      ],
      pitfalls: ['认为 sleep 会像 wait 一样释放当前持有的锁。', '捕获 InterruptedException 后什么也不做，破坏上层取消协议。'],
    }, GUIDE.concurrent01, OFFICIAL.object, OFFICIAL.thread),
    withSources({
      title: 'ThreadPoolExecutor 的核心参数和执行流程是什么？',
      summary: '核心参数决定常驻线程、最大线程、空闲回收、队列、线程工厂和拒绝策略；提交流程通常是先核心线程，再入队，再扩到最大，最后拒绝。',
      mechanism: '主要参数包括 corePoolSize、maximumPoolSize、keepAliveTime、workQueue、threadFactory 与 RejectedExecutionHandler。execute 提交后：运行线程少于核心数则尝试新建核心线程；否则任务入队；队列无法接收且线程数未到最大值时再建非核心线程；仍无法接收就执行拒绝策略。无界队列常使 maximumPoolSize 形同虚设，有界队列则让过载显性化。线程数和队列容量应由任务阻塞比、下游容量、内存与延迟预算共同决定。',
      example: '订单接口调用数据库时，线程池不能只按 CPU 核心数机械设置，也不能超过连接池和下游可承载并发。使用有界队列与带业务指标的拒绝策略，压测观察活跃线程、队列等待、拒绝数和 p99，找到系统饱和点。',
      followUps: [
        { question: '为什么无界队列下最大线程数可能不起作用？', answer: '核心线程满后任务仍可持续入队，不会进入创建非核心线程的分支，直到内存或延迟失控。' },
        { question: 'CallerRunsPolicy 有什么效果和风险？', answer: '它让提交线程执行任务形成反压，但可能阻塞请求线程或关键调度线程，需要确认调用链影响。' },
      ],
      pitfalls: ['只背七个参数，不会按“核心—队列—最大—拒绝”解释提交路径。', '使用无界队列掩盖过载，最终以长延迟或内存耗尽失败。'],
    }, GUIDE.threadPool, OFFICIAL.threadPool),
    withSources({
      title: '为什么生产环境不建议直接使用 Executors 创建线程池？',
      summary: '常用 Executors 工厂隐藏了关键容量选择，可能创建无界队列或数量快速增长的线程；生产环境更需要显式、可审计地配置 ThreadPoolExecutor。',
      mechanism: 'newFixedThreadPool 常配无界 LinkedBlockingQueue，过载时任务持续堆积；newCachedThreadPool 使用直接移交并允许线程数大幅增长，慢下游会造成线程膨胀；singleThreadExecutor 同样可能积压无界任务。问题不在工厂方法本身“绝对不能用”，而在默认容量与失败策略常不符合服务 SLA。显式构造可让核心数、最大数、有界队列、线程命名、异常处理与拒绝策略进入配置和监控，也应设计 shutdown 与任务取消。',
      example: '邮件发送服务若用 newFixedThreadPool，供应商变慢时队列可积压百万任务。改为有界队列、命名线程工厂和明确拒绝或落盘策略，并监控队列等待；容量按供应商限额而不是服务器 CPU 单独决定。',
      followUps: [
        { question: 'Executors 工厂在任何场景都不能使用吗？', answer: '不是。受控脚本和明确任务上限的场景可以使用，但服务端必须清楚默认队列和线程上限是否满足风险边界。' },
        { question: '显式 new ThreadPoolExecutor 就一定安全吗？', answer: '不一定。参数仍可能错误，还需要监控、压测、关闭、拒绝和下游容量配套。' },
      ],
      pitfalls: ['把“不推荐”背成语法禁令，却说不出无界队列与线程膨胀风险。', '显式构造线程池后仍设置巨大队列，实际没有建立有效反压。'],
    }, GUIDE.threadPool, OFFICIAL.executors, OFFICIAL.threadPool),
    withSources({
      title: 'ThreadLocal 的原理是什么，为什么要调用 remove？',
      summary: 'ThreadLocal 为每个线程维护独立值，数据实际存在线程持有的 ThreadLocalMap 中；线程池会复用线程，因此任务结束应 remove 防止串数据和滞留。',
      mechanism: '每个 Thread 对象可关联自己的 ThreadLocalMap，键是 ThreadLocal 的弱引用，值通常仍是强引用。get、set 以当前 ThreadLocal 在当前线程的 Map 中查找槽位，所以隔离的是“同一变量在不同线程的值”，不是自动把共享对象深复制。键弱引用被回收后，值可能在后续清理前继续滞留；更常见的业务风险是线程池线程长期存在，下一个请求读取到上个请求上下文。应在 finally 中 remove，并优先显式传递核心业务上下文。',
      example: 'Web 过滤器把 traceId 放入 ThreadLocal，链路结束时无论正常还是异常都在 finally remove。若只 set 不清理，线程池复用后另一个用户请求可能继承旧 traceId，造成日志串号甚至权限上下文泄漏。',
      followUps: [
        { question: 'ThreadLocal 能让一个可变对象变得线程安全吗？', answer: '只有每个线程持有独立对象时能隔离；若多个线程的值仍指向同一对象，竞态依旧存在。' },
        { question: '键是弱引用为什么仍可能内存滞留？', answer: '键被回收后 entry 的 value 仍可能被线程长期强引用，直到 Map 操作触发清理或线程结束。' },
      ],
      pitfalls: ['在线程池任务中 set 后不 remove，造成请求上下文污染和对象滞留。', '用 ThreadLocal 隐藏大量业务依赖，使异步切换线程后上下文丢失。'],
    }, GUIDE.xiaolinJuc, OFFICIAL.threadLocal, OFFICIAL.thread),
    withSources({
      title: '死锁产生的条件是什么，怎样预防和排查？',
      summary: '死锁常由互斥、占有且等待、不可剥夺和循环等待同时成立；工程上通过固定锁顺序、缩小锁范围、超时尝试和线程转储来预防与定位。',
      mechanism: '两个线程分别持有 A 等 B、持有 B 等 A，就形成循环等待。预防最有效的是破坏必要条件：为多把锁定义全局顺序；一次性申请所需资源；用 tryLock 超时后释放已持有锁；减少锁嵌套与锁内阻塞 I/O。排查时获取线程 dump，查看 BLOCKED 线程、锁拥有者和 JVM 报告的死锁环，结合代码路径确认资源顺序。数据库死锁与 JVM 监视器死锁是不同层面，还要查看数据库诊断。',
      example: '转账同时锁两个账户时，所有线程按 accountId 从小到大加锁，而不是按转出、转入顺序。线上无响应时用 jcmd Thread.print 或 ThreadMXBean 获取锁图，先保留证据再决定重启，并补并发回归测试。',
      followUps: [
        { question: '发生死锁时 CPU 一定很高吗？', answer: '不一定。线程可能都在阻塞等待，CPU 反而较低，但吞吐停滞、请求和队列持续积压。' },
        { question: 'tryLock 超时能彻底避免业务问题吗？', answer: '它能避免无限等待，但需要正确释放已持有资源，并为失败设计重试、回滚或提示。' },
      ],
      pitfalls: ['只背四个条件，不会画出具体线程和锁的等待环。', '看到服务卡住就直接重启，未保留线程转储导致根因无法复盘。'],
    }, GUIDE.xiaolinJuc, OFFICIAL.threadMxBean, OFFICIAL.lock),
    withSources({
      title: 'CAS 的原理是什么，ABA 问题怎样解决？',
      summary: 'CAS 原子比较内存位置的当前值与期望值，相等才写入新值，失败由调用方重试；ABA 是值变回原样却掩盖了中间变化，可加入版本号解决。',
      mechanism: '原子类常用 compareAndSet 构建无锁更新循环：读取旧值，计算新值，CAS 提交；竞争失败后重新读取。它避免线程阻塞和上下文切换，但高竞争下会反复自旋消耗 CPU，也难以直接维护多个变量的复合不变量。ABA 场景中值从 A 变 B 又回 A，单看值的 CAS 认为未变化，却可能错过节点生命周期。AtomicStampedReference 等把值与版本一起比较，或通过不可复用标识、锁来处理。',
      example: '计数器可用 AtomicInteger.incrementAndGet。无锁栈弹出节点时，如果节点 A 被移除又重新压回，旧线程仅比较头引用可能错误成功；将头引用与递增 stamp 作为整体检查，可识别中间发生过变化。',
      followUps: [
        { question: 'CAS 一定比锁性能好吗？', answer: '不一定。低竞争短操作常有优势，高竞争或长重试会浪费 CPU，锁反而能更好地排队。' },
        { question: 'AtomicInteger 能保证两个字段同时更新吗？', answer: '不能。它只保证自身操作原子，多字段不变量应封装成一个不可变状态做原子替换或使用锁。' },
      ],
      pitfalls: ['把 CAS 说成完全没有开销，忽略竞争自旋和失败重试。', '只解释值从 A 回到 A，却不说明版本号或状态封装如何修复。'],
    }, GUIDE.concurrent02, OFFICIAL.atomic, OFFICIAL.jlsThreads),
  ],
}
