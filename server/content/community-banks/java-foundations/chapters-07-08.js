import { OFFICIAL } from './shared.js'

export const JAVA_FOUNDATION_CHAPTERS_07_08 = [
  {
    title: '线程基础与异步任务',
    questions: [
      {
        title: '创建线程时，为什么通常提交 Runnable 或 Callable，而不是继承 Thread？',
        summary: '线程是执行载体，Runnable 和 Callable 是待执行任务。把二者分开后，任务既能交给不同执行器，也更容易测试、组合和控制生命周期；直接调用 run 只是在当前线程执行普通方法，只有 start 才会启动新线程。',
        mechanism: 'Thread 同时包含线程身份、优先级、名称、中断状态等执行上下文，也提供 start 启动一次实际线程；start 最终会在新线程中回调 run，重复调用会抛 IllegalThreadStateException。Runnable.run 没有返回值且不能声明受检异常，Callable.call 可以返回结果并抛出异常，通常通过 ExecutorService 包装成 Future。继承 Thread 会把业务任务与具体执行线程绑定，还占用 Java 的单继承位置；实现任务接口则可以让同一个任务由测试代码直接调用、由线程执行或由执行器调度。线程创建、并发上限和关闭策略也应由执行层统一管理，而不是散落在领域对象里。',
        example: '批量计算十个文件摘要时，将每个文件封装为 Callable<Digest> 并提交给受控执行器，调用方保存返回的 Future，设置总截止时间并统一取消未完成任务。这样摘要算法可以在单元测试中直接调用 call，生产环境再决定使用多少工作线程；若写成十个 Thread 子类，返回值、异常收集和生命周期管理都会变得零散。',
        followUps: [
          {
            question: '直接调用 thread.run() 会发生什么？',
            answer: '它只是当前线程上的普通方法调用，不会创建新线程，也不会经历 start 所建立的线程生命周期。代码看似并发，实际上会同步执行，因此测试线程身份或时序时很容易误判。',
          },
          {
            question: '同一个 Thread 对象可以 start 两次吗？',
            answer: '不可以。Thread 实例的 start 只能成功一次，即使 run 已经结束也不能再次启动；需要再次执行任务时，应创建新的 Thread，通常更适合把任务重新提交给执行器。',
          },
        ],
        pitfalls: [
          '把 run 当成启动线程的方法，结果耗时任务仍阻塞当前调用线程。',
          '业务对象随手 new Thread，导致并发上限、异常处理和应用关闭无法统一治理。',
        ],
        sources: [OFFICIAL.thread, OFFICIAL.executor],
      },
      {
        title: 'Java 线程的六种状态怎样理解，BLOCKED 与 WAITING 有什么区别？',
        summary: 'Thread.State 是 JVM 观察线程所用的六类快照：NEW、RUNNABLE、BLOCKED、WAITING、TIMED_WAITING、TERMINATED。RUNNABLE 同时覆盖可运行和正在运行；BLOCKED 是等待进入监视器，WAITING 则是线程已经主动进入无期限等待。',
        mechanism: 'NEW 表示尚未 start，TERMINATED 表示 run 已退出。RUNNABLE 不等于此刻占用 CPU，它还包含等待操作系统调度或正在执行的线程。BLOCKED 专指线程试图进入 synchronized 区域或重新获取对象监视器时受阻；WAITING 常由无超时 Object.wait、Thread.join 或 LockSupport.park 产生，TIMED_WAITING 则包括带超时的 wait、join、sleep 与 parkNanos。状态是采样瞬间的分类，不记录线程之前做过什么，也不能单凭一次快照判断故障；排查需要结合多次线程转储、锁拥有者、调用栈、CPU 和业务时间线。I/O 等待在 JVM 层也可能仍呈 RUNNABLE，不能把 RUNNABLE 直接解释为高 CPU。',
        example: '某请求卡住时，线程 A 在 synchronized(lock) 入口显示 BLOCKED，转储同时指出线程 B 持有该监视器；线程 C 在 queue.take 的内部等待条件，可能显示 WAITING；线程 D 调用了 sleep(1000) 则显示 TIMED_WAITING。连续采样若 A 一直被 B 阻塞，才进一步检查 B 的调用栈和持锁范围，而不是看到 BLOCKED 就立即重启。',
        followUps: [
          {
            question: '为什么 RUNNABLE 线程不一定正在消耗 CPU？',
            answer: 'Java 的 RUNNABLE 合并了操作系统层面的就绪和运行等情况，某些本地 I/O 等待也可能映射为该状态。是否消耗 CPU 应结合采样分析器和线程 CPU 时间判断。',
          },
          {
            question: '线程从 Object.wait 返回后一定立刻运行吗？',
            answer: '不一定。收到通知后，它还必须重新竞争并获得同一个对象的监视器，才会从 wait 返回；竞争期间可表现为 BLOCKED，之后还要等待调度器分配执行机会。',
          },
        ],
        pitfalls: [
          '把 RUNNABLE 等同于正在占用处理器，据此误判高 CPU 根因。',
          '只看一份线程转储就下结论，没有追踪状态、锁拥有者和调用栈的变化。',
        ],
        sources: [OFFICIAL.thread],
      },
      {
        title: 'interrupt 为什么是协作式取消，而不是强制终止线程？',
        summary: 'interrupt 只是发出取消请求：它设置中断状态，或让部分阻塞方法抛出 InterruptedException。任务必须在合适边界检查并退出、清理资源或向上转交；Java 不会在任意指令处粗暴杀死线程。',
        mechanism: '对正常运行的线程调用 interrupt，通常只把其中断标志设为 true；Thread.currentThread().isInterrupted 可读取而不清除，静态 Thread.interrupted 会读取并清除当前线程标志。sleep、wait、join 以及部分并发阻塞方法在响应中断时抛 InterruptedException，并会清除中断状态。底层任务若无法完成取消，通常应清理局部状态后重新设置中断 Thread.currentThread().interrupt，或把 InterruptedException 继续抛给能决定策略的上层。循环要在合理频率检查中断，阻塞 I/O 是否响应中断取决于具体 API。强行终止可能把共享对象留在不变量被破坏的中间状态，因此 Thread.stop 已不适合作为取消机制。',
        example: '文件导入任务每处理一批记录就检查 isInterrupted，数据库写入使用可取消或有超时的调用。收到取消后，任务停止领取新批次，在 finally 中关闭流并回滚未提交事务，然后正常返回。若一个库方法捕获 InterruptedException 只是为了关闭临时文件，它在退出前重新设置中断，让上层 Future 或请求编排器仍能识别这次取消。',
        followUps: [
          {
            question: '捕获 InterruptedException 后为什么常要重新设置中断？',
            answer: '抛出该异常的阻塞方法通常已经清除了中断标志。若当前层不能继续抛出异常，却直接吞掉它，上层会误以为任务可继续；重新设置可以保留取消信号。',
          },
          {
            question: 'finally 中收到中断后还应做清理吗？',
            answer: '应该完成必要且有界的资源释放或一致性清理，但不要借机执行长时间新业务。清理代码也要考虑再次中断和超时，避免取消路径本身永久卡住。',
          },
        ],
        pitfalls: [
          '捕获 InterruptedException 后空处理，导致线程池关闭或请求取消迟迟不生效。',
          '只在循环结束才检查中断，或调用不响应中断且无超时的阻塞 API。',
        ],
        sources: [OFFICIAL.thread, OFFICIAL.concurrent],
      },
      {
        title: 'wait 与 notify 为什么必须配合条件循环和同一个监视器？',
        summary: 'wait/notify 不是消息队列，而是对象监视器上的条件等待协议。调用者必须先持有该对象的监视器；等待线程在循环里检查业务条件，wait 时释放监视器，被唤醒并重新获得监视器后再检查条件。',
        mechanism: '对对象调用 wait、notify 或 notifyAll 前必须处于 synchronized(该对象) 内，否则会抛 IllegalMonitorStateException。wait 会原子地把当前线程加入该对象等待集并释放其监视器，但不会自动释放线程持有的其他锁。notify 只选择一个等待者，选择规则不保证公平；notifyAll 唤醒全部等待者，它们仍需竞争锁。线程可能因为通知、超时、中断或所谓虚假唤醒而返回，所以条件必须用 while 而不是 if 检查。修改条件与发送通知也要在同一监视器保护下完成，才能避免检查条件与进入等待之间丢失通知。复杂的多个条件队列通常更适合 BlockingQueue 或 Lock/Condition。',
        example: '有界缓冲区的 put 在 synchronized(lock) 中使用 while(size == capacity) lock.wait()，入队后调用 lock.notifyAll；take 同样用 while(size == 0) 等待，出队后通知。即使多个生产者同时被唤醒，只有拿到锁且重新确认容量仍可用的线程才能入队，其余线程继续等待，因此不会因一次通知越过容量约束。',
        followUps: [
          {
            question: '为什么推荐 while 而不是 if？',
            answer: '线程醒来时业务条件可能已被另一线程再次改变，也允许在没有目标通知时醒来。while 会在重新持锁后再次验证不变量，if 则可能让线程在条件不成立时继续执行。',
          },
          {
            question: 'notify 与 notifyAll 应怎样选择？',
            answer: '只有一个条件且任意等待者都能推进时 notify 可能足够；多个条件共用等待集或无法证明选中者一定能推进时，notifyAll 更安全，但应评估竞争开销并优先考虑更明确的条件工具。',
          },
        ],
        pitfalls: [
          '在 synchronized 外调用 wait 或 notify，运行时直接抛监视器状态异常。',
          '用 if 检查条件，忽略竞争、超时和虚假唤醒后条件可能仍不成立。',
        ],
        sources: [OFFICIAL.object, OFFICIAL.jlsThreads],
      },
      {
        title: 'Thread.join 能保证什么，带超时的 join 应怎样写？',
        summary: 'join 让当前线程等待目标线程终止，适合表达明确的生命周期依赖；它不传播目标线程异常，也不负责取消。Java 19 起优先使用返回 boolean 的 join(Duration)，可直接区分目标是否在期限内结束。',
        mechanism: '调用 worker.join 意味着调用线程暂停，直到 worker 进入 TERMINATED，并会响应等待线程自身的中断。Java 19 起，worker.join(Duration) 最多等待指定时长并返回目标是否已经终止；Duration 小于等于零时不等待，只做一次终止状态检查，适合用剩余 deadline 安全调用。旧的 join(long millis) 返回 void，超时后必须用 isAlive 判断，而且 millis 为 0 的语义不是立即返回，而是无限等待；把不足一毫秒的剩余时间截断成 0 会意外突破超时预算。等待多个线程时应计算统一 deadline，不给每个线程重复完整时长。目标线程抛出的未捕获异常不会由 join 转交，需要 UncaughtExceptionHandler、结果容器或 Future 收集。',
        example: '服务关闭时给两个后台线程总计五秒退出窗口：先设置停止标志并 interrupt，再记录 deadline。每次计算 Duration remaining，调用 worker.join(remaining) 并检查 boolean 结果，随后为下一线程重算剩余预算；remaining 为零时只检查而不等待。兼容旧 API 时，若换算后的剩余毫秒为 0 但仍有少量时间，应至少传 1，而不能调用 join(0) 进入无限等待。',
        followUps: [
          {
            question: 'join 和 sleep 的本质区别是什么？',
            answer: 'sleep 只等待一段时间，不关心其他线程状态；join 等待特定线程终止，并可无超时等待。两者都会让当前线程暂停且都可能抛 InterruptedException。',
          },
          {
            question: '目标线程异常退出后 join 会怎样？',
            answer: '目标线程仍会进入 TERMINATED，所以 join 正常返回，但不会把异常抛给等待者。若调用方关心成功或失败，应使用 Future.get 或显式的异常收集与处理机制。',
          },
        ],
        pitfalls: [
          '旧毫秒重载把换算后的 0 传给 join，误把“立即检查”变成无限等待。',
          '循环等待多个线程时重复使用完整时长，使总关闭时间远超统一预算。',
        ],
        sources: [OFFICIAL.thread],
      },
      {
        title: 'sleep、wait 与 yield 都会“让出执行”吗？',
        summary: '三者语义完全不同：sleep 让当前线程定时暂停但不释放监视器；wait 在持锁条件下进入对象等待集并释放对应监视器；yield 只是向调度器提示当前线程愿意让出处理器，不提供时序保证。',
        mechanism: 'Thread.sleep 依据指定时长让当前线程进入 TIMED_WAITING，到期后只是重新具备运行资格，实际恢复时间受调度影响；如果在 synchronized 中调用，它仍持有监视器。Object.wait 必须先持有目标对象监视器，调用后释放该监视器，并因通知、超时或中断醒来，再竞争锁并复查条件。Thread.yield 不阻塞到某个明确事件，也不保证其他线程立刻运行，调度器可以忽略它，因此不能用于正确性同步、限流或等待状态变化。需要等待条件时使用通知、锁条件、并发队列或 Future；需要控制频率时使用调度器、限速器或带截止时间的等待，而不是忙等加 yield。',
        example: '订单轮询线程不能写成 while(!ready) Thread.yield()，因为它既浪费 CPU 又没有可见性和时序保证。若 ready 由另一个任务完成，可让完成方结束 CompletableFuture，等待方用带超时的 get；若是有界生产消费，则使用 BlockingQueue.take。只有模拟延迟或简单重试退避时才可能使用 sleep，并确保不在持有业务锁时睡眠。',
        followUps: [
          {
            question: '在 synchronized 中 sleep 会释放锁吗？',
            answer: '不会。sleep 只改变当前线程的调度状态，不修改它持有的监视器；其他需要同一锁的线程仍会阻塞，所以持锁睡眠通常会无谓放大临界区。',
          },
          {
            question: 'yield 能否保证优先让高优先级线程运行？',
            answer: '不能。yield 只是调度提示，Java 规范没有承诺下一位执行者，也没有承诺当前线程不会马上再次运行；不能把它当作可移植的优先级或同步机制。',
          },
        ],
        pitfalls: [
          '在持有热点锁时 sleep，导致其他线程在整个暂停期间无法进入临界区。',
          '用 yield 或短 sleep 轮询条件，形成忙等、延迟抖动和难以复现的时序问题。',
        ],
        sources: [OFFICIAL.thread, OFFICIAL.object],
      },
      {
        title: 'ThreadLocal 解决什么问题，为什么在线程池中必须 remove？',
        summary: 'ThreadLocal 为每个线程保存独立值，适合传递明确生命周期内的线程上下文或复用非线程安全对象；它不是跨线程共享工具。线程池会复用工作线程，若任务结束不清理，旧值可能泄漏给后续请求并长期占用内存。',
        mechanism: '每个 Thread 维护与 ThreadLocal 键关联的局部值，同一个 ThreadLocal 在不同线程读取到各自副本。initialValue 或 withInitial 可延迟创建每线程值，set 覆盖当前线程条目，remove 删除当前线程值，下一次 get 会重新初始化。ThreadLocal 对象被回收不等于值立即释放，线程内部表的键具有弱引用语义，而值可能随长寿命线程继续存活。线程池工作线程跨任务复用，因此请求标识、用户信息或大对象若未在 finally 中 remove，会造成上下文串号和保留。异步任务换线程后也不会自动继承普通 ThreadLocal；InheritableThreadLocal 只在创建子线程时复制初值，不适合线程池中的请求传播。',
        example: '过滤器在请求入口把 traceId 放入 ThreadLocal，业务日志从当前线程读取。请求结束无论成功失败都在 finally 中调用 remove。提交异步任务时，不假设线程池线程能看到调用方值，而是在任务对象中显式携带不可变的 TraceContext，并在执行边界设置和清理；这样既避免串号，也能审计上下文从哪里传来。',
        followUps: [
          {
            question: 'ThreadLocal 能让对象变成线程安全吗？',
            answer: '它只能让每个线程操作自己的实例，从而避免共享；若局部值本身被发布给其他线程或引用共享可变对象，仍然存在并发问题，也要明确资源数量和清理成本。',
          },
          {
            question: '为什么 InheritableThreadLocal 不适合在线程池传播请求上下文？',
            answer: '它只在线程创建时从父线程复制值，而线程池线程通常早已存在并反复执行不同请求。结果可能拿不到新上下文或残留旧上下文，无法表达每次任务提交的边界。',
          },
        ],
        pitfalls: [
          '在线程池任务中只 set 不 remove，造成用户上下文串用和长寿命对象滞留。',
          '假设普通 ThreadLocal 会跟随 CompletableFuture 或线程池任务自动传播。',
        ],
        sources: [OFFICIAL.threadLocal, OFFICIAL.thread],
      },
      {
        title: 'Future 的 get、cancel 与超时分别代表什么？',
        summary: 'Future 是一次异步计算的结果句柄：get 等待结果并转交失败，带超时的 get 限制等待时间；cancel 请求取消尚未完成的任务。超时只停止当前等待，不会自动终止后台任务，取消也不保证任务一定立即停止。',
        mechanism: '提交 Callable 后得到 Future。get 在任务成功时返回值，任务抛异常时以 ExecutionException 包装原始原因，等待线程被中断时抛 InterruptedException；get(timeout) 到期抛 TimeoutException，但任务仍可继续。cancel(false) 不会中断正在运行的任务，但仍可能把尚未完成的 Future 标记为已取消，此时底层计算可以继续到自然结束；cancel(true) 则还会向执行线程请求中断。取消成功后 isCancelled 为 true，之后 get 抛 CancellationException；isDone 对正常、异常和取消三种终态都为 true，不能据此判断计算是否真的停止或成功。正确做法是使用总 deadline、分类处理异常，并让任务协作响应中断或业务取消信号。',
        example: '聚合三个下游报价时设置 800 毫秒总预算，每个 Future.get 使用当前剩余时间。某一路超时后，策略若不再需要它就 cancel(true)，并记录 timeout；已完成结果通过 get 收集，ExecutionException 展开 cause 区分业务失败和系统失败。方法 finally 中取消所有不再需要的 Future，避免请求早已返回而后台仍消耗连接。',
        followUps: [
          {
            question: 'isDone 为 true 是否说明任务成功？',
            answer: '不说明。正常返回、抛异常和被取消都会进入完成状态；调用方需要 get 并分别处理 ExecutionException 与 CancellationException，或保存明确的结果状态。',
          },
          {
            question: 'get 超时后为什么任务还可能继续？',
            answer: '超时约束的是调用线程等待 Future 的时长，不是任务本身的生命周期。若业务决定放弃结果，需要显式 cancel，并确保底层操作支持中断或自身具备超时。',
          },
        ],
        pitfalls: [
          '把 TimeoutException 当作任务已经取消，实际后台仍持续占用线程和连接。',
          '捕获 ExecutionException 后只打印包装异常，没有检查 cause 并按失败类型处理。',
        ],
        sources: [OFFICIAL.future, OFFICIAL.executor],
      },
      {
        title: 'CompletableFuture 中 thenApply、thenCompose 与 thenCombine 怎样选择？',
        summary: 'thenApply 用于同步映射一个已完成结果；thenCompose 把返回的下一段异步任务摊平，避免嵌套 Future；thenCombine 在两个相互独立的异步结果都完成后合并。选择依据是数据依赖关系，而不是方法名熟悉程度。',
        mechanism: 'CompletableFuture 同时实现 Future 与 CompletionStage。若函数从 T 同步得到 U，使用 thenApply 得到 CompletionStage<U>；若函数从 T 发起并返回 CompletionStage<U>，使用 thenCompose 得到扁平链，否则 thenApply 会形成 CompletionStage<CompletionStage<U>>。两个任务互不依赖时先并行启动，再用 thenCombine 合并；有先后依赖时用 thenCompose。allOf 只表示所有阶段结束，本身结果为 Void，仍需从各子阶段读取结果；anyOf 返回最先完成的 Object，要注意类型与失败策略。链式 API 描述完成关系，并不自动提供业务超时、取消传播或资源隔离，这些要显式设计。',
        example: '先异步查询用户，再根据 userId 异步查询订单，二者有依赖，写成 findUser(id).thenCompose(user -> findOrders(user.id()))；订单和优惠券都只依赖 userId 时则同时启动两个阶段，再 thenCombine 计算展示模型。最终统一设置超时与异常映射，避免在回调中 join 把本可异步的依赖重新阻塞。',
        followUps: [
          {
            question: 'thenApply 返回 CompletableFuture 会有什么问题？',
            answer: '结果会多嵌套一层，外层完成只说明内层 Future 已创建，不代表内层任务已完成；后续还需再展开。返回异步阶段时通常应该使用 thenCompose。',
          },
          {
            question: 'allOf 为什么不能直接得到 List 结果？',
            answer: 'allOf 的契约只汇聚完成信号并返回 CompletableFuture<Void>。全部成功后仍要按原顺序从各子 Future 读取结果，并明确任一失败、部分结果和取消时的处理策略。',
          },
        ],
        pitfalls: [
          '所有关系都用 thenApply，造成嵌套 Future 和错误的“已完成”判断。',
          '在回调里立即 join 另一个尚未启动或同池受限的任务，破坏并行性甚至造成饥饿。',
        ],
        sources: [OFFICIAL.completableFuture],
      },
      {
        title: 'CompletableFuture 的异常处理和执行线程怎样控制？',
        summary: '非 Async 阶段可能由完成前一阶段的线程直接执行，Async 重载若不传 Executor 通常使用公共池。异常会沿依赖链传播，handle、exceptionally 和 whenComplete 语义不同；生产代码应显式选择执行器、超时和恢复边界。',
        mechanism: 'thenApply 等非 Async 方法的动作可由完成当前阶段的线程执行，不能假设它总在提交线程或某个固定线程；thenApplyAsync 等无 Executor 重载通常使用 ForkJoinPool.commonPool，有 Executor 重载则进入指定执行器。CPU 计算、阻塞 I/O 和关键业务不应无差别挤在公共池。exceptionally 只在异常时提供替代结果，handle 无论成功失败都把两种状态转换为新结果，whenComplete 更适合观察和清理，原异常通常继续传播。join 用 CompletionException 包装失败且不声明受检异常，get 使用 ExecutionException；orTimeout 使阶段在期限后异常完成，completeOnTimeout 提供默认值，但都要评估底层工作是否仍在运行以及取消如何处理。',
        example: '聚合接口把 HTTP 调用放到专用有界 I/O 执行器，thenApply 中只做轻量映射，重计算转入 CPU 执行器。链尾用 orTimeout 限制用户等待，whenComplete 记录耗时并释放追踪上下文，exceptionally 仅对允许降级的“推荐语”返回默认值；订单金额等关键数据异常则继续失败，避免用空值掩盖故障。',
        followUps: [
          {
            question: 'whenComplete 能否像 exceptionally 一样恢复异常？',
            answer: '它主要用于观察成功值或异常并执行副作用，返回阶段通常保留原结果或原异常。需要把异常转换为替代值时使用 exceptionally，需同时映射成功和失败时使用 handle。',
          },
          {
            question: '为什么不应把所有 Async 阶段都丢给 commonPool？',
            answer: '公共池被整个进程共享，阻塞调用或长任务会相互干扰，也难以设置隔离、容量和监控。关键链路应按任务性质使用受控执行器，并明确拒绝和关闭策略。',
          },
        ],
        pitfalls: [
          '误以为非 Async 回调固定运行在主线程，在线程上下文和日志上产生错误假设。',
          '用 exceptionally 为所有异常返回空集合，导致权限、数据和系统故障被静默吞掉。',
        ],
        sources: [OFFICIAL.completableFuture, OFFICIAL.concurrent],
      },
    ],
  },
  {
    title: '并发协作、容器与安全发布',
    questions: [
      {
        title: 'CountDownLatch、CyclicBarrier 与 Phaser 分别适合什么协作场景？',
        summary: 'CountDownLatch 适合一个或多个线程等待若干一次性事件；CyclicBarrier 让固定数量的参与者在同一阶段会合并可重复使用；Phaser 支持多阶段推进以及参与者动态注册和退出。',
        mechanism: 'CountDownLatch 以计数初始化，countDown 递减且不会阻塞，await 等待计数归零，归零后不能重置，常用于启动门或完成门。CyclicBarrier 的参与方调用 await，最后一个到达时可执行 barrier action，随后所有参与者进入下一轮；等待超时、中断或某方失败可能使屏障 broken，其他等待者也要处理异常。Phaser 把流程表示为 phase，支持 register、arrive、arriveAndAwaitAdvance 与 arriveAndDeregister，适合迭代阶段和动态成员。选择时先问参与方是否固定、是否多轮、谁需要等待，不能只因三个工具都能“等线程”就混用。所有等待都应有故障和超时策略。',
        example: '服务启动时主线程用 CountDownLatch 等待配置、缓存和连接池三个一次性初始化完成；并行图像处理的四个固定工作线程每轮都要在“读取—处理—写出”边界会合，可用 CyclicBarrier；分片计算中工作分片会动态增加或提前退出，且要推进多个阶段，则 Phaser 更能表达注册、到达与退出。',
        followUps: [
          {
            question: 'CountDownLatch 的 countDown 调用多了会怎样？',
            answer: '计数降到零后继续 countDown 不会变成负数，也不会报错，但通常暴露调用协议不清。它不能恢复到初始计数，下一轮需要新建实例或改用可复用工具。',
          },
          {
            question: 'CyclicBarrier 中一个参与者超时有什么影响？',
            answer: '该屏障会进入 broken 状态，其他正在等待的参与者通常收到 BrokenBarrierException。调用方必须把这一轮视为整体失败并决定 reset、重建或终止，不能让其余线程继续假装会合成功。',
          },
        ],
        pitfalls: [
          '用 CountDownLatch 承担多轮阶段同步，却忘记它归零后无法重置。',
          '屏障等待没有超时和失败传播，一个参与者退出后其余线程永久等待。',
        ],
        sources: [OFFICIAL.concurrent],
      },
      {
        title: 'Semaphore 如何限制并发资源，许可数为什么不等于线程数？',
        summary: 'Semaphore 维护的是许可，不拥有线程也不自动创建资源。线程在使用稀缺资源前获取许可，结束后归还；许可数应对应可安全并行使用的资源容量，而不是简单照搬请求线程数量。',
        mechanism: 'acquire 在无许可时等待并响应中断，tryAcquire 可立即失败或带超时等待，release 增加许可。信号量本身不追踪某个许可由谁获取，因此无条件 release、重复 release 或未成功获取就 release 都会把容量放大。正确模板是先记录 acquired，成功后再进入 try/finally，并仅在 finally 中归还一次。公平构造可以倾向先到先得，但可能降低吞吐，且 tryAcquire 的无参形式不承诺遵循公平顺序。Semaphore 只限制同时进入某段逻辑的数量，不保证被保护对象自身线程安全，也不替代连接池的借还、健康检查和销毁协议。容量要结合下游上限、延迟与压测调整。',
        example: '第三方 OCR 接口只允许同时 20 个请求，应用在调用前 tryAcquire(100, MILLISECONDS)。获取失败立即返回可重试的繁忙结果；获取成功后在 try 中调用带自身超时的客户端，finally 中 release。许可数固定为对方允许且本服务验证安全的并发量，而不是 Web 线程池的 200；指标同时记录等待时长、拒绝数和实际在途请求。',
        followUps: [
          {
            question: '为什么 release 不应写在没有条件的 finally 中？',
            answer: '如果 acquire 因中断、超时或 tryAcquire 返回 false 而未拿到许可，无条件 release 会凭空增加许可，使并发限制逐渐失效。应只在成功获取后归还一次。',
          },
          {
            question: 'Semaphore 能替代数据库连接池吗？',
            answer: '不能完全替代。它只管理数量，没有连接创建、健康校验、泄漏检测和关闭等生命周期；可以作为某段调用的额外并发门，但实际资源仍应由专用池管理。',
          },
        ],
        pitfalls: [
          '获取失败仍执行 release，运行一段时间后许可数超过真实资源容量。',
          '只有并发许可没有调用超时，持有许可的阻塞任务让全部请求一起停滞。',
        ],
        sources: [OFFICIAL.concurrent],
      },
      {
        title: 'BlockingQueue 为什么是生产者—消费者模型的首选基础工具？',
        summary: 'BlockingQueue 把线程安全队列和等待协议封装在一起，生产者与消费者无需手写 wait/notify。选择有界容量并明确 put、offer、take、poll 的等待语义，可以同时表达背压、超时和关闭策略。',
        mechanism: 'put 在有界队列已满时等待，take 在空队列时等待，二者响应中断；offer 和 poll 有立即返回及带超时重载，便于把拥塞转成显式结果。ArrayBlockingQueue 容量固定且数组存储，LinkedBlockingQueue 可指定容量，若使用其很大的默认上限容易掩盖积压；PriorityBlockingQueue 按优先级取元素但本身通常无界，且相同优先级不保证 FIFO。队列解决传递与等待，不自动定义消费者如何优雅停止。常见方案是中断消费者、显式关闭外层组件，或使用不会与真实数据冲突的结束协议。任务进入队列前后都要保留总截止时间，避免排队后已失去业务价值。',
        example: '日志上传器使用容量 1000 的 ArrayBlockingQueue。低价值调试日志调用 offer 并在队满时计数丢弃，审计日志使用带短超时的 offer，超时则切换本地持久化；上传线程 take 批量发送，组件关闭时设置停止状态并 interrupt 消费者。监控队列深度、等待时长和丢弃率，使背压成为可观测策略而不是内存无限增长。',
        followUps: [
          {
            question: '为什么生产服务通常偏向有界队列？',
            answer: '有界容量把过载限制在已知范围，并迫使系统选择等待、拒绝、降级或落盘。无界积压会把流量峰值转成内存压力和无限延迟，最终常以更难恢复的方式失败。',
          },
          {
            question: 'add、offer 与 put 在队满时有什么差异？',
            answer: 'add 通常抛 IllegalStateException，offer 立即返回 false，put 则等待直到有空间或被中断；带超时 offer 在限定时间内等待。调用方应按业务可丢弃性选择。',
          },
        ],
        pitfalls: [
          '默认使用近似无界队列，把消费者变慢的问题推迟成高内存和超长延迟。',
          '没有关闭协议，应用停止时消费者永久阻塞在 take 或漏处理已入队数据。',
        ],
        sources: [OFFICIAL.concurrent],
      },
      {
        title: 'ReentrantLock、Condition 与 synchronized 的边界怎样选择？',
        summary: '两者都能提供可重入互斥与必要的内存同步语义。简单、词法范围明确的临界区优先 synchronized；需要可中断或限时获取、非块结构解锁、多个条件等待队列时，再选择 ReentrantLock 与 Condition。',
        mechanism: 'synchronized 绑定对象监视器，进入和退出由语言与 JVM 保证，正常返回或抛异常都会自动释放，代码结构更不容易漏锁；每个监视器只有一个 wait set，通过 wait、notify、notifyAll 协作。ReentrantLock 需要显式 lock，并且必须在成功获取后用 try/finally unlock；它额外提供 tryLock、带超时获取、lockInterruptibly、锁状态监测及可选公平策略。一个 Lock 可以 newCondition 出多个 Condition，例如 notEmpty 与 notFull 分离等待者；await 会原子释放关联锁，返回前重新获取，仍必须在 while 中检查条件，signal 也要求当前线程持有关联锁。功能更多不代表默认更快，应按语义需要选，而不是为“高级”替换所有 synchronized。',
        example: '普通账户余额更新只需短临界区且没有限时获取，使用 synchronized(account) 更直接。自定义有界缓冲区希望生产者只唤醒等待空间者、消费者只唤醒等待数据者，可使用一个 ReentrantLock 配两个 Condition；put 在 while(full) 中 notFull.await，成功入队后 notEmpty.signal，并在 finally 中 unlock。若获取锁还受请求截止时间约束，则使用 tryLock(remaining, unit)。',
        followUps: [
          {
            question: 'lock() 与 lockInterruptibly() 有什么区别？',
            answer: 'lockInterruptibly 在等待获取锁期间可以因中断抛出 InterruptedException，适合需要取消的阻塞流程；lock 获取前若已中断也会继续按其契约等待，取得锁后中断状态仍需业务处理。',
          },
          {
            question: 'Condition.await 为什么也必须写在 while 中？',
            answer: '被 signal 只表示条件可能成立，线程还要重新竞争锁，期间状态可能再次变化，也允许虚假唤醒。返回后循环复查业务条件，才能守住缓冲区等共享状态的不变量。',
          },
        ],
        pitfalls: [
          '调用 lock 后没有在 finally 中 unlock，异常路径永久占住显式锁。',
          '把 Condition 对象本身拿去 synchronized 或 wait，混淆两套互不关联的等待协议。',
        ],
        sources: [OFFICIAL.locks, OFFICIAL.object, OFFICIAL.jlsThreads],
      },
      {
        title: 'volatile 能保证什么，为什么不能保证 count++ 的原子性？',
        summary: 'volatile 适合发布单个状态：写入对随后读取该字段的线程可见，并限制相关内存操作越过这次访问重排；它不把“读取、计算、写回”合成一个不可分割动作，所以 volatile count++ 仍会丢更新。',
        mechanism: '对 volatile 字段的写与之后读到该值的读取建立明确的线程间顺序，使写线程在发布前完成的普通写入也能被读取方按规则观察到，因此常用于停止标志、状态位或不可变配置引用。volatile 读写本身是单次访问语义，但 count++ 要先读取旧值、加一、再写回；两个线程可能读到相同旧值并各自写入相同新值。检查后执行、跨多个字段维护不变量也不能靠 volatile 完成，应使用 synchronized、Lock、原子类或更高层协议。volatile 修饰数组变量只约束数组引用的读写，不会自动让元素更新具备同样语义；它也不等于刷新全部业务对象或禁止所有编译器优化。',
        example: '后台任务用 volatile boolean shutdownRequested 作为停止请求：控制线程先写好关闭原因，再把标志设为 true；工作线程每处理一批就读取标志并退出。访问计数不能写 volatile int count 后执行 count++，而应按需求使用 AtomicInteger.incrementAndGet、LongAdder 或锁。配置更新可构造不可变 Snapshot 后一次写入 volatile 引用，读者不再原地修改快照。',
        followUps: [
          {
            question: 'volatile boolean stop 为什么通常可用，volatile int count++ 为什么不行？',
            answer: '停止标志的协议通常只有单次写入和单次读取，不需要把多个动作合并；count++ 包含读、算、写三个步骤，线程可交错执行，单次 volatile 访问无法保护整个复合操作。',
          },
          {
            question: 'volatile 引用指向可变对象后，对象字段都线程安全吗？',
            answer: '不是。正确发布能让读者看到发布前已构造的状态，但对象发布后的独立字段修改仍需要自身同步策略。更稳妥的方式是发布不可变快照，更新时替换整个引用。',
          },
        ],
        pitfalls: [
          '把 volatile 当作轻量锁，用它保护计数累加或多个字段之间的业务不变量。',
          '只给数组引用加 volatile，却假设所有数组元素的并发修改都已受保护。',
        ],
        sources: [OFFICIAL.jlsThreads],
      },
      {
        title: '死锁、活锁与饥饿有什么区别，线上应怎样排查？',
        summary: '死锁是参与线程形成循环依赖而都无法继续；活锁是线程仍在响应和重试，却持续互相让步而没有有效进展；饥饿是某个线程长期得不到所需资源。三者都表现为业务停滞，但线程状态和修复方向不同。',
        mechanism: '典型死锁由互斥资源、持有并等待、不可抢占和循环等待共同形成，常见代码原因是不同路径以相反顺序获取两把锁。活锁中的线程并未永久阻塞，例如双方检测冲突后同时释放、等待相同时间再重试，状态不断变化但完成数不增长。饥饿则可能来自长期占锁、优先级策略、无界任务挤压或总被其他竞争者抢先。排查先确认业务吞吐与排队，再连续获取多份线程转储：死锁关注 BLOCKED 链、监视器或 ownable synchronizer 的拥有者及 JVM 检出的循环；活锁关注高 CPU、重复栈和重试日志；饥饿关注等待时间分布及资源是否总被少数线程占用。修复分别采用统一锁顺序、随机或指数退避、缩短临界区和有界公平策略。',
        example: '转账线程 A 先锁账户 1 再等账户 2，线程 B 顺序相反，会形成稳定的互等；规定始终按账户 ID 升序加锁可消除环。两个同步程序冲突后都固定等待 10 毫秒再重试，日志持续滚动但成功数为零，这是活锁，可加入随机退避。若批处理长期持有单线程资源导致在线请求一直排队，则按等待直方图和持有时长排查饥饿。',
        followUps: [
          {
            question: '为什么 tryLock 加超时不等于已经彻底消除死锁？',
            answer: '它能让线程在等待超时后退出，从而避免永久卡住，但若失败后仍以相同顺序和节奏无限重试，可能转成活锁；外部资源和回调中的锁也仍可能形成环。',
          },
          {
            question: '一次线程转储没有报告死锁就能排除并发停滞吗？',
            answer: '不能。活锁和饥饿通常不会被死锁检测器报告，外部数据库锁也未必出现在 JVM 锁图中。需要连续样本、业务吞吐、外部依赖与等待时长共同判断。',
          },
        ],
        pitfalls: [
          '看到大量 WAITING 就直接判断死锁，没有构造资源拥有与等待的循环关系。',
          '所有重试使用固定间隔，故障恢复后多个线程仍同步碰撞形成活锁。',
        ],
        sources: [OFFICIAL.thread, OFFICIAL.jcmd, OFFICIAL.locks],
      },
      {
        title: 'happens-before 解决什么问题，核心规则有哪些？',
        summary: 'happens-before 是 Java 判断一个线程的写入是否保证对另一个线程可见、执行顺序是否受约束的核心关系。它不是墙上时间先后；没有这条关系的冲突访问可能形成数据竞争，结果不能按单线程直觉推断。',
        mechanism: '常用规则包括：同一线程内按程序顺序，前一个动作先于后一个动作；同一监视器的 unlock 先于随后成功的 lock；对 volatile 字段的写先于随后读到该字段的读取；调用 Thread.start 之前的动作先于新线程中的动作；线程中的全部动作先于其他线程从 join 成功返回或确认线程终止；关系还具有传递性。它描述规范保证，不要求硬件逐条物理执行，也不意味着“代码行看起来更早”就自动成立。若两个线程对同一变量有冲突访问且不存在合适关系，便存在数据竞争；应通过锁、volatile、线程启动/等待、并发容器等建立明确边界。单有原子读写也未必能保护跨变量不变量。',
        example: '主线程先构造不可变配置并赋给普通变量，再调用 worker.start；工作线程读取该配置有 start 规则提供的可见性。工作线程写 result 后结束，主线程成功 join 再读取 result，也有终止等待规则。若两条已运行线程只通过普通 boolean ready 通知，写 data 后写 ready、另一线程轮询 ready 再读 data，则没有可靠边界，应把 ready 设为 volatile 或使用锁、Future。',
        followUps: [
          {
            question: '发生在真实时间更早，是否就一定 happens-before？',
            answer: '不一定。它是由程序顺序和规范定义的同步规则建立的关系，而不是根据日志时间戳推断。两个线程的普通读写即使肉眼看来先后执行，也可能没有该保证。',
          },
          {
            question: 'start 和 join 两条规则分别把可见性传向哪里？',
            answer: 'start 把调用它之前的动作传给新线程开始后的动作；线程终止配合成功 join，则把该线程结束前的动作传给等待线程在 join 返回后的动作，方向不能颠倒。',
          },
        ],
        pitfalls: [
          '用日志时间或 sleep 推断跨线程可见性，没有建立规范定义的同步关系。',
          '只证明单字段读写有序，就进一步声称多个字段的业务操作整体原子。',
        ],
        sources: [OFFICIAL.jlsThreads, OFFICIAL.thread],
      },
      {
        title: '新建对象怎样安全交给其他线程使用？',
        summary: '构造完成不等于其他线程就能可靠看到完整状态。对象引用应通过明确的发布边界交给读者，例如类初始化、同步块、volatile 引用、并发容器或任务提交，并避免在构造期间让 this 提前逃逸。',
        mechanism: '若把新对象直接写入普通共享字段，而读写双方没有同步协议，读者可能没有可靠的可见性保证。常见安全路径包括：对象作为 static final 在类初始化期间建立；在同一监视器保护下写入和读取；写入 volatile 引用并由读者读取该引用；放入 BlockingQueue、ConcurrentMap 等具有并发规范的容器；或在提交任务前构造对象并让任务从执行器边界接收。final 字段在对象正确构造且未提前逸出时还具有额外初始化保证，但它不让对象中所有可变状态永久线程安全。构造函数中注册监听器、启动线程或把 this 放入全局集合，会让其他线程在构造完成前访问半初始化对象，应改为工厂完成构造后再注册。',
        example: '配置刷新先在局部变量中解析并校验出不可变 ConfigSnapshot，全部字段就绪后一次写入 volatile currentConfig。请求线程先读取一次 currentConfig 到局部变量，并在整次请求中使用同一快照。不能先把空 Config 放到普通静态字段，再逐项填充；也不应在 Config 构造函数里把 this 注册到全局监听器。',
        followUps: [
          {
            question: '把引用声明为 volatile 后，对象内部任意修改都自动安全吗？',
            answer: '不会。volatile 引用能建立引用写入和读取的发布边界，但对象发布后的独立字段修改仍需要不可变设计、锁、原子变量或再次发布新快照，不能把引用修饰符当作深层锁。',
          },
          {
            question: '构造函数中启动线程为什么危险？',
            answer: '新线程可能在构造函数完成前取得 this 并读取尚未初始化或尚未满足不变量的字段。这属于提前逸出，应由工厂或 start 方法在完整构造后再启动。',
          },
        ],
        pitfalls: [
          '先发布对象引用再逐个填写字段，使其他线程可能观察到半初始化状态。',
          '认为所有字段是 final 就可以在构造函数中任意泄漏 this，破坏正确构造前提。',
        ],
        sources: [OFFICIAL.jlsThreads, OFFICIAL.concurrent],
      },
      {
        title: 'synchronized 实例方法、静态方法和代码块分别锁住谁，为什么可重入？',
        summary: '实例同步方法锁当前对象 this，静态同步方法锁声明该方法的 Class 对象，代码块锁括号表达式得到的对象。只有竞争同一个锁对象才互斥；同一线程可以重复获得自己已持有的监视器，所以 synchronized 是可重入的。',
        mechanism: '调用某实例的 synchronized 实例方法等价于围绕该实例监视器进入临界区，因此两个不同实例默认不会互相阻塞。static synchronized 与实例无关，使用对应 Class 对象监视器；它和任一实例锁也是两把不同的锁。synchronized(lock) 则精确锁住运行时求值得到的非 null 引用，锁对象应稳定、私有且不暴露。监视器记录拥有线程和重入次数，同一线程已持锁时再进入同一对象的其他同步方法不会自我阻塞，退出每一层后次数递减，最外层退出才真正释放。子类继承的同步实例方法仍锁实际接收者 this，但 synchronized 修饰符本身不会作为可覆盖方法签名的一部分强制子类保持同步。',
        example: 'Counter 的 synchronized increment 与 synchronized value 都锁同一个 Counter 实例，所以同一实例上互斥，不同 Counter 可并行。static synchronized resetAll 锁 Counter.class，并不会自动挡住某实例的 increment；若二者共同修改静态总量，必须统一锁。转账代码使用 private final Object balanceLock，避免锁 String 常量、装箱值或外部可取得对象而被无关代码争用。',
        followUps: [
          {
            question: '实例同步方法能与同类的静态同步方法并发执行吗？',
            answer: '通常可以，因为前者锁具体实例，后者锁 Class 对象，二者不是同一监视器。若它们访问同一份共享状态，这种写法就没有形成共同互斥，需要统一锁策略。',
          },
          {
            question: '可重入为什么对同步方法调用链很重要？',
            answer: '一个已持有对象锁的方法常会调用同对象的另一个同步方法。可重入允许同一线程再次进入并累计持有层数，否则这种正常的封装调用就会把自己永久阻塞。',
          },
        ],
        pitfalls: [
          '以为同一个类的所有 synchronized 方法共用一把锁，混淆实例锁与类锁。',
          '锁住可变字段、字符串常量或公开对象，导致锁身份变化或遭到外部意外竞争。',
        ],
        sources: [OFFICIAL.jlsThreads, OFFICIAL.jlsClasses],
      },
      {
        title: 'CAS 与 Atomic 原子类怎样工作，ABA 问题是什么？',
        summary: 'CAS 按“当前值仍等于预期值才替换”为条件完成单变量更新，AtomicInteger、AtomicReference 等据此提供线程安全的读改写和条件更新。它避免传统互斥阻塞，但竞争下会重试，也不能自动维护多变量事务。',
        mechanism: 'compareAndSet(expected, update) 原子比较当前值和 expected，相等才写入 update 并返回 true，否则不修改并返回 false。incrementAndGet、updateAndGet 等方法通常把这种条件更新封装成重试循环，因此传入的更新函数可能被重复调用，必须无副作用。CAS 只检查当前位模式或引用是否等于预期；若值从 A 变成 B 又回到 A，等待线程可能误以为期间从未变化，这就是 ABA。只关心最终数值的计数场景未必受影响，但无锁栈节点复用等依赖版本历史的算法可能出错，可用 AtomicStampedReference 把引用与版本戳一并比较，或用 AtomicMarkableReference 携带标记。复杂不变量仍应使用锁或更高层并发结构。',
        example: '库存上限为 100 时，循环读取 AtomicInteger 当前值，若 current + delta 超限就拒绝，否则 compareAndSet(current, current + delta)，失败后重新读取。更新函数不发送消息，因为重试可能执行多次。无锁空闲节点表若节点引用可能被移除后又放回，则仅比较引用会漏掉 ABA，可同时维护递增 stamp；真正跨数据库库存和订单写入仍交给事务。',
        followUps: [
          {
            question: 'AtomicInteger 能保证两个计数器之和恒定吗？',
            answer: '不能。它只能保证针对单个变量的指定操作原子，分别更新两个 AtomicInteger 之间仍有可见的中间状态。跨变量不变量需要同一锁、不可变整体快照或其他事务协议。',
          },
          {
            question: '为什么 updateAndGet 的函数不应包含外部副作用？',
            answer: '并发竞争会让一次 CAS 失败并重新计算，更新函数可能执行多次。若函数同时扣款、发消息或写日志，副作用会重复；它应是基于输入计算输出的纯函数。',
          },
        ],
        pitfalls: [
          '认为使用 Atomic 类后包含多个字段的业务操作也自动成为整体原子事务。',
          '在 CAS 重试函数中执行不可重复副作用，竞争失败后产生重复外部动作。',
        ],
        sources: [OFFICIAL.atomic, OFFICIAL.concurrent],
      },
    ],
  },
]
