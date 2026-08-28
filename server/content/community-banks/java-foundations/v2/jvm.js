import { GUIDE, OFFICIAL, withSources } from './sources.js'

export const JAVA_FOUNDATION_V2_JVM = {
  title: '四、JVM 与垃圾回收（11 题）',
  questions: [
    withSources({
      title: 'JVM 运行时数据区包括哪些部分？',
      summary: '常见运行时区域包括线程私有的程序计数器、Java 虚拟机栈和本地方法栈，以及线程共享的堆和方法区；直接内存则位于规范数据区之外。',
      mechanism: '程序计数器记录当前线程下一条字节码位置；虚拟机栈由栈帧组成，保存局部变量、操作数栈和返回信息；本地方法栈服务于 native 调用。堆主要存放对象和数组，是垃圾回收重点。方法区是规范概念，保存类结构、运行时常量池等，HotSpot 从 JDK 8 起主要以本地内存中的 Metaspace 实现，而不是永久代。线程隔离与共享属性影响故障范围，排障时还要关注直接缓冲区、代码缓存和线程栈等非堆消耗。',
      example: '堆使用正常但容器仍被 OOM Kill 时，不能只调大 Xmx；还要检查线程数量乘 Xss、DirectByteBuffer、Metaspace、JIT 代码缓存和本地库。通过进程 RSS、NMT、GC 日志和线程数逐层对账。',
      followUps: [
        { question: '方法区是否等同于永久代或 Metaspace？', answer: '方法区是 JVM 规范的逻辑区域，永久代和 Metaspace 是 HotSpot 在不同版本中的具体实现。' },
        { question: '运行时常量池放在哪里？', answer: '在 JVM 规范中，它是每个类或接口在方法区中的运行时结构，由 class 文件的 constant_pool 表构建，保存字面量以及指向类、字段和方法的符号引用；这些引用可在加载后按需要解析为可直接使用的目标。方法区只是逻辑归属，HotSpot 的具体表项、元数据和关联对象可能分布在 Metaspace 与堆等实现区域，不能据此推断单一物理地址。它也不等同于 String.intern 使用的字符串池，排查时应区分类元数据增长与字符串对象增长。' },
      ],
      pitfalls: ['继续把 JDK 8 以后方法区直接称为永久代。', '只看 Java 堆使用量，忽略直接内存、线程栈和元数据等本地内存。'],
    }, GUIDE.memory, OFFICIAL.jvmsRuntime),
    withSources({
      title: 'Java 堆和虚拟机栈有什么区别？',
      summary: '堆由线程共享，主要承载对象并由 GC 管理；每个线程拥有自己的虚拟机栈，方法调用创建栈帧，返回后帧随即弹出。',
      mechanism: '堆的容量通常由 Xms、Xmx 等参数约束，对象不一定物理连续，逃逸分析还可能消除分配，因此“对象一定在堆上”不宜绝对化。虚拟机栈保存每次方法调用的局部变量表、操作数栈、动态链接和返回信息；栈帧之间按调用关系进出。大量存活对象或分配压力可能导致堆 OOM，过深递归可能导致 StackOverflowError，大量线程还会因每线程栈占用推高进程内存。',
      example: '无限递归通常迅速抛 StackOverflowError；把百万个大对象持续放入静态 List 更可能造成堆 OOM。线上创建数千线程时，即使堆未满，线程栈和系统线程资源也可能先耗尽，需结合 Xss 与并发模型分析。',
      followUps: [
        { question: '局部变量引用和它指向的对象分别在哪里？', answer: '引用可位于当前栈帧的局部变量表，对象通常由堆管理，但具体优化不能用简单物理位置绝对描述。' },
        { question: '栈内存是否由垃圾回收器回收？', answer: '栈帧随方法返回自动弹出，不依靠对象垃圾回收流程；线程结束后其栈整体释放。' },
      ],
      pitfalls: ['把“引用在栈、对象在堆”当作没有任何优化例外的物理定律。', '只通过加大线程栈解决递归问题，未修复无限递归或错误终止条件。'],
    }, GUIDE.memory, OFFICIAL.jvmsRuntime),
    withSources({
      title: '一个 Java 对象从创建到可用经历了什么？',
      summary: '执行 new 前要确保目标类已初始化，随后为对象分配内存、设置零值和对象头、执行构造初始化，最后把引用交给调用代码。',
      mechanism: 'new 指令解析类符号引用，必要时触发类加载、链接和初始化。JVM 在堆中为实例字段与对象元数据安排空间，先把实例字段设为默认零值并建立对象头等运行时信息，然后按语言规则执行实例字段初始化、初始化块和构造器链。构造器总会先完成父类构造过程。对象引用只有在构造流程正常完成并被正确发布后才应交给其他线程；在构造器中把 this 注册到全局位置会造成逸出，让其他线程看到未完成状态。',
      example: 'Repository 构造器若先把 this 放入静态监听器，再初始化连接字段，其他线程可能提前回调并读到 null。应完成构造后由工厂注册，并通过 final 字段、锁或安全容器发布。对象很大或创建频繁时，再结合分配率和逃逸分析判断优化点。',
      followUps: [
        { question: 'new 对象时字段为什么先有默认值？', answer: 'JVM 在执行显式字段初始化和构造器代码前会进行零值准备，保证实例字段具有规范定义的初始状态。' },
        { question: '构造器返回是否意味着其他线程必然看到完整对象？', answer: '不必然。还需要安全发布；final 字段有特殊保证，普通字段仍应借助同步关系传播。' },
      ],
      pitfalls: ['把对象创建简化成“堆上分配一块内存”，漏掉类初始化与构造顺序。', '在构造器中泄漏 this，让其他线程可能观察到半初始化对象。'],
    }, GUIDE.memory, OFFICIAL.jlsExecution, OFFICIAL.jvmsRuntime),
    withSources({
      title: '什么是 GC Roots，可达性分析怎样判断对象存活？',
      summary: '可达性分析从一组 GC Roots 沿引用关系遍历，能到达的对象视为存活候选，无法到达的对象才可能被回收。',
      mechanism: '常见根包括当前线程栈帧中的活动引用、已加载类的静态字段、JNI 全局引用以及 JVM 内部持有对象。GC 在安全点或相应并发阶段获取和处理根，再遍历对象图。引用不可达通常是回收必要条件，但软、弱、虚引用及终结历史机制会影响处理时机。对象之间即使形成环，只要整体不再从 Roots 可达，仍可回收；这也是可达性分析相对简单引用计数的重要能力。',
      example: '双向链表的节点彼此引用，但业务根不再持有整条链后可被 GC 回收。相反，静态 Map 持续保存已经下线租户对象，它们始终从类静态字段可达，会形成内存泄漏；堆转储应查看到 GC Root 的保留路径。',
      followUps: [
        { question: '引用计数为什么难以处理循环引用？', answer: '环内对象互相引用会让计数不归零，即使它们已无法从任何程序根访问。' },
        { question: '对象不可达后是否会立刻释放内存？', answer: '不会保证。还要等待相应 GC 周期和引用处理，具体回收时机由收集器与内存压力决定。' },
      ],
      pitfalls: ['把“互相引用”直接判断为永远无法回收，忽略是否从根可达。', '发现对象数量增长只看类名，不分析到 GC Roots 的保留链。'],
    }, GUIDE.gc, OFFICIAL.gcTuning, OFFICIAL.jvmsRuntime),
    withSources({
      title: '标记—清除、复制和标记—整理算法有什么区别？',
      summary: '标记—清除直接回收不可达区域但可能产生碎片，复制把存活对象搬到新区域，标记—整理则把存活对象压缩后统一释放尾部空间。',
      mechanism: '三类算法的权衡点是存活比例、移动成本、额外空间和停顿：\n- 标记—清除不必搬移所有存活对象，但空闲块分散，后续大对象分配可能困难。\n- 复制算法按存活对象量搬迁，分配连续且简单，却需要目标空间。\n- 标记—整理在标记后移动并压缩存活对象，减少碎片，但移动和更新引用成本更高。\n现代收集器常分区并组合这些思想，不应把整个堆简单归为单一算法。',
      example: '年轻代多数对象很快死亡，复制少量存活对象通常划算；老年代存活率较高，若每次复制全部存活对象成本更大。G1 按 Region 选择回收集合并转移存活对象，本质上组合分区、标记和复制整理思想。',
      followUps: [
        { question: '复制算法是否一定浪费一半内存？', answer: '不一定。经典 semispace 把空间固定分成 from/to 两半，是为了保证最坏情况下所有存活对象都有目标位置；现代分代或区域化收集器可以只选择部分 Region 作为回收集合，再按实际存活量把对象疏散到其他 Survivor 或 Old Region，因此不必永久空置半个堆。代价并没有消失：收集器仍须预留足够的疏散空间，存活率估算错误或目标空间不足会导致 evacuation failure、退化回收甚至 Full GC，可从 GC 日志的回收集合、存活量和 to-space 指标验证。' },
        { question: '对象移动后引用怎样保持正确？', answer: '移动式收集器复制对象时会记录旧地址到新地址的转发关系，并扫描 GC Roots 与已知引用槽，把仍指向旧对象的引用改写或重定向到新位置。停顿式收集器可在应用线程暂停时集中完成更新；并发移动收集器则可能借助读屏障、转发表或带状态的指针，让应用访问时安全解析到新对象。卡表和记忆集主要帮助定位跨代或跨 Region 的引用来源，不能简单等同为“自动修复全部指针”；具体步骤应以所用收集器文档和 GC 日志为准。' },
      ],
      pitfalls: ['把教科书三种算法机械对应到所有现代收集器实现。', '只比较暂停时间，不考虑额外空间、碎片和存活对象复制成本。'],
    }, GUIDE.gc, OFFICIAL.gcTuning),
    withSources({
      title: 'JVM 为什么采用分代收集？',
      summary: '分代利用“大多数对象朝生夕死、熬过多次回收的对象更可能长寿”的经验规律，让不同存活特征的区域采用不同回收频率与策略。',
      mechanism: '年轻代承接大部分新对象并较频繁回收，存活对象经过复制和年龄增长后可能晋升老年代；老年代回收通常更昂贵且频率更低。跨代引用会让年轻代回收不能扫描整个老年代，收集器借助卡表或记忆集记录相关引用。分代是假设与优化策略，不改变对象语义，也不是所有收集器都按固定 Eden、Survivor 比例工作；区域化收集器可以动态安排 Region 角色。',
      example: '接口每次创建的大量临时 DTO 很快失效，适合在年轻代回收；静态缓存长期持有的数据会进入老年代。若缓存无界增长，调大年轻代无法解决，必须控制缓存生命周期并观察晋升率和老年代占用。',
      followUps: [
        { question: '对象年龄达到阈值就一定晋升吗？', answer: '不一定。晋升还受 Survivor 空间、动态年龄判断、分配担保和具体收集器策略影响。' },
        { question: '为什么年轻代 GC 需要关心老年代引用？', answer: '老年代对象可能指向年轻对象，若完全不扫描相关关系，就会把仍被引用的年轻对象误判为垃圾。' },
      ],
      pitfalls: ['把分代规则说成所有 JVM 和收集器都固定不变的布局。', '看到对象晋升就只调年龄阈值，不先确认长期引用是否本来就不该存在。'],
    }, GUIDE.gc, OFFICIAL.gcTuning),
    withSources({
      title: 'Minor GC、Major GC 和 Full GC 有什么区别？',
      summary: 'Minor GC 通常指年轻代回收，Major GC 常被用于老年代回收，Full GC 通常覆盖整个堆并可能处理更多区域；后两者名称在工具和收集器间并不完全统一。',
      mechanism: '这些术语不是 JVMS 为所有实现规定的严格统一事件名。传统分代语境中，Minor GC 回收年轻代，通常频繁且停顿较短；Major GC 有时指老年代回收，有些日志却把它与 Full GC 混用；Full GC 往往进行更完整的堆回收、类卸载或压缩，停顿风险较大。分析时必须看所用 JDK、收集器和 GC 日志事件，例如 G1 的 Young、Mixed、Concurrent Mark 与 Full GC，而不是仅凭口头名称判断。',
      example: '监控显示“Major GC 次数增加”时，先核对采集器如何定义指标，并查看原始 GC 日志的 cause、回收前后占用和暂停。G1 连续 Young GC 本身不等于故障；若最终出现 to-space exhausted 后 Full GC，才需要结合分配与标记进度分析。',
      followUps: [
        { question: 'Minor GC 一定不会回收老年代对象吗？', answer: '在传统分代 HotSpot 语境中，Young/Minor GC 的回收集合通常只包含年轻代，不会把老年代 Region 当作本次回收目标；它仍要扫描记忆集中的老年代到年轻代引用，但“处理跨代引用”不等于回收老年代对象。G1 的 Mixed GC 会在年轻代之外加入部分老年代 Region，Full GC 的范围又更大，而 Major GC 这个名称在不同工具中并不统一。因此不能只看口头名称，应核对原始 GC 日志中的 Young、Mixed、Full 事件及各区域回收前后占用。' },
        { question: 'Full GC 次数为零就代表 GC 健康吗？', answer: '不代表。频繁年轻代停顿、并发周期跟不上或分配失败同样可能造成严重延迟。' },
      ],
      pitfalls: ['把 Major GC 与 Full GC 当作所有 JVM 中完全统一的同义词。', '只看 GC 次数，不看暂停、回收效果、分配率和触发原因。'],
    }, GUIDE.xiaolinJvm, OFFICIAL.gcTuning),
    withSources({
      title: '类加载过程包括哪些阶段？',
      summary: '类从字节流进入可用状态通常经历加载、链接和初始化；链接又分验证、准备与解析，初始化执行类变量赋值和静态初始化块。',
      mechanism: '加载阶段查找类的二进制表示并创建对应 Class 对象。验证检查格式、字节码和符号等安全性；准备为静态字段分配并设置默认值，编译期常量有特殊处理；解析把常量池中的符号引用转换为直接引用，允许按实现延迟。初始化执行编译器生成的类初始化方法，按父类先于子类的规则处理静态字段赋值和静态块。加载、链接和初始化在时间上可交错或延迟，但必须满足规范约束。',
      example: '声明 static int x = compute() 时，准备阶段先给 x 零值，初始化阶段才调用 compute 赋业务值。仅定义 Class 类型字面量或创建数组不一定触发目标类初始化，而 new、访问非编译期常量静态字段等通常属于主动使用。',
      followUps: [
        { question: '加载完成是否代表静态代码块已经执行？', answer: '不代表。静态代码块属于初始化阶段，加载和链接可先完成而初始化尚未发生。' },
        { question: '访问 static final 常量一定触发类初始化吗？', answer: '不一定。编译期常量可能被内联到调用方，读取时无需初始化声明该常量的类。' },
      ],
      pitfalls: ['把加载、链接、初始化合并成一个模糊步骤，解释不了静态字段零值。', '认为任何对 Class 的接触都会立即执行静态初始化块。'],
    }, GUIDE.classLoading, OFFICIAL.jlsExecution),
    withSources({
      title: '什么是双亲委派模型，它有什么作用？',
      summary: '类加载器接到加载请求时通常先委派父加载器，父级无法完成才自行查找；这样能复用已加载类并保护 Java 核心类型的一致性。',
      mechanism: '常见层次包括 Bootstrap、Platform 和 Application ClassLoader，自定义加载器通常继承 ClassLoader.loadClass 的委派逻辑。类身份由“完整类名加定义它的类加载器”共同决定，同名 class 被两个互不关联的加载器定义后类型并不相同。双亲委派避免应用随意用自定义 java.lang.String 替换核心类，也减少重复加载。它不是不可打破的绝对规定，SPI、模块化服务器和热部署会使用线程上下文加载器、子优先等受控机制。',
      example: '插件系统可为每个插件建立独立 ClassLoader，使不同版本依赖隔离；跨加载器交互通过父加载器可见的公共接口。若直接把插件实现类强转为主应用中“同名”类，可能出现 ClassCastException，因为定义加载器不同。',
      followUps: [
        { question: '双亲委派中的父子是 Java 继承关系吗？', answer: '不一定。它描述加载请求的委派关系，通常通过持有 parent 引用实现，并非必须由类继承表达。' },
        { question: '为什么 SPI 常需要线程上下文类加载器？', answer: '父加载器定义的框架接口需要发现应用层实现，而父级默认看不到子级类，因此借上下文加载器反向查找。' },
      ],
      pitfalls: ['把双亲委派描述成“父加载器一定先加载所有类”，忽略按请求和失败回退。', '只知道能防核心类替换，不理解类身份还包含定义加载器。'],
    }, GUIDE.classLoader, OFFICIAL.classLoader, OFFICIAL.jlsExecution),
    withSources({
      title: 'OutOfMemoryError 和 StackOverflowError 有什么区别？',
      summary: 'StackOverflowError 通常来自单线程调用栈过深，OutOfMemoryError 表示 JVM 无法在某个内存区域满足分配；OOM 不只可能发生在 Java 堆。',
      mechanism: '无限递归或过深调用会不断创建栈帧，超过线程栈能力后抛 StackOverflowError。OOM 需要看错误消息和区域：Java heap space 常见于真实泄漏、容量不足或瞬时分配；Metaspace 可能来自大量动态类及其加载器不能卸载；direct buffer memory 涉及直接内存；unable to create native thread 可能是线程数、地址空间或系统限制。两者都属于 Error，不应靠常规 catch 后继续运行，应该先保存堆转储、线程转储、GC 日志和系统指标。',
      example: '递归解析深层树导致 StackOverflow，应改迭代或限制深度，而不是只调大 Xss。堆 OOM 时先比较对象数量和到 GC Root 的路径；若容器被杀却没有 Java 堆 OOM，则核对 RSS、线程栈和直接内存。',
      followUps: [
        { question: '调大 Xmx 能解决所有 OOM 吗？', answer: '不能。非堆、直接内存、线程和操作系统限制导致的问题不会由 Xmx 解决，内存泄漏也只是延后失败。' },
        { question: 'StackOverflowError 是否只可能由无限递归造成？', answer: '不是。每次方法调用都要在线程的有限栈空间中建立栈帧，保存局部变量、操作数和返回信息；无限递归只是最常见的持续压栈方式，有限但过深的调用链、局部变量较多导致的大栈帧，或较小的 -Xss 也可能先耗尽栈。应从异常栈追踪观察重复帧和调用深度，并修复递归终止、改为迭代或限制输入深度；盲目调大 -Xss 只会推迟错误，还会增加每线程内存并限制可创建线程数。' },
      ],
      pitfalls: ['看到任何内存问题都先增大 Xmx，没有确认具体失败区域。', '捕获 OOM 后继续提供服务，忽略进程状态和诊断证据可能已经不可靠。'],
    }, GUIDE.memory, OFFICIAL.throwable, OFFICIAL.jvmsRuntime),
    withSources({
      title: 'G1 收集器有什么特点，Full GC 频繁时怎样排查？',
      summary: 'G1 是面向较大堆的垃圾收集器，它把堆切成许多小区域（Region），每次优先回收预计收益高的区域，以尽量满足停顿目标。Full GC 频繁表示并发回收来不及或出现特殊压力，应先看 GC 日志中的触发原因，再检查对象分配速度、回收后存活量、大对象和并发标记是否及时完成。',
      mechanism: 'G1 让 Region 动态承担 Eden、Survivor、Old 或大对象角色，年轻代回收转移存活对象，并发标记后可执行 Mixed GC 回收部分老年代 Region。它以停顿目标做启发式选择，不承诺每次都满足目标。Full GC 常见线索包括并发周期启动过晚、分配或晋升速度过快、Humongous 对象占用、转移空间不足、显式 System.gc 或真实长期存活集接近堆上限。先读 GC 日志中的 cause、各区域变化、暂停与回收效果，再结合堆和业务分配定位。',
      example: '若日志显示大量 Humongous 分配后触发并发模式失败，应定位超大 byte 数组来源，而不是只增加并发 GC 线程。若老年代回收后仍接近上限，获取 heap dump 分析 dominator 与 GC Root；若回收效果好但很快涨满，则重点查分配率和流量。',
      followUps: [
        { question: '设置 MaxGCPauseMillis 是否能硬性限制停顿？', answer: '不能，它是收集器的软目标，实际停顿仍受存活对象、根扫描、系统资源和回收失败影响。' },
        { question: '排查 Full GC 最先应看哪些信息？', answer: '先看时间线、GC cause、回收前后占用、暂停、分配和晋升速率，再决定是否抓堆或调整参数。' },
      ],
      pitfalls: ['看到 Full GC 就先堆叠 JVM 参数，未确认触发原因和回收效果。', '把 G1 的停顿目标当作任何负载下都能严格兑现的 SLA。'],
    }, GUIDE.xiaolinJvm, OFFICIAL.gcTuning, OFFICIAL.jcmd),
  ],
}
