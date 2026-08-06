# Java 基础高频 60 题

# 一、Java 语言基础（14 题）

## Q1：Java 有哪些核心特点，为什么能跨平台？

**短回答：**

Java 的核心是面向对象、静态类型、自动内存管理和丰富标准库；“一次编译，多处运行”来自统一字节码与各平台 JVM 的配合。

**原理：**

理解跨平台要分三层：
- javac 把源码编译成与具体 CPU 指令集无关的 class 字节码。
- Windows、Linux 等平台分别提供遵循 JVM 规范的虚拟机，把同一份字节码解释或编译成本机指令。
- 标准库屏蔽大量操作系统差异，但本地库、文件路径、字符集和系统命令仍可能破坏可移植性。
因此跨平台是运行时抽象带来的能力，不代表任何 Java 程序无需验证就能在所有环境得到完全相同的行为。

**代码 / 场景：**

同一个 Spring Boot jar 可以在安装了兼容 JRE 的 Windows 和 Linux 上启动。若代码硬编码 C 盘路径、调用仅 Windows 存在的命令，或加载某个平台的 JNI 动态库，应用层仍会失去跨平台能力；上线前需要在目标 JDK、操作系统和容器限制下测试。

**递进追问：**

1. **Java 是纯编译型还是纯解释型语言？**

   都不准确。源码先编译为字节码，JVM 可解释执行，也会把热点代码即时编译为本机机器码。

2. **字节码跨平台是否意味着 JVM 本身也跨平台？**

   不是。同一份字节码可复用，但每种操作系统和处理器需要对应实现的 JVM 可执行程序。

**易错点：**

- 把跨平台说成“Java 程序与操作系统完全无关”，忽略本地资源与环境差异。
- 只背“一次编译到处运行”，说不清字节码、JVM 和本机指令之间的关系。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [技术校准：Oracle Java 21 文档总览](https://docs.oracle.com/en/java/javase/21/)
- [技术校准：JVMS 2：JVM 结构与运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)

校验日期：2026-08-06

## Q2：JDK、JRE 和 JVM 有什么区别？

**短回答：**

JVM 负责执行字节码，JRE 表示运行 Java 程序所需的虚拟机和类库，JDK 则在运行能力之上提供编译、诊断和打包等开发工具。

**原理：**

可以按“执行引擎—运行环境—开发套件”理解：
- JVM 规范定义类加载、字节码执行和运行时数据区等规则，HotSpot 等具体 JVM 实现这些规则，并提供内存管理与垃圾回收能力。
- 传统概念中的 JRE 包含 JVM 和运行时类库，面向只运行程序的场景。
- JDK 包含 javac、java、javadoc、jcmd、jstack 等工具，是开发、构建和排障所需的完整套件。
从 JDK 9 模块化以后，Oracle 不再像早期版本那样单独发布通用 JRE 安装包，生产镜像也可通过 jlink 裁剪，因此回答时要区分概念关系与现代发行方式。

**代码 / 场景：**

CI 环境需要 javac 和测试工具，所以使用 JDK；生产容器可用同版本 JDK 运行，也可通过 jlink 生成只含所需模块的运行时。若线上只留下极度裁剪的镜像，发生故障时可能缺少 jcmd 等工具，部署设计应提前考虑诊断能力。

**递进追问：**

1. **生产环境必须只安装 JRE 吗？**

   不必须。现代发行版常直接提供 JDK 或定制运行时，关键是版本兼容、安全更新、镜像体积与诊断能力之间的取舍。

2. **javac 和 java 命令分别做什么？**

   javac 主要把 Java 源文件编译为 class 字节码，java 命令创建运行时并加载主类执行程序。

**易错点：**

- 沿用旧版本安装包结论，声称现代 JDK 一定自带一个可单独识别的 jre 目录。
- 把 JVM 等同于整套 JDK，导致说不清编译工具和运行时组件边界。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [技术校准：Oracle Java 21 文档总览](https://docs.oracle.com/en/java/javase/21/)
- [技术校准：JVMS 2：JVM 结构与运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)

校验日期：2026-08-06

## Q3：什么是 Java 泛型，类型擦除是什么意思？

**短回答：**

泛型把类型作为参数，在编译期提供类型检查并减少强制转换；Java 泛型主要通过类型擦除实现，多数类型参数不会原样保留到运行时。

**原理：**

可以从“编译期约束”和“运行时表示”两层理解：
- `List<String>` 限制调用方按字符串读写，编译器能更早发现类型错误。
- 泛型默认不协变，`List<Integer>` 不是 `List<Number>` 的子类型。
- `? extends T` 适合读取 T，通常不能安全写入具体值；`? super T` 适合写入 T，读取时只能按 Object 看待。
- 编译后，类型变量通常擦除为上界或 Object，编译器补充必要的类型转换，并可能生成桥接方法维持多态。
因此不能创建 `new T()`，也不能用 `instanceof List<String>` 判断元素的实际泛型参数。

**代码 / 场景：**

复制数字列表时可把方法参数写成 `List<? extends T> source` 与 `List<? super T> target`：`List<Integer>` 可以作为来源，`List<Number>` 可以作为目标。若直接使用原始类型 `List`，错误元素可能直到取值和隐式转换时才暴露为 ClassCastException。

**递进追问：**

1. **为什么 List<String> 和 List<Integer> 的运行时 Class 通常相同？**

   两者在编译后都擦除为原始 List 类型，字符串或整数参数主要用于编译期检查，不形成两个独立运行时类。

2. **泛型方法和泛型类有什么区别？**

   泛型类的类型参数作用于整个实例类型；泛型方法在自己的方法签名中声明类型参数，可独立于所属类进行类型推断。

**易错点：**

- 把 `List<Integer>` 当成 `List<Number>` 使用，忽略泛型默认不协变。
- 使用原始类型绕过编译期检查，把类型错误推迟到运行时。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（下）](https://javaguide.cn/java/basis/java-basic-questions-03.html)
- [技术校准：JLS 4：类型、值与变量](https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html)

校验日期：2026-08-06

## Q4：Java 的基本类型和引用类型有什么区别？

**短回答：**

八种基本类型直接表示布尔、整数、浮点或字符值；引用类型变量保存对象或数组的引用，两者在默认值、空值、泛型和相等比较上表现不同。

**原理：**

基本类型包括 boolean、byte、short、int、long、char、float、double，它们不是对象且不能为 null；引用类型包括类、接口和数组，引用可为 null。字段与数组元素会获得零值、false 或 null，局部变量必须先确定赋值才能读取。基本值比较通常比较数值，引用使用双等号比较是否指向同一对象。泛型实参要求引用类型，因此基本值进入 List<Integer> 会装箱。JLS 规定语言语义，但不要随意把引用解释成固定大小的“内存地址”，实际表示由 JVM 决定。

**代码 / 场景：**

成员字段 int count 初始为 0，String name 初始为 null；方法内写 int n 后直接读取会编译失败。List<int> 不合法，需要 List<Integer>。判断一个可能为空的 Integer 是否等于 1 时要先处理 null，避免拆箱触发空指针。

**递进追问：**

1. **char 一定能表示一个完整 Unicode 字符吗？**

   不一定。char 是一个 UTF-16 代码单元，补充平面字符需要两个代理项，应按代码点处理。

2. **final 引用是否意味着对象不可变？**

   不是。final 只限制该变量再次绑定，引用指向对象的字段或集合内容仍可能改变。

**易错点：**

- 背诵每种类型位数时给 boolean 强行指定语言规范未承诺的存储大小。
- 把引用变量本身和被引用对象混为一谈，误认为 final 会深度冻结对象。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [技术校准：JLS 4：类型、值与变量](https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html)
- [技术校准：JLS 14：语句与控制流](https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html)

校验日期：2026-08-06

## Q5：int 和 Integer 有什么区别，自动装箱有哪些坑？

**短回答：**

int 是不能为 null 的基本类型，Integer 是对象包装类型；自动装箱简化转换，但缓存、引用比较和 null 拆箱容易制造隐藏错误。

**原理：**

装箱把 int 转成 Integer，拆箱反向取出 int。核心差异包括：
- Integer 可用于泛型并能表达 null，代价是对象语义和潜在分配。
- 对两个 Integer 使用双等号比较引用身份，不是稳定的数值比较；部分小整数装箱结果会缓存。
- 包装对象参与算术或赋给 int 时会拆箱，null 在此时抛出 NullPointerException。
- 方法重载会依据编译期类型和转换阶段选择基本类型或包装类型版本。
数值比较优先用 equals 或先明确空值策略，热点计算则避免不必要装箱。

**代码 / 场景：**

Integer a = 127 与 b = 127 可能因缓存使 a == b 为 true，而 128 的两个对象常为 false，业务不能依赖这一差异。Map.get 返回 Integer，直接赋给 int 时若键不存在就会空指针，可用 getOrDefault 或显式判断 null。

**递进追问：**

1. **为什么 Integer 缓存范围外不能用双等号比较？**

   双等号比较对象身份，而缓存范围外的装箱不保证复用同一实例，数值相同也可能是两个对象。

2. **Integer.equals(Long) 在数值相同情况下会返回什么？**

   返回 false，因为包装类 equals 通常同时要求相同包装类型，跨类型数值比较需要先统一类型。

**易错点：**

- 用 Integer 的双等号判断业务数值相等，让结果偶然依赖缓存。
- 把可能为 null 的包装值直接参与运算，忽略隐式拆箱位置。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [技术校准：JLS 5：转换与上下文](https://docs.oracle.com/javase/specs/jls/se21/html/jls-5.html)
- [技术校准：Java 21 Integer API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html)

校验日期：2026-08-06

## Q6：为什么金额计算通常使用 BigDecimal？

**短回答：**

double 无法精确表示多数十进制小数，金额需要明确的小数精度与舍入规则，因此通常使用以十进制数值语义工作的 BigDecimal。

**原理：**

二进制浮点只能近似表示许多十进制分数，所以 0.1 加 0.2 不一定精确等于 0.3。BigDecimal 由任意精度整数和 scale 表达十进制数，使用时要注意：
- 优先用字符串构造或 BigDecimal.valueOf，避免把 double 的近似误差带入。
- 除法可能无限不循环，必须按业务指定 scale 与 RoundingMode。
- equals 同时比较数值和 scale，compareTo 只比较数值大小。
- BigDecimal 不可变，每次运算返回新对象，必须接住结果。

**代码 / 场景：**

订单金额可写 `new BigDecimal("19.90")` 乘 `BigDecimal.valueOf(3)`，分摊时显式保留两位并指定 HALF_UP 或财务要求的模式。`new BigDecimal("1.0")` 与 `new BigDecimal("1.00")` 用 equals 不相等，但 compareTo 返回 0。

**递进追问：**

1. **BigDecimal 可以直接用双等号比较吗？**

   不可以，双等号只比较对象身份；数值比较按是否关心 scale 选择 equals 或 compareTo。

2. **所有科学计算都应该换成 BigDecimal 吗？**

   不一定。科学计算常接受可量化误差并重视浮点吞吐，应基于误差模型和性能目标选择。

**易错点：**

- 用 `new BigDecimal(0.1)` 构造金额，把已有二进制近似完整带入。
- 调用 divide 时不指定无法整除情况下的精度和舍入规则。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [技术校准：Java 21 BigDecimal API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/math/BigDecimal.html)

校验日期：2026-08-06

## Q7：Java 是值传递还是引用传递？

**短回答：**

Java 只有值传递：基本类型复制具体值，引用类型复制引用值；方法能修改双方共同指向的对象，却不能替调用方变量重新绑定。

**原理：**

方法调用时，每个形参都会得到实参值的一份副本。基本类型的副本是数值，引用类型的副本是指向同一对象的引用值。于是方法内通过形参修改对象字段，调用方随后能看到共享对象的状态变化；但把形参赋成另一个新对象，只改变局部引用副本。数组也是对象，修改元素可见，重新给形参数组赋值不可见。准确说“复制了引用值”能解释现象，也避免误导为 C++ 式引用参数。

**代码 / 场景：**

方法 `rename(User u)` 先执行 `u.name = "Li"`，再执行 `u = new User("Wang")`。调用后原 User 的 name 变为 Li，但调用方变量不会指向 Wang。想交换两个调用方引用，应该返回结果并由调用方重新赋值。

**递进追问：**

1. **为什么传入 List 后 add 的结果能被调用方看到？**

   双方引用值虽然各自独立，却指向同一个 List 对象，add 修改的是这个共享对象。

2. **String 参数为何看起来修改不了？**

   String 不可变，所谓修改会创建新对象并重绑局部形参，不会改变调用方的变量。

**易错点：**

- 把“引用值的副本”简称为引用传递，错误认为方法能重绑调用方变量。
- 为避免副作用只复制外层集合，实际仍与调用方共享内部可变元素。

**参考来源：**

- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 15：表达式](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html)
- [技术校准：JLS 4：类型、值与变量](https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html)

校验日期：2026-08-06

## Q8：面向对象的封装、继承和多态分别是什么？

**短回答：**

封装保护状态与不变量，继承建立可替换的类型关系，多态让调用方依赖抽象并在运行时选择具体实现；三者共同降低变化传播。

**原理：**

封装不只是把字段改成 private，而是让状态只能通过能校验规则的方法变化。继承表达“子类型是父类型”，只有子类能在父类所有合法场景中替代父类时才合理；仅为复用代码通常优先组合。多态主要体现在实例方法动态分派：编译期按静态类型确认可调用签名，运行时按实际对象选择重写实现。字段、静态方法和 private 方法不走相同的动态分派。好的抽象还要明确失败、生命周期与线程安全契约。

**代码 / 场景：**

支付模块定义 PaymentMethod.pay，银行卡和余额分别实现，订单服务只依赖接口。账户余额通过 debit 方法检查余额并更新，不能只暴露 setBalance。若 OrderService 只是想复用日志能力，应组合 Logger，而不是让它继承 Logger。

**递进追问：**

1. **为什么组合通常比实现继承更稳？**

   组合只依赖公开契约，不继承内部状态和可重写钩子，并且可以更灵活地替换实现。

2. **多态是否只发生在接口调用上？**

   不是。普通父子类的实例方法重写也会动态分派，接口只是更清晰地隔离抽象与实现。

**易错点：**

- 只背三个定义，不说明它们怎样维护业务不变量和隔离变化。
- 把代码复用当作继承的充分理由，忽略子类型可替换关系。

**参考来源：**

- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)
- [技术校准：JLS 9：接口](https://docs.oracle.com/javase/specs/jls/se21/html/jls-9.html)

校验日期：2026-08-06

## Q9：方法重载和方法重写有什么区别？

**短回答：**

重载是在同一作用域用不同参数列表提供多个方法，编译期决定调用哪一个；重写是子类替换可继承实例方法实现，运行时动态分派。

**原理：**

重载关注方法签名的参数类型、个数或顺序，不能只靠返回值区分；解析依据表达式的编译期类型，并按基本类型宽化、装箱、可变参数等适用阶段选择最具体方法。重写要求方法签名兼容，返回类型可协变，访问权限不能更严格，受检异常不能扩大。实例方法重写参与动态分派；static 方法是隐藏，private 方法不被子类继承，final 方法明确禁止重写。

**代码 / 场景：**

同时存在 print(long) 和 print(Integer) 时，传入 int 字面量通常选择 long，因为无需装箱的宽化阶段先适用。Animal a = new Dog() 调用 a.sound() 时，编译器确认 Animal 有该签名，运行时执行 Dog 的重写实现。

**递进追问：**

1. **返回值不同能构成合法重载吗？**

   不能。调用处可能不接收返回值，编译器无法仅靠返回类型区分同名同参数方法。

2. **构造器能被重写吗？**

   不能。构造器不被继承，因此只能在同一个类中重载，子类构造器会调用父类构造过程。

**易错点：**

- 把重载也说成运行时根据对象真实类型选择，混淆静态绑定与动态分派。
- 认为 static 同名方法属于重写，忽略它只按引用静态类型进行隐藏解析。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)
- [技术校准：JLS 15：表达式](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html)

校验日期：2026-08-06

## Q10：接口和抽象类有什么区别，应该怎样选择？

**短回答：**

接口侧重定义跨类型能力与契约，抽象类适合共享受控状态和模板实现；选择关键是领域关系与演进边界，而不是简单比较是否能写方法。

**原理：**

类只能直接继承一个类，却可以实现多个接口。抽象类可有实例字段、构造器、不同可见性的成员和抽象方法，适合同一家族共享状态与骨架。接口字段隐式为 public static final，方法可包含 abstract、default、static 和 private 形式，但不持有每个实现对象的可变实例状态。default 方法用于兼容演进而非替代完整基类。若调用方只需要某种能力，优先依赖小接口；只有确实存在稳定“是一个”关系和共享不变量时再引入抽象类。

**代码 / 场景：**

不同存储实现都具备 Repository 能力，可以实现同一接口；若多种账户共享 id、开户规则和受保护状态迁移，可由 AbstractAccount 提供模板。不要创建只有空实现的巨大接口，也不要为了复用两个工具方法强迫无关类继承共同父类。

**递进追问：**

1. **接口有 default 方法后是否等同抽象类？**

   不等同。接口仍没有每个实例的构造和可变字段，并保留多实现能力，状态模型和继承约束不同。

2. **抽象类可以不包含抽象方法吗？**

   可以。它仍可通过 abstract 阻止直接实例化，并为子类提供共同状态和实现。

**易错点：**

- 继续用“接口不能有实现”解释区别，忽略现代 Java 的 default 与 private 方法。
- 仅因想复用代码就建立抽象父类，制造不成立的继承关系。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（中）](https://javaguide.cn/java/basis/java-basic-questions-02.html)
- [技术校准：JLS 9：接口](https://docs.oracle.com/javase/specs/jls/se21/html/jls-9.html)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)

校验日期：2026-08-06

## Q11：双等号、equals 和 hashCode 有什么关系？

**短回答：**

基本类型的双等号比较数值，引用类型的双等号比较身份；equals 定义逻辑相等，而相等对象必须返回相同 hashCode 才能正确用于哈希容器。

**原理：**

Object.equals 默认仍是身份相等，值对象需要按业务身份重写，并满足自反、对称、传递、一致和非空约束。hashCode 的核心契约是：equals 为 true 的对象必须得到相同哈希值；反过来哈希相同不代表 equals。HashMap、HashSet 先用哈希定位候选桶，再用 equals 区分键。若只重写 equals，不同步重写 hashCode，相等对象可能进入不同桶。参与两者计算的字段在作为键期间也应保持稳定。

![Java 引用相等、equals 语义相等与 hashCode 散列契约关系图](/content/diagrams/java-foundations/object-contract-v1.svg "先区分引用身份与业务相等，再确保相等对象产生相同散列值，集合才能稳定定位元素。")

**代码 / 场景：**

UserId 值对象按 id 重写 equals 和 hashCode 后，两次反序列化得到的对象可作为同一 Map 键。若对象放进 HashSet 后修改参与哈希的 id，集合可能无法在新旧桶位置正确找到或删除它，因此更适合使用不可变键。

**递进追问：**

1. **两个对象 hashCode 相同就一定 equals 吗？**

   不一定。哈希值空间有限，碰撞是允许的，容器还需要继续调用 equals 确认逻辑相等。

2. **为什么枚举常量通常可以用双等号？**

   每个枚举常量由运行时提供唯一实例，身份比较正好符合其语义，也避免 null 调用 equals。

**易错点：**

- 只重写 equals 而不重写 hashCode，破坏哈希集合查找契约。
- 把可变字段放进哈希计算，并在对象作为键期间修改该字段。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（中）](https://javaguide.cn/java/basis/java-basic-questions-02.html)
- [技术校准：Java 21 Object API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html)
- [技术校准：Java 21 HashMap API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html)

校验日期：2026-08-06

## Q12：String 为什么不可变，StringBuilder 和 StringBuffer 怎么选？

**短回答：**

String 创建后内容不再变化，便于共享、缓存、哈希与并发读取；频繁拼接用可变缓冲区，单线程优先 StringBuilder，需要同步语义才考虑 StringBuffer。

**原理：**

String 的字符内容对外没有原地修改入口，拼接和 replace 都返回新对象。不可变使字符串池、安全参数和缓存的 hashCode 更可控，也便于跨线程安全共享。编译器可折叠常量拼接，但循环内反复使用加号可能创建大量中间对象。StringBuilder 提供非同步的可变字符序列，通常适合局部拼接；StringBuffer 的公开操作带同步，单次方法线程安全，但多步复合逻辑仍需外部协调。三者都不应被误解为自动解决编码和 Unicode 边界。

**代码 / 场景：**

生成一万行 CSV 时，应在方法内创建 StringBuilder 并连续 append，最后一次 toString；直接在循环中 result = result + line 会不断复制已有内容。若缓冲区只属于当前请求，没有理由使用 StringBuffer 增加同步开销。

**递进追问：**

1. **`String s = "a" + "b"` 一定创建多个运行时对象吗？**

   不一定。编译期常量表达式可被折叠为一个常量，变量参与的拼接才需要结合字节码和运行时优化判断。

2. **StringBuffer 能保证一组 append 的整体原子性吗？**

   不能自动保证。每次方法调用可同步，但多个调用组成的业务步骤仍可能被其他线程穿插。

**易错点：**

- 笼统说所有加号拼接都慢，忽略常量折叠和编译器生成策略。
- 把 StringBuffer 单方法同步等同于任意复合操作都线程安全。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（中）](https://javaguide.cn/java/basis/java-basic-questions-02.html)
- [技术校准：Java 21 String API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html)
- [技术校准：Java 21 StringBuilder API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringBuilder.html)
- [技术校准：Java 21 StringBuffer API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringBuffer.html)

校验日期：2026-08-06

## Q13：Java 的异常体系是怎样的，受检异常和非受检异常有何区别？

**短回答：**

Throwable 分为 Error 与 Exception；Exception 中除 RuntimeException 体系外通常属于受检异常，编译器要求捕获或声明，非受检异常则不强制处理。

**原理：**

Error 多表示应用通常难以恢复的运行环境问题，不应靠普通业务捕获继续运行。受检异常用于调用方有合理恢复动作的失败，方法签名必须 throws 或在内部捕获；RuntimeException 及其子类常表达参数、状态或编程错误。异常设计应保留原始 cause，添加必要上下文，并在能真正恢复、转换边界或统一记录的位置处理。try-with-resources 会逆序关闭 AutoCloseable 资源，关闭异常作为 suppressed 附加，优于手写 finally 覆盖主异常。

**代码 / 场景：**

读取配置文件失败可在基础设施层捕获 IOException，附带文件名后转换为领域启动异常并保留 cause；不能空 catch 后返回默认值掩盖错误。数据库连接和输入流放入 try-with-resources，确保正常与异常路径都释放。

**递进追问：**

1. **业务异常一定要设计成受检异常吗？**

   不一定。应看调用方是否能合理恢复以及团队 API 约定，不能只按“业务”二字机械选择。

2. **为什么不建议直接 catch Throwable？**

   它会连 Error 一起捕获，可能让内存耗尽等严重状态被误当作普通失败继续执行。

**易错点：**

- 捕获 Exception 后既不处理也不继续抛出，导致根因和失败信号丢失。
- 每层都记录同一异常再抛出，造成重复日志却没有新增上下文。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（下）](https://javaguide.cn/java/basis/java-basic-questions-03.html)
- [技术校准：JLS 11：异常](https://docs.oracle.com/javase/specs/jls/se21/html/jls-11.html)
- [技术校准：Java 21 Throwable API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Throwable.html)

校验日期：2026-08-06

## Q14：什么是反射，它有哪些典型用途和代价？

**短回答：**

反射让程序在运行时检查类、方法、字段和构造器并进行动态调用，常用于框架装配、序列化和测试，但会削弱静态检查与封装边界。

**原理：**

反射入口通常来自 Class 对象，可查询声明成员、注解与类型信息，再通过 Constructor、Method 或 Field 执行操作。它支撑依赖注入、ORM 映射和通用序列化，但需要处理访问权限、参数转换、包装异常和模块开放。现代 JVM 会优化部分反射路径，不能简单宣称一定慢几十倍；真正代价还包括启动扫描、缓存、可读性、重构安全和原生镜像可达性配置。若类型在编译期已知，普通调用或明确接口通常更可靠。

**代码 / 场景：**

测试框架可扫描带 Test 注解的方法并动态执行，ORM 可依据映射创建实体。生产代码应缓存已解析的 Method 或元数据，启动时校验签名并给出清晰错误；不要在每条高频请求上重复扫描所有类。

**递进追问：**

1. **Class 对象常见的获取方式有哪些？**

   可使用类型字面量、对象的 getClass，或按类名由 Class.forName 触发加载；三者适用时机不同。

2. **反射是否可以无条件访问 private 成员？**

   不可以。访问检查、模块 opens、运行环境策略和 API 限制都可能阻止深反射。

**易错点：**

- 把反射当成绕过所有封装和模块限制的万能入口。
- 在热点路径反复扫描与解析成员，不做缓存、预热和失败校验。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（下）](https://javaguide.cn/java/basis/java-basic-questions-03.html)
- [技术校准：Java 21 反射 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/reflect/package-summary.html)
- [技术校准：JLS 12：执行、加载与初始化](https://docs.oracle.com/javase/specs/jls/se21/html/jls-12.html)

校验日期：2026-08-06

# 二、Java 集合高频（11 题）

## Q15：List、Set、Map 和 Queue 有什么区别？

**短回答：**

List 表达有位置的有序序列，Set 表达不重复元素，Map 表达键值映射，Queue 表达待处理次序；应先按业务语义选接口，再比较实现性能。

**原理：**

四类接口解决不同问题：
- List 允许重复，并通过索引维护元素顺序。
- Set 按实现使用的相等或排序规则限制重复。
- Map 不继承 Collection，它维护唯一键到值的关联。
- Queue 用 offer、poll、peek 等方法描述入队和出队，具体实现可以是 FIFO、优先队列或双端队列。
接口本身不自动承诺线程安全、排序方式和复杂度。选型应依次确认是否允许重复、是否需要稳定顺序、是否按键查询、是否有优先级与并发访问。

**代码 / 场景：**

订单明细需要保序且允许同一商品多行，可用 List；用户权限去重可用 Set；通过用户编号查资料用 Map；异步任务按优先级消费可用 PriorityQueue。不能因为“Map 查找快”就把所有数据都塞进 Map，否则可能丢失重复和顺序语义。

**递进追问：**

1. **Map 的 values 方法为什么返回 Collection 而不是 Set？**

   不同键可以映射到相等的值，因此值视图不具备唯一性，不能承诺 Set 语义。

2. **Queue 是否一定先进先出？**

   不一定。普通队列常是 FIFO，但 PriorityQueue 按比较规则出队，Deque 还能在两端操作。

**易错点：**

- 把接口契约和某个常见实现的数据结构、顺序保证混为一谈。
- 只比较时间复杂度，不先确认重复、顺序和并发等业务语义。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [技术校准：Java 21 Collections Framework](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/doc-files/coll-overview.html)

校验日期：2026-08-06

## Q16：ArrayList 和 LinkedList 有什么区别？

**短回答：**

ArrayList 基于连续逻辑数组，随机访问快且缓存友好；LinkedList 是双向链表，已定位节点后的插入删除便捷，但按索引访问和内存局部性较差。

**原理：**

ArrayList 的 get、set 通常是常数时间，尾部追加摊销常数时间，中间插入删除需要搬移后续元素。LinkedList 按索引先从头或尾遍历，随机访问为线性时间；每个节点还保存前后引用，增加对象与缓存成本。所谓“链表插入 O(1)”只在已经持有目标节点位置时成立，通过 get(index) 定位仍是 O(n)。现代业务大多读多、遍历多且数据规模可预测，ArrayList 通常是默认选择；队列或频繁两端操作则优先考虑 Deque 实现。

**代码 / 场景：**

读取数据库后形成结果列表并按下标访问，使用 ArrayList 更合适。若任务只需不断在队首队尾加入移除，ArrayDeque 往往比 LinkedList 更紧凑。不要为了偶尔在中间删除一项就默认使用 LinkedList，应以真实访问模式和基准验证。

**递进追问：**

1. **LinkedList 中间删除一定比 ArrayList 快吗？**

   不一定。若只有索引，定位节点先花 O(n)；元素规模较小时，数组搬移也可能因连续内存而更快。

2. **为什么 ArrayList 不适合无锁并发写？**

   扩容、size 更新和数组写入不是一个不可分割动作，并发修改可能丢失数据或破坏可见性。

**易错点：**

- 机械背诵“链表增删快”，漏掉查找节点和对象分配成本。
- 用 LinkedList 实现栈，却忽略 ArrayDeque 通常是更合适的专用选择。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [技术校准：Java 21 ArrayList API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayList.html)
- [技术校准：Java 21 LinkedList API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/LinkedList.html)

校验日期：2026-08-06

## Q17：ArrayList 的底层结构和扩容过程是什么？

**短回答：**

ArrayList 用 Object 数组保存元素，并记录实际 size；容量不足时创建更大的数组并复制旧元素，所以追加是摊销常数而非每次绝对常数。

**原理：**

空列表通常延迟到第一次加入元素时分配内部数组。add 会先确认所需容量，空间不足时计算新容量、申请新数组并复制已有引用，然后写入新元素并增加 size。常见 OpenJDK 实现按约 1.5 倍增长，但这是实现细节，API 不承诺固定倍率。扩容单次成本是 O(n)，多次追加摊销后通常为 O(1)。ensureCapacity 可在已知规模时减少重复扩容，trimToSize 可缩小闲置容量，但频繁收缩会增加复制。

**代码 / 场景：**

导入十万行数据且数量已知时，可使用 `new ArrayList<>(100000)` 或提前调用 ensureCapacity，减少扩容和瞬时旧数组。仅预估“可能很大”就一次分配极大容量也会浪费堆内存，应基于上限、常见值和监控选择。

**递进追问：**

1. **ArrayList 的 size 和 capacity 是同一个概念吗？**

   不是。size 是逻辑元素数量，capacity 是内部数组当前可容纳的数量，容量通常不对外直接暴露。

2. **调用 clear 会立刻把内部数组容量降为零吗？**

   通常只清除元素引用并把 size 归零，不承诺收缩容量；是否回收数组取决于对象生命周期或显式策略。

**易错点：**

- 把某个 JDK 的 1.5 倍扩容写成 Java API 永久不变的规范。
- 只看到预分配减少复制，却不评估超大空数组带来的内存浪费。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [技术校准：Java 21 ArrayList API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayList.html)

校验日期：2026-08-06

## Q18：HashMap 的底层数据结构是什么？

**短回答：**

JDK 8 常见实现以数组作为桶表，桶内用链表解决哈希冲突，冲突严重且容量达到条件时可转换为红黑树以限制最坏查询成本。

**原理：**

key 的 hash 会经过扰动后映射到长度为 2 的幂的桶数组。桶为空时直接放节点；多个键落在同一桶形成链表，达到树化阈值且整张表容量足够时转为红黑树，元素减少后还可能退化回链表。HashMap 允许一个 null 键和多个 null 值，不维护业务插入顺序，也不保证线程安全。平均查找接近 O(1) 的前提是哈希分布合理、负载受控且 equals 成本可接受。

**代码 / 场景：**

使用自定义 OrderKey 作为键时，应实现稳定的 equals 与 hashCode，并在入 Map 后不要修改参与计算的字段。若大量键故意返回同一 hash，所有请求会集中到少数桶，即使树化也会增加比较和内存开销。

**递进追问：**

1. **发生哈希冲突是否代表两个键相等？**

   不代表。hashCode 相同只表示落桶候选相同，还要通过 equals 判断是否是同一个逻辑键。

2. **为什么链表达到阈值后不一定立即树化？**

   当表容量较小时优先扩容通常更能分散冲突，只有容量达到最小条件才转换成树。

**易错点：**

- 只回答“数组加链表加红黑树”，说不清它们分别何时出现。
- 把平均 O(1) 当成无条件保证，忽略哈希质量与冲突成本。

**参考来源：**

- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 HashMap API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html)

校验日期：2026-08-06

## Q19：HashMap 的 put 和 get 流程是什么？

**短回答：**

put 先计算哈希与桶索引，再按空桶、同键、链表或树分支新增或覆盖；get 用相同定位规则缩小候选范围并通过 equals 确认键。

**原理：**

put 的关键步骤是：必要时初始化或扩容桶表；定位桶；空桶直接写入，非空桶先检查首节点，再遍历链表或树查找相同 key；找到则替换 value，未找到则追加节点并在需要时触发树化；最后按结构变化更新 size 并判断扩容。get 同样先计算 hash 和索引，比较首节点后再进入链或树。HashMap 判断键相等通常先比 hash，再满足引用相同或 equals 为 true，以减少昂贵比较。

![HashMap 从计算哈希、定位桶到链表树化和扩容的处理流程图](/content/diagrams/java-foundations/hashmap-put-resize-v2.svg "先用扰动后的哈希定位桶，再区分空桶、同键更新与冲突插入；达到阈值后统一扩容迁移。")

**代码 / 场景：**

实现缓存覆盖时，put 同一个逻辑 key 会返回或替换旧 value，而不是新增第二个键。若 key 重写了 equals 却没有重写 hashCode，put 和 get 可能定位到不同桶，表现为“明明相等却取不到”。

**递进追问：**

1. **HashMap 如何处理 null 键？**

   实现会为 null 键使用约定哈希并放入对应桶，仍只允许一个逻辑 null 键。

2. **put 相同键会让 size 增加吗？**

   通常不会。找到相等键时只替换关联值，只有插入新映射节点才增加逻辑 size。

**易错点：**

- 只描述索引公式，不提 equals 在覆盖和查询中的决定作用。
- 认为 put 总是新增元素，忽略同键覆盖并不增加映射数量。

**参考来源：**

- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 HashMap API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html)
- [技术校准：Java 21 Object API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html)

校验日期：2026-08-06

## Q20：HashMap 为什么使用 2 的幂容量和默认负载因子？

**短回答：**

2 的幂容量让索引可用位与高效计算，并简化扩容后的桶拆分；负载因子在空间占用与冲突概率之间取平衡，达到阈值后扩容。

**原理：**

容量为 2 的幂时，可用 hash 与 n-1 做位与映射到桶，并让低位分布都参与索引。容量翻倍后，节点只需检查新增的那一位：为 0 留在原索引，为 1 移到原索引加旧容量。负载因子越低，桶更稀疏、冲突通常更少但占用空间更多；越高则节省数组空间，却增加冲突与遍历成本。常见默认值 0.75 是通用折中，不是每个业务的理论最优值。初始容量还应结合预估条数和负载因子计算。

**代码 / 场景：**

预计保存 1000 个条目时，直接传入 1000 仍可能因阈值不足而扩容；可以按预期数量除以负载因子并向上取合适容量。若键分布极差，仅增加容量不能替代修复 hashCode。

**递进追问：**

1. **容量是 2 的幂就一定分布均匀吗？**

   不一定。仍依赖 key 的哈希质量和扰动结果，低位模式差的哈希可能集中到少数桶。

2. **负载因子是否越小越好？**

   不是。过小会让桶数组大量空置并增加内存与缓存压力，需要结合规模和冲突特征权衡。

**易错点：**

- 只说位与比取模快，漏掉扩容拆桶和哈希分布意义。
- 为了避免冲突盲目降低负载因子，造成明显空间浪费。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [技术校准：Java 21 HashMap API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html)

校验日期：2026-08-06

## Q21：HashMap 什么时候扩容和树化？

**短回答：**

新映射数量超过容量乘负载因子的阈值时通常扩容；单桶冲突链达到树化阈值且表容量足够时才树化，否则优先扩容分散节点。

**原理：**

扩容一般把桶表容量翻倍，并将旧桶节点按新增哈希位拆成原位置和原位置加旧容量两组，避免逐个重新做通用取模。树化用于限制恶意或极端冲突下的线性查找。OpenJDK 8 至 21 的常见常量是：桶内节点达到 8 个时尝试树化；表容量小于 64 时优先扩容；树节点减少到 6 个附近时可退化为链表。8、64、6 都属于具体实现细节，回答时应同时说明“冲突严重且表已足够大”这一机制，而不是把常量当成 Map 接口规范。

**代码 / 场景：**

构造多个 hashCode 相同的键，在较小 HashMap 中连续加入，可能先看到整表扩容而不是立刻红黑树化；表足够大后继续冲突才会树化。生产排障应先检查键设计和输入分布，而不是依赖树化兜底。

**递进追问：**

1. **扩容时每个节点都要重新计算完整索引吗？**

   JDK 8 常见实现利用容量翻倍的新增位，把节点拆到两个位置，不需要普通意义上的完整重算。

2. **红黑树为什么不能完全消除哈希攻击成本？**

   树操作仍有比较、对象和内存成本，而且比较规则、树化条件及大量输入本身仍会消耗资源。

**易错点：**

- 把链长达到 8 说成唯一树化条件，漏掉最小表容量。
- 把具体阈值当作 Map 接口规范，忽略它属于实现细节。

**参考来源：**

- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 HashMap API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html)

校验日期：2026-08-06

## Q22：HashMap 为什么线程不安全？

**短回答：**

HashMap 没有为并发读写建立原子性与可见性保证，多个线程同时 put、resize 或遍历可能丢更新、读到不一致状态或触发迭代异常。

**原理：**

一次 put 涉及定位桶、链接节点、更新 size 和可能扩容等多个步骤，没有共同锁或适合并发协议。两个线程可基于同一旧状态写入而覆盖彼此；扩容期间表引用和桶迁移也不是对并发调用者承诺的安全快照。只有对象构建完成后安全发布且后续完全只读，普通 Map 才可被并发读取；只用 volatile 保存 Map 引用不能让其内部复合写入变安全。需要并发更新时应使用 ConcurrentHashMap 或外部同步。

**代码 / 场景：**

把 HashMap 作为单例缓存并在请求线程中边查边 put，即使压测偶尔正确也可能丢数据。改用 ConcurrentHashMap 后，仍不能用 get 后再 put 实现原子计数，应使用 compute、merge 或更合适的原子结构。

**递进追问：**

1. **Collections.synchronizedMap 能解决什么？**

   它用共同互斥包装单次方法调用，但遍历和多步复合操作仍需按其约定在同一锁上同步。

2. **只读 HashMap 能安全跨线程共享吗？**

   构建后不再修改并通过 final、锁、volatile 等方式安全发布时，可以进行并发只读访问。

**易错点：**

- 用“JDK 8 已修复环形链表”推导 HashMap 变成线程安全。
- 换成线程安全容器后继续用先读再写的非原子业务组合。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [技术校准：Java 21 HashMap API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html)
- [技术校准：JLS 17：线程与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)

校验日期：2026-08-06

## Q23：HashSet 如何实现去重？

**短回答：**

HashSet 常以 HashMap 的键保存元素，先用 hashCode 定位候选桶，再用 equals 判断逻辑相等；因此元素必须遵守相等与哈希契约。

**原理：**

加入元素时，HashSet 把元素作为底层映射的 key，与一个占位值关联。若候选桶里已有 hash 相同且 equals 为 true 的键，本次 add 返回 false；否则新增。由此可知去重不是只看 hashCode，哈希冲突仍允许多个不相等元素共存。HashSet 不保证插入顺序，允许一个 null，且不是线程安全容器。作为集合元素期间修改参与 equals 或 hashCode 的字段，会让 contains 和 remove 无法按预期定位。

**代码 / 场景：**

邮箱地址值对象若按标准化邮箱重写 equals 与 hashCode，HashSet 可过滤重复地址。若只重写 equals，不重写 hashCode，相等对象可能进入不同桶而重复出现；若加入后修改邮箱字段，也可能再也无法正常删除。

**递进追问：**

1. **两个元素 hashCode 相同，HashSet 会只保留一个吗？**

   不一定。还要继续用 equals 判断；哈希相同但不相等的元素可以同时保留在冲突桶中。

2. **为什么 HashSet 不适合保存可变业务键？**

   键的哈希或相等字段变化后，当前桶位置与新计算结果不一致，查询和删除会失效。

**易错点：**

- 把去重机制简化成只比较 hashCode，忽略冲突后的 equals。
- 加入集合后修改参与相等判断的字段，破坏容器内部定位。

**参考来源：**

- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 HashSet API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashSet.html)
- [技术校准：Java 21 Object API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html)

校验日期：2026-08-06

## Q24：ConcurrentHashMap 如何保证并发安全，JDK 7 和 JDK 8 有何不同？

**短回答：**

JDK 7 主要通过 Segment 分段锁降低竞争；JDK 8 改为桶数组加 CAS、桶级 synchronized 和树结构，读取多为无锁，并支持线程协助扩容。

**原理：**

JDK 7 的 Segment 本身近似一个可重入锁保护的子 Map，并发度受分段数量影响。JDK 8 取消固定 Segment：空桶写入先 CAS 安装节点，冲突桶修改同步桶头，树桶使用相应锁协议；table 与节点字段配合可见性规则，扩容时用转发节点标识并允许多个线程协助迁移。计数采用分散方式降低热点。它保证单次容器操作的线程安全，不自动让多个方法组成的业务步骤原子。

**代码 / 场景：**

并发累计标签次数时，用 map.merge(tag, 1, Integer::sum) 比 get 后 put 更可靠。若业务要求“仅当账户状态为启用时同时修改两个键”，仍需更高层锁、状态对象或持久层事务，不能仅靠 ConcurrentHashMap。

**递进追问：**

1. **ConcurrentHashMap 为什么不允许 null 键和值？**

   并发读取返回 null 必须明确表示没有映射，否则无法区分真实 null 与并发删除后的不存在。

2. **size 能否作为严格的并发控制条件？**

   不适合。并发变化期间统计用于监控较合理，不能据此决定只执行一次的关键业务分支。

**易错点：**

- 把 JDK 8 ConcurrentHashMap 简化成“仍然使用分段锁”。
- 认为容器线程安全就能保证跨多个键或多个调用的业务事务。

**参考来源：**

- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 ConcurrentHashMap API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)
- [技术校准：JLS 17：线程与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)

校验日期：2026-08-06

## Q25：什么是 fail-fast，遍历集合时怎样安全删除元素？

**短回答：**

fail-fast 是迭代器发现集合被非预期结构修改后尽力快速抛出异常的诊断机制，不是线程安全保证；单线程删除当前项应使用 Iterator.remove。

**原理：**

ArrayList 等迭代器会记录创建时的结构修改计数，next 或 remove 时检查实际计数。遍历期间若绕过迭代器直接 add、remove，计数不一致后通常抛出 ConcurrentModificationException。Iterator.remove 会在删除当前元素后同步内部期望值，因此是受支持路径；removeIf 适合表达批量过滤。fail-fast 是 best effort，不能依赖异常必然发生来做并发控制。并发遍历与修改应选择快照、外部锁或适合的并发集合，并理解其弱一致性语义。

**代码 / 场景：**

删除所有失效会话可写 sessions.removeIf(Session::expired)，或显式 Iterator 遍历后调用 iterator.remove。增强 for 中直接 sessions.remove(item) 可能抛异常。CopyOnWriteArrayList 适合读多写少的快照遍历，但每次写会复制数组，不适合高频更新。

**递进追问：**

1. **修改元素内部字段会触发 fail-fast 吗？**

   通常不会，结构修改计数关注容器增删等结构变化；但元素可变仍可能破坏排序或哈希契约。

2. **ConcurrentHashMap 的迭代器会抛同样异常吗？**

   它通常提供弱一致遍历，可与并发更新共存，但不保证看到某个时刻的完整快照。

**易错点：**

- 把 ConcurrentModificationException 当作可靠的并发冲突检测器。
- 在增强 for 中直接调用集合自身 remove，期待每次都能安全工作。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [技术校准：Java 21 Iterator API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Iterator.html)
- [技术校准：Java 21 ArrayList API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayList.html)

校验日期：2026-08-06

# 三、Java 并发高频（14 题）

## Q26：进程和线程有什么区别，并发和并行又是什么？

**短回答：**

进程是资源分配与隔离的运行实体，线程是进程内被调度的执行单元；并发强调任务交替推进，并行强调同一时刻真正同时执行。

**原理：**

同一进程内线程通常共享堆、类元数据和打开资源，每个线程拥有自己的程序计数器、虚拟机栈与本地方法栈。线程切换开销通常小于进程切换，但共享内存也带来竞态、可见性与故障扩散。单核通过时间片也能并发，多核才可能让多个可运行线程并行。线程数量不是越多越快：CPU 密集任务受核心数限制，I/O 密集任务可容纳更多等待，但最终仍受队列、连接和下游容量约束。

**代码 / 场景：**

图片压缩主要消耗 CPU，线程数接近有效核心数通常更合理；调用多个远程接口时，任务经常等待网络，可以提高受控并发度。无论哪种场景都应使用有界线程池，并用吞吐、p99、上下文切换和队列长度验证。

**递进追问：**

1. **一个进程崩溃是否一定会导致另一个进程崩溃？**

   通常有较强隔离，不会直接共享地址空间，但共享文件、网络依赖或操作系统资源仍可能造成连锁影响。

2. **协程或虚拟线程是否等同操作系统线程？**

   不等同。它们可由语言运行时调度并映射到较少载体线程，资源模型和阻塞行为需要分别理解。

**易错点：**

- 把并发和并行当成同义词，无法解释单核交替执行。
- 认为线程一定比进程“轻量且安全”，忽略共享状态竞态与调度成本。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（上）](https://javaguide.cn/java/concurrent/java-concurrent-questions-01.html)
- [技术校准：Java 21 Thread API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html)
- [技术校准：JVMS 2：JVM 结构与运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)

校验日期：2026-08-06

## Q27：Java 线程有哪些状态，状态如何转换？

**短回答：**

Thread.State 包含 NEW、RUNNABLE、BLOCKED、WAITING、TIMED_WAITING 和 TERMINATED；它描述 JVM 视角状态，不等同操作系统调度状态。

**原理：**

新建未 start 的线程是 NEW，start 后进入 RUNNABLE，既可能正在 CPU 上运行，也可能等待操作系统调度。等待进入 synchronized 监视器会是 BLOCKED；Object.wait、Thread.join 等无期限等待进入 WAITING；带超时的 sleep、wait、join 进入 TIMED_WAITING。获得锁、被通知、超时或目标线程结束后回到可运行竞争，run 正常返回或抛出未捕获异常后进入 TERMINATED。线程终止后不能再次 start。

**代码 / 场景：**

线程 dump 中大量 BLOCKED 通常提示监视器竞争；大量 WAITING 不一定异常，线程池空闲工作线程可能在队列上等待。排障要结合锁拥有者、队列长度、CPU 和业务吞吐，而不是只看到某个状态就直接定性。

**递进追问：**

1. **RUNNABLE 是否代表线程正在占用 CPU？**

   不一定。Java 把正在运行和等待操作系统调度的可运行线程都归入 RUNNABLE。

2. **线程进入 BLOCKED 和 WAITING 的原因有何不同？**

   BLOCKED 专指等待进入 synchronized 监视器，WAITING 通常来自显式等待其他线程动作且没有超时。

**易错点：**

- 把 Java 的 RUNNABLE 一律翻译成“正在 CPU 上执行”。
- 只看一次线程状态快照就判断死锁，不分析持锁关系与时间变化。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（上）](https://javaguide.cn/java/concurrent/java-concurrent-questions-01.html)
- [技术校准：Java 21 Thread API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html)

校验日期：2026-08-06

## Q28：Thread、Runnable 和 Callable 有什么区别？

**短回答：**

Thread 表示线程及其生命周期，Runnable 表示无返回任务，Callable 可返回结果并抛受检异常；业务通常应提交任务给执行器而非手工管理线程。

**原理：**

继承 Thread 把“任务是什么”和“由哪个线程执行”耦合在一起，也占用单继承位置。实现 Runnable 可把同一任务交给不同 Thread 或 Executor 执行，但 run 没有返回值且不能直接声明受检异常。Callable.call 可返回泛型结果并抛 Exception，提交给 ExecutorService 后通常通过 Future 获取、取消或等待结果。调用 run 只是普通方法调用，只有 start 才请求 JVM 创建新的执行路径并最终调用 run。

**代码 / 场景：**

发送日志这类无需返回结果的工作可实现 Runnable；并行查询价格需要结果和异常时可提交 Callable。Web 服务不要为每个请求 new Thread，应由有界线程池统一控制并发、命名、拒绝和关闭。

**递进追问：**

1. **直接调用 thread.run 会启动新线程吗？**

   不会，它只是由当前线程执行普通方法；调用 start 才会建立新的线程生命周期。

2. **Future.get 有什么风险？**

   它可能无限阻塞并传播包装异常，应设置超时、处理中断并避免在关键线程串行等待大量任务。

**易错点：**

- 把调用 run 当成启动新线程，实际任务仍在当前线程同步执行。
- 大量直接 new Thread，缺少并发上限、统一命名和关闭策略。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 线程池详解](https://javaguide.cn/java/concurrent/java-thread-pool-summary.html)
- [技术校准：Java 21 Thread API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html)
- [技术校准：Java 21 Runnable API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Runnable.html)
- [技术校准：Java 21 Callable API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Callable.html)

校验日期：2026-08-06

## Q29：什么是线程安全，原子性、可见性和有序性分别指什么？

**短回答：**

线程安全要求并发调用仍满足对象契约；原子性是不被中间观察的操作边界，可见性是写入能被其他线程看到，有序性是关键动作按约束顺序发生。

**原理：**

原子性并非“单行代码”即可保证，例如 count++ 包含读取、计算和写回。可见性问题来自各线程工作数据、缓存与编译器优化，线程 A 的普通写不保证线程 B 及时观察。有序性不要求所有指令严格按源码执行，而要求不能破坏线程内语义和跨线程 happens-before。synchronized、volatile、锁、原子类和并发容器分别提供不同组合保证。设计时先定义共享不变量与操作边界，再选择最小而完整的同步机制。

**代码 / 场景：**

库存扣减要求“检查大于零并减一”整体原子，只把库存字段声明 volatile 仍会超卖；可在同一锁内完成或用原子条件更新。配置快照是构建后整体替换引用，则 volatile 引用可提供发布可见性，但快照内部应不可变。

**递进追问：**

1. **单次 int 读写原子是否代表 count++ 线程安全？**

   不代表。自增是读、加、写的复合过程，多个线程可能都基于同一个旧值更新。

2. **不可变对象为什么更容易线程安全？**

   构造后状态不再变化，配合安全发布即可并发读取，减少需要同步的不变量。

**易错点：**

- 把线程安全简化成“没有抛异常”，忽略结果是否满足业务不变量。
- 认为 volatile 能把任意复合操作自动变成原子操作。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（上）](https://javaguide.cn/java/concurrent/java-concurrent-questions-01.html)
- [技术校准：JLS 17：线程与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)

校验日期：2026-08-06

## Q30：synchronized 锁住的到底是什么？

**短回答：**

synchronized 互斥的是某个对象监视器：实例同步方法锁当前对象，静态同步方法锁对应 Class 对象，同步代码块锁显式给出的引用。

**原理：**

进入同步区域前线程必须获得同一个 monitor，退出时释放；同一线程可重入。只有竞争相同锁对象的代码才互斥，两个实例的实例同步方法彼此不阻塞，除非它们最终使用同一锁。锁既建立原子执行边界，也建立释放到后续获取之间的 happens-before，使锁内写入可见。应选择稳定、私有且生命周期清晰的锁对象，避免锁字符串常量、可变引用或公开对象导致意外共享。

**代码 / 场景：**

单例计数器的 synchronized 实例方法都锁单例本身；普通多实例服务若要保护共享静态缓存，锁 this 无效，应锁共同的私有 static final 对象或改用并发容器。不要写 `synchronized ("LOCK")`，字符串池可能让无关代码竞争同一对象。

**递进追问：**

1. **synchronized 是否可重入？**

   可以。同一线程已经持有某监视器时可再次进入该监视器保护的方法或代码块。

2. **锁对象引用改变会发生什么？**

   不同线程可能在新旧两个对象上分别加锁，互斥边界被拆开，因此锁引用通常应固定为 final。

**易错点：**

- 只说“锁方法”或“锁代码”，没有指出真正参与竞争的对象监视器。
- 用 this 保护多个实例共同访问的静态共享状态，实际没有形成共同锁。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（中）](https://javaguide.cn/java/concurrent/java-concurrent-questions-02.html)
- [技术校准：JLS 17：线程与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)
- [技术校准：Java 21 Object API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html)

校验日期：2026-08-06

## Q31：volatile 能保证什么，不能保证什么？

**短回答：**

volatile 保证对该变量的写对后续读可见，并参与限制相关重排序；它不为读取—计算—写回这样的复合操作提供整体原子性。

**原理：**

对 volatile 变量的写 happens-before 后续对同一变量的读，因此常用于发布不可变快照、状态标志和双重检查中的实例引用。它还通过内存语义约束前后普通读写的重排范围。单次读取和写入具有相应语义，但 count++、检查后执行、多个字段一致更新仍包含多个动作，需要锁、CAS 循环或更高层同步。volatile 也不等于把对象内部所有字段都自动变成同步变量；发布后继续并发修改内部可变状态仍需单独保护。

**代码 / 场景：**

后台线程循环检查 volatile boolean stopped，控制线程写 true 后能让它看到退出信号。并发计数不能只写 volatile int count 后执行 count++，应使用 AtomicInteger.incrementAndGet 或锁。配置对象若通过 volatile 引用整体替换，最好让配置本身不可变。

**递进追问：**

1. **volatile 和 synchronized 的主要差异是什么？**

   volatile 不提供互斥，适合单变量发布和状态通知；synchronized 可保护复合不变量并同时提供可见性。

2. **双重检查单例为什么需要 volatile？**

   它防止其他线程看到引用已经发布但对象初始化尚未按要求完成的状态，并提供可见性。

**易错点：**

- 看到字段是 volatile 就对它执行自增，误以为复合更新不会丢失。
- 把 volatile 引用的可见性扩张成其内部任意可变对象都线程安全。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（中）](https://javaguide.cn/java/concurrent/java-concurrent-questions-02.html)
- [技术校准：JLS 17：线程与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)

校验日期：2026-08-06

## Q32：synchronized 和 ReentrantLock 有什么区别？

**短回答：**

两者都能提供可重入互斥与可见性；synchronized 由语言结构自动释放，ReentrantLock 额外提供可中断、超时、公平策略和多个 Condition。

**原理：**

synchronized 语法简单，正常返回或异常时 JVM 都会退出监视器，适合多数互斥场景。ReentrantLock 需要显式 lock 与 finally unlock，可用 lockInterruptibly 响应中断、tryLock 实现超时或非阻塞尝试，并通过多个 Condition 管理不同等待队列；可选公平锁通常降低饥饿风险但牺牲吞吐。两者都不能自动保证锁内业务设计正确。选择应由确实需要的能力驱动，不应仅凭“Lock 性能一定更好”的旧结论。

**代码 / 场景：**

普通账户状态更新用 synchronized 即可保持代码简洁。需要等待锁最多 100 毫秒并在超时后降级时，可使用 tryLock；成功后必须在 finally 里 unlock。多个条件队列的生产者消费者可用不同 Condition 减少无关唤醒。

**递进追问：**

1. **ReentrantLock 为什么必须在 finally 中释放？**

   业务代码或等待过程可能抛异常，若未释放，后续线程会永久等待并造成锁泄漏。

2. **公平锁是否意味着线程严格按到达顺序执行？**

   它主要偏向等待时间最长的线程，仍受调度和 tryLock 等行为影响，不能理解为绝对 FIFO。

**易错点：**

- 离开 finally 手工 unlock，异常路径导致锁永远不释放。
- 无条件宣称 ReentrantLock 比 synchronized 更快，忽略现代 JVM 优化与场景差异。

**参考来源：**

- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 Lock API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/Lock.html)
- [技术校准：JLS 17：线程与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)

校验日期：2026-08-06

## Q33：什么是 Java 内存模型和 happens-before？

**短回答：**

JMM 定义共享内存下读写、同步与允许重排序的规则；happens-before 用来判断一个动作的结果是否必须对另一个动作可见。

**原理：**

happens-before 不是墙钟时间，而是内存可见性与排序关系。常见规则包括：同一线程程序次序；监视器解锁先于后续对同一监视器加锁；volatile 写先于后续读；Thread.start 之前动作先于新线程动作；线程中动作先于其他线程成功 join 返回；关系可传递。若两个冲突访问之间没有这样的关系，程序可能存在数据竞争，观察结果不能用单线程直觉推导。JMM 允许编译器和处理器优化，只要不违反既定同步语义。

**代码 / 场景：**

主线程先写入配置对象，再调用 worker.start，工作线程可依据 start 规则看到此前写入。任务线程完成计算后退出，主线程 join 成功返回后可看到结果。单纯 sleep 一段时间不建立这种确定关系，不能用于发布共享数据。

**递进追问：**

1. **happens-before 是否表示动作 A 现实时间一定先完成？**

   它主要是可见性与排序保证；部分规则用于推导可观察结果，不能简单等同物理时钟先后。

2. **volatile 写与读为何能发布此前普通字段？**

   volatile 写前的动作通过程序次序，加上该写到后续读的规则与传递性，使此前结果对读线程可见。

**易错点：**

- 把 happens-before 当作日志时间先后，而不讨论共享读写可见性。
- 用“通常能看到”替代明确同步关系，让竞态只在压力下暴露。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（中）](https://javaguide.cn/java/concurrent/java-concurrent-questions-02.html)
- [技术校准：JLS 17：线程与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)

校验日期：2026-08-06

## Q34：wait、sleep 和 join 有什么区别？

**短回答：**

wait 在持有对象监视器时进入等待并释放该监视器，sleep 只让当前线程定时休眠且不释放已持有锁，join 用于等待目标线程结束。

**原理：**

Object.wait 必须在拥有对应 monitor 的 synchronized 区域调用，调用后加入该对象等待集并释放 monitor；被 notify、notifyAll、中断或超时后，还要重新竞争锁才能继续。Thread.sleep 是静态方法，使当前线程进入定时等待，不与某个监视器协议绑定，所以不会主动释放锁。join 在语义上等待指定线程终止，并建立目标线程动作到 join 成功返回之间的可见性。三者都可能被中断，代码应恢复中断标志或按边界传播，而不是静默吞掉。

![Java 线程在监视器等待、通知、中断与 join 协作中的状态流转图](/content/diagrams/java-foundations/thread-coordination-v1.svg "条件循环守住业务谓词，通知只让等待者重新竞争锁；中断与 join 都必须明确传播策略。")

**代码 / 场景：**

生产者消费者使用 wait 时必须放在 while 条件循环中，醒来后重新检查队列，防止虚假唤醒和条件被其他线程抢先改变。不要在 synchronized 内 sleep 来“让出锁”，它会占着锁休眠。聚合子任务可 join，但生产代码通常优先使用 Future 或结构化执行。

**递进追问：**

1. **为什么 wait 条件应使用 while 而不是 if？**

   线程可能虚假唤醒，或被唤醒后条件已被其他线程改变，必须持锁重新检查。

2. **notify 后等待线程是否立即开始执行？**

   不会保证。它先从等待集中被唤醒，仍需等通知线程释放 monitor 后再竞争获得锁。

**易错点：**

- 认为 sleep 会像 wait 一样释放当前持有的锁。
- 捕获 InterruptedException 后什么也不做，破坏上层取消协议。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（上）](https://javaguide.cn/java/concurrent/java-concurrent-questions-01.html)
- [技术校准：Java 21 Object API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html)
- [技术校准：Java 21 Thread API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html)

校验日期：2026-08-06

## Q35：ThreadPoolExecutor 的核心参数和执行流程是什么？

**短回答：**

核心参数决定常驻线程、最大线程、空闲回收、队列、线程工厂和拒绝策略；提交流程通常是先核心线程，再入队，再扩到最大，最后拒绝。

**原理：**

主要参数包括 corePoolSize、maximumPoolSize、keepAliveTime、workQueue、threadFactory 与 RejectedExecutionHandler。execute 提交后：运行线程少于核心数则尝试新建核心线程；否则任务入队；队列无法接收且线程数未到最大值时再建非核心线程；仍无法接收就执行拒绝策略。无界队列常使 maximumPoolSize 形同虚设，有界队列则让过载显性化。线程数和队列容量应由任务阻塞比、下游容量、内存与延迟预算共同决定。

![ThreadPoolExecutor 从核心线程、工作队列到拒绝策略的任务接纳流程图](/content/diagrams/java-backend/thread-pool-admission-v1.svg "先补核心线程、再尝试入队，队满后扩到最大线程；仍无法接纳时执行明确的拒绝策略。")

**代码 / 场景：**

订单接口调用数据库时，线程池不能只按 CPU 核心数机械设置，也不能超过连接池和下游可承载并发。使用有界队列与带业务指标的拒绝策略，压测观察活跃线程、队列等待、拒绝数和 p99，找到系统饱和点。

**递进追问：**

1. **为什么无界队列下最大线程数可能不起作用？**

   核心线程满后任务仍可持续入队，不会进入创建非核心线程的分支，直到内存或延迟失控。

2. **CallerRunsPolicy 有什么效果和风险？**

   它让提交线程执行任务形成反压，但可能阻塞请求线程或关键调度线程，需要确认调用链影响。

**易错点：**

- 只背七个参数，不会按“核心—队列—最大—拒绝”解释提交路径。
- 使用无界队列掩盖过载，最终以长延迟或内存耗尽失败。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 线程池详解](https://javaguide.cn/java/concurrent/java-thread-pool-summary.html)
- [技术校准：Java 21 ThreadPoolExecutor API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html)

校验日期：2026-08-06

## Q36：为什么生产环境不建议直接使用 Executors 创建线程池？

**短回答：**

常用 Executors 工厂隐藏了关键容量选择，可能创建无界队列或数量快速增长的线程；生产环境更需要显式、可审计地配置 ThreadPoolExecutor。

**原理：**

newFixedThreadPool 常配无界 LinkedBlockingQueue，过载时任务持续堆积；newCachedThreadPool 使用直接移交并允许线程数大幅增长，慢下游会造成线程膨胀；singleThreadExecutor 同样可能积压无界任务。问题不在工厂方法本身“绝对不能用”，而在默认容量与失败策略常不符合服务 SLA。显式构造可让核心数、最大数、有界队列、线程命名、异常处理与拒绝策略进入配置和监控，也应设计 shutdown 与任务取消。

**代码 / 场景：**

邮件发送服务若用 newFixedThreadPool，供应商变慢时队列可积压百万任务。改为有界队列、命名线程工厂和明确拒绝或落盘策略，并监控队列等待；容量按供应商限额而不是服务器 CPU 单独决定。

**递进追问：**

1. **Executors 工厂在任何场景都不能使用吗？**

   不是。受控脚本和明确任务上限的场景可以使用，但服务端必须清楚默认队列和线程上限是否满足风险边界。

2. **显式 new ThreadPoolExecutor 就一定安全吗？**

   不一定。参数仍可能错误，还需要监控、压测、关闭、拒绝和下游容量配套。

**易错点：**

- 把“不推荐”背成语法禁令，却说不出无界队列与线程膨胀风险。
- 显式构造线程池后仍设置巨大队列，实际没有建立有效反压。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 线程池详解](https://javaguide.cn/java/concurrent/java-thread-pool-summary.html)
- [技术校准：Java 21 Executors API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Executors.html)
- [技术校准：Java 21 ThreadPoolExecutor API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html)

校验日期：2026-08-06

## Q37：ThreadLocal 的原理是什么，为什么要调用 remove？

**短回答：**

ThreadLocal 为每个线程维护独立值，数据实际存在线程持有的 ThreadLocalMap 中；线程池会复用线程，因此任务结束应 remove 防止串数据和滞留。

**原理：**

每个 Thread 对象可关联自己的 ThreadLocalMap，键是 ThreadLocal 的弱引用，值通常仍是强引用。get、set 以当前 ThreadLocal 在当前线程的 Map 中查找槽位，所以隔离的是“同一变量在不同线程的值”，不是自动把共享对象深复制。键弱引用被回收后，值可能在后续清理前继续滞留；更常见的业务风险是线程池线程长期存在，下一个请求读取到上个请求上下文。应在 finally 中 remove，并优先显式传递核心业务上下文。

**代码 / 场景：**

Web 过滤器把 traceId 放入 ThreadLocal，链路结束时无论正常还是异常都在 finally remove。若只 set 不清理，线程池复用后另一个用户请求可能继承旧 traceId，造成日志串号甚至权限上下文泄漏。

**递进追问：**

1. **ThreadLocal 能让一个可变对象变得线程安全吗？**

   只有每个线程持有独立对象时能隔离；若多个线程的值仍指向同一对象，竞态依旧存在。

2. **键是弱引用为什么仍可能内存滞留？**

   键被回收后 entry 的 value 仍可能被线程长期强引用，直到 Map 操作触发清理或线程结束。

**易错点：**

- 在线程池任务中 set 后不 remove，造成请求上下文污染和对象滞留。
- 用 ThreadLocal 隐藏大量业务依赖，使异步切换线程后上下文丢失。

**参考来源：**

- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 ThreadLocal API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ThreadLocal.html)
- [技术校准：Java 21 Thread API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html)

校验日期：2026-08-06

## Q38：死锁产生的条件是什么，怎样预防和排查？

**短回答：**

死锁常由互斥、占有且等待、不可剥夺和循环等待同时成立；工程上通过固定锁顺序、缩小锁范围、超时尝试和线程转储来预防与定位。

**原理：**

两个线程分别持有 A 等 B、持有 B 等 A，就形成循环等待。预防最有效的是破坏必要条件：为多把锁定义全局顺序；一次性申请所需资源；用 tryLock 超时后释放已持有锁；减少锁嵌套与锁内阻塞 I/O。排查时获取线程 dump，查看 BLOCKED 线程、锁拥有者和 JVM 报告的死锁环，结合代码路径确认资源顺序。数据库死锁与 JVM 监视器死锁是不同层面，还要查看数据库诊断。

**代码 / 场景：**

转账同时锁两个账户时，所有线程按 accountId 从小到大加锁，而不是按转出、转入顺序。线上无响应时用 jcmd Thread.print 或 ThreadMXBean 获取锁图，先保留证据再决定重启，并补并发回归测试。

**递进追问：**

1. **发生死锁时 CPU 一定很高吗？**

   不一定。线程可能都在阻塞等待，CPU 反而较低，但吞吐停滞、请求和队列持续积压。

2. **tryLock 超时能彻底避免业务问题吗？**

   它能避免无限等待，但需要正确释放已持有资源，并为失败设计重试、回滚或提示。

**易错点：**

- 只背四个条件，不会画出具体线程和锁的等待环。
- 看到服务卡住就直接重启，未保留线程转储导致根因无法复盘。

**参考来源：**

- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 ThreadMXBean API](https://docs.oracle.com/en/java/javase/21/docs/api/java.management/java/lang/management/ThreadMXBean.html)
- [技术校准：Java 21 Lock API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/Lock.html)

校验日期：2026-08-06

## Q39：CAS 的原理是什么，ABA 问题怎样解决？

**短回答：**

CAS 原子比较内存位置的当前值与期望值，相等才写入新值，失败由调用方重试；ABA 是值变回原样却掩盖了中间变化，可加入版本号解决。

**原理：**

原子类常用 compareAndSet 构建无锁更新循环：读取旧值，计算新值，CAS 提交；竞争失败后重新读取。它避免线程阻塞和上下文切换，但高竞争下会反复自旋消耗 CPU，也难以直接维护多个变量的复合不变量。ABA 场景中值从 A 变 B 又回 A，单看值的 CAS 认为未变化，却可能错过节点生命周期。AtomicStampedReference 等把值与版本一起比较，或通过不可复用标识、锁来处理。

**代码 / 场景：**

计数器可用 AtomicInteger.incrementAndGet。无锁栈弹出节点时，如果节点 A 被移除又重新压回，旧线程仅比较头引用可能错误成功；将头引用与递增 stamp 作为整体检查，可识别中间发生过变化。

**递进追问：**

1. **CAS 一定比锁性能好吗？**

   不一定。低竞争短操作常有优势，高竞争或长重试会浪费 CPU，锁反而能更好地排队。

2. **AtomicInteger 能保证两个字段同时更新吗？**

   不能。它只保证自身操作原子，多字段不变量应封装成一个不可变状态做原子替换或使用锁。

**易错点：**

- 把 CAS 说成完全没有开销，忽略竞争自旋和失败重试。
- 只解释值从 A 回到 A，却不说明版本号或状态封装如何修复。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（中）](https://javaguide.cn/java/concurrent/java-concurrent-questions-02.html)
- [技术校准：Java 21 原子变量 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/package-summary.html)
- [技术校准：JLS 17：线程与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)

校验日期：2026-08-06

# 四、JVM 与垃圾回收（11 题）

## Q40：JVM 运行时数据区包括哪些部分？

**短回答：**

常见运行时区域包括线程私有的程序计数器、Java 虚拟机栈和本地方法栈，以及线程共享的堆和方法区；直接内存则位于规范数据区之外。

**原理：**

程序计数器记录当前线程下一条字节码位置；虚拟机栈由栈帧组成，保存局部变量、操作数栈和返回信息；本地方法栈服务于 native 调用。堆主要存放对象和数组，是垃圾回收重点。方法区是规范概念，保存类结构、运行时常量池等，HotSpot 从 JDK 8 起主要以本地内存中的 Metaspace 实现，而不是永久代。线程隔离与共享属性影响故障范围，排障时还要关注直接缓冲区、代码缓存和线程栈等非堆消耗。

![Java 进程中堆、Metaspace、直接内存和线程栈的边界与限制图](/content/diagrams/java-foundations/jvm-memory-v1.svg "Xmx 只约束 Java 堆；容量规划还要给类元数据、直接缓冲区、线程栈和本地组件留出余量。")

**代码 / 场景：**

堆使用正常但容器仍被 OOM Kill 时，不能只调大 Xmx；还要检查线程数量乘 Xss、DirectByteBuffer、Metaspace、JIT 代码缓存和本地库。通过进程 RSS、NMT、GC 日志和线程数逐层对账。

**递进追问：**

1. **方法区是否等同于永久代或 Metaspace？**

   方法区是 JVM 规范的逻辑区域，永久代和 Metaspace 是 HotSpot 在不同版本中的具体实现。

2. **运行时常量池放在哪里？**

   它是每个类或接口常量池表的运行时表示，属于方法区逻辑内容，具体存储由实现决定。

**易错点：**

- 继续把 JDK 8 以后方法区直接称为永久代。
- 只看 Java 堆使用量，忽略直接内存、线程栈和元数据等本地内存。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [技术校准：JVMS 2：JVM 结构与运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)

校验日期：2026-08-06

## Q41：Java 堆和虚拟机栈有什么区别？

**短回答：**

堆由线程共享，主要承载对象并由 GC 管理；每个线程拥有自己的虚拟机栈，方法调用创建栈帧，返回后帧随即弹出。

**原理：**

堆的容量通常由 Xms、Xmx 等参数约束，对象不一定物理连续，逃逸分析还可能消除分配，因此“对象一定在堆上”不宜绝对化。虚拟机栈保存每次方法调用的局部变量表、操作数栈、动态链接和返回信息；栈帧之间按调用关系进出。大量存活对象或分配压力可能导致堆 OOM，过深递归可能导致 StackOverflowError，大量线程还会因每线程栈占用推高进程内存。

**代码 / 场景：**

无限递归通常迅速抛 StackOverflowError；把百万个大对象持续放入静态 List 更可能造成堆 OOM。线上创建数千线程时，即使堆未满，线程栈和系统线程资源也可能先耗尽，需结合 Xss 与并发模型分析。

**递进追问：**

1. **局部变量引用和它指向的对象分别在哪里？**

   引用可位于当前栈帧的局部变量表，对象通常由堆管理，但具体优化不能用简单物理位置绝对描述。

2. **栈内存是否由垃圾回收器回收？**

   栈帧随方法返回自动弹出，不依靠对象垃圾回收流程；线程结束后其栈整体释放。

**易错点：**

- 把“引用在栈、对象在堆”当作没有任何优化例外的物理定律。
- 只通过加大线程栈解决递归问题，未修复无限递归或错误终止条件。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [技术校准：JVMS 2：JVM 结构与运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)

校验日期：2026-08-06

## Q42：一个 Java 对象从创建到可用经历了什么？

**短回答：**

执行 new 前要确保目标类已初始化，随后为对象分配内存、设置零值和对象头、执行构造初始化，最后把引用交给调用代码。

**原理：**

new 指令解析类符号引用，必要时触发类加载、链接和初始化。JVM 在堆中为实例字段与对象元数据安排空间，先把实例字段设为默认零值并建立对象头等运行时信息，然后按语言规则执行实例字段初始化、初始化块和构造器链。构造器总会先完成父类构造过程。对象引用只有在构造流程正常完成并被正确发布后才应交给其他线程；在构造器中把 this 注册到全局位置会造成逸出，让其他线程看到未完成状态。

**代码 / 场景：**

Repository 构造器若先把 this 放入静态监听器，再初始化连接字段，其他线程可能提前回调并读到 null。应完成构造后由工厂注册，并通过 final 字段、锁或安全容器发布。对象很大或创建频繁时，再结合分配率和逃逸分析判断优化点。

**递进追问：**

1. **new 对象时字段为什么先有默认值？**

   JVM 在执行显式字段初始化和构造器代码前会进行零值准备，保证实例字段具有规范定义的初始状态。

2. **构造器返回是否意味着其他线程必然看到完整对象？**

   不必然。还需要安全发布；final 字段有特殊保证，普通字段仍应借助同步关系传播。

**易错点：**

- 把对象创建简化成“堆上分配一块内存”，漏掉类初始化与构造顺序。
- 在构造器中泄漏 this，让其他线程可能观察到半初始化对象。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [技术校准：JLS 12：执行、加载与初始化](https://docs.oracle.com/javase/specs/jls/se21/html/jls-12.html)
- [技术校准：JVMS 2：JVM 结构与运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)

校验日期：2026-08-06

## Q43：什么是 GC Roots，可达性分析怎样判断对象存活？

**短回答：**

可达性分析从一组 GC Roots 沿引用关系遍历，能到达的对象视为存活候选，无法到达的对象才可能被回收。

**原理：**

常见根包括当前线程栈帧中的活动引用、已加载类的静态字段、JNI 全局引用以及 JVM 内部持有对象。GC 在安全点或相应并发阶段获取和处理根，再遍历对象图。引用不可达通常是回收必要条件，但软、弱、虚引用及终结历史机制会影响处理时机。对象之间即使形成环，只要整体不再从 Roots 可达，仍可回收；这也是可达性分析相对简单引用计数的重要能力。

**代码 / 场景：**

双向链表的节点彼此引用，但业务根不再持有整条链后可被 GC 回收。相反，静态 Map 持续保存已经下线租户对象，它们始终从类静态字段可达，会形成内存泄漏；堆转储应查看到 GC Root 的保留路径。

**递进追问：**

1. **引用计数为什么难以处理循环引用？**

   环内对象互相引用会让计数不归零，即使它们已无法从任何程序根访问。

2. **对象不可达后是否会立刻释放内存？**

   不会保证。还要等待相应 GC 周期和引用处理，具体回收时机由收集器与内存压力决定。

**易错点：**

- 把“互相引用”直接判断为永远无法回收，忽略是否从根可达。
- 发现对象数量增长只看类名，不分析到 GC Roots 的保留链。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [技术校准：JDK 21 垃圾回收调优指南](https://docs.oracle.com/en/java/javase/21/gctuning/)
- [技术校准：JVMS 2：JVM 结构与运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)

校验日期：2026-08-06

## Q44：标记—清除、复制和标记—整理算法有什么区别？

**短回答：**

标记—清除直接回收不可达区域但可能产生碎片，复制把存活对象搬到新区域，标记—整理则把存活对象压缩后统一释放尾部空间。

**原理：**

三类算法的权衡点是存活比例、移动成本、额外空间和停顿：
- 标记—清除不必搬移所有存活对象，但空闲块分散，后续大对象分配可能困难。
- 复制算法按存活对象量搬迁，分配连续且简单，却需要目标空间。
- 标记—整理在标记后移动并压缩存活对象，减少碎片，但移动和更新引用成本更高。
现代收集器常分区并组合这些思想，不应把整个堆简单归为单一算法。

**代码 / 场景：**

年轻代多数对象很快死亡，复制少量存活对象通常划算；老年代存活率较高，若每次复制全部存活对象成本更大。G1 按 Region 选择回收集合并转移存活对象，本质上组合分区、标记和复制整理思想。

**递进追问：**

1. **复制算法是否一定浪费一半内存？**

   不一定。具体收集器可使用多个区域和动态回收集合，不必采用固定对半的经典教科书布局。

2. **对象移动后引用怎样保持正确？**

   GC 会更新指向被移动对象的引用，并通过转发表、记忆集等实现细节维护对象图。

**易错点：**

- 把教科书三种算法机械对应到所有现代收集器实现。
- 只比较暂停时间，不考虑额外空间、碎片和存活对象复制成本。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [技术校准：JDK 21 垃圾回收调优指南](https://docs.oracle.com/en/java/javase/21/gctuning/)

校验日期：2026-08-06

## Q45：JVM 为什么采用分代收集？

**短回答：**

分代利用“大多数对象朝生夕死、熬过多次回收的对象更可能长寿”的经验规律，让不同存活特征的区域采用不同回收频率与策略。

**原理：**

年轻代承接大部分新对象并较频繁回收，存活对象经过复制和年龄增长后可能晋升老年代；老年代回收通常更昂贵且频率更低。跨代引用会让年轻代回收不能扫描整个老年代，收集器借助卡表或记忆集记录相关引用。分代是假设与优化策略，不改变对象语义，也不是所有收集器都按固定 Eden、Survivor 比例工作；区域化收集器可以动态安排 Region 角色。

**代码 / 场景：**

接口每次创建的大量临时 DTO 很快失效，适合在年轻代回收；静态缓存长期持有的数据会进入老年代。若缓存无界增长，调大年轻代无法解决，必须控制缓存生命周期并观察晋升率和老年代占用。

**递进追问：**

1. **对象年龄达到阈值就一定晋升吗？**

   不一定。晋升还受 Survivor 空间、动态年龄判断、分配担保和具体收集器策略影响。

2. **为什么年轻代 GC 需要关心老年代引用？**

   老年代对象可能指向年轻对象，若完全不扫描相关关系，就会把仍被引用的年轻对象误判为垃圾。

**易错点：**

- 把分代规则说成所有 JVM 和收集器都固定不变的布局。
- 看到对象晋升就只调年龄阈值，不先确认长期引用是否本来就不该存在。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [技术校准：JDK 21 垃圾回收调优指南](https://docs.oracle.com/en/java/javase/21/gctuning/)

校验日期：2026-08-06

## Q46：Minor GC、Major GC 和 Full GC 有什么区别？

**短回答：**

Minor GC 通常指年轻代回收，Major GC 常被用于老年代回收，Full GC 通常覆盖整个堆并可能处理更多区域；后两者名称在工具和收集器间并不完全统一。

**原理：**

这些术语不是 JVMS 为所有实现规定的严格统一事件名。传统分代语境中，Minor GC 回收年轻代，通常频繁且停顿较短；Major GC 有时指老年代回收，有些日志却把它与 Full GC 混用；Full GC 往往进行更完整的堆回收、类卸载或压缩，停顿风险较大。分析时必须看所用 JDK、收集器和 GC 日志事件，例如 G1 的 Young、Mixed、Concurrent Mark 与 Full GC，而不是仅凭口头名称判断。

**代码 / 场景：**

监控显示“Major GC 次数增加”时，先核对采集器如何定义指标，并查看原始 GC 日志的 cause、回收前后占用和暂停。G1 连续 Young GC 本身不等于故障；若最终出现 to-space exhausted 后 Full GC，才需要结合分配与标记进度分析。

**递进追问：**

1. **Minor GC 一定不会回收老年代对象吗？**

   术语通常指年轻代回收，但具体收集器会处理跨区引用等辅助信息，仍应以实际日志事件为准。

2. **Full GC 次数为零就代表 GC 健康吗？**

   不代表。频繁年轻代停顿、并发周期跟不上或分配失败同样可能造成严重延迟。

**易错点：**

- 把 Major GC 与 Full GC 当作所有 JVM 中完全统一的同义词。
- 只看 GC 次数，不看暂停、回收效果、分配率和触发原因。

**参考来源：**

- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JDK 21 垃圾回收调优指南](https://docs.oracle.com/en/java/javase/21/gctuning/)

校验日期：2026-08-06

## Q47：类加载过程包括哪些阶段？

**短回答：**

类从字节流进入可用状态通常经历加载、链接和初始化；链接又分验证、准备与解析，初始化执行类变量赋值和静态初始化块。

**原理：**

加载阶段查找类的二进制表示并创建对应 Class 对象。验证检查格式、字节码和符号等安全性；准备为静态字段分配并设置默认值，编译期常量有特殊处理；解析把常量池中的符号引用转换为直接引用，允许按实现延迟。初始化执行编译器生成的类初始化方法，按父类先于子类的规则处理静态字段赋值和静态块。加载、链接和初始化在时间上可交错或延迟，但必须满足规范约束。

**代码 / 场景：**

声明 static int x = compute() 时，准备阶段先给 x 零值，初始化阶段才调用 compute 赋业务值。仅定义 Class 类型字面量或创建数组不一定触发目标类初始化，而 new、访问非编译期常量静态字段等通常属于主动使用。

**递进追问：**

1. **加载完成是否代表静态代码块已经执行？**

   不代表。静态代码块属于初始化阶段，加载和链接可先完成而初始化尚未发生。

2. **访问 static final 常量一定触发类初始化吗？**

   不一定。编译期常量可能被内联到调用方，读取时无需初始化声明该常量的类。

**易错点：**

- 把加载、链接、初始化合并成一个模糊步骤，解释不了静态字段零值。
- 认为任何对 Class 的接触都会立即执行静态初始化块。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：类加载过程详解](https://javaguide.cn/java/jvm/class-loading-process.html)
- [技术校准：JLS 12：执行、加载与初始化](https://docs.oracle.com/javase/specs/jls/se21/html/jls-12.html)

校验日期：2026-08-06

## Q48：什么是双亲委派模型，它有什么作用？

**短回答：**

类加载器接到加载请求时通常先委派父加载器，父级无法完成才自行查找；这样能复用已加载类并保护 Java 核心类型的一致性。

**原理：**

常见层次包括 Bootstrap、Platform 和 Application ClassLoader，自定义加载器通常继承 ClassLoader.loadClass 的委派逻辑。类身份由“完整类名加定义它的类加载器”共同决定，同名 class 被两个互不关联的加载器定义后类型并不相同。双亲委派避免应用随意用自定义 java.lang.String 替换核心类，也减少重复加载。它不是不可打破的绝对规定，SPI、模块化服务器和热部署会使用线程上下文加载器、子优先等受控机制。

**代码 / 场景：**

插件系统可为每个插件建立独立 ClassLoader，使不同版本依赖隔离；跨加载器交互通过父加载器可见的公共接口。若直接把插件实现类强转为主应用中“同名”类，可能出现 ClassCastException，因为定义加载器不同。

**递进追问：**

1. **双亲委派中的父子是 Java 继承关系吗？**

   不一定。它描述加载请求的委派关系，通常通过持有 parent 引用实现，并非必须由类继承表达。

2. **为什么 SPI 常需要线程上下文类加载器？**

   父加载器定义的框架接口需要发现应用层实现，而父级默认看不到子级类，因此借上下文加载器反向查找。

**易错点：**

- 把双亲委派描述成“父加载器一定先加载所有类”，忽略按请求和失败回退。
- 只知道能防核心类替换，不理解类身份还包含定义加载器。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：类加载器与双亲委派](https://javaguide.cn/java/jvm/classloader.html)
- [技术校准：Java 21 ClassLoader API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ClassLoader.html)
- [技术校准：JLS 12：执行、加载与初始化](https://docs.oracle.com/javase/specs/jls/se21/html/jls-12.html)

校验日期：2026-08-06

## Q49：OutOfMemoryError 和 StackOverflowError 有什么区别？

**短回答：**

StackOverflowError 通常来自单线程调用栈过深，OutOfMemoryError 表示 JVM 无法在某个内存区域满足分配；OOM 不只可能发生在 Java 堆。

**原理：**

无限递归或过深调用会不断创建栈帧，超过线程栈能力后抛 StackOverflowError。OOM 需要看错误消息和区域：Java heap space 常见于真实泄漏、容量不足或瞬时分配；Metaspace 可能来自大量动态类及其加载器不能卸载；direct buffer memory 涉及直接内存；unable to create native thread 可能是线程数、地址空间或系统限制。两者都属于 Error，不应靠常规 catch 后继续运行，应该先保存堆转储、线程转储、GC 日志和系统指标。

**代码 / 场景：**

递归解析深层树导致 StackOverflow，应改迭代或限制深度，而不是只调大 Xss。堆 OOM 时先比较对象数量和到 GC Root 的路径；若容器被杀却没有 Java 堆 OOM，则核对 RSS、线程栈和直接内存。

**递进追问：**

1. **调大 Xmx 能解决所有 OOM 吗？**

   不能。非堆、直接内存、线程和操作系统限制导致的问题不会由 Xmx 解决，内存泄漏也只是延后失败。

2. **StackOverflowError 是否只可能由无限递归造成？**

   不是。有限但过深的调用、过大的栈帧和较小线程栈也可能触发。

**易错点：**

- 看到任何内存问题都先增大 Xmx，没有确认具体失败区域。
- 捕获 OOM 后继续提供服务，忽略进程状态和诊断证据可能已经不可靠。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [技术校准：Java 21 Throwable API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Throwable.html)
- [技术校准：JVMS 2：JVM 结构与运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)

校验日期：2026-08-06

## Q50：G1 收集器有什么特点，Full GC 频繁时怎样排查？

**短回答：**

G1 把堆划分为多个 Region，按收益选择回收集合并以可预测停顿为目标；频繁 Full GC 要从触发原因、分配速率、存活量和并发标记进度逐层排查。

**原理：**

G1 让 Region 动态承担 Eden、Survivor、Old 或大对象角色，年轻代回收转移存活对象，并发标记后可执行 Mixed GC 回收部分老年代 Region。它以停顿目标做启发式选择，不承诺每次都满足目标。Full GC 常见线索包括并发周期启动过晚、分配或晋升速度过快、Humongous 对象占用、转移空间不足、显式 System.gc 或真实长期存活集接近堆上限。先读 GC 日志中的 cause、各区域变化、暂停与回收效果，再结合堆和业务分配定位。

**代码 / 场景：**

若日志显示大量 Humongous 分配后触发并发模式失败，应定位超大 byte 数组来源，而不是只增加并发 GC 线程。若老年代回收后仍接近上限，获取 heap dump 分析 dominator 与 GC Root；若回收效果好但很快涨满，则重点查分配率和流量。

**递进追问：**

1. **设置 MaxGCPauseMillis 是否能硬性限制停顿？**

   不能，它是收集器的软目标，实际停顿仍受存活对象、根扫描、系统资源和回收失败影响。

2. **排查 Full GC 最先应看哪些信息？**

   先看时间线、GC cause、回收前后占用、暂停、分配和晋升速率，再决定是否抓堆或调整参数。

**易错点：**

- 看到 Full GC 就先堆叠 JVM 参数，未确认触发原因和回收效果。
- 把 G1 的停顿目标当作任何负载下都能严格兑现的 SLA。

**参考来源：**

- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JDK 21 垃圾回收调优指南](https://docs.oracle.com/en/java/javase/21/gctuning/)
- [技术校准：JDK 21 jcmd 工具说明](https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html)

校验日期：2026-08-06

# 五、现代 Java 与高频补全（10 题）

## Q51：Lambda 表达式和函数式接口是什么？

**短回答：**

Lambda 是对“可作为值传递的一段行为”的简洁表达；它的目标类型必须是函数式接口，即只有一个抽象方法的接口，default、static 和与 Object 等价的方法不计入这个数量。

**原理：**

理解 Lambda 要抓住“目标类型”和“捕获变量”：
- 编译器从赋值、参数或返回值位置推断目标函数式接口，再把参数与返回值对齐到它的单一抽象方法。
- `@FunctionalInterface` 不是必需条件，但能让编译器校验接口以后仍只有一个抽象方法。
- Lambda 可以捕获外层局部变量，但该变量必须是 final 或事实上不再赋值的 effectively final；成员字段不受这条局部变量规则限制。
- Lambda 没有独立的 `this`，其中的 `this` 指向外围实例；这与匿名内部类不同。
- 方法引用只是满足目标类型时对既有方法的更紧凑写法，不会改变调用语义。

**代码 / 场景：**

把订单筛选规则声明为 `Predicate<Order> paid = order -> order.isPaid()`，再传给通用过滤方法，调用方无需创建只使用一次的实现类。若 Lambda 捕获局部阈值 `limit`，后续不能再给 limit 赋值；需要可变计数时应重新设计状态归属，而不是用单元素数组绕过限制。

**递进追问：**

1. **函数式接口可以有多个方法吗？**

   可以有多个 default、static 或 private 方法，但只能有一个需要实现的抽象方法；否则不能作为 Lambda 的目标类型。

2. **Lambda 和匿名内部类的 this 有何区别？**

   Lambda 的 this 继承外围词法作用域，匿名内部类的 this 指向新建的匿名类实例。

**易错点：**

- 认为 Lambda 天然异步；它只是行为表示，是否换线程取决于调用它的 API。
- 在 Lambda 中堆叠大量分支与副作用，使简洁语法掩盖复杂业务流程。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 8 新特性实战](https://javaguide.cn/java/new-features/java8-common-new-features.html)
- [技术校准：Java 21 函数式接口 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/function/package-summary.html)
- [技术校准：JLS 15：表达式](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html)

校验日期：2026-08-06

## Q52：Stream 的执行模型是什么，什么时候不适合使用？

**短回答：**

Stream 是一次性的声明式数据处理管道：中间操作通常惰性组装，终止操作才触发遍历；它强调无干扰、少副作用，不等同于集合，也不会默认并行。

**原理：**

一条 Stream 管道由数据源、中间操作和终止操作组成：
- `map`、`filter`、`sorted` 等中间操作返回新流，通常在终止操作出现前不读取全部数据。
- `collect`、`reduce`、`forEach`、`count` 等终止操作消费流；同一流终止后不能再次复用。
- 无状态操作可以逐个元素融合执行；`sorted`、`distinct` 等有状态操作可能缓存较多数据。
- 短路操作如 `findFirst`、`anyMatch` 可以提前结束，但是否有序影响可并行程度。
- parallelStream 使用公共 ForkJoinPool，只有数据量、任务粒度和关联规约都合适时才可能获益。

**代码 / 场景：**

统计有效订单总额可写成 `orders.stream().filter(Order::isValid).map(Order::amount).reduce(BigDecimal.ZERO, BigDecimal::add)`。如果处理过程需要逐步修改多份共享状态、频繁阻塞远程接口，显式循环或受控线程池通常更清晰，也更容易限流与排障。

**递进追问：**

1. **map 和 flatMap 的区别是什么？**

   map 把一个元素映射成一个结果；flatMap 把一个元素映射成流，再把多层流摊平成单层。

2. **并行流一定更快吗？**

   不一定。拆分、合并、线程竞争和公共线程池干扰都可能让它更慢，必须用真实数据和负载验证。

**易错点：**

- 在 peek、map 或 forEach 中修改外部共享集合，破坏无干扰要求并引入并发错误。
- 把数据库查询、网络调用直接放进并行流，失去线程池隔离、超时和背压控制。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 8 新特性实战](https://javaguide.cn/java/new-features/java8-common-new-features.html)
- [技术校准：Java 21 Stream API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/package-summary.html)

校验日期：2026-08-06

## Q53：Optional 应该怎样使用，为什么不建议到处使用？

**短回答：**

Optional 用显式的“可能没有结果”替代部分裸 null 返回值，适合方法返回边界；它不是通用字段容器，也不应靠 get 或层层包装掩盖数据模型问题。

**原理：**

Optional 的价值来自调用协议而非消灭所有 null：
- `of` 要求值非空，`ofNullable` 接受 null，`empty` 明确表示没有值。
- `map` 适合普通映射，映射函数本身返回 Optional 时用 `flatMap` 避免嵌套。
- `orElse` 会先计算备用值，即使当前有值；备用计算昂贵或有副作用时用惰性的 `orElseGet`。
- `orElseThrow` 适合把“缺失”转换为清晰异常，`ifPresentOrElse` 适合显式处理两条分支。
- 参数、DTO/实体字段和集合元素通常仍应通过约束、空集合或领域类型表达，而非全部改成 Optional。

**代码 / 场景：**

仓储接口可返回 `Optional<User>`，服务层用 `orElseThrow(() -> new UserNotFoundException(id))` 转成领域错误。不要写 `optional.isPresent()` 后紧接 `get()` 模拟 null 判断；可以用 map、flatMap 或显式分支直接表达后续动作。

**递进追问：**

1. **orElse 和 orElseGet 有什么关键差别？**

   orElse 的参数会立即求值，orElseGet 的 Supplier 只在 Optional 为空时调用。

2. **为什么返回 Optional<List<T>> 往往没有必要？**

   集合本身可以用空集合表达“没有元素”，再套 Optional 通常增加一种无业务价值的缺失状态。

**易错点：**

- 直接调用 get 而不证明值存在，把空值错误推迟为 NoSuchElementException。
- 把 Optional 用作所有实体字段和方法参数，增加序列化、框架兼容与调用复杂度。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 8 新特性实战](https://javaguide.cn/java/new-features/java8-common-new-features.html)
- [技术校准：Java 21 Optional API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Optional.html)

校验日期：2026-08-06

## Q54：Java 注解、元注解和保留策略分别是什么？

**短回答：**

注解是附着在程序元素上的结构化元数据；元注解约束注解自身的使用方式，其中 Retention 决定信息保留到源码、class 文件还是运行时。

**原理：**

常见元注解需要成组理解：
- `@Target` 限定可标注的位置，如类型、方法、字段、参数或 TYPE_USE。
- `@Retention(SOURCE)` 只在源码阶段存在，CLASS 会写入 class 但运行时反射不可见，RUNTIME 才能被反射读取。
- `@Documented` 控制是否进入生成文档，`@Inherited` 只影响类级注解沿父类继承，不会自动作用于接口或方法。
- `@Repeatable` 允许同一位置重复出现同类注解，底层需要容器注解。
注解本身通常只是元数据，真正行为来自编译器、注解处理器、字节码工具或运行时框架。

**代码 / 场景：**

运行时路由框架若要通过反射读取自定义 `@Route`，必须把保留策略设为 RUNTIME，并把 Target 设为 METHOD 或 TYPE。编译期生成代码的注解可以使用 SOURCE 或 CLASS，再由 annotation processor 处理，不必为运行时反射付出成本。

**递进追问：**

1. **@Inherited 能让接口上的注解被实现类继承吗？**

   不能。它只影响类上的注解沿超类关系查询，不适用于接口实现、字段或方法。

2. **RUNTIME 注解会自动执行逻辑吗？**

   不会。必须有框架、反射代码或其他处理器主动读取并解释它。

**易错点：**

- 忘记设置 RUNTIME，却在生产中用反射读取，结果始终拿不到注解。
- 把注解当成业务能力本身，忽略真正执行逻辑的处理器、代理与生命周期。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（下）](https://javaguide.cn/java/basis/java-basic-questions-03.html)
- [技术校准：JLS 9.6：注解接口](https://docs.oracle.com/javase/specs/jls/se21/html/jls-9.html#jls-9.6)
- [技术校准：Java 21 Retention API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/annotation/Retention.html)

校验日期：2026-08-06

## Q55：Queue、Deque 和 BlockingQueue 有什么区别？

**短回答：**

Queue 抽象队列访问，Deque 支持两端插入删除并可实现栈，BlockingQueue 则为生产者—消费者增加阻塞等待和容量协作语义。

**原理：**

三类接口的关键区别在操作端与失败策略：
- Queue 通常按 FIFO 使用，`add/remove/element` 失败时抛异常，`offer/poll/peek` 用返回值表示失败或空。
- Deque 增加 first/last 两端操作；作为栈时优先用 `push/pop/peek`，不推荐遗留 Stack。
- BlockingQueue 提供 `put/take` 的可中断阻塞操作，以及带超时的 `offer/poll`，适合在线程间传递任务。
- 有界阻塞队列不仅存数据，还提供背压；无界队列可能把处理能力不足转化成内存压力。
- BlockingQueue 不接受 null，因为 null 常被 poll 用来表示当前无元素。

**代码 / 场景：**

日志生产者可向 `ArrayBlockingQueue` 执行带超时 offer，消费者用 take 获取；队列满时记录丢弃、降级或回压指标。需要头尾都操作的滑动窗口可使用 ArrayDeque，但它不是线程安全容器。

**递进追问：**

1. **ArrayDeque 和 LinkedList 作为队列通常怎样选？**

   一般优先 ArrayDeque，连续数组局部性更好且不接受 null；只有确实需要 LinkedList 的其他链表特性时再选。

2. **BlockingQueue 能代替线程池吗？**

   不能。它只协调任务传递，线程创建、执行、异常、关闭与拒绝策略仍需执行器或专门组件管理。

**易错点：**

- 使用无界队列却没有监控积压，让突发流量最终表现为 OOM。
- 混用抛异常与返回特殊值的两组 Queue API，漏掉空队列或队满分支。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [技术校准：Java 21 Queue API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Queue.html)
- [技术校准：Java 21 Deque API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Deque.html)
- [技术校准：Java 21 BlockingQueue API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/BlockingQueue.html)

校验日期：2026-08-06

## Q56：LinkedHashMap 和 TreeMap 的适用场景有什么不同？

**短回答：**

LinkedHashMap 在哈希查找基础上维护插入序或访问序，TreeMap 按自然顺序或 Comparator 维护有序键；前者适合稳定遍历与简单 LRU，后者适合排序和范围查询。

**原理：**

选择时同时比较顺序语义与复杂度：
- LinkedHashMap 通过双向链表串联条目，常规查找平均仍为 O(1)，可配置 accessOrder 并重写 removeEldestEntry 做简单容量淘汰。
- TreeMap 基于红黑树，查找、插入、删除通常为 O(log n)，提供 floorKey、ceilingKey、subMap 等导航与范围视图。
- TreeMap 的比较结果决定键是否相同：Comparator 返回 0 的两个键会占同一映射位置，即使 equals 为 false。
- 两者默认都不是线程安全；视图通常与原映射联动，不是独立副本。

**代码 / 场景：**

接口需要按用户提交顺序输出字段时使用 LinkedHashMap；做价格区间索引并查找不高于目标价的最近档位时使用 TreeMap.floorEntry。简单本地 LRU 可借助访问序 LinkedHashMap，但并发缓存、过期和统计应交给专门缓存库。

**递进追问：**

1. **HashMap 能保证某种遍历顺序吗？**

   不能把当前观察到的顺序当作契约；需要插入序应明确选择 LinkedHashMap。

2. **TreeMap 的 Comparator 为什么要与 equals 一致？**

   若比较为 0 但 equals 为 false，Map 会按同一个键处理，容易产生违反调用方直觉的覆盖和查询结果。

**易错点：**

- 用 LinkedHashMap 手写生产级缓存，却遗漏并发、过期、权重与命中率治理。
- Comparator 只比较一个非唯一字段，导致多个业务键被 TreeMap 当作同一键。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [技术校准：Java 21 LinkedHashMap API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/LinkedHashMap.html)
- [技术校准：Java 21 TreeMap API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/TreeMap.html)

校验日期：2026-08-06

## Q57：进阶：CopyOnWriteArrayList 为什么适合读多写少？

**短回答：**

这是并发容器进阶题。CopyOnWriteArrayList 写入时复制底层数组并发布新快照，读取无需写锁且迭代稳定，适合规模有限、读取远多于修改的场景。

**原理：**

它的成本和语义来自写时复制：
- get 等读取直接访问当前数组快照，不需要为普通读取获取写锁。
- add、set、remove 会复制数组再修改，时间与额外内存开销随数组规模增长。
- 迭代器持有创建时的快照，不会抛 ConcurrentModificationException，也看不到迭代开始后的新增删除。
- 元素对象本身并不会被深拷贝；若元素可变，仍需处理对象内部的并发安全。
- 复合操作不能自动由多个单独方法组成原子事务，应使用专门方法或外部同步。

**代码 / 场景：**

事件总线保存几十个、很少变化的监听器时，分发线程可遍历稳定快照，不必与偶发注册争用。若订单明细每秒更新成千上万次，写时复制会产生大量数组和 GC 压力，应换成更匹配的并发结构。

**递进追问：**

1. **它的迭代器为什么不支持 remove？**

   迭代器面对的是不可变历史快照，直接删除无法清晰映射到当前底层数组，因此该操作不受支持。

2. **读无锁是否代表所有操作都无锁？**

   不是。修改操作需要序列化并复制数组，优势只集中在普通读取和快照遍历。

**易错点：**

- 只看到“线程安全”就用于高频写入的大列表，造成复制和内存分配放大。
- 误以为快照会深拷贝元素，对可变元素的并发修改仍可能产生竞态。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（中）](https://javaguide.cn/java/concurrent/java-concurrent-questions-02.html)
- [技术校准：Java 21 CopyOnWriteArrayList API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CopyOnWriteArrayList.html)

校验日期：2026-08-06

## Q58：进阶：AQS 的核心思想是什么？

**短回答：**

这是并发原理进阶题。AQS 让子类定义同步状态的获取与释放规则，由框架统一处理等待队列、阻塞唤醒以及独占或共享传播。

**原理：**

回答 AQS 可以沿“state—队列—模板方法”展开：
- 一个 volatile int state 表示同步状态，子类通过 getState、setState 和 CAS 修改它。
- 获取失败的线程进入 FIFO 风格的 CLH 等待队列，后继线程在合适条件下被挂起和唤醒。
- 独占模式同一时刻只允许一个持有者，共享模式可让多个线程同时成功并向后传播。
- 子类实现 tryAcquire、tryRelease 或共享版本，AQS 的 final 模板方法处理排队、取消与中断。
- ConditionObject 使用独立条件队列；await 先释放同步状态，signal 只把节点转移到同步队列，重新竞争成功后才能继续。

**代码 / 场景：**

ReentrantLock、Semaphore、CountDownLatch 都可借助 AQS，但 state 语义不同：锁可表示重入次数，信号量表示许可数，倒计时器表示剩余计数。业务代码通常使用这些成熟同步器，而不是直接继承 AQS。

**递进追问：**

1. **AQS 队列是否严格公平？**

   不保证。具体同步器的公平策略由获取逻辑决定，非公平实现允许新线程在排队线程前抢占。

2. **signal 后等待线程会立刻执行吗？**

   不会。它先从条件队列转移到同步队列，仍需重新获取锁后才能从 await 返回。

**易错点：**

- 把 AQS 简化成一个普通阻塞队列，忽略 state 与获取/释放模板才是同步语义核心。
- 在业务代码自行继承 AQS，却没有完整处理重入、取消、中断和序列化契约。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（中）](https://javaguide.cn/java/concurrent/java-concurrent-questions-02.html)
- [技术校准：Java 21 AbstractQueuedSynchronizer API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/AbstractQueuedSynchronizer.html)

校验日期：2026-08-06

## Q59：CompletableFuture 怎样组织异步任务和异常处理？

**短回答：**

CompletableFuture 同时表示异步结果和可组合阶段，可串行转换、并行汇合与统一恢复；正确使用的重点是线程池、依赖关系、异常和超时，而不只是把任务丢到后台。

**原理：**

常用组合按依赖关系选择：
- `thenApply` 转换结果，`thenCompose` 串联异步步骤，`thenCombine` 或 `allOf` 汇合独立任务。
- `exceptionally` 提供失败替代值，`handle` 统一处理成败，`whenComplete` 观察结果但不自动吞掉异常。
- 非 Async 阶段可能由前序完成线程执行；Async 默认使用公共池，阻塞任务应传入隔离的 Executor。
- 超时方法只约束 Future 的等待结果，不保证底层 I/O 已被取消。

**代码 / 场景：**

查询用户和权限互不依赖，可分别 supplyAsync 到隔离线程池，再用 thenCombine 组装视图；依赖用户 ID 再查订单时用 thenCompose。出口通过 orTimeout 限制等待，并在 handle 中区分超时、业务失败和成功，避免一律返回空对象。

**递进追问：**

1. **thenApply 和 thenCompose 的区别是什么？**

   thenApply 做同步映射；thenCompose 摊平返回 CompletionStage 的异步映射，类似 Stream 的 flatMap。

2. **join 和 get 有何差别？**

   两者都会等待；get 抛受检的 ExecutionException/InterruptedException，join 用非受检 CompletionException 包装失败。

**易错点：**

- 所有任务都使用公共 ForkJoinPool，阻塞 I/O 抢占其他并行任务并且难以隔离容量。
- 只给最外层 Future 加超时，却误认为远程请求和占用资源会自动停止。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（下）](https://javaguide.cn/java/concurrent/java-concurrent-questions-03.html)
- [技术校准：Java 21 CompletableFuture API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html)

校验日期：2026-08-06

## Q60：进阶：JVM 解释执行和 JIT 编译是怎样配合的？

**短回答：**

这是 JVM 执行引擎进阶题。HotSpot 通常先解释执行字节码，再依据运行时画像把热点代码编译为优化机器码；假设失效时还可能去优化并回退。

**原理：**

从启动到峰值性能可以分层理解：
- class 字节码由 JVM 执行，解释器启动快并收集调用次数、分支和类型等运行时信息。
- 热点代码达到阈值后进入即时编译，分层编译在较快的 C1 与更激进的 C2 优化之间平衡启动和吞吐。
- JIT 可做内联、逃逸分析、标量替换和锁消除等优化；这些依赖真实调用分布，而非只看源码。
- 基于“某调用点只有一种实现”等假设生成的代码，会保留守卫；类加载或类型分布改变时可能触发去优化。
- 冷代码未必值得编译，短生命周期应用也可能还未充分预热就结束。

**代码 / 场景：**

基准测试若只运行一次，测到的主要是类加载、解释执行和编译预热，不代表稳态吞吐。应使用 JMH 处理预热、迭代和防止无用代码消除；线上则结合 JFR、编译日志和延迟分位数判断是否真是 JIT 问题。

**递进追问：**

1. **为什么 Java 不能简单归类为解释型语言？**

   源码先编译为字节码，运行时既可解释，也会把热点代码即时编译为本机机器码。

2. **JIT 编译后的机器码会永久保持不变吗？**

   不一定。依赖的类型或分支假设失效时，JVM 可以使其失效并回退，再按新画像重新优化。

**易错点：**

- 把 JIT 描述成启动时一次性编译全部代码，忽略热点探测、分层编译和去优化。
- 用手写微基准直接比较代码快慢，未预热也未防止常量折叠与无用代码消除。

**参考来源：**

- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：Oracle JDK 21：HotSpot 性能增强](https://docs.oracle.com/en/java/javase/21/vm/java-hotspot-virtual-machine-performance-enhancements.html)
- [技术校准：JVMS 2：JVM 结构与运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)

校验日期：2026-08-06
