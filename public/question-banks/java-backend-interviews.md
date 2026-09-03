# Java 后端高频 54 题

# Spring 与 Spring Boot

## Q1：什么是 Spring IoC 和依赖注入？

**短回答：**

因为在业务类里到处 `new` 具体实现会把创建方式、配置和业务逻辑绑死，Spring 才把对象的创建与依赖管理交给 IoC 容器。依赖注入是容器把所需对象传给 Bean 的具体做法，让业务代码只声明“我需要什么”。

**原理：**

因为 `OrderService` 自己创建支付客户端时，也被迫知道地址、认证、实现类型和生命周期，所以测试替换困难，配置变化还会污染业务代码。改成只声明 `PaymentGateway` 依赖后，装配决策集中在容器，业务类可以稳定地面向接口工作。

Spring 启动时读取配置与组件元数据，形成 BeanDefinition，再由 BeanFactory/ApplicationContext 创建并管理对象。构造器、Setter 或字段注入把依赖关系从对象内部的 `new` 操作移到容器。构造器注入能明确必需依赖、便于测试，并可配合 `final` 保持对象完整，因此通常是首选。

**代码 / 场景：**

**示例场景：**

- **前提：** 订单服务不要在类内直接 new 支付客户端，而是通过构造器接收 PaymentGateway。
- **过程：** 测试时注入假的实现，生产时由容器装配 HTTP 客户端；
- **结果：** 启动失败还能立即暴露缺失依赖。

**对照结果：** 因为在业务类里到处 `new` 具体实现会把创建方式、配置和业务逻辑绑死，Spring 才把对象的创建与依赖管理交给 IoC 容器。

**补充代码示例：**

构造器注入让对象创建时依赖就完整，也方便单元测试替换实现：

```java
// 示例重点：用这段最小代码验证“什么是 Spring IoC 和依赖注入”
@Service
class OrderService {
    private final OrderRepository repository;

    OrderService(OrderRepository repository) {
        this.repository = repository; // 容器在创建 Bean 时传入依赖
    }
}
```

**对照结果：** OrderService 不负责 new 数据库实现；生产环境由 Spring 装配，测试可直接传入 fake repository。

**递进追问：**

1. **BeanFactory 和 ApplicationContext 有什么区别？**

   ApplicationContext 在 BeanFactory 基础上增加事件、国际化、资源加载与自动注册后处理器等应用级能力，日常业务通常直接使用它。

2. **为什么不推荐字段注入？**

   字段注入隐藏必需依赖、难以构造不可变对象，也让普通单元测试必须依赖反射或启动容器，构造器注入更清晰。

**易错点：**

- 把 IoC 解释成“容器里存了很多单例”，忽略控制权转移与生命周期管理。
- 所有依赖都使用 @Autowired 字段注入，导致循环依赖和职责膨胀不易发现。

**参考来源：**

- [真实面经线索（题目已改写）：阿里、腾讯、VIVO、OPPO Java 面经复盘（牛客）](https://www.nowcoder.com/discuss/422046)
- [高频题库参考（内容已重写）：JavaGuide：Spring 常见面试题](https://javaguide.cn/system-design/framework/spring/spring-knowledge-and-questions-summary.html)
- [技术校准：Spring：依赖注入](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html)

校验日期：2026-08-06

## Q2：Spring AOP 是什么，代理怎样生效？

**短回答：**

AOP 把日志、鉴权、事务等横切逻辑从业务方法中抽离。Spring 通常为目标 Bean 创建代理，对匹配的方法调用织入通知，再把调用转发给真实对象。

**原理：**

切点决定哪些连接点需要增强，通知描述调用前后或异常时做什么。目标实现接口时可使用 JDK 动态代理；没有接口时通常使用基于子类的代理。调用必须经过容器返回的代理对象，final 方法、private 方法以及同类内部 self-invocation 都可能绕开或限制代理增强。

**代码 / 场景：**

**示例场景：**

- **前提：** 为所有应用服务的方法统一记录耗时：切点匹配 service 包，环绕通知在 proceed 前后采样时间并打标签。
- **结果：** 若一个方法用 this 调另一个被增强方法，监控或事务可能不生效，应拆到另一个 Bean 或调整调用边界。

**对照结果：** AOP 把日志、鉴权、事务等横切逻辑从业务方法中抽离。Spring 通常为目标 Bean 创建代理，对匹配的方法调用织入通知，再把调用转发给真实对象。

**补充代码示例：**

调用必须经过代理，切面才能在业务方法前后执行：

```java
// 示例重点：用这段最小代码验证“Spring AOP 是什么，代理怎样生效”
@Aspect
@Component
class TimingAspect {
    @Around("@annotation(Timed)")
    Object measure(ProceedingJoinPoint point) throws Throwable {
        long start = System.nanoTime();
        try { return point.proceed(); } // 继续调用真实业务方法
        finally { recordCost(System.nanoTime() - start); }
    }
}
```

**对照结果：** AOP 适合事务、日志、指标等横切逻辑；私有方法或同类自调用通常不会穿过 Spring 代理。

**递进追问：**

1. **JDK 动态代理和子类代理怎么选？**

   有合适接口时 JDK 代理面向接口；子类代理可代理普通类，但无法覆盖 final 类或 final 方法，两者都要求调用经过代理。

2. **切面顺序如何控制？**

   可用 Ordered 或 @Order 指定优先级，并明确异常、事务和日志切面的嵌套关系，不能依赖偶然的注册顺序。

**易错点：**

- 只背“动态代理”，却说不清切点、通知、代理对象与目标对象之间的调用关系。
- 在同一个类内直接调用被 @Transactional 标记的方法，误以为必然经过 AOP 代理。

**参考来源：**

- [真实面经线索（题目已改写）：科大讯飞 Java 后端一面（牛客，2025）](https://www.nowcoder.com/discuss/747230985057468416)
- [高频题库参考（内容已重写）：JavaGuide：Spring 常见面试题](https://javaguide.cn/system-design/framework/spring/spring-knowledge-and-questions-summary.html)
- [技术校准：Spring：AOP 代理机制](https://docs.spring.io/spring-framework/reference/core/aop/proxying.html)

校验日期：2026-08-06

## Q3：Spring Bean 的生命周期有哪些关键阶段？

**短回答：**

核心顺序是实例化、属性填充、Aware 回调、前置处理、初始化、后置处理、可用，容器关闭时再执行销毁回调；代理通常由后处理器在初始化前后创建。

**原理：**

容器先按 BeanDefinition 实例化并注入依赖，再执行 BeanNameAware 等感知接口。BeanPostProcessor 可在初始化前后修改或包装对象，随后执行 @PostConstruct、InitializingBean 或自定义 init 方法。单例 Bean 由容器管理销毁；

prototype Bean 创建后通常不再跟踪完整销毁过程。

**代码 / 场景：**

**示例场景：**

- **前提：** 连接池包装 Bean 在初始化阶段校验地址与凭据，在销毁阶段关闭资源。
- **过程：** 不要在构造器里执行依赖其他 Bean 的远程请求，因为属性可能尚未完成注入；
- **结果：** 启动预热应放在明确的生命周期回调并设置超时。

**对照结果：** 核心顺序是实例化、属性填充、Aware 回调、前置处理、初始化、后置处理、可用，容器关闭时再执行销毁回调；代理通常由后处理器在初始化前后创建。

**补充代码示例：**

初始化与销毁回调应负责资源的成对创建和释放：

```java
// 示例重点：用这段最小代码验证“Spring Bean 的生命周期有哪些关键阶段”
@Component
class ClientHolder {
    @PostConstruct
    void start() { client = connect(); } // 依赖注入完成后初始化

    @PreDestroy
    void stop() { client.close(); }      // 容器关闭前释放资源
}
```

**对照结果：** 构造器适合建立普通不变量；依赖容器完成注入后才可做的工作放初始化阶段，外部资源必须在销毁阶段关闭。

**递进追问：**

1. **BeanPostProcessor 有什么典型用途？**

   它能在 Bean 初始化前后做统一加工，Spring 的自动代理创建、部分注解处理和校验能力都建立在这类扩展点上。

2. **@PostConstruct 和构造器有什么区别？**

   构造器执行时依赖注入通常未完成；@PostConstruct 在属性填充之后执行，更适合依赖已注入对象的轻量初始化。

**易错点：**

- 把生命周期简化成“创建和销毁”，遗漏依赖注入、后处理器与代理生成阶段。
- 在初始化回调里做无超时的重型网络操作，使应用启动卡死且难以滚动发布。

**参考来源：**

- [真实面经线索（题目已改写）：BOSS 直聘 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/801379399596535808)
- [高频题库参考（内容已重写）：JavaGuide：Spring 常见面试题](https://javaguide.cn/system-design/framework/spring/spring-knowledge-and-questions-summary.html)
- [技术校准：Spring：Bean 生命周期回调](https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html)

校验日期：2026-08-06

## Q4：Spring 声明式事务是怎样工作的？

**短回答：**

声明式事务由 AOP 代理拦截方法，事务拦截器根据属性获取连接、开启事务，方法正常返回时提交，匹配回滚规则的异常抛出时回滚。

**原理：**

代理调用进入 TransactionInterceptor 后，事务管理器把连接等资源绑定到当前执行线程，并按照传播行为决定加入、挂起或新建事务。默认情况下运行时异常和 Error 触发回滚，受检异常需要显式配置。事务边界应覆盖需要原子提交的数据库操作，但不应把慢远程调用长时间包在锁和连接中。

**代码 / 场景：**

**示例场景：**

- **前提：** 创建订单与写本地事件表放在同一 public 服务方法中，使用同一个数据源事务提交。
- **结果：** 支付网关调用放到事务外或拆成状态机，避免远程超时让数据库连接和行锁长期占用。

**对照结果：** 声明式事务由 AOP 代理拦截方法，事务拦截器根据属性获取连接、开启事务，方法正常返回时提交，匹配回滚规则的异常抛出时回滚。

**补充代码示例：**

一个代理方法内的多次写入可以共享同一事务边界：

```java
// 示例重点：用这段最小代码验证“Spring 声明式事务是怎样工作的”
@Transactional
public void transfer(long from, long to, BigDecimal amount) {
    accountRepository.debit(from, amount);  // 第一次写
    accountRepository.credit(to, amount);   // 第二次写
    auditRepository.record(from, to, amount);
    // 抛出未检查异常时，默认整体回滚
}
```

**对照结果：** 事务保证的是同一资源边界内的提交/回滚；远程 HTTP 调用不会因为加了注解就自动参与数据库事务。

**递进追问：**

1. **REQUIRED 和 REQUIRES_NEW 有什么区别？**

   REQUIRED 优先加入现有事务；REQUIRES_NEW 会挂起外层事务并开启独立事务，因此内外提交结果可以不同。

2. **事务隔离级别由谁真正实现？**

   Spring 负责声明和设置连接属性，脏读、不可重复读等隔离语义最终由所使用的数据库与驱动实现。

**易错点：**

- 把 @Transactional 当作编译器关键字，忽略它依赖代理、事务管理器和实际数据库连接。
- 在大事务中串行调用多个外部接口，导致锁持有、连接占用和失败回滚范围失控。

**参考来源：**

- [真实面经线索（题目已改写）：BOSS 直聘 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/801379399596535808)
- [高频题库参考（内容已重写）：JavaGuide：Spring 常见面试题](https://javaguide.cn/system-design/framework/spring/spring-knowledge-and-questions-summary.html)
- [技术校准：Spring：声明式事务](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html)

校验日期：2026-08-06

## Q5：@Transactional 为什么会失效？

**短回答：**

常见原因是调用没有经过 Spring 代理、方法不可代理、对象不是容器 Bean、异常被吞掉或不匹配回滚规则，也可能是数据源不支持或用了错误的事务管理器。

**原理：**

同类内部通过 this 调用、手工 new 对象、private/final 方法都可能让拦截器没有机会执行。即使进入代理，方法捕获异常后正常返回会触发提交；受检异常默认也未必回滚。多数据源时事务管理器选择错误，或异步切换线程后资源绑定丢失，都会让实际边界与代码注解不一致。

**代码 / 场景：**

**示例场景：**

- **前提：** 批量导入方法内部调用本类的 saveOne，saveOne 上的 REQUIRES_NEW 没有生效。
- **结果：** 应把独立事务方法拆到另一个 Bean，再用集成测试故意制造异常，核对实际提交记录而不是只看注解。

**对照结果：** 常见原因是调用没有经过 Spring 代理、方法不可代理、对象不是容器 Bean、异常被吞掉或不匹配回滚规则，也可能是数据源不支持或用了错误的事务管理器。

**补充代码示例：**

同类内部调用绕开代理，是最常见的失效方式：

```java
// 示例重点：用这段最小代码验证“@Transactional 为什么会失效”
@Service
class ImportService {
    void importAll() {
        saveOne(); // 等价于 this.saveOne()，没有经过 Spring 代理
    }

    @Transactional
    public void saveOne() { repository.save(item); }
}
// 修复：把 saveOne 移到另一个 Bean，再通过该 Bean 调用
```

**对照结果：** 还要检查方法可代理性、异常是否被吞掉、rollbackFor、事务管理器以及线程是否切换。

**递进追问：**

1. **catch 异常后怎样仍让事务回滚？**

   更推荐按业务边界重新抛出匹配异常；确需吞掉时可显式标记 rollback-only，但要避免让上层误以为操作成功。

2. **异步方法能继承调用方事务吗？**

   通常不能，事务资源绑定在线程上下文；新线程应建立自己的事务或通过消息与状态机处理跨线程一致性。

**易错点：**

- 只回答“private 方法不行”，漏掉 self-invocation、异常规则、多数据源与异步线程。
- 用日志显示进入了方法就断定事务生效，没有通过故障用例检查数据库提交结果。

**参考来源：**

- [真实面经线索（题目已改写）：BOSS 直聘 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/801379399596535808)
- [高频题库参考（内容已重写）：JavaGuide：Spring 常见面试题](https://javaguide.cn/system-design/framework/spring/spring-knowledge-and-questions-summary.html)
- [技术校准：Spring：声明式事务](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html)

校验日期：2026-08-06

## Q6：Spring MVC 一次请求经过哪些组件？

**短回答：**

请求先到 DispatcherServlet，再由 HandlerMapping 找到处理器和拦截器，HandlerAdapter 调用 Controller，返回值经转换器或视图解析后写入 HTTP 响应。

**原理：**

前端控制器统一协调请求，但不直接承担业务。HandlerMapping 依据路径、方法和条件匹配处理器；HandlerAdapter 完成参数解析、校验和方法调用；异常可交给 HandlerExceptionResolver；@ResponseBody 返回值通常由 HttpMessageConverter 序列化。

Filter 属于 Servlet 链，Interceptor 位于 MVC 处理器链，两者作用层次不同。

**代码 / 场景：**

**示例场景：**

- **前提：** JSON 创建订单请求先通过鉴权 Filter，再由参数解析器绑定 DTO 并做 Bean Validation；
- **结果：** Controller 调用应用服务，统一异常处理器把业务异常映射成稳定错误码，消息转换器输出 JSON。

**对照结果：** 请求先到 DispatcherServlet，再由 HandlerMapping 找到处理器和拦截器，HandlerAdapter 调用 Controller，返回值经转换器或视图解析后写入 HTTP 响应。

**递进追问：**

1. **Filter 和 Interceptor 有什么区别？**

   Filter 位于 Servlet 容器链，可覆盖静态资源等请求；Interceptor 由 Spring MVC 管理，能感知匹配到的处理器与执行阶段。

2. **@RestController 为什么直接返回 JSON？**

   它组合了 @Controller 与 @ResponseBody，返回值由消息转换器按协商的媒体类型序列化，而不是交给视图解析器。

**易错点：**

- 把 DispatcherServlet 说成负责执行所有业务，忽略映射器、适配器和消息转换器。
- 在 Controller 里堆事务和领域逻辑，使 HTTP 适配层与业务规则难以测试和复用。

**参考来源：**

- [真实面经线索（题目已改写）：OPPO Java 后端一二面复盘（牛客）](https://www.nowcoder.com/discuss/411933101142585344)
- [高频题库参考（内容已重写）：JavaGuide：Spring 常见面试题](https://javaguide.cn/system-design/framework/spring/spring-knowledge-and-questions-summary.html)
- [技术校准：Spring MVC：DispatcherServlet](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet.html)

校验日期：2026-08-06

## Q7：Spring Boot 自动配置是怎样生效的？

**短回答：**

Spring Boot 根据类路径、已有 Bean、配置属性和应用类型等条件选择自动配置，并用条件注解做到“满足条件才装配、用户自定义优先”。

**原理：**

启动注解开启自动配置导入，候选配置来自 Boot 约定的导入清单。每个自动配置类再用 @ConditionalOnClass、@ConditionalOnMissingBean、@ConditionalOnProperty 等条件决定是否创建 Bean。配置属性把外部配置绑定为类型安全对象。

自动配置不是扫描并实例化所有依赖，而是一组可解释、可排除的条件配置。

**代码 / 场景：**

**示例场景：**

- **前提：** 引入 JDBC starter 且配置 DataSource 属性后，类路径和缺失 Bean 条件满足，Boot 创建数据源相关 Bean；
- **过程：** 如果项目显式声明 DataSource，缺失 Bean 条件不再成立，用户配置接管。
- **结果：** 可通过条件评估报告定位为何未装配。

**对照结果：** Spring Boot 根据类路径、已有 Bean、配置属性和应用类型等条件选择自动配置，并用条件注解做到“满足条件才装配、用户自定义优先”。

**补充代码示例：**

自动配置本质是“条件满足时才注册默认 Bean”：

```java
// 示例重点：用这段最小代码验证“Spring Boot 自动配置是怎样生效的”
@AutoConfiguration
@ConditionalOnClass(DataSource.class) // 类路径中有 JDBC 才考虑启用
class DataSourceAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean         // 用户没自定义时才提供默认值
    DataSource dataSource() { return createFromProperties(); }
}
```

**对照结果：** 发现配置没生效时应看条件评估报告，而不是只背 @EnableAutoConfiguration。

**递进追问：**

1. **Starter 和自动配置有什么区别？**

   Starter 主要聚合依赖并给出约定入口；自动配置是真正根据条件声明 Bean 的代码，两者常配合但不是同一个概念。

2. **怎样排除某个自动配置？**

   可在启动注解、配置属性或专用开关中排除，并先用条件评估报告确认冲突来源，避免盲目覆盖 Bean。

**易错点：**

- 把自动配置解释成“包扫描”，无法说明候选配置来源和条件回退机制。
- 出现 Bean 冲突就允许覆盖，掩盖多个配置同时生效的真正原因。

**参考来源：**

- [真实面经线索（题目已改写）：阿里、腾讯、VIVO、OPPO Java 面经复盘（牛客）](https://www.nowcoder.com/discuss/422046)
- [高频题库参考（内容已重写）：JavaGuide：Spring Boot 自动装配原理](https://javaguide.cn/system-design/framework/spring/spring-boot-auto-assembly-principles.html)
- [技术校准：Spring Boot：自动配置](https://docs.spring.io/spring-boot/reference/using/auto-configuration.html)

校验日期：2026-08-06

## Q8：Spring 能解决哪些循环依赖？

**短回答：**

Spring 容器在允许循环引用时，只能借助早期引用处理一部分单例 Bean 的 Setter/字段注入环；

- 构造器注入双方都必须先拿到完整依赖，prototype 也没有单例缓存协作，因此这些环处理不了。现代 Spring Boot 默认禁止循环引用，正确做法仍是拆开双向依赖。

**原理：**

单例创建过程中，容器可在对象实例化后、完整初始化前暴露工厂或早期引用，使另一个 Bean 完成属性注入，再回到原 Bean 继续初始化。构造器注入必须先拿到完整依赖，双方都无法开始实例化；prototype 也没有同样的单例缓存协作。

即使底层机制能够处理，Spring Boot 的 `spring.main.allow-circular-references` 默认值为 false，不应把开启它当作设计方案。

**代码 / 场景：**

**示例场景：**

- **前提：** OrderService 与 CouponService 互相注入通常说明职责或依赖方向错误。
- **过程：** 优先提取 PricingPolicy 或发布领域事件打断环，而不是开启允许循环依赖的配置；
- **结果：** 重构后用构造器注入让架构问题在启动时直接暴露。

**对照结果：** Spring 容器在允许循环引用时，只能借助早期引用处理一部分单例 Bean 的 Setter/字段注入环；构造器注入双方都必须先拿到完整依赖，prototype 也没有单例缓存协作，因此这些环处理不了。

**递进追问：**

1. **为什么三级缓存不是业务设计方案？**

   它只是容器创建单例时协调早期引用的内部机制，无法消除模块耦合、职责混乱和不完整对象暴露风险。

2. **@Lazy 能解决循环依赖吗？**

   它可把一侧解析推迟到首次使用，但更多是延后问题；仍应检查依赖方向和首次调用时的失败边界。

**易错点：**

- 背出“三级缓存”就认为所有循环依赖都能解决，忽略构造器、作用域和代理限制。
- 为让项目启动而全局允许循环依赖，没有修正双向模块耦合。

**参考来源：**

- [真实面经线索（题目已改写）：科大讯飞 Java 后端一面（牛客，2025）](https://www.nowcoder.com/discuss/747230985057468416)
- [高频题库参考（内容已重写）：JavaGuide：Spring 常见面试题](https://javaguide.cn/system-design/framework/spring/spring-knowledge-and-questions-summary.html)
- [技术校准：Spring：循环依赖](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html#beans-dependency-resolution)
- [技术校准：Spring Boot：循环引用默认配置](https://docs.spring.io/spring-boot/appendix/application-properties/index.html#application-properties.core.spring.main.allow-circular-references)

校验日期：2026-08-06

## Q9：Spring 单例 Bean 是线程安全的吗？

**短回答：**

单例只表示容器中通常只有一个实例，不等于线程安全。无共享可变状态的服务 Bean 通常可并发使用；一旦把请求数据存进字段，就必须重新设计或同步保护。

**原理：**

Web 请求会由多个线程同时调用同一个 singleton Bean。局部变量属于每次调用栈，而实例字段由所有线程共享。把用户 ID、临时列表或可变计数器放在字段中会产生竞态和串数据。request/session scope 可改变实例生命周期，但业务服务更推荐保持无状态，把状态放到参数或具备并发语义的持久层。

**代码 / 场景：**

**示例场景：**

- **前提：** PriceService 把 currentUserId 写进字段后再调用远程接口，高并发下会把 A 用户身份用于 B 请求。
- **过程：** 应把 userId 沿方法参数传递；
- **结果：** 计数指标使用专用线程安全指标组件，而不是在服务字段里做 ++。

**对照结果：** 单例只表示容器中通常只有一个实例，不等于线程安全。无共享可变状态的服务 Bean 通常可并发使用；一旦把请求数据存进字段，就必须重新设计或同步保护。

**补充代码示例：**

无状态单例可以并发复用，把请求数据写进字段则会串请求：

```java
// 示例重点：用这段最小代码验证“Spring 单例 Bean 是线程安全的吗”
@Service
class PriceService {
    private final PriceRepository repository; // 只保存线程安全的依赖

    Money price(long productId) {
        Money result = repository.find(productId); // 请求数据放局部变量
        return result;
    }
    // 不要用字段保存 currentUser 或本次计算结果
}
```

**对照结果：** Bean 的 scope 只决定实例数量，不自动提供同步；线程安全来自不可变状态、局部变量或明确并发控制。

**递进追问：**

1. **无状态 Bean 为什么通常安全？**

   每次调用只使用参数、局部变量与本身线程安全的依赖，不在共享实例上保存会随请求变化的数据，因此没有实例级竞态。

2. **把字段换成 ThreadLocal 就可以吗？**

   只在明确线程上下文边界时考虑，并必须清理；线程池复用会让未清理数据泄漏到后续请求，也不适合跨线程异步。

**易错点：**

- 把 singleton 与 synchronized 画等号，没有检查 Bean 是否持有共享可变状态。
- 用 ThreadLocal 隐藏所有请求状态，却忘记线程池复用、异步切换和 finally 清理。

**参考来源：**

- [真实面经线索（题目已改写）：Spring 单例 Bean 线程安全问答（牛客）](https://www.nowcoder.com/discuss/353149002420002816)
- [高频题库参考（内容已重写）：JavaGuide：Spring 常见面试题](https://javaguide.cn/system-design/framework/spring/spring-knowledge-and-questions-summary.html)
- [技术校准：Spring：Bean 作用域](https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html)

校验日期：2026-08-06

## Q10：Spring、Spring MVC 和 Spring Boot 有什么区别？

**短回答：**

Spring Framework 提供 IoC、AOP、事务等基础能力；Spring MVC 是其 Web MVC 模块；Spring Boot 用约定、Starter、自动配置和运维能力简化 Spring 应用的创建与运行。

**原理：**

三者不是互相替代的框架。Spring MVC 构建在 Spring 容器上，负责 HTTP 请求映射、参数绑定和响应渲染；Spring Boot 仍使用 Spring Framework，只是把常见依赖、配置和嵌入式服务器组合成可快速启动的应用，并提供 Actuator 等生产支持。

理解层次后才能定位问题属于容器、Web 层还是自动配置。

**代码 / 场景：**

**示例场景：**

- **前提：** 一个 Boot Web 项目通常同时使用三者：容器装配 OrderService，MVC 把 POST /orders 映射到 Controller，Boot 自动配置服务器与 JSON 转换器。
- **结果：** 排查 404 看 MVC 映射，排查 Bean 缺失看容器与自动配置条件。

**对照结果：** Spring Framework 提供 IoC、AOP、事务等基础能力；Spring MVC 是其 Web MVC 模块；Spring Boot 用约定、Starter、自动配置和运维能力简化 Spring 应用的创建与运行。

**递进追问：**

1. **Spring Boot 是否不需要 XML 或配置？**

   它减少样板配置但不会消除配置；Java 配置、属性文件和显式 Bean 仍用于表达业务所需的非默认行为。

2. **嵌入式服务器是 Spring Boot 必需的吗？**

   不是，Boot 也可打包为传统部署或运行非 Web 应用；嵌入式服务器只是 Web 应用的常见默认选择。

**易错点：**

- 把 Spring Boot 说成独立替代 Spring 的新框架，忽略它建立在 Spring Framework 之上。
- 把所有启动问题都归因于自动配置，不区分组件扫描、MVC 映射与外部配置。

**参考来源：**

- [真实面经线索（题目已改写）：20 篇 Java 后端面经汇总（牛客）](https://www.nowcoder.com/discuss/353155591071801344)
- [高频题库参考（内容已重写）：JavaGuide：Spring Boot 自动装配原理](https://javaguide.cn/system-design/framework/spring/spring-boot-auto-assembly-principles.html)
- [技术校准：Spring Boot：应用开发指南](https://docs.spring.io/spring-boot/reference/using/index.html)

校验日期：2026-08-06

# MySQL

## Q11：一条 SQL 在 MySQL 中怎样执行？

**短回答：**

查询通常经过连接管理、解析、优化和执行；更新还会进入 InnoDB 事务与日志流程。Server 层负责通用 SQL 能力，存储引擎负责索引、数据页、锁与持久化。

**原理：**

客户端完成认证并建立会话后，解析器生成语法树，预处理检查表与列，优化器根据统计信息选择访问路径和连接顺序，执行器调用存储引擎接口读取或修改记录。InnoDB 更新会生成 undo 版本与 redo 记录，提交还要与 binlog 协调。定位慢 SQL 必须先判断时间耗在等待、优化计划还是实际扫描。

**代码 / 场景：**

**示例场景：**

- **前提：** 订单查询突然变慢时，先用 EXPLAIN ANALYZE 查看真实扫描行数和迭代器耗时，再检查锁等待与缓冲池命中；
- **结果：** 不要只看到 SQL 文本就直接添加索引，因为问题也可能是统计信息失真或连接池排队。

**对照结果：** 查询通常经过连接管理、解析、优化和执行；更新还会进入 InnoDB 事务与日志流程。

**递进追问：**

1. **优化器为什么可能选错索引？**

   成本估算依赖统计信息、数据分布和参数值；统计过期或数据倾斜会让估算行数偏离真实执行。

2. **查询缓存还在常规执行链中吗？**

   不在。MySQL 8.0 已移除旧的全局 Query Cache，因此常规执行链不会先按 SQL 文本查这层结果缓存；旧实现要求语句精确匹配，并在相关表发生写入时失效缓存，写多或语句变化多的负载命中率低，还会引入全局协调与争用。需要结果缓存时应在应用或 Redis 中显式设计 key、TTL、权限隔离和失效策略，且不要把 InnoDB Buffer Pool、prepared statement 或执行计划复用误称为 Query Cache。

**易错点：**

- 把所有步骤都归入 InnoDB，混淆 Server 层与存储引擎的职责边界。
- 用固定口诀描述所有版本，仍声称 MySQL 8 会先查旧查询缓存。

**参考来源：**

- [真实面经线索（题目已改写）：小红书 Java 后端岗位面经转载（牛客）](https://www.nowcoder.com/feed/main/detail/b9a57fd0856149ef87a55f80ade7f8fc)
- [高频题库参考（内容已重写）：JavaGuide：MySQL 常见面试题](https://javaguide.cn/database/mysql/mysql-questions-01.html)
- [技术校准：MySQL 8.4：查询执行计划](https://dev.mysql.com/doc/refman/8.4/en/execution-plan-information.html)

校验日期：2026-08-06

## Q12：InnoDB 和 MyISAM 有什么区别？

**短回答：**

现代业务表通常优先 InnoDB，因为它支持事务、崩溃恢复、行级锁和外键；MyISAM 不提供事务与崩溃安全，适用范围已很有限。

**原理：**

InnoDB 以聚簇索引组织主键记录，通过 undo、redo、MVCC 和细粒度锁支持并发事务；MyISAM 的数据与索引分离，主要使用表级锁，崩溃后可能需要修复。两者在计数、空间组织和并发写入行为上也不同。选择引擎应围绕一致性、恢复与负载，而不是只背读写速度结论。

**代码 / 场景：**

**示例场景：**

- **前提：** 订单、余额、库存必须依赖事务与故障恢复，使用 InnoDB。
- **结果：** 即便是只读归档表，也应先评估备份恢复、并发维护和统一运维成本，不因为“听说 MyISAM 查询快”就切换引擎。

**对照结果：** 现代业务表通常优先 InnoDB，因为它支持事务、崩溃恢复、行级锁和外键；MyISAM 不提供事务与崩溃安全，适用范围已很有限。

**递进追问：**

1. **InnoDB 为什么必须有主键？**

   聚簇索引需要记录标识；若没有显式合适主键，InnoDB 会选择合适唯一键或生成隐藏行 ID，但不利于可控设计。

2. **表级锁一定比行级锁慢吗？**

   不是。低并发、整表操作中表锁成本可能更低，但业务系统通常需要行级并发与事务语义，不能只按锁粒度下结论。

**易错点：**

- 只回答“一个行锁、一个表锁”，遗漏事务、MVCC、恢复和存储组织。
- 把 MyISAM 描述成普遍更快，忽略现代版本、缓存命中和实际业务负载。

**参考来源：**

- [真实面经线索（题目已改写）：科大讯飞 Java 后端一面（牛客，2025）](https://www.nowcoder.com/discuss/747230985057468416)
- [高频题库参考（内容已重写）：JavaGuide：MySQL 常见面试题](https://javaguide.cn/database/mysql/mysql-questions-01.html)
- [技术校准：MySQL 8.4：InnoDB 简介](https://dev.mysql.com/doc/refman/8.4/en/innodb-introduction.html)
- [技术校准：MySQL 8.4：MyISAM 特性](https://dev.mysql.com/doc/refman/8.4/en/myisam-storage-engine.html)

校验日期：2026-08-06

## Q13：MySQL 索引是什么，为什么常用 B+Tree？

**短回答：**

索引是用额外空间维护的有序查找结构，用来减少需要访问的数据页。B+Tree 层级低、扇出大、叶子有序，适合磁盘页访问、范围查询和排序。

**原理：**

![InnoDB B+Tree 内部节点、叶子页与范围扫描关系图](/content/diagrams/database-cache/b-plus-tree-v1.svg "内部节点负责导航，数据集中在有序叶子页，使点查与范围扫描兼顾较少随机 I/O。")

InnoDB B+Tree 的非叶子节点主要保存键和子页指针，叶子节点保存记录或主键，因此单页能容纳更多导航项，通常少量页访问即可定位数据。叶子页按键有序并相互连接，范围扫描无需反复回到树根。索引会增加写入维护、页分裂与存储成本，低选择性列也未必带来收益。

**代码 / 场景：**

**示例场景：**

- **前提：** 订单按 user_id 和 created_at 查询最近记录，可建立 `(user_id, created_at)` 索引，让等值定位后顺序扫描时间范围。
- **结果：** 上线前用实际数据分布和 EXPLAIN 验证扫描行数，而不是为每个查询条件各建单列索引。

**对照结果：** 索引是用额外空间维护的有序查找结构，用来减少需要访问的数据页。B+Tree 层级低、扇出大、叶子有序，适合磁盘页访问、范围查询和排序。

**递进追问：**

1. **为什么不使用普通二叉搜索树？**

   二叉树扇出小，同样数据量需要更多层级，磁盘或缓冲池页访问次数更高，不适合大规模页式存储。

2. **Hash 索引为什么不适合范围查询？**

   哈希结构按哈希值定位等值项，不保留业务键的整体顺序，无法自然支持范围扫描与按键排序。

**易错点：**

- 只说“B+Tree 查询是 O(log n)”，没有联系页大小、扇出和范围扫描。
- 认为索引越多越好，忽略写放大、空间、优化器选择和维护成本。

**参考来源：**

- [真实面经线索（题目已改写）：百度 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/795247127986245632)
- [高频题库参考（内容已重写）：小林 Coding：MySQL 索引](https://xiaolincoding.com/mysql/index/index_interview.html)
- [技术校准：MySQL 8.4：InnoDB 索引](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)

校验日期：2026-08-06

## Q14：聚簇索引、回表和覆盖索引是什么？

**短回答：**

InnoDB 聚簇索引叶子保存整行；普通二级索引叶子保存索引列和主键。通过二级索引再查聚簇索引叫回表；所需列全在索引中就是覆盖索引。

**原理：**

一张 InnoDB 表只有一种聚簇组织，通常按主键排序。二级索引命中后，如果查询还需要索引未包含的列，就用叶子中的主键再次访问聚簇树。覆盖索引省去这次随机访问，但把过多大列塞入索引会放大空间和写成本。主键越宽，所有二级索引保存的主键也越宽。

**代码 / 场景：**

**示例场景：**

- **前提：** 查询某用户最近订单的 `id,status,created_at`，索引 `(user_id, created_at, status)` 可能覆盖结果并减少回表。
- **结果：** 是否值得加入 status，要结合查询频率、字段长度和更新频率，再用执行计划确认 `using index` 与实际耗时。

**对照结果：** InnoDB 聚簇索引叶子保存整行；普通二级索引叶子保存索引列和主键。

**补充代码示例：**

同一筛选条件只改查询列，就可能从覆盖索引变成回表：

```sql
-- 示例重点：用这段最小代码验证“聚簇索引、回表和覆盖索引是什么”
CREATE INDEX idx_user_status ON orders(user_id, status);

-- user_id、status 都在二级索引中，可直接返回
SELECT user_id, status FROM orders WHERE user_id = 7;

-- total 不在二级索引中，需要拿主键回聚簇索引查
SELECT user_id, status, total FROM orders WHERE user_id = 7;
```

**对照结果：** 覆盖索引减少随机回表，但不要为每条查询无限堆字段；索引会增加写入、存储和维护成本。

**递进追问：**

1. **主键查询也会回表吗？**

   直接走聚簇索引时叶子已经包含完整行，不需要再按主键访问一次；回表通常发生在非覆盖的二级索引查询。

2. **覆盖索引一定更快吗？**

   通常减少随机页访问，但更宽的索引降低页密度并增加写入维护，应以真实负载和执行计划衡量。

**易错点：**

- 把聚簇索引理解成一个额外复制的索引文件，忽略表数据本身按它组织。
- 为了覆盖所有 SELECT 字段创建超宽索引，导致写入和缓存效率明显下降。

**参考来源：**

- [真实面经线索（题目已改写）：百度 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/795247127986245632)
- [高频题库参考（内容已重写）：小林 Coding：MySQL 索引](https://xiaolincoding.com/mysql/index/index_interview.html)
- [技术校准：MySQL 8.4：InnoDB 索引](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)

校验日期：2026-08-06

## Q15：联合索引为什么遵循最左前缀？

**短回答：**

联合索引按定义列依次排序，只有先确定左侧列，后续列的局部有序性才可用于快速定位；可用前缀还受范围条件、排序和查询形式影响。

**原理：**

索引 `(a,b,c)` 先按 a 排，再在相同 a 内按 b、c 排。只查询 b 时，不同 a 分组中的 b 并非全局连续，难以直接定位。对 a 等值、b 范围后，c 通常不能继续缩小扫描边界，但仍可能参与索引条件下推或覆盖。MySQL 也可能使用跳跃扫描等优化，不能把规则说成绝对“完全不用索引”。

**代码 / 场景：**

**示例场景：**

- **前提：** 查询 `tenant_id=? AND status=? AND created_at>=?`，优先按租户、等值筛选和常用范围设计联合索引。
- **过程：** 若还要按 created_at 排序，应一起评估；
- **结果：** 用不同参数分布执行 EXPLAIN ANALYZE，确认扫描范围。

**对照结果：** 联合索引按定义列依次排序，只有先确定左侧列，后续列的局部有序性才可用于快速定位；可用前缀还受范围条件、排序和查询形式影响。

**补充代码示例：**

用同一个联合索引对照三条查询最直观：

```sql
-- 示例重点：用这段最小代码验证“联合索引为什么遵循最左前缀”
CREATE INDEX idx_order_user_status_time
ON orders(user_id, status, created_at);

-- 可连续利用 user_id、status 和 created_at
SELECT * FROM orders
WHERE user_id = 7 AND status = 'PAID' AND created_at >= '2026-01-01';

-- 跳过最左列，仅按 status 通常无法完整利用该索引
SELECT * FROM orders WHERE status = 'PAID';
```

**对照结果：** 联合索引按字段顺序排序；是否真正使用、使用到几列仍应通过 EXPLAIN 与真实数据分布验证。

**递进追问：**

1. **联合索引列顺序只看区分度吗？**

   不只。还要看等值与范围条件、排序分组需求、查询覆盖、更新成本和最常见访问路径。

2. **范围条件后的列一定完全无效吗？**

   不一定。它可能不能继续缩小索引扫描区间，但仍可用于索引条件下推、过滤或覆盖返回列。

**易错点：**

- 机械背诵“遇到范围就全部失效”，没有区分定位范围、过滤和覆盖。
- 仅按单列区分度排序联合索引，忽略真实查询条件与排序需求。

**参考来源：**

- [真实面经线索（题目已改写）：百度 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/795247127986245632)
- [高频题库参考（内容已重写）：小林 Coding：MySQL 索引](https://xiaolincoding.com/mysql/index/index_interview.html)
- [技术校准：MySQL 8.4：联合索引](https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html)

校验日期：2026-08-06

## Q16：哪些写法容易让索引效果变差？

**短回答：**

对索引列做函数或隐式类型转换、无法利用左侧前缀、前导模糊匹配、低选择性条件和返回大量行，都可能让优化器放弃或弱化索引。

**原理：**

索引可用不等于一定最优。表达式改变了待比较值，可能无法直接在原有有序键上定位；字符串列与数字比较可能发生隐式转换；`LIKE %x` 没有固定起点。即使能走索引，如果预计回表太多，顺序全表扫描可能成本更低。复合条件还要检查统计信息、索引合并和排序临时表。

**代码 / 场景：**

**示例场景：**

- **前提：** 不要用 `DATE(created_at)=?` 查询一天，可改成左闭右开时间范围；
- **过程：** 手机号 varchar 条件必须传字符串。
- **结果：** 优化前后比较 rows、filtered、key、Extra 和实际迭代器耗时，避免只看“是否出现 key”。

**对照结果：** 对索引列做函数或隐式类型转换、无法利用左侧前缀、前导模糊匹配、低选择性条件和返回大量行，都可能让优化器放弃或弱化索引。

**补充代码示例：**

把函数放在索引列上，可能让普通 B+Tree 无法直接定位范围：

```sql
-- 示例重点：用这段最小代码验证“哪些写法容易让索引效果变差”
-- 不推荐：对 created_at 做函数计算
SELECT * FROM orders WHERE DATE(created_at) = '2026-09-03';

-- 推荐：把条件改写成原列上的连续范围
SELECT * FROM orders
WHERE created_at >= '2026-09-03 00:00:00'
  AND created_at <  '2026-09-04 00:00:00';
```

**对照结果：** “索引失效”不是绝对口号；最终要看执行计划、扫描行数、回表量和耗时。

**递进追问：**

1. **使用索引后为什么仍然很慢？**

   可能扫描范围很大、回表随机 I/O 多、排序或临时表昂贵，也可能真正耗时来自锁等待而非执行计划。

2. **EXPLAIN 的 rows 是真实扫描行数吗？**

   传统 EXPLAIN 多为统计估算；需要结合 EXPLAIN ANALYZE、慢日志和运行指标判断真实行数与时间。

**易错点：**

- 把“索引失效”当作二元状态，只检查 key 列而不看扫描量和回表成本。
- 为了强制某个索引长期使用 hint，掩盖统计、数据分布或索引设计问题。

**参考来源：**

- [真实面经线索（题目已改写）：小红书 Java 后端岗位面经转载（牛客）](https://www.nowcoder.com/feed/main/detail/b9a57fd0856149ef87a55f80ade7f8fc)
- [高频题库参考（内容已重写）：小林 Coding：MySQL 索引](https://xiaolincoding.com/mysql/index/index_interview.html)
- [技术校准：MySQL 8.4：EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html)

校验日期：2026-08-06

## Q17：数据库事务的 ACID 分别是什么？

**短回答：**

原子性表示事务操作要么都成功要么都撤销；一致性是业务约束从一个合法状态到另一个合法状态；隔离性控制并发可见；持久性保证提交结果可恢复。

**原理：**

InnoDB 用 undo 支持回滚和历史版本，锁与 MVCC 共同提供隔离，redo 保障崩溃恢复，约束和正确业务逻辑共同维护一致性。ACID 不是四个互不相关的开关：提交协议、日志刷盘和隔离级别会影响延迟与保证；数据库也无法自动理解“库存不能为负”等全部业务规则。

**代码 / 场景：**

**示例场景：**

- **前提：** 转账事务同时扣减 A、增加 B 并写流水，任一步失败都回滚；
- **过程：** 账户余额的非负约束还需条件更新或锁保护。
- **结果：** 测试应在提交前后模拟进程崩溃，并并发执行转账验证总额守恒。

**对照结果：** 原子性表示事务操作要么都成功要么都撤销；一致性是业务约束从一个合法状态到另一个合法状态；隔离性控制并发可见；持久性保证提交结果可恢复。

**补充代码示例：**

转账能同时体现原子性、一致性、隔离性和持久性：

```sql
-- 示例重点：用这段最小代码验证“数据库事务的 ACID 分别是什么”
START TRANSACTION;
UPDATE account SET balance = balance - 100 WHERE id = 1;
UPDATE account SET balance = balance + 100 WHERE id = 2;

-- 两条更新都成功才提交；任一失败则 ROLLBACK
COMMIT;
```

**对照结果：** ACID 是数据库提供的事务语义，但业务一致性仍依赖正确约束、锁定范围和异常处理。

**递进追问：**

1. **一致性是数据库自动保证的吗？**

   数据库保证声明的约束和事务语义，跨表、跨服务的业务不变量仍需应用设计、唯一约束和对账共同保证。

2. **提交成功是否等于所有副本都已持久化？**

   不等于。COMMIT 成功只表示主库已经满足其本地日志刷盘与提交策略；异步复制下，事务可能尚未发送到副本，更谈不上在副本执行完成，主库此时故障会留下 RPO 缺口。半同步复制通常只等待至少一个副本确认收到相应日志，具体持久点受实现和配置影响，也不代表所有副本已经回放完成；“多数派持久化”则是另一类复制协议的确认语义。系统必须明确可接受的数据损失、读后写策略和故障切换条件，并通过强制切主演练验证。

**易错点：**

- 把一致性简单解释成“数据没有乱码”，没有说明业务不变量与合法状态。
- 认为用了事务就能自动覆盖远程接口和消息系统的跨资源一致性。

**参考来源：**

- [真实面经线索（题目已改写）：20 篇 Java 后端面经汇总（牛客）](https://www.nowcoder.com/discuss/353155591071801344)
- [高频题库参考（内容已重写）：小林 Coding：MySQL 事务](https://xiaolincoding.com/mysql/transaction/mvcc.html)
- [技术校准：MySQL 8.4：InnoDB 事务模型](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)

校验日期：2026-08-06

## Q18：事务隔离级别和并发异常有哪些？

**短回答：**

SQL 标准从读未提交到串行化逐步约束脏读、不可重复读与幻读。MySQL InnoDB 默认可重复读，并结合 MVCC 与锁提供具体语义。

**原理：**

脏读是读到未提交修改；不可重复读是同一行两次读取结果变化；幻读关注同一条件集合新增或消失。读已提交通常每条语句生成新 Read View，可重复读通常事务首次一致性读后复用视图。当前读会读取最新可见记录并加锁，不能与快照读混为一谈。更强隔离会增加阻塞或冲突成本。

**代码 / 场景：**

**示例场景：**

- **前提：** 报表需要事务内多次查询保持一致，可使用可重复读快照；
- **过程：** 扣库存必须用条件更新或锁定读，不能根据旧快照先判断再更新。
- **结果：** 并发测试要安排两个连接的精确执行顺序，记录每次读写结果。

**对照结果：** SQL 标准从读未提交到串行化逐步约束脏读、不可重复读与幻读。MySQL InnoDB 默认可重复读，并结合 MVCC 与锁提供具体语义。

**补充代码示例：**

用两个会话对照“同一事务两次读取”的结果最容易理解隔离级别：

```sql
-- 示例重点：用这段最小代码验证“事务隔离级别和并发异常有哪些”
-- 会话 A：在同一个事务中读取两次
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
SELECT balance FROM account WHERE id = 7; -- 第一次得到 100

-- 此时会话 B 把余额更新为 80 并 COMMIT
SELECT balance FROM account WHERE id = 7; -- 第二次可能得到 80：不可重复读
COMMIT;
```

**对照结果：** READ COMMITTED 每条语句建立自己的读视图，因此两次结果可不同；REPEATABLE READ 的普通一致性读通常复用事务读视图。

**递进追问：**

1. **可重复读是否完全没有幻读？**

   InnoDB 的一致性读依靠快照，锁定范围操作可用 next-key lock；应结合快照读、当前读和具体语句说明。

2. **隔离级别越高越好吗？**

   更强隔离通常带来更多锁等待、冲突或重试，应按业务不变量选择最低但足够的级别。

**易错点：**

- 只背四级名称，无法用两个事务的执行顺序解释三类并发异常。
- 把快照读与 select for update 当前读混为一谈，错误推断可见性和锁行为。

**参考来源：**

- [真实面经线索（题目已改写）：腾讯 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/744849501931790336)
- [高频题库参考（内容已重写）：小林 Coding：MySQL 事务](https://xiaolincoding.com/mysql/transaction/mvcc.html)
- [技术校准：MySQL 8.4：事务隔离级别](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)

校验日期：2026-08-06

## Q19：MVCC 是怎样实现一致性读的？

**短回答：**

InnoDB 通过记录中的事务信息、undo 版本链和 Read View 判断哪个历史版本对当前事务可见，让普通一致性读减少读写互相阻塞。

**原理：**

更新记录会保留可回溯到旧版本的 undo 信息。Read View 记录创建时活跃事务边界，读取时结合版本的事务 ID 判断已提交、当前事务或仍活跃版本是否可见，不可见就沿版本链查找。读已提交与可重复读主要差别之一是 Read View 的创建时机。MVCC 不等于无锁，更新、当前读和唯一性检查仍需加锁。

**代码 / 场景：**

**示例场景：**

- **前提：** 长事务开启后一直不提交，会让旧版本无法及时回收，undo 空间增长并拖累查询。
- **结果：** 监控活跃事务与 history list，找到持有旧视图的会话，而不是只通过扩大磁盘掩盖问题。

**对照结果：** InnoDB 通过记录中的事务信息、undo 版本链和 Read View 判断哪个历史版本对当前事务可见，让普通一致性读减少读写互相阻塞。

**递进追问：**

1. **Read View 里通常要判断什么？**

   它要判断记录版本的事务 ID 在视图创建时是否可见：当前事务自己生成的版本可见；早于最小活跃事务 ID 的版本通常已提交并可见；不小于下一个待分配事务 ID 的版本属于未来事务而不可见；位于两者之间时，还要检查它是否在活跃事务 ID 集合中，在集合内则不可见、不在则已提交可见。当前版本不可见时，InnoDB 会沿 undo 版本链继续寻找。字段名称和边界细节会随实现版本变化，回答与排障应结合目标 MySQL 版本及具体隔离级别。

2. **MVCC 能解决写写冲突吗？**

   不能靠快照自动解决；对同一记录的更新仍需锁、版本条件或冲突检测来串行化。

**易错点：**

- 把 MVCC 说成复制多份完整数据，没有说明 undo 版本链和可见性判断。
- 认为使用 MVCC 后数据库没有锁，忽略更新、当前读与约束检查。

**参考来源：**

- [真实面经线索（题目已改写）：腾讯 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/744849501931790336)
- [高频题库参考（内容已重写）：小林 Coding：MySQL 事务](https://xiaolincoding.com/mysql/transaction/mvcc.html)
- [技术校准：MySQL 8.4：多版本并发控制](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)

校验日期：2026-08-06

## Q20：InnoDB 有哪些常见锁，死锁怎样处理？

**短回答：**

常见有记录锁、间隙锁、next-key lock 和意向锁。死锁是事务形成循环等待，InnoDB 会检测并回滚一个事务；应用仍需重试并减少冲突。

**原理：**

记录锁保护索引记录，间隙锁保护索引区间，next-key lock 组合二者；加锁范围由索引、隔离级别和语句条件共同决定。事务以不同顺序锁定相同资源容易形成环。数据库检测死锁后选择代价较小的牺牲者，但频繁死锁表明访问顺序、索引或事务边界存在问题。

**代码 / 场景：**

**示例场景：**

- **前提：** 两个转账事务都先按较小账户 ID 再按较大 ID 加锁，可减少反向等待；
- **过程：** 条件列必须有合适索引，避免扫描并锁住过大范围。
- **结果：** 捕获死锁错误后做有限退避重试，同时保存死锁日志定位语句。

**对照结果：** 常见有记录锁、间隙锁、next-key lock 和意向锁。死锁是事务形成循环等待，InnoDB 会检测并回滚一个事务；应用仍需重试并减少冲突。

**补充代码示例：**

两笔转账都按账户 id 排序加锁，可降低循环等待概率：

```sql
-- 示例重点：用这段最小代码验证“InnoDB 有哪些常见锁，死锁怎样处理”
START TRANSACTION;
-- 所有请求都先锁较小 id，再锁较大 id
SELECT id FROM account
WHERE id IN (2, 9) ORDER BY id FOR UPDATE;

UPDATE account SET balance = balance - 100 WHERE id = 2;
UPDATE account SET balance = balance + 100 WHERE id = 9;
COMMIT;
```

**对照结果：** 死锁无法保证永不发生；应用仍要捕获死锁回滚，按有限次数和抖动策略重试整个事务。

**递进追问：**

1. **意向锁有什么作用？**

   它在表级标记事务准备或已经持有某类行锁，让表锁检查无需遍历所有记录锁，并不等同于锁住整张表。

2. **死锁和锁等待超时一样吗？**

   死锁存在等待环，可被检测后立即选择回滚；超时可能只是长时间单向等待，两者诊断证据不同。

**易错点：**

- 把间隙锁说成锁住不存在的数据，没有联系索引区间和防止范围插入。
- 遇到死锁只把超时调大，不统一加锁顺序、不缩短事务也不补索引。

**参考来源：**

- [真实面经线索（题目已改写）：数字马力 Java 后端秋招面经（牛客，2025）](https://www.nowcoder.com/discuss/826171566831517696)
- [高频题库参考（内容已重写）：小林 Coding：MySQL 事务](https://xiaolincoding.com/mysql/transaction/mvcc.html)
- [技术校准：MySQL 8.4：InnoDB 锁](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html)

校验日期：2026-08-06

## Q21：undo log、redo log 和 binlog 各做什么？

**短回答：**

undo 保存回滚和历史版本信息；redo 记录 InnoDB 页修改以支持崩溃恢复；binlog 记录服务器层逻辑变更，用于复制和时间点恢复。

**原理：**

更新先在内存页执行并写 redo，WAL 允许先持久化顺序日志再延后刷脏页。undo 支持事务回滚，也为 MVCC 提供旧版本。binlog 属于 MySQL Server 层，覆盖多种引擎。InnoDB 事务提交时通过协调流程保证 redo 与 binlog 状态一致，避免崩溃后主库恢复结果和复制日志不一致。

**代码 / 场景：**

**示例场景：**

- **前提：** 误删数据可用全量备份加 binlog 回放到指定时间；
- **过程：** 实例异常重启主要依靠 redo 恢复已提交修改。
- **结果：** 恢复演练必须验证备份、binlog 保留和时间点，而不能把三种日志都称为“回滚日志”。

**对照结果：** undo 保存回滚和历史版本信息；redo 记录 InnoDB 页修改以支持崩溃恢复；binlog 记录服务器层逻辑变更，用于复制和时间点恢复。

**递进追问：**

1. **redo 为什么采用顺序写思路？**

   先追加固定格式日志通常比随机刷多个数据页更高效，并能在崩溃后重放尚未落盘的数据页修改。

2. **binlog 和 redo 为什么都需要？**

   redo 服务 InnoDB 崩溃恢复，binlog 服务跨引擎复制与归档恢复，所属层次、内容和生命周期不同。

**易错点：**

- 把三种日志都说成保存完整 SQL，无法说明所属层次和恢复目标。
- 只做数据库备份却从不演练 binlog 回放，真正误删时无法确认恢复点。

**参考来源：**

- [真实面经线索（题目已改写）：小红书 Java 后端岗位面经转载（牛客）](https://www.nowcoder.com/feed/main/detail/b9a57fd0856149ef87a55f80ade7f8fc)
- [高频题库参考（内容已重写）：小林 Coding：MySQL 三种日志](https://xiaolincoding.com/mysql/log/how_update.html)
- [技术校准：MySQL 8.4：Undo Log](https://dev.mysql.com/doc/refman/8.4/en/innodb-undo-logs.html)
- [技术校准：MySQL 8.4：Redo Log](https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html)
- [技术校准：MySQL 8.4：Binary Log](https://dev.mysql.com/doc/refman/8.4/en/binary-log.html)

校验日期：2026-08-06

## Q22：慢 SQL 应怎样系统排查？

**短回答：**

先确认慢在执行还是等待，再用慢日志、执行计划和运行指标定位扫描量、回表、排序、锁、数据分布或资源问题，最后用真实负载验证优化。

**原理：**

慢查询日志提供候选，EXPLAIN/EXPLAIN ANALYZE 展示访问类型、索引、估算与实际行数、排序和临时表。还要检查锁等待、Buffer Pool 命中、磁盘延迟、连接数与统计信息。优化顺序通常是减少无效数据访问、修正索引和 SQL、缩短事务，再评估分库分表或硬件，不能只靠缓存遮盖。

**代码 / 场景：**

**示例场景：**

- **前提：** 列表接口 p99 变慢，计划显示先扫描百万订单再排序。
- **过程：** 将过滤条件和排序组合进联合索引并改为游标分页后，比较扫描行数、p99 和写入成本；
- **结果：** 若只优化单个测试参数，还需用冷热用户数据复测。

**对照结果：** 先确认慢在执行还是等待，再用慢日志、执行计划和运行指标定位扫描量、回表、排序、锁、数据分布或资源问题，最后用真实负载验证优化。

**补充代码示例：**

先拿执行计划验证扫描路径，再决定是否改 SQL 或索引：

```sql
-- 示例重点：用这段最小代码验证“慢 SQL 应怎样系统排查”
EXPLAIN ANALYZE
SELECT id, total
FROM orders
WHERE user_id = 7 AND status = 'PAID'
ORDER BY created_at DESC
LIMIT 20;

-- 重点看实际行数、循环次数、排序和回表，而非只看 possible_keys
```

**对照结果：** 执行计划必须结合真实参数、数据分布和慢日志；测试库几百行跑得快不能证明线上计划合理。

**递进追问：**

1. **深分页为什么慢？**

   数据库仍需找到并跳过 offset 前的大量记录，常伴随回表；可按稳定唯一排序键使用 seek/游标分页。

2. **为什么不能看到 filesort 就判定有问题？**

   filesort 表示额外排序策略，不等于必然慢；小结果集排序可能比维护宽索引更经济，要看实际行数与耗时。

**易错点：**

- 一发现慢 SQL 就新增单列索引，没有分析联合条件、排序与回表。
- 只在空闲测试库执行一次，忽略生产数据分布、缓存状态和并发锁等待。

**参考来源：**

- [真实面经线索（题目已改写）：小红书 Java 后端岗位面经转载（牛客）](https://www.nowcoder.com/feed/main/detail/b9a57fd0856149ef87a55f80ade7f8fc)
- [高频题库参考（内容已重写）：JavaGuide：MySQL 常见面试题](https://javaguide.cn/database/mysql/mysql-questions-01.html)
- [技术校准：MySQL 8.4：慢查询日志](https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html)

校验日期：2026-08-06

# Redis

## Q23：Redis 为什么快，适合用在什么地方？

**短回答：**

Redis 主要在内存中操作，核心命令路径短，使用高效数据结构并以事件循环处理网络请求，避免大量线程切换；它适合缓存、计数、排行榜、会话和轻量协调。

**原理：**

“单线程”通常指命令执行主路径，并不代表持久化、网络 I/O 或后台任务只有一个线程。内存访问减少磁盘等待，事件驱动模型让请求按顺序执行核心命令，复杂度可预测的数据结构提供不同能力。慢命令、大键、持久化抖动和网络延迟仍会阻塞事件循环，因此不能把内存数据库等同于永远低延迟。

**代码 / 场景：**

**示例场景：**

- **前提：** 商品详情读多写少，可把序列化结果按商品 ID 缓存并设置过期；
- **过程：** 库存最终事实仍落数据库。
- **结果：** 压测要关注 p99、命令复杂度和大键，而不是只看单机平均 QPS。

**对照结果：** Redis 主要在内存中操作，核心命令路径短，使用高效数据结构并以事件循环处理网络请求，避免大量线程切换；它适合缓存、计数、排行榜、会话和轻量协调。

**递进追问：**

1. **Redis 6 的 I/O 多线程改变了命令原子性吗？**

   I/O 线程可并行处理部分网络读写，但核心命令执行仍按主要事件循环串行推进，不能据此假定事务语义改变。

2. **Redis 能完全替代 MySQL 吗？**

   通常不能。两者在查询模型、事务约束、持久化和数据规模上不同，Redis 更常作为加速层或专用数据结构服务。

**易错点：**

- 只回答“内存加单线程”，没有说明事件驱动、数据结构和慢命令阻塞。
- 把缓存当唯一事实源，却没有评估持久化、故障切换和数据恢复边界。

**参考来源：**

- [真实面经线索（题目已改写）：百度 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/795247127986245632)
- [高频题库参考（内容已重写）：小林 Coding：Redis 基础与应用](https://xiaolincoding.com/redis/base/redis_interview.html)
- [技术校准：Redis：延迟与性能诊断](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/)

校验日期：2026-08-06

## Q24：Redis 常用数据类型和典型场景有哪些？

**短回答：**

String 用于值、计数和位操作；Hash 表示字段对象；List 适合队列式序列；Set 做去重和集合运算；Sorted Set 按分值排序。还可按需使用 Stream、Bitmap 与 HyperLogLog。

**原理：**

选型应从操作语义、数据规模和复杂度出发，而不是把 Java 对象直接映射。Sorted Set 的 score 决定排序且 member 唯一；Hash 可局部更新字段；Stream 提供消息 ID、消费者组和待确认记录；HyperLogLog 以小空间估算基数但不是精确集合。每种类型都可能形成大键，需要限制成员数量与单值大小。

**代码 / 场景：**

**示例场景：**

- **前提：** 排行榜使用 Sorted Set，以积分为 score、用户 ID 为 member；
- **过程：** 用户标签交并集用 Set；访问 UV 可接受误差时用 HyperLogLog。
- **结果：** 设计时写明最大成员数、过期策略和是否需要精确结果。

**对照结果：** String 用于值、计数和位操作；Hash 表示字段对象；List 适合队列式序列；Set 做去重和集合运算；Sorted Set 按分值排序。

**补充代码示例：**

把需求映射成数据结构，比只背命令更容易记住：

**示例注解：** 用这段最小代码验证“Redis 常用数据类型和典型场景有哪些”；协议报文或轨迹需保持原样，所以注释放在代码框外。

```text
# 示例重点：每种结构对应一种访问方式
SET session:42 token123 EX 1800       # String：带过期会话
HSET user:42 name "Lin" level 3      # Hash：对象字段
SADD article:7:likes user:1 user:2   # Set：去重成员
ZADD rank:weekly 98.5 user:42        # ZSet：按分数排序
LPUSH jobs email:1001                # List：简单队列
```

**对照结果：** 结构选择应看读写命令、容量和原子性要求；复杂可靠队列通常优先使用专门消息系统。

**递进追问：**

1. **List 能否当可靠消息队列？**

   可做简单队列，但缺少完整消费确认、重试、持久保留与运维语义；关键业务更适合 Stream 或专业 MQ。

2. **Sorted Set 分值相同怎样排序？**

   分值相同时按 member 的字典序确定次序；需要稳定业务次序时要设计复合分值或额外规则。

**易错点：**

- 按名称机械对应 Java 集合，忽略 Redis 命令语义、复杂度和数据规模。
- 所有对象都序列化成一个超大 String，导致局部更新、网络传输和删除延迟恶化。

**参考来源：**

- [真实面经线索（题目已改写）：20 篇 Java 后端面经汇总（牛客）](https://www.nowcoder.com/discuss/353155591071801344)
- [高频题库参考（内容已重写）：小林 Coding：Redis 基础与应用](https://xiaolincoding.com/redis/base/redis_interview.html)
- [技术校准：Redis：数据类型](https://redis.io/docs/latest/develop/data-types/)

校验日期：2026-08-06

## Q25：Redis 的过期删除和内存淘汰有什么区别？

**短回答：**

过期删除处理已经到期的键，常结合访问时删除与周期抽样；内存淘汰是在超过 maxmemory 后按策略选择键移除。两者触发条件和目的不同。

**原理：**

只靠定时遍历全部键成本过高，只靠惰性删除又会让大量过期键长期占内存，因此 Redis 周期抽样清理并在访问时检查。达到内存上限后，可按 LRU/LFU、随机、TTL 或不淘汰等策略处理，范围可限定带过期键或全部键。策略必须匹配缓存重要性，淘汰不等于业务数据已安全持久化。

**代码 / 场景：**

**示例场景：**

- **前提：** 会话缓存设置 TTL，并使用 allkeys-lfu 让高频会话更可能保留；
- **过程：** 上线前监控 expired_keys、evicted_keys、内存碎片和命中率。
- **结果：** 如果开始持续淘汰，应扩容或降低数据量，而非只拉长 TTL。

**对照结果：** 过期删除处理已经到期的键，常结合访问时删除与周期抽样；内存淘汰是在超过 maxmemory 后按策略选择键移除。

**递进追问：**

1. **键到期后会立刻从内存消失吗？**

   不保证恰好到期瞬间删除，实际由访问检查和周期清理完成，因此短时间内可能仍占用内存但读取会按过期处理。

2. **noeviction 会发生什么？**

   达到 maxmemory 后会拒绝需要新增内存的写命令并返回错误，读取通常仍可继续，应用必须正确处理失败。

**易错点：**

- 把 TTL 到期理解成后台精确计时器立即删除每一个键。
- 选择淘汰策略后不监控写失败与淘汰速率，直到缓存大面积失效。

**参考来源：**

- [真实面经线索（题目已改写）：百度 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/795247127986245632)
- [高频题库参考（内容已重写）：JavaGuide：Redis 常见面试题](https://javaguide.cn/database/redis/redis-questions-01.html)
- [技术校准：Redis：内存淘汰策略](https://redis.io/docs/latest/develop/reference/eviction/)

校验日期：2026-08-06

## Q26：缓存穿透、击穿和雪崩分别是什么？

**短回答：**

穿透是大量请求查询不存在数据；击穿是单个热点键失效时并发回源；雪崩是大量键同时失效或缓存整体不可用，导致下游被集中流量压垮。

**原理：**

穿透可用参数校验、空值短缓存或布隆过滤器，但要处理误判和数据新增；击穿可用互斥重建、逻辑过期或单飞请求；雪崩需要过期时间加抖动、多级缓存、限流降级与高可用。三个问题都要保留数据库容量保护，缓存措施只能降低概率，不能让无限流量直达存储。

**代码 / 场景：**

**示例场景：**

- **前提：** 热门商品键到期时只允许一个请求异步重建，其余返回旧值或等待有限时间；
- **过程：** 批量预热的 TTL 加随机抖动。
- **结果：** 不存在商品 ID 使用参数边界和空值短缓存，所有回源都受限流器保护。

**对照结果：** 穿透是大量请求查询不存在数据；击穿是单个热点键失效时并发回源；雪崩是大量键同时失效或缓存整体不可用，导致下游被集中流量压垮。

**补充代码示例：**

同一个查询入口要针对三种不同流量形态使用不同保护：

```java
// 示例重点：用这段最小代码验证“缓存穿透、击穿和雪崩分别是什么”
Value load(String key) {
    Value cached = cache.get(key);
    if (cached == NULL_MARKER) return null; // 穿透：短暂缓存“查无此值”
    if (cached != null) return cached;

    return singleFlight.run(key, () -> {    // 击穿：同一热点只让一个请求回源
        Value value = repository.find(key);
        cache.set(key, value == null ? NULL_MARKER : value,
            ttlWithJitter());               // 雪崩：TTL 加随机抖动
        return value;
    });
}
```

**对照结果：** 穿透是反复查不存在数据，击穿是单个热点失效，雪崩是大量键同时失效；名字相近但故障形态与治理手段不同。

**递进追问：**

1. **布隆过滤器为什么会误判？**

   多个元素的位映射可能重叠，它可能把不存在元素判断为可能存在，但不会把已加入元素判断为不存在。

2. **逻辑过期有什么代价？**

   它用可用性换新鲜度：热点值通常连同 logicalExpireAt 保留，过期后的请求先选出一个重建者异步回源，其他请求继续返回旧值或只等待有限时间，因而避免同一时刻全部压向数据库。代价是用户可能读到陈旧数据，还要治理单飞锁租约、重建者崩溃、重复重建和持续失败；逻辑时间戳也不能替代物理 TTL 或内存淘汰。必须按业务定义最大陈旧时间，并用回源超时、重建失败和持锁进程终止等故障测试验证降级路径。

**易错点：**

- 把三个名词混用，无法指出流量形态是空值、单热点还是大面积失效。
- 只加分布式锁却没有超时、旧值回退和数据库限流，锁服务异常时仍会雪崩。

**参考来源：**

- [真实面经线索（题目已改写）：百度 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/795247127986245632)
- [高频题库参考（内容已重写）：小林 Coding：缓存常见问题](https://xiaolincoding.com/redis/cluster/cache_problem.html)
- [技术校准：Redis：键过期](https://redis.io/docs/latest/commands/expire/)

校验日期：2026-08-06

## Q27：Cache Aside 怎样处理缓存与数据库一致性？

**短回答：**

常见做法是读时未命中再查库并回填，写时先更新数据库再删除缓存。它提供可控的最终一致，但仍需处理并发窗口、删除失败和旧值回填。

**原理：**

![数据库更新、缓存失效、延迟重试与消息补偿的一致性流程图](/content/diagrams/java-backend/cache-consistency-v1.svg "数据库是事实源，缓存失效失败进入可观测补偿链路，并用版本避免旧值回写。")

直接同时更新缓存与数据库难以保证双写原子性。先改库后删缓存，可避免大部分旧值长期驻留；删除失败要可靠重试或通过 binlog/消息驱动失效。并发读可能在写入窗口回填旧值，可用短 TTL、版本号、延迟双删或串行化热点写降低风险。强一致需求应直接读主库或重新设计边界。

**代码 / 场景：**

**示例场景：**

- **前提：** 修改商品价格先在数据库事务提交，再发送包含商品 ID 和版本的失效事件；
- **过程：** 消费者幂等删除缓存。
- **结果：** 回填时比较版本，拒绝把旧版本覆盖新缓存，并监控失效消息积压。

**对照结果：** 常见做法是读时未命中再查库并回填，写时先更新数据库再删除缓存。它提供可控的最终一致，但仍需处理并发窗口、删除失败和旧值回填。

**补充代码示例：**

读路径负责回填，写路径先提交数据库再删除缓存：

```java
// 示例重点：用这段最小代码验证“Cache Aside 怎样处理缓存与数据库一致性”
User find(long id) {
    User cached = cache.get(id);
    if (cached != null) return cached; // 命中直接返回

    User user = repository.find(id);   // 未命中查数据库
    cache.set(id, user, Duration.ofMinutes(10));
    return user;
}

@Transactional
void rename(long id, String name) {
    repository.rename(id, name);       // 先让数据库成为事实来源
    afterCommit(() -> cache.delete(id)); // 提交后让缓存失效
}
```

**对照结果：** 并发读写仍可能出现短暂旧值；必须结合业务容忍度设计 TTL、延迟双删、消息失效或版本控制。

**递进追问：**

1. **为什么通常不是先删缓存再更新数据库？**

   删除后到数据库提交前，其他读请求可能查到旧库值并重新写入缓存，造成更持久的不一致窗口。

2. **延迟双删能保证强一致吗？**

   不能，它是降低特定竞争窗口的工程补偿，延迟难以覆盖所有调度与故障情况，仍需 TTL、版本和重试。

**易错点：**

- 把“更新数据库再删缓存”宣传成绝对强一致，没有说明失败和并发窗口。
- 缓存删除失败只打印日志，不建立可靠重试、告警与补偿通道。

**参考来源：**

- [真实面经线索（题目已改写）：腾讯二面 Redis 与 MySQL 一致性追问（牛客）](https://www.nowcoder.com/discuss/766955367430438912)
- [高频题库参考（内容已重写）：小林 Coding：缓存常见问题](https://xiaolincoding.com/redis/cluster/cache_problem.html)
- [技术校准：Microsoft：Cache-Aside 模式](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)

校验日期：2026-08-06

## Q28：RDB 和 AOF 有什么区别？

**短回答：**

RDB 在某个时间点生成紧凑快照，恢复快但可能丢失最近一段数据；AOF 记录写命令，数据损失窗口可更小，但文件与重写成本更高。两者可组合使用。

**原理：**

RDB 通常由子进程基于写时复制生成快照，父进程继续服务，但大内存实例 fork 与页复制会造成抖动。AOF 按配置刷盘，并通过重写压缩历史命令；刷盘频率决定性能和故障损失边界。恢复时还要考虑文件校验、磁盘容量、主从拓扑和业务是否允许从数据库重建。

**代码 / 场景：**

**示例场景：**

- **前提：** 会话缓存允许丢失且可重新登录，可把高可用和回源能力放在首位；
- **结果：** 若 Redis 保存难以重建的任务状态，则启用合适 AOF 策略并定期做恢复演练，记录恢复时间与最大可接受丢失量。

**对照结果：** RDB 在某个时间点生成紧凑快照，恢复快但可能丢失最近一段数据；AOF 记录写命令，数据损失窗口可更小，但文件与重写成本更高。

**递进追问：**

1. **AOF everysec 是否绝不丢数据？**

   不是，进程或主机故障可能损失最近约一个刷盘周期的数据，实际还受操作系统和存储行为影响。

2. **RDB 生成时为什么还能写？**

   父子进程初始共享内存页，父进程修改时通过写时复制生成独立页，因此无需全程停止写入，但会增加内存压力。

**易错点：**

- 只背“RDB 快、AOF 安全”，不说明刷盘策略、fork 抖动和恢复目标。
- 配置了持久化就从不做恢复演练，故障时才发现文件、磁盘或版本不兼容。

**参考来源：**

- [真实面经线索（题目已改写）：百度 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/795247127986245632)
- [高频题库参考（内容已重写）：JavaGuide：Redis 常见面试题](https://javaguide.cn/database/redis/redis-questions-01.html)
- [技术校准：Redis：持久化](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)

校验日期：2026-08-06

## Q29：Redis 主从、Sentinel 和 Cluster 分别解决什么？

**短回答：**

主从复制提供副本和读扩展；Sentinel 监控主从并自动故障转移；Cluster 通过哈希槽分片数据并提供分片内主从切换，解决容量与吞吐扩展。

**原理：**

复制通常异步，因此主节点故障切换可能丢失尚未复制的数据。Sentinel 由多个实例协作判断主节点故障、选举新主并通知客户端，但不负责数据分片。Cluster 将键映射到槽，槽分布在多个主节点；多键操作需要考虑同槽约束，扩缩容涉及槽迁移。高可用不等于零数据损失或零中断。

**代码 / 场景：**

**示例场景：**

- **前提：** 缓存容量单机足够但需要自动切换，可采用主从加 Sentinel；
- **过程：** 数据量和吞吐超过单机时再考虑 Cluster，并用 hash tag 让必须原子操作的相关键落同槽。
- **结果：** 演练主节点断网并记录切换时间和数据缺口。

**对照结果：** 主从复制提供副本和读扩展；Sentinel 监控主从并自动故障转移；Cluster 通过哈希槽分片数据并提供分片内主从切换，解决容量与吞吐扩展。

**递进追问：**

1. **从库能直接提高写吞吐吗？**

   通常写入仍由主节点接受并复制，从库主要用于读取和容灾；提升写吞吐需要分片或拆分业务。

2. **Cluster 为什么有 16384 个槽？**

   Redis Cluster 用 CRC16(key) 对 16384 取模，也就是取 14 位槽号。选择 2^14 是协议元数据与迁移粒度的工程折中：节点在集群通信中可用约 2 KB 位图表达全部槽归属，若使用 65536 槽位图会扩大到约 8 KB并增加心跳传播成本，而 16384 对推荐规模的集群已经提供足够细的重分片粒度。槽数不是主节点数量上限，也不保证负载天然均匀；仍要检查 key 分布、hash tag 和热点槽，并通过 CLUSTER SLOTS/SHARDS 与迁移演练验证。

**易错点：**

- 把 Sentinel 当作分片组件，或把 Cluster 当成绝对无损的一致性系统。
- 上线高可用拓扑却不做客户端重连、故障切换和脑裂风险演练。

**参考来源：**

- [真实面经线索（题目已改写）：Java 二面 Redis 高可用追问（牛客）](https://www.nowcoder.com/discuss/855883903741988864)
- [高频题库参考（内容已重写）：JavaGuide：Redis 常见面试题](https://javaguide.cn/database/redis/redis-questions-01.html)
- [技术校准：Redis：主从复制](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/)
- [技术校准：Redis：Sentinel](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/)
- [技术校准：Redis：Cluster](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/)

校验日期：2026-08-06

## Q30：Redis 分布式锁怎样正确加锁和解锁？

**短回答：**

基础方案用带唯一 token 和过期时间的原子 SET 获取锁，释放时原子比较 token 后删除；业务还要处理续期、超时、故障切换和迟到执行。

**原理：**

`SET key token NX PX ttl` 把互斥与租约一次完成。解锁不能直接 DEL，因为旧持有者的锁可能已过期并被新请求获得，应通过 Lua 比较 token 再删除。任务超过 TTL 可受控续期，但网络分区或长暂停后旧持有者仍可能恢复执行；关键写入需增加 fencing token、数据库版本条件或幂等约束。

**代码 / 场景：**

**示例场景：**

- **前提：** 结算任务获得锁和递增版本后执行，数据库更新条件要求传入版本不小于当前值。
- **结果：** 故障测试暂停旧实例超过 TTL，让新实例接管，再恢复旧实例，确认旧写被拒绝且旧实例不会删新锁。

**对照结果：** 基础方案用带唯一 token 和过期时间的原子 SET 获取锁，释放时原子比较 token 后删除；业务还要处理续期、超时、故障切换和迟到执行。

**补充代码示例：**

加锁值必须唯一，解锁要原子地“比较持有者再删除”：

```java
// 示例重点：用这段最小代码验证“Redis 分布式锁怎样正确加锁和解锁”
String owner = UUID.randomUUID().toString();
boolean locked = redis.set(key, owner, SetArgs.Builder.nx().px(5000));
if (!locked) throw new BusyException();

try {
    doCriticalWork();
} finally {
    // Lua 脚本原子校验 value==owner 后 DEL，不能直接 delete
    redis.eval(UNLOCK_SCRIPT, List.of(key), List.of(owner));
}
```

**对照结果：** 锁过期、任务超时和主从切换都影响安全性；涉及严格正确性的资源还应使用 fencing token 或数据库约束。

**递进追问：**

1. **为什么 SETNX 后再 EXPIRE 不安全？**

   两个命令之间进程可能崩溃，留下永不过期的锁；应使用单条 SET 同时设置 NX 与过期时间。

2. **自动续期是否能代替幂等？**

   不能，续期线程也可能暂停或失联，重复执行和迟到写仍需由业务唯一键、状态机或版本条件控制。

**易错点：**

- 只会使用 SETNX，不设置租约或把设置过期拆成第二条命令。
- 释放锁直接 DEL，可能误删已经属于另一个请求的新锁。

**参考来源：**

- [真实面经线索（题目已改写）：百度 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/795247127986245632)
- [高频题库参考（内容已重写）：JavaGuide：Redis 常见面试题](https://javaguide.cn/database/redis/redis-questions-01.html)
- [技术校准：Redis：分布式锁模式](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)

校验日期：2026-08-06

## Q31：Big Key 和 Hot Key 有什么危害，怎样治理？

**短回答：**

Big Key 是单个值或集合成员过大，会放大网络、删除和迁移成本；Hot Key 是少数键承受集中访问，会打满单节点或事件循环。二者可能同时出现但治理方向不同。

**原理：**

大键会占用大量内存，序列化、复制、AOF 重写和 Cluster 槽迁移都更重，某些全量命令还会阻塞。热键的瓶颈来自请求分布偏斜，即使值很小也可能超载。治理前先用内存扫描、命令统计和业务埋点确认键大小与访问频率，再做拆分、本地缓存、只读副本、请求合并或限流。

**代码 / 场景：**

**示例场景：**

- **前提：** 百万成员的活动用户 Set 应按时间或 hash 拆分，并用渐进式删除；
- **过程：** 爆款商品详情可用进程内短缓存和请求合并降低 Redis QPS。
- **结果：** 迁移前评估跨分片查询与一致性，不要只改键名。

**对照结果：** Big Key 是单个值或集合成员过大，会放大网络、删除和迁移成本；Hot Key 是少数键承受集中访问，会打满单节点或事件循环。

**递进追问：**

1. **直接 DEL 大键有什么风险？**

   同步释放大量对象可能长时间阻塞事件循环；可按类型分批删除或使用异步释放能力，并在低峰观察延迟。

2. **给 Hot Key 增加 TTL 能解决吗？**

   TTL 只控制生命周期，热点存续期间访问集中仍存在；还可能在到期瞬间形成击穿，需要副本、本地缓存或合并请求。

**易错点：**

- 把大键和热键混为一谈，只按 value 字节数判断所有问题。
- 在线上直接运行高成本全量扫描或同步删除，反而制造新的延迟尖峰。

**参考来源：**

- [真实面经线索（题目已改写）：小红书 Java 后端岗位面经转载（牛客）](https://www.nowcoder.com/feed/main/detail/b9a57fd0856149ef87a55f80ade7f8fc)
- [高频题库参考（内容已重写）：小林 Coding：Redis 基础与应用](https://xiaolincoding.com/redis/base/redis_interview.html)
- [技术校准：Redis：诊断大键与内存](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/)

校验日期：2026-08-06

# 消息队列

## Q32：消息队列是什么，为什么要使用？

**短回答：**

消息队列让生产者把事件交给 Broker，再由消费者异步处理，常用于解耦、削峰和异步提速；代价是引入重复、丢失、顺序、积压与最终一致问题。

**原理：**

生产者只依赖消息契约，不必同步等待所有下游；Broker 暂存并按订阅投递，消费者按自身能力处理。削峰来自把瞬时流量转成队列积压，但并没有消灭工作量。业务必须定义消息保留、确认、重试、死信、幂等和监控，关键同步结果不能为了“用了 MQ”而变得不可解释。

**代码 / 场景：**

**示例场景：**

- **前提：** 下单成功后，邮件、积分和画像更新可消费 OrderCreated 事件异步完成；
- **过程：** 订单创建本身仍在主事务内返回明确结果。
- **结果：** 上线前测量峰值生产/消费速率、允许积压时间，并设计消费者失败后的重试与补偿。

**对照结果：** 消息队列让生产者把事件交给 Broker，再由消费者异步处理，常用于解耦、削峰和异步提速；代价是引入重复、丢失、顺序、积压与最终一致问题。

**递进追问：**

1. **解耦为什么不是没有依赖？**

   服务仍依赖消息契约、投递语义和时序约束，只是从同步地址依赖转为异步协议依赖，需要版本治理。

2. **什么场景不适合上 MQ？**

   低流量且必须立即返回下游强一致结果的简单链路，MQ 可能增加延迟、状态和运维成本而收益有限。

**易错点：**

- 只回答解耦削峰异步三词，不说明引入的可靠性和一致性成本。
- 把 MQ 当成无限缓冲区，没有容量、保留期、积压告警与降级方案。

**参考来源：**

- [真实面经线索（题目已改写）：阿里、腾讯 Java 社招 MQ 面经（牛客）](https://www.nowcoder.com/discuss/688053)
- [高频题库参考（内容已重写）：JavaGuide：消息队列常见问题](https://javaguide.cn/high-performance/message-queue/message-queue.html)
- [技术校准：Apache Kafka：设计](https://kafka.apache.org/documentation/#design)

校验日期：2026-08-06

## Q33：怎样保证消息尽量不丢失？

**短回答：**

要分别检查生产、Broker 和消费三个阶段：生产端等待确认并重试，Broker 做持久化与副本，消费者处理成功后再提交确认；同时保留对账和补偿。

**原理：**

生产发送失败或确认丢失时重试会带来重复；Broker 的可靠性取决于刷盘、复制与确认策略；消费者若先提交 offset/ack 再执行业务，崩溃会永久跳过消息，若业务成功后确认前崩溃则会重投。没有任何单一开关能覆盖所有外部副作用，必须以业务 ID 对账最终事实。

**代码 / 场景：**

**示例场景：**

- **前提：** 支付结果事件使用可靠生产确认，Broker 配置足够副本；
- **过程：** 消费者在数据库事务内写业务结果和处理记录，提交后再确认消息。
- **结果：** 定期比对支付流水与订单状态，对缺失事件重新投递。

**对照结果：** 要分别检查生产、Broker 和消费三个阶段：生产端等待确认并重试，Broker 做持久化与副本，消费者处理成功后再提交确认；同时保留对账和补偿。

**递进追问：**

1. **生产端重试为什么可能重复？**

   Broker 可能已经写入消息，只是确认响应在网络中丢失；生产者无法区分而重发，消费者必须幂等。

2. **消费成功后立刻 ack 就万无一失吗？**

   业务数据库提交与 Broker 确认仍不是同一原子事务，需要正确顺序、幂等记录和对账来覆盖崩溃窗口。

**易错点：**

- 只配置生产重试就宣称消息绝不丢，忽略 Broker 和消费确认阶段。
- 消费者先确认消息再更新数据库，进程崩溃后消息无法重放。

**参考来源：**

- [真实面经线索（题目已改写）：阿里 MQ 可靠性三连问（牛客）](https://www.nowcoder.com/discuss/384032906283380736)
- [高频题库参考（内容已重写）：JavaGuide：消息队列常见问题](https://javaguide.cn/high-performance/message-queue/message-queue.html)
- [技术校准：Apache Kafka：投递语义](https://kafka.apache.org/documentation/#semantics)

校验日期：2026-08-06

## Q34：重复消费怎样实现幂等？

**短回答：**

至少一次投递允许重复，消费者应以事件 ID 或业务唯一键识别同一操作，使用数据库唯一约束、状态机或条件更新保证副作用最多生效一次。

**原理：**

简单的“先查是否处理”存在并发竞态，查询与写入必须由同一事务、唯一索引或原子条件合并。幂等记录应保存处理结果，让重复请求能够返回一致结果。对于扣款、库存等状态变化，还需校验状态版本与合法转换；去重记录过期时间要覆盖消息最大重试和回放窗口。

**代码 / 场景：**

**示例场景：**

- **前提：** 发券事件以 event_id 建唯一索引，在同一事务插入消费记录并创建优惠券。
- **结果：** 两个消费者并发时只有一个插入成功，另一个读取已完成结果并正常确认，不会发第二张券。

**对照结果：** 至少一次投递允许重复，消费者应以事件 ID 或业务唯一键识别同一操作，使用数据库唯一约束、状态机或条件更新保证副作用最多生效一次。

**补充代码示例：**

用业务事件 id 建唯一约束，让重复投递变成可识别结果：

```sql
-- 示例重点：用这段最小代码验证“重复消费怎样实现幂等”
CREATE TABLE consumed_event (
  event_id VARCHAR(64) PRIMARY KEY, -- 同一事件只能插入一次
  consumed_at TIMESTAMP NOT NULL
);

START TRANSACTION;
INSERT INTO consumed_event(event_id, consumed_at) VALUES ('evt-7', NOW());
UPDATE account SET points = points + 10 WHERE id = 42;
COMMIT;
```

**对照结果：** 去重记录与业务更新应处在同一事务；仅靠内存 Set 或“先查再写”会在并发和重启时失效。

**递进追问：**

1. **只用 Redis SETNX 去重够吗？**

   关键事实通常不够，缓存过期、故障切换或跨存储提交失败都会突破边界，数据库唯一约束更适合最终兜底。

2. **所有操作都能返回完全相同结果吗？**

   至少要保证业务副作用不重复；可保存首次处理结果或稳定状态，让调用方明确知道已处理而不是再次执行。

**易错点：**

- 把幂等写成先 select 再 insert，两步之间没有唯一约束或事务保护。
- 去重键只用用户 ID，错误地把同一用户的不同合法事件当作重复。

**参考来源：**

- [真实面经线索（题目已改写）：阿里 MQ 可靠性三连问（牛客）](https://www.nowcoder.com/discuss/384032906283380736)
- [高频题库参考（内容已重写）：JavaGuide：消息队列常见问题](https://javaguide.cn/high-performance/message-queue/message-queue.html)
- [技术校准：Apache Kafka：投递语义](https://kafka.apache.org/documentation/#semantics)

校验日期：2026-08-06

## Q35：怎样保证消息的业务顺序？

**短回答：**

先明确顺序范围，通常只要求同一订单等聚合内有序。生产端按业务键路由到同一分区或队列，消费端按同一键串行处理，并用版本和状态机抵御重试乱序。

**原理：**

全局单队列可以提供更强顺序但严重限制并行度。按 key 分区能让不同业务实体并行，同一实体保持局部顺序；扩分区、生产重试和消费失败仍可能改变到达或完成顺序。因此消息应携带序号/版本，消费者拒绝旧版本、等待缺口或进入补偿队列，不能只相信到达顺序。

**代码 / 场景：**

**示例场景：**

- **前提：** 订单创建、支付、关闭事件都以 orderId 路由，消费者维护订单状态机。
- **过程：** 若先收到版本 3 而版本 2 缺失，暂存并告警；
- **结果：** 重复版本 2 通过幂等记录直接跳过，不把已关闭订单改回已支付。

**对照结果：** 先明确顺序范围，通常只要求同一订单等聚合内有序。生产端按业务键路由到同一分区或队列，消费端按同一键串行处理，并用版本和状态机抵御重试乱序。

**递进追问：**

1. **为什么不保证全局顺序？**

   全局顺序通常要求单分区和串行消费，会限制整个 Topic 吞吐，而业务多只需同一聚合根内有序。

2. **同一分区就一定按业务完成顺序吗？**

   消息到达有序不代表异步处理完成有序；并发线程、失败重试和外部调用仍需串行或版本控制。

**易错点：**

- 笼统声称 MQ 保证顺序，没有说明是全局、分区还是业务键范围。
- 只依赖队列到达顺序，不校验业务版本和合法状态转换。

**参考来源：**

- [真实面经线索（题目已改写）：Kafka 真实面经考点交叉汇总（牛客）](https://www.nowcoder.com/discuss/839473391097614336)
- [高频题库参考（内容已重写）：JavaGuide：消息队列常见问题](https://javaguide.cn/high-performance/message-queue/message-queue.html)
- [技术校准：Apache RocketMQ：顺序消息](https://rocketmq.apache.org/docs/featureBehavior/03fifomessage/)

校验日期：2026-08-06

## Q36：消息积压时怎样排查和恢复？

**短回答：**

先用生产速率、消费速率、lag 和最老消息年龄确认规模，再定位分区不均、消费者故障、慢下游或毒消息；止损后提升有效吞吐并受控重放。

**原理：**

消费者数量超过分区数不会继续提高 Kafka 并行度；真正瓶颈可能是数据库连接、远程接口、GC 或热点分区。无限重试单条毒消息会堵住后续消息。恢复可暂时限制生产、隔离失败消息、扩容有效消费者或批量处理，但必须确保幂等，并观察下游容量，避免恢复流量造成二次雪崩。

**代码 / 场景：**

**示例场景：**

- **前提：** 订单 Topic 的总 lag 激增，分区指标显示一个大客户占满单分区。
- **过程：** 先隔离非核心事件并限制重试，再评估更细的路由键和增加分区；
- **结果：** 恢复过程中监控数据库连接池与 lag 下降斜率。

**对照结果：** 先用生产速率、消费速率、lag 和最老消息年龄确认规模，再定位分区不均、消费者故障、慢下游或毒消息；止损后提升有效吞吐并受控重放。

**递进追问：**

1. **为什么增加消费者后 lag 仍不下降？**

   可能消费者数已超过分区数，或瓶颈在下游资源、单条处理时间和热点分区，而不是实例数量。

2. **毒消息应直接丢弃吗？**

   应带完整上下文进入有限重试或死信队列并告警，按业务风险修复或补偿，不能静默丢失。

**易错点：**

- 只看 Topic 总 lag，不按分区、实例和处理阶段定位真正瓶颈。
- 对失败消息无限立即重试，既阻塞分区又持续冲击故障下游。

**参考来源：**

- [真实面经线索（题目已改写）：BOSS 直聘 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/801379399596535808)
- [高频题库参考（内容已重写）：JavaGuide：消息队列常见问题](https://javaguide.cn/high-performance/message-queue/message-queue.html)
- [技术校准：Apache Kafka：Consumer 配置](https://kafka.apache.org/documentation/#consumerconfigs)

校验日期：2026-08-06

## Q37：Kafka、RocketMQ 和 RabbitMQ 怎样选？

**短回答：**

日志流、超高吞吐和长期回放常偏 Kafka；交易消息、事务与延时能力常偏 RocketMQ；灵活路由和中小规模业务集成常偏 RabbitMQ，最终还要匹配团队运维能力。

**原理：**

选型维度包括消息模型、吞吐与延迟、顺序范围、投递语义、事务/延时、路由、保留回放、扩容、生态和可观测性。Kafka 以分区追加日志见长；RocketMQ 面向业务消息提供顺序、事务等能力；RabbitMQ 通过 Exchange 提供灵活路由。产品能力随版本变化，必须用目标版本实测。

**代码 / 场景：**

**示例场景：**

- **前提：** 埋点与数据管道需要多次回放，可用 Kafka；
- **过程：** 订单状态事件若团队已有 RocketMQ 运维和事务消息经验，可沿用；轻量邮件路由可评估 RabbitMQ。
- **结果：** 选型文档写清峰值、保留期、顺序键和灾备。

**对照结果：** 日志流、超高吞吐和长期回放常偏 Kafka；交易消息、事务与延时能力常偏 RocketMQ；灵活路由和中小规模业务集成常偏 RabbitMQ，最终还要匹配团队运维能力。

**递进追问：**

1. **能只按官方 TPS 选型吗？**

   不能，测试模型、消息大小和硬件差异很大，还要评估语义、扩容、故障恢复与团队值班成本。

2. **支持事务消息等于跨服务强一致吗？**

   不等于。它协调本地事务和消息可见性，消费者仍异步执行并需要幂等、补偿和对账。

**易错点：**

- 只比较峰值吞吐，不分析顺序、保留、重放和事务等业务语义。
- 团队没有监控和恢复经验却引入多种 MQ，显著增加故障面。

**参考来源：**

- [真实面经线索（题目已改写）：阿里、腾讯 Java 社招 MQ 面经（牛客）](https://www.nowcoder.com/discuss/688053)
- [高频题库参考（内容已重写）：JavaGuide：消息队列常见问题](https://javaguide.cn/high-performance/message-queue/message-queue.html)
- [技术校准：Apache Kafka：设计](https://kafka.apache.org/documentation/#design)
- [技术校准：Apache RocketMQ：事务消息](https://rocketmq.apache.org/docs/featureBehavior/04transactionmessage/)

校验日期：2026-08-06

# 分布式与服务保护

## Q38：单体、微服务和分布式系统有什么区别？

**短回答：**

单体把功能作为一个部署单元；微服务按业务边界拆成可独立部署的服务；分布式强调组件跨进程或节点协作。微服务是分布式架构的一种，不是项目规模增长后的必选答案。

**原理：**

拆分可带来独立扩缩容、发布与团队自治，但本地调用变为网络调用，还需服务发现、网关、配置、可观测性、容错、数据一致性和自动化交付。边界应围绕业务能力与数据所有权，而不是按 Controller/Service/DAO 技术层横切。拆得过早会让调试和运维成本高于收益。

**代码 / 场景：**

**示例场景：**

- **前提：** 初创订单系统先采用模块化单体，明确订单、库存、支付模块和接口；
- **结果：** 只有当发布节奏、团队边界或容量差异成为真实瓶颈时，再独立拆出服务，同时补齐追踪、超时和契约测试。

**对照结果：** 单体把功能作为一个部署单元；微服务按业务边界拆成可独立部署的服务；分布式强调组件跨进程或节点协作。

**递进追问：**

1. **模块化单体有什么价值？**

   它在单进程内保持清晰边界和可测试接口，避免过早承担网络与运维成本，也为未来按模块拆分保留路径。

2. **微服务是否一定更高可用？**

   不一定，服务增多会增加网络和依赖故障点；只有配套隔离、冗余、观测和自动恢复后才可能提升整体韧性。

**易错点：**

- 把“服务数量多”当成微服务成熟度，不讨论业务边界与数据所有权。
- 为追求架构名词过早拆分，开发效率下降却没有容量或组织收益。

**参考来源：**

- [真实面经线索（题目已改写）：腾讯 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/744849501931790336)
- [高频题库参考（内容已重写）：JavaGuide：分布式系统基础](https://javaguide.cn/distributed-system/)
- [技术校准：Microsoft：微服务设计模式](https://learn.microsoft.com/en-us/azure/architecture/microservices/design/patterns)

校验日期：2026-08-06

## Q39：RPC 调用和服务发现是怎样配合的？

**短回答：**

RPC 把远程服务调用抽象为协议请求；服务发现维护服务名到可用实例的映射，客户端或代理据此选择实例，再完成序列化、传输、超时和结果解析。

**原理：**

提供者启动后注册地址与健康信息，消费者订阅或查询实例列表，并通过负载均衡挑选节点。一次 RPC 还涉及连接管理、编解码、超时、重试、错误映射和追踪上下文。注册中心只反映某种健康视图，存在传播延迟；调用方仍要处理实例已下线、半开连接和网络分区。

**代码 / 场景：**

**示例场景：**

- **前提：** 库存服务扩容后实例注册，订单服务收到变更并把请求分散到新节点。
- **过程：** 发布摘流时先标记不接新流量，再等待在途请求完成；
- **结果：** 调用失败按幂等性决定是否重试，并把实例与 traceId 写入日志。

**对照结果：** RPC 把远程服务调用抽象为协议请求；服务发现维护服务名到可用实例的映射，客户端或代理据此选择实例，再完成序列化、传输、超时和结果解析。

**递进追问：**

1. **客户端发现和服务端发现有什么区别？**

   客户端发现由调用方选择实例；服务端发现由负载均衡器或代理选择，调用方只访问统一入口，各自有不同治理和依赖成本。

2. **注册中心显示健康为什么调用仍会失败？**

   健康检查与真实请求存在时间差和覆盖差异，网络、连接池或特定接口也可能故障，因此调用端仍需超时和容错。

**易错点：**

- 把 RPC 仅解释成“像调用本地方法”，忽略网络失败和部分成功语义。
- 完全相信注册中心健康状态，不给真实调用设置超时、隔离和追踪。

**参考来源：**

- [真实面经线索（题目已改写）：腾讯 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/744849501931790336)
- [高频题库参考（内容已重写）：JavaGuide：分布式系统基础](https://javaguide.cn/distributed-system/)
- [技术校准：Spring Cloud：服务发现抽象](https://docs.spring.io/spring-cloud-commons/reference/spring-cloud-commons/common-abstractions.html#service-discovery-client)

校验日期：2026-08-06

## Q40：超时、重试和幂等为什么必须一起设计？

**短回答：**

超时只表示调用方没及时拿到结果，不代表服务端未执行；重试可能把一次操作变成多次，因此只有可重试错误和幂等操作才应受控重试。

**原理：**

每层调用都默认重试会形成乘法放大。应从用户总延迟预算倒推连接、读取和下游超时，只在一个明确层做有限次数、指数退避与抖动。写操作用业务唯一键、请求 ID、条件更新或状态机保证重复到达不会重复生效。非幂等且结果未知时应查询状态或进入补偿，而不是盲目重放。

**代码 / 场景：**

**示例场景：**

- **前提：** 创建订单使用 clientOrderNo 唯一约束。
- **过程：** 网关总预算 1 秒，订单服务调用库存单次 250ms，最多一次带抖动重试；
- **结果：** 若首次响应丢失，第二次根据唯一键返回原订单，不再次扣库存。

**对照结果：** 超时只表示调用方没及时拿到结果，不代表服务端未执行；重试可能把一次操作变成多次，因此只有可重试错误和幂等操作才应受控重试。

**补充代码示例：**

只有可确认安全的失败才重试，并复用同一个幂等键：

```java
// 示例重点：用这段最小代码验证“超时、重试和幂等为什么必须一起设计”
String key = request.idempotencyKey(); // 每次重试保持不变
for (int attempt = 1; attempt <= 3; attempt++) {
    try {
        return client.pay(request, key, Duration.ofMillis(800));
    } catch (ConnectException error) {
        backoffWithJitter(attempt); // 连接失败可按策略退避重试
    }
}
throw new ServiceUnavailableException();
```

**对照结果：** 读超时可能发生在服务端已成功之后；支付等写操作没有服务端幂等记录时，客户端不能盲目重放。

**递进追问：**

1. **GET 就一定可以无限重试吗？**

   GET 语义通常幂等，但下游容量、长尾和实现副作用仍限制重试次数，必须受总预算与退避控制。

2. **什么是重试风暴？**

   依赖变慢时多层客户端同时重试，使实际请求量倍增，进一步压垮下游并延长故障恢复。

**易错点：**

- 把超时当作执行失败，直接重试扣款、发券等有副作用操作。
- 网关、服务和客户端各重试三次，形成指数级请求放大。

**参考来源：**

- [真实面经线索（题目已改写）：招银 Java 二面分布式系统追问（牛客）](https://www.nowcoder.com/discuss/856850971807232000)
- [高频题库参考（内容已重写）：JavaGuide：高可用系统设计](https://javaguide.cn/high-availability/)
- [技术校准：Microsoft：重试模式](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry)
- [技术校准：RFC 9110：HTTP 语义](https://www.rfc-editor.org/rfc/rfc9110)

校验日期：2026-08-06

## Q41：限流、熔断和降级有什么区别？

**短回答：**

限流控制进入系统的负载；熔断在依赖持续失败时暂时停止调用；降级在资源不足或依赖不可用时返回简化结果。三者共同保护核心链路但触发依据不同。

**原理：**

限流可按固定窗口、滑动窗口、漏桶或令牌桶控制速率与突发；熔断根据失败率、慢调用或并发阈值进入打开、半开、关闭状态；降级要定义可接受的旧数据、默认值或关闭非核心功能。还应配合有界线程池和连接池形成舱壁，阈值来自压测容量与 SLO，而非随意常量。

**代码 / 场景：**

**示例场景：**

- **前提：** 商品活动高峰按用户和接口令牌桶限流；
- **过程：** 推荐服务慢调用超过阈值后熔断，商品页降级为不显示推荐；
- **结果：** 订单提交使用独立连接池，确保推荐故障不会耗尽核心资源。

**对照结果：** 限流控制进入系统的负载；熔断在依赖持续失败时暂时停止调用；降级在资源不足或依赖不可用时返回简化结果。

**补充代码示例：**

三种保护作用在不同位置，可以组合而不是互相替代：

```java
// 示例重点：用这段最小代码验证“限流、熔断和降级有什么区别”
if (!rateLimiter.tryAcquire(userId)) return tooManyRequests(); // 限制入口量
if (breaker.isOpen()) return cachedResult();                       // 依赖故障时快速降级

try {
    return remote.call();
} catch (TimeoutException error) {
    breaker.recordFailure(); // 连续失败达到阈值后熔断
    return cachedResult();    // 返回较弱但可用的结果
}
```

**对照结果：** 限流保护容量，熔断阻止持续调用故障依赖，降级定义不可用时仍能提供什么。

**递进追问：**

1. **熔断和超时有什么关系？**

   超时限制单次调用等待，熔断汇总一段时间的失败或慢调用并快速拒绝后续请求，二者需要协调阈值。

2. **降级为什么不能统一返回空数据？**

   空数据可能被误认为真实业务结果；应按场景标注陈旧、不可用或稍后重试，并保证核心不变量不被破坏。

**易错点：**

- 把限流、熔断和降级当同一个“拒绝请求”按钮，没有定义触发与恢复。
- 阈值直接抄别人的配置，不基于本系统容量、依赖预算和用户体验。

**参考来源：**

- [真实面经线索（题目已改写）：招银 Java 二面分布式系统追问（牛客）](https://www.nowcoder.com/discuss/856850971807232000)
- [高频题库参考（内容已重写）：JavaGuide：高可用系统设计](https://javaguide.cn/high-availability/)
- [技术校准：Spring Cloud：Circuit Breaker](https://docs.spring.io/spring-cloud-circuitbreaker/reference/)
- [技术校准：Envoy：全局限流](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting)

校验日期：2026-08-06

## Q42：CAP 和 BASE 理论怎样理解？

**短回答：**

网络分区发生时，分布式系统无法同时保证每次访问的一致结果和所有请求都成功响应，只能按业务选择；BASE 强调基本可用、软状态和最终一致的工程取舍。

**原理：**

CAP 的 P 是节点间通信可能中断，不是可随意关闭的性能选项。分区期间，一致性路径可能拒绝或等待请求，可用性路径可能返回旧值并在恢复后收敛。真实系统可按不同数据和操作做选择：余额扣减偏一致，商品介绍偏可用。最终一致仍需要版本、重试、冲突解决和对账，不是“以后自然会一致”。

**代码 / 场景：**

**示例场景：**

- **前提：** 支付状态在主库不可确认时返回处理中，避免两个分区各自确认成功；
- **过程：** 商品详情在缓存与源站断连时可返回标注时间的旧版本。
- **结果：** 两条链路采用不同策略，并明确恢复后如何对账。

**对照结果：** 网络分区发生时，分布式系统无法同时保证每次访问的一致结果和所有请求都成功响应，只能按业务选择；BASE 强调基本可用、软状态和最终一致的工程取舍。

**递进追问：**

1. **CAP 是否表示平时只能三选二？**

   重点是分区发生时 C 与 A 的冲突；无分区时系统仍可同时提供一致访问和正常响应，不能简化成永久三选二。

2. **最终一致是否没有时间要求？**

   工程上必须定义可接受收敛时间、失败告警与补偿路径，否则“最终”无法验证也无法运营。

**易错点：**

- 把分区容错理解成数据分片，或说业务可简单选择不要 P。
- 用“最终一致”掩盖没有重试、冲突处理、监控和对账的设计缺口。

**参考来源：**

- [真实面经线索（题目已改写）：招银 Java 二面分布式系统追问（牛客）](https://www.nowcoder.com/discuss/856850971807232000)
- [高频题库参考（内容已重写）：JavaGuide：分布式系统基础](https://javaguide.cn/distributed-system/)
- [技术校准：Microsoft：分布式一致性级别](https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels)

校验日期：2026-08-06

## Q43：分布式事务有哪些常见方案？

**短回答：**

常见方案包括强协调的两阶段提交、业务补偿的 TCC/Saga，以及事务消息或 Outbox 的最终一致。选择取决于一致性要求、参与者能力和可接受复杂度。

**原理：**

2PC 由协调者驱动准备与提交，参与者可能长时间锁资源；TCC 把业务拆成 Try、Confirm、Cancel，必须处理幂等、空回滚和悬挂；Saga 以一系列本地事务和补偿推进；Outbox 在同一本地事务写业务事实与待发送事件，再可靠投递。没有方案能自动消除业务补偿和对账。

**代码 / 场景：**

**示例场景：**

- **前提：** 普通订单创建可在同一库写订单与 outbox，再由库存服务幂等消费实现最终一致；
- **结果：** 资金冻结若要求更强控制，可评估 TCC，并为 Confirm/Cancel 建唯一状态机和人工对账。

**对照结果：** 常见方案包括强协调的两阶段提交、业务补偿的 TCC/Saga，以及事务消息或 Outbox 的最终一致。

**递进追问：**

1. **Outbox 为什么仍会重复消息？**

   投递器发送成功后可能在标记完成前崩溃，恢复后再次发送，因此消费者仍需事件 ID 幂等。

2. **TCC 的空回滚是什么？**

   Cancel 可能早于对应 Try 到达或 Try 实际未成功，回滚逻辑必须识别并安全返回，不能凭空释放资源。

**易错点：**

- 把分布式事务等同于某个中间件注解，不分析锁、补偿和故障窗口。
- 只设计正常提交路径，没有幂等、空回滚、悬挂、重试与人工对账。

**参考来源：**

- [真实面经线索（题目已改写）：BOSS 直聘 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/801379399596535808)
- [高频题库参考（内容已重写）：JavaGuide：分布式系统基础](https://javaguide.cn/distributed-system/)
- [技术校准：Microsoft：Saga 模式](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga)
- [技术校准：Apache RocketMQ：事务消息](https://rocketmq.apache.org/docs/featureBehavior/04transactionmessage/)

校验日期：2026-08-06

# HTTP、Linux 与线上排障

## Q44：常见 HTTP 状态码和方法幂等性怎样理解？

**短回答：**

2xx 表示成功处理，3xx 表示重定向，4xx 是客户端请求问题，5xx 是服务端失败。幂等表示同一请求重复执行的预期效果与执行一次相同，不等于响应必须完全一样。

**原理：**

GET、PUT、DELETE 在规范语义上通常幂等，POST 通常不保证；但真实幂等仍依赖服务实现，GET 不应偷偷产生关键副作用。401 表示缺少或无效认证，403 表示已识别但无权限；404 是资源不可见，409 可表示状态冲突，429 表示限流。状态码、业务错误码和可重试策略应共同设计。

**代码 / 场景：**

**示例场景：**

- **前提：** 创建订单使用 POST，但客户端携带唯一 clientOrderNo，服务端用唯一约束实现业务幂等；
- **过程：** 重复请求返回原订单。
- **结果：** 库存版本冲突返回 409，限流返回 429 并携带合理重试提示，而不是所有错误都返回 200。

**对照结果：** 2xx 表示成功处理，3xx 表示重定向，4xx 是客户端请求问题，5xx 是服务端失败。

**补充代码示例：**

同一个幂等键重复提交，服务端应返回同一业务结果：

**示例注解：** 用这段最小代码验证“常见 HTTP 状态码和方法幂等性怎样理解”；协议报文或轨迹需保持原样，所以注释放在代码框外。

```http
# 示例重点：第二次请求不是再次扣款，而是读取第一次结果
POST /payments HTTP/1.1
Host: api.example.com
Idempotency-Key: order-20260903-7
Content-Type: application/json

{"orderId":7,"amount":"99.00"}
```

**对照结果：** HTTP 方法语义与业务实现要一致；POST 默认不幂等，但可通过幂等键和服务端唯一记录实现业务幂等。

**递进追问：**

1. **DELETE 同一资源第二次返回 404 还算幂等吗？**

   可以，最终服务器状态仍是资源不存在；幂等关注预期副作用，不要求每次状态码或响应体完全相同。

2. **502、503 和 504 有什么区别？**

   502 常表示网关收到无效上游响应，503 表示服务暂不可用，504 表示网关等待上游超时，重试应结合方法与预算。

**易错点：**

- 把幂等理解成每次响应字节完全相同，忽略它描述的是重复执行副作用。
- 接口发生任何异常都返回 HTTP 200，只在 JSON 里放错误，破坏网关和监控语义。

**参考来源：**

- [真实面经线索（题目已改写）：20 篇 Java 后端面经汇总（牛客）](https://www.nowcoder.com/discuss/353155591071801344)
- [高频题库参考（内容已重写）：小林 Coding：图解网络](https://xiaolincoding.com/network/)
- [技术校准：RFC 9110：HTTP 语义](https://www.rfc-editor.org/rfc/rfc9110)

校验日期：2026-08-06

## Q45：TCP 为什么要三次握手和四次挥手？

**短回答：**

三次握手让双方确认收发能力并同步初始序列号；关闭时两个方向独立终止，因此通常各自发送 FIN 和确认，表现为四个报文阶段。

**原理：**

客户端 SYN、服务端 SYN+ACK、客户端 ACK 后，双方都获得对端初始序列号并确认此前报文可达，避免旧连接请求直接建立错误状态。全双工连接的两个发送方向可分别关闭，一端 FIN 只表示不再发送。主动关闭方通常进入 TIME_WAIT，等待迟到报文消失并能重传最终 ACK。网络实现可能合并部分报文，不能死背固定包数。

**代码 / 场景：**

**示例场景：**

- **前提：** 服务频繁短连接导致大量 TIME_WAIT，应先启用连接复用、检查客户端连接池和负载均衡超时，而不是随意缩短内核等待时间。
- **结果：** 抓包结合连接状态确认是哪一端主动关闭。

**对照结果：** 三次握手让双方确认收发能力并同步初始序列号；关闭时两个方向独立终止，因此通常各自发送 FIN 和确认，表现为四个报文阶段。

**递进追问：**

1. **为什么两次握手不够？**

   服务端无法确认自己的 SYN 与初始序列号已被客户端接收，旧 SYN 也可能让两端对连接状态产生不一致判断。

2. **TIME_WAIT 为什么通常在主动关闭方？**

   它需要确保最终 ACK 可重传，并让旧连接中的重复报文在网络中过期，避免影响相同四元组的新连接。

**易错点：**

- 只画报文箭头，无法说明序列号同步、旧报文与双向关闭。
- 看到 TIME_WAIT 就调内核参数，没有确认连接复用、主动关闭方和实际端口压力。

**参考来源：**

- [真实面经线索（题目已改写）：20 篇 Java 后端面经汇总（牛客）](https://www.nowcoder.com/discuss/353155591071801344)
- [高频题库参考（内容已重写）：小林 Coding：图解网络](https://xiaolincoding.com/network/)
- [技术校准：RFC 9293：TCP](https://www.rfc-editor.org/rfc/rfc9293)

校验日期：2026-08-06

## Q46：BIO、NIO 和 I/O 多路复用有什么区别？

**短回答：**

BIO 的线程会阻塞等待读写；Java NIO 提供非阻塞 Channel、Buffer 和 Selector。I/O 多路复用让一个线程等待多个连接的就绪事件，再只处理已就绪通道。

**原理：**

传统一连接一线程的 BIO 在大量空闲长连接下会占用很多线程与栈空间。非阻塞 Channel 在暂时不可读写时立即返回，Selector 把多个通道注册到同一事件循环，底层可映射到 epoll、kqueue 等系统机制。多路复用通知的是“已经就绪”，应用仍要执行实际读写；它减少等待线程，并不会让 CPU 计算自动并行。

**代码 / 场景：**

**示例场景：**

- **前提：** 聊天网关用 Selector 维护大量长连接，只在连接可读时解析消息，再把耗时业务交给有界工作池。
- **结果：** 如果在事件循环中执行慢 SQL 或大文件计算，一个阻塞任务仍会拖慢该循环负责的全部连接。

**对照结果：** BIO 的线程会阻塞等待读写；Java NIO 提供非阻塞 Channel、Buffer 和 Selector。

**递进追问：**

1. **NIO 是否一定比 BIO 快？**

   不一定。连接数少、请求简单时 BIO 更直观；NIO 的优势主要在大量并发连接和可控线程占用，还要承担状态机与事件循环复杂度。

2. **多路复用等于异步 I/O 吗？**

   不等同。多路复用通常通知通道已经就绪，应用再执行读写；异步 I/O 是系统完成操作后通知结果。

**易错点：**

- 把 NIO 直接解释成异步 I/O，混淆非阻塞、就绪通知和完成通知。
- 在 Netty/Reactor 事件线程里做长阻塞调用，导致该线程负责的连接整体卡顿。

**参考来源：**

- [真实面经线索（题目已改写）：20 篇 Java 后端面经汇总（牛客）](https://www.nowcoder.com/discuss/353155591071801344)
- [高频题库参考（内容已重写）：小林 Coding：图解系统](https://xiaolincoding.com/os/)
- [技术校准：Java 21：NIO Selector API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/Selector.html)

校验日期：2026-08-06

## Q47：Linux 上怎样排查 Java 接口变慢？

**短回答：**

先确定影响范围和时间线，再按 CPU、内存、磁盘、网络、线程池、连接池、GC 与下游逐层收集证据，用请求追踪把系统指标和具体调用关联。

**原理：**

因为“接口慢”可能来自流量、CPU、GC、锁、连接池、磁盘、网络或下游，单看一个 `top` 数字无法定位，所以排查要先按时间线和请求链缩小故障域，再逐层验证。先看流量、错误率和 p95/p99，再用 top/pidstat 定位进程与线程 CPU，vmstat/free 观察内存和换页，iostat 看磁盘，ss 看连接状态；

应用侧用 jcmd、线程转储、GC 日志和 JFR 检查锁、热点栈、分配与暂停，数据库和 Redis 再核对等待与延迟。每次只验证一个假设。

**代码 / 场景：**

**示例场景：**

- **前提：** 发布后接口 p99 升高，top 显示 CPU 正常但线程池 active 已满；
- **过程：** 线程转储显示大量线程等待数据库连接，追踪又显示事务内远程调用。
- **结果：** 先回滚止损，再拆短事务并增加连接等待告警。

**对照结果：** 先确定影响范围和时间线，再按 CPU、内存、磁盘、网络、线程池、连接池、GC 与下游逐层收集证据，用请求追踪把系统指标和具体调用关联。

**补充代码示例：**

先看整机，再定位进程、线程和调用链，避免一上来就重启：

```bash
# 示例重点：用这段最小代码验证“Linux 上怎样排查 Java 接口变慢”
# 查看 CPU、内存、负载和 I/O 是否整体异常
vmstat 1
pidstat -p <pid> 1

# 找到 Java 高 CPU 线程，并保存线程栈做证据
top -H -p <pid>
jcmd <pid> Thread.print > threads.txt

# 查看 GC 与堆概况，不要直接在线上抓超大 heap dump
jcmd <pid> GC.heap_info
```

**对照结果：** 命令结果要和请求 trace、慢 SQL、GC 日志及变更时间线对齐，才能区分 CPU、锁、I/O 或下游问题。

**递进追问：**

1. **平均耗时正常为什么用户仍觉得慢？**

   平均值会被大量快速请求稀释，应看高分位并按接口、实例、版本、机房和用户群切片定位长尾。

2. **线程转储应该怎样看？**

   连续采样并按线程状态与相同栈聚类，关注持锁者、BLOCKED、线程池队列和热点调用，单次快照只是一瞬间证据。

**易错点：**

- 只会报出 top、jstack 命令列表，却没有从现象到假设再到验证的顺序。
- 同时修改线程池、JVM 和数据库参数，结果改善后无法确认真正根因。

**参考来源：**

- [真实面经线索（题目已改写）：20 篇 Java 后端面经汇总（牛客）](https://www.nowcoder.com/discuss/353155591071801344)
- [高频题库参考（内容已重写）：小林 Coding：图解系统](https://xiaolincoding.com/os/)
- [技术校准：JDK 21：jcmd 工具](https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html)

校验日期：2026-08-06

## Q48：线上 CPU 飙高或内存增长怎样定位？

**短回答：**

CPU 飙高要定位到具体线程和热点栈；内存增长要区分堆、元空间、直接内存和进程 RSS，并观察 GC 后基线是否持续上升，再选择采样或转储。

**原理：**

CPU 路径可用系统工具找高占用线程，将线程 ID 对应到线程转储，或用 JFR 持续采样热点方法、锁和分配。内存路径先看 GC 频率、暂停和老年代趋势；堆持续增长再做类直方图或受控 heap dump，直接内存与线程栈则需结合 NMT、线程数和容器限制。转储可能造成停顿和磁盘压力。

**代码 / 场景：**

**示例场景：**

- **前提：** 实例 CPU 100% 时连续 JFR 显示正则回溯占大头，先限流并回滚规则；
- **结果：** 若 RSS 增长但堆稳定，继续检查直接缓冲区、线程数量和 native memory，而不是盲目增大 Xmx。

**对照结果：** CPU 飙高要定位到具体线程和热点栈；内存增长要区分堆、元空间、直接内存和进程 RSS，并观察 GC 后基线是否持续上升，再选择采样或转储。

**递进追问：**

1. **频繁 Full GC 一定是内存泄漏吗？**

   不一定，也可能是堆过小、分配突增、显式 GC、元空间或晋升压力，需要看 GC 原因和回收后基线。

2. **为什么不能在线上直接做 heap dump？**

   大堆转储可能触发停顿、额外内存和大量磁盘 I/O，应先确认空间、风险和副本，并优先用低开销证据缩小范围。

**易错点：**

- 看到进程内存高就断定 Java 堆泄漏，忽略直接内存、线程栈和页缓存。
- 在唯一生产实例上贸然转储大堆，造成停顿或磁盘写满的二次故障。

**参考来源：**

- [真实面经线索（题目已改写）：BOSS 直聘 Java 后端面经（牛客，2025）](https://www.nowcoder.com/discuss/801379399596535808)
- [高频题库参考（内容已重写）：小林 Coding：图解系统](https://xiaolincoding.com/os/)
- [技术校准：JDK 21：Flight Recorder](https://docs.oracle.com/en/java/javase/21/jfapi/)

校验日期：2026-08-06

# Spring 与 MyBatis 工程高频

## Q49：Spring Bean 作用域及跨作用域依赖怎样处理？

**短回答：**

Spring 提供单例、原型及请求、会话等作用域。长生命周期 Bean 依赖短生命周期对象时，应通过延迟获取或作用域代理保持正确边界。

**原理：**

- singleton 在同一容器和 Bean 定义内复用实例。
- prototype 在每次向容器请求时创建实例，容器不负责完整销毁。
- request、session 等 Web 作用域绑定请求或会话上下文。
- singleton 直接注入 prototype，只会在自身创建时解析一次。
- ObjectProvider、查找方法或 scoped proxy 可在实际调用时取得当前作用域对象。

**代码 / 场景：**

**示例场景：**

- **前提：** 导出任务 Service 是 singleton，但每次执行都需要新的 TaskContext。
- **过程：** 用 ObjectProvider<TaskContext>.getObject() 在任务开始时获取，而不是构造注入后长期复用同一个 prototype；
- **结果：** 请求作用域对象进入异步任务前则应提取必要值，不能继续依赖已结束的请求上下文。

**对照结果：** Spring 提供单例、原型及请求、会话等作用域。长生命周期 Bean 依赖短生命周期对象时，应通过延迟获取或作用域代理保持正确边界。

**递进追问：**

1. **prototype 注入 singleton 后为什么没有每次创建？**

   依赖注入发生在 singleton 实例化阶段，当时只解析一次 prototype；后续调用复用的是已经保存的引用。

2. **异步线程能直接使用 request-scoped Bean 吗？**

   通常不能，请求结束或线程切换后上下文可能不存在；应在提交任务前复制必要数据，或显式建立适合异步任务的上下文边界。

**易错点：**

- 把 prototype 作为字段直接注入 singleton，却误以为每次调用都会产生新实例。
- 把 request-scoped Bean 传入线程池长期持有，导致上下文失效、数据串用或资源无法释放。

**参考来源：**

- [真实面经线索（题目已改写）：Spring 单例 Bean 线程安全问答（牛客）](https://www.nowcoder.com/discuss/353149002420002816)
- [高频题库参考（内容已重写）：JavaGuide：Spring 常见面试题](https://javaguide.cn/system-design/framework/spring/spring-knowledge-and-questions-summary.html)
- [技术校准：Spring：Bean 作用域](https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html)

校验日期：2026-08-06

## Q50：一次 MyBatis Mapper 方法调用经历了什么？

**短回答：**

Mapper 接口由动态代理实现。调用时先定位映射语句，再经会话、执行器和 JDBC 完成参数绑定与查询，最后把结果集映射成 Java 对象。

**原理：**

- MapperProxy 拦截接口方法并解析 MapperMethod。
- “接口全名 + 方法名”用于定位 MappedStatement。
- SqlSession 把操作委托给负责缓存与执行策略的 Executor。
- StatementHandler 生成 BoundSql，ParameterHandler 绑定 JDBC 参数。
- JDBC 返回结果后，ResultSetHandler 按 resultMap/resultType 组装对象。

**代码 / 场景：**

**示例场景：**

- **前提：** 调用 userMapper.findById(7) 时，代理定位 namespace 为 UserMapper、id 为 findById 的语句；
- **过程：** #{id} 被绑定为 PreparedStatement 参数。
- **结果：** 查询返回后，ResultSetHandler 根据 resultMap 将 user_id、user_name 映射到 User 字段，SqlSessionTemplate 再按当前 Spring 事务复用或关闭会话。

**对照结果：** Mapper 接口由动态代理实现。调用时先定位映射语句，再经会话、执行器和 JDBC 完成参数绑定与查询，最后把结果集映射成 Java 对象。

**递进追问：**

1. **Mapper 接口没有实现类，为什么可以注入？**

   扫描器为接口注册代理对象，代理在运行时把方法签名转换为语句标识并委托 SqlSession 执行；真正的 SQL 和结果映射来自 Mapper 元数据。

2. **Executor 有哪些常见类型？**

   Simple 每次创建 Statement，Reuse 尝试复用 Statement，Batch 累积更新后批量提交；选择 Batch 时必须明确 flush、异常定位和生成键处理。

**易错点：**

- 只回答“动态代理执行 SQL”，说不清 MappedStatement、Executor、StatementHandler 与 JDBC 的职责边界。
- 把 SqlSession 保存为单例字段跨线程使用，绕开 Spring 的事务绑定与生命周期管理。

**参考来源：**

- [真实面经线索（题目已改写）：小红书 Java 后端岗位面经转载（牛客）](https://www.nowcoder.com/feed/main/detail/b9a57fd0856149ef87a55f80ade7f8fc)
- [高频题库参考（内容已重写）：JavaGuide：MyBatis 常见面试题](https://javaguide.cn/system-design/framework/mybatis/mybatis-interview.html)
- [技术校准：MyBatis 3：Java API 与 Mapper](https://mybatis.org/mybatis-3/java-api.html)

校验日期：2026-08-06

## Q51：MyBatis 的 #{} 和 ${} 有什么区别，SQL 注入边界在哪里？

**短回答：**

#{} 通过 PreparedStatement 绑定数据值；${} 直接替换 SQL 文本。前者适合业务参数，后者只应接收代码内白名单片段，否则会越过预编译边界并引入注入风险。

**原理：**

- #{} 先保留 ? 占位符，再由驱动按类型绑定值。
- 参数中的引号和关键字不会经 #{} 变成 SQL 结构。
- ${} 在解析阶段直接替换文本，可改变列名、表名和排序。
- 动态标识符必须由后端枚举映射为固定常量。
- 普通条件优先使用 if、choose、foreach 与 #{}，不要拼接用户输入。

**代码 / 场景：**

**示例场景：**

- **前提：** 按用户名查询写成 WHERE username = #{username}。
- **过程：** 排序接口接收 sortKey 枚举，服务端通过 Map.of("createdAt", "created_at", "name", "user_name") 选择固定列，再交给 ${column}；order 也只允许 ASC/DESC 两个常量。
- **结果：** 绝不能把请求中的 orderBy 原样放进 ${}。

**对照结果：** #{} 通过 PreparedStatement 绑定数据值；${} 直接替换 SQL 文本。

**补充代码示例：**

业务值使用预编译绑定；动态列名必须先在 Java 中映射白名单：

```xml
<!-- 示例重点：用这段最小代码验证“MyBatis 的 #{} 和 ${} 有什么区别，SQL 注入边界在哪里” -->
<!-- #{} 会变成 ? 参数，不改变 SQL 结构 -->
<select id="findByName">
  SELECT * FROM user WHERE name = #{name}
</select>

<!-- ${column} 只能接收服务端枚举映射后的固定列名 -->
<select id="listSorted">
  SELECT * FROM user ORDER BY ${column}
</select>
```

**对照结果：** `${}` 不是天然漏洞，但任何未经白名单处理的请求参数都不能进入它。

**递进追问：**

1. **为什么列名不能直接使用 #{}？**

   占位符表达的是数据值，数据库会把它作为字符串或其他值类型处理，而不是 SQL 标识符；动态列名必须在生成 SQL 结构前由可信白名单确定。

2. **使用 ${} 就一定有漏洞吗？**

   不一定，若替换内容完全来自代码内固定常量或严格枚举映射，风险可控；漏洞来自不可信输入进入 SQL 结构，而不是符号本身。

**易错点：**

- 认为用了 MyBatis 就天然防注入，忽略 ${}、拼接 LIKE、动态排序和批量片段仍可能接入不可信文本。
- 用关键词过滤或手工转义保护动态列名，遗漏编码、注释和数据库方言差异；正确边界应是枚举白名单。

**参考来源：**

- [真实面经线索（题目已改写）：阿里、腾讯、VIVO、OPPO Java 面经复盘（牛客）](https://www.nowcoder.com/discuss/422046)
- [高频题库参考（内容已重写）：JavaGuide：MyBatis 常见面试题](https://javaguide.cn/system-design/framework/mybatis/mybatis-interview.html)
- [技术校准：MyBatis 3：映射 XML](https://mybatis.org/mybatis-3/sqlmap-xml.html)

校验日期：2026-08-06

## Q52：MyBatis 一级、二级缓存有什么区别，什么时候会失效？

**短回答：**

一级缓存属于会话，二级缓存属于 Mapper 命名空间。写操作、提交回滚或显式刷新会清理缓存；跨表依赖与外部写入仍需自行处理。

**原理：**

- 一级缓存位于 Executor，默认范围是 SESSION。
- localCacheScope=STATEMENT 时，每条语句结束即清理。
- 二级缓存按 namespace 管理，需要显式启用。
- 查询结果通常在会话提交或关闭后才进入二级缓存。
- 写语句默认 flushCache=true；跨 namespace 和外部写入不会被自动推导。

**代码 / 场景：**

**示例场景：**

- **前提：** 同一事务连续两次按 id 查询用户且没有更新，一级缓存可能让第二次不访问数据库；
- **过程：** 若随后执行 updateUser，再查会重新访问。对“用户 + 角色”跨表视图，不要简单依赖 UserMapper 二级缓存，因为 RoleMapper 更新未必清理它；
- **结果：** 更稳妥的是关闭该缓存或使用有明确失效策略的集中缓存。

**对照结果：** 一级缓存属于会话，二级缓存属于 Mapper 命名空间。写操作、提交回滚或显式刷新会清理缓存；跨表依赖与外部写入仍需自行处理。

**递进追问：**

1. **为什么二级缓存不是查询后立即对其他会话可见？**

   当前会话可能仍会回滚；通常要等会话提交或关闭，事务边界确定后才把结果放入共享缓存，避免传播未提交数据。

2. **一级缓存会不会导致读到旧值？**

   会。同一 SqlSession 生命周期过长、数据库被其他事务修改或使用嵌套查询时都可能复用旧对象；应缩短会话边界，必要时清缓存或使用 STATEMENT 范围。

**易错点：**

- 把一级缓存说成“同一线程缓存”，它实际绑定 SqlSession；线程与会话只是框架集成下可能恰好关联。
- 启用二级缓存后认为所有表更新都会自动失效，忽略 namespace、跨表依赖和多实例一致性边界。

**参考来源：**

- [真实面经线索（题目已改写）：小红书 Java 后端岗位面经转载（牛客）](https://www.nowcoder.com/feed/main/detail/b9a57fd0856149ef87a55f80ade7f8fc)
- [高频题库参考（内容已重写）：JavaGuide：MyBatis 常见面试题](https://javaguide.cn/system-design/framework/mybatis/mybatis-interview.html)
- [技术校准：MyBatis 3：Java API 与 Mapper](https://mybatis.org/mybatis-3/java-api.html)
- [技术校准：MyBatis 3：配置与缓存](https://mybatis.org/mybatis-3/configuration.html)

校验日期：2026-08-06

## Q53：resultMap、懒加载与 N+1 查询是什么关系？

**短回答：**

resultMap 描述列、对象与集合的映射；嵌套查询可懒加载关联数据，却可能随父记录逐条补查而形成 N+1。懒加载只延后 SQL，消除 N+1 仍需 JOIN 或批量查询。

**原理：**

- association 映射一对一，collection 映射一对多。
- 嵌套结果用一次 JOIN 组装对象图，id 配置帮助去重。
- 嵌套查询先查父对象，再按外键调用另一条 select。
- 懒加载代理在属性首次访问时触发关联查询。
- JOIN、IN 批查或聚合查询应按结果集大小和分页语义选择。

**代码 / 场景：**

**示例场景：**

- **前提：** 查询 50 个订单后逐个访问 order.items，若每个访问都触发 selectItemsByOrderId，就会产生 51 次 SQL。
- **过程：** 可以改成两次查询：先分页取 50 个订单，再用 WHERE order_id IN (...) 批量取明细并按 order_id 分组；
- **结果：** 这比把大明细表直接 JOIN 后再做错误的内存分页更可控。

**对照结果：** resultMap 描述列、对象与集合的映射；嵌套查询可懒加载关联数据，却可能随父记录逐条补查而形成 N+1。

**补充代码示例：**

把逐订单查询明细改为一次 IN 批查：

```sql
-- 示例重点：用这段最小代码验证“resultMap、懒加载与 N+1 查询是什么关系”
-- 第一步：分页取 50 个订单
SELECT id, user_id FROM orders ORDER BY id DESC LIMIT 50;

-- 不要循环执行 50 次 selectItemsByOrderId
-- 第二步：一次取回全部明细，再按 order_id 在 Java 中分组
SELECT order_id, product_id, quantity
FROM order_item
WHERE order_id IN (101, 102, 103);
```

**对照结果：** 总查询数从 1+N 变成固定的 2；同时保留父表分页，避免一对多 JOIN 造成重复行和分页失真。

**递进追问：**

1. **为什么 JOIN 也不总是优于两次批量查询？**

   一对多 JOIN 会重复父表列并放大结果集，复杂关联还可能形成笛卡尔膨胀；两次批量查询能保留父级分页并控制传输量。

2. **怎样确认线上出现 N+1？**

   按一次请求关联 SQL 追踪，观察同一语句模板是否随父记录数重复执行；结合数据库慢日志、APM span 和集成测试中的查询计数验证。

**易错点：**

- 开启懒加载后就认为性能已优化，实际只是把大量 SQL 推迟到序列化或循环访问阶段。
- 用一条多表 JOIN 解决所有关系，却没有处理重复行、分页失真、结果集膨胀和对象去重。

**参考来源：**

- [真实面经线索（题目已改写）：OPPO Java 后端一二面复盘（牛客）](https://www.nowcoder.com/discuss/411933101142585344)
- [高频题库参考（内容已重写）：JavaGuide：MyBatis 常见面试题](https://javaguide.cn/system-design/framework/mybatis/mybatis-interview.html)
- [技术校准：MyBatis 3：映射 XML](https://mybatis.org/mybatis-3/sqlmap-xml.html)

校验日期：2026-08-06

## Q54：MySQL 主从复制怎样工作，读写分离如何保证读到刚写的数据？

**短回答：**

主库记录 binlog，副本接收并重放事件。复制存在延迟，读写分离默认不保证写后立即可见；关键读取需通过粘主、等待复制位点或超时回主库显式保证。

**原理：**

- 主库提交事务并把变更写入 binlog。
- 副本接收事件写入 relay log，再由应用线程重放。
- 网络、大事务、锁等待和副本负载都会放大延迟。
- 写后读可短暂粘主，或等待副本追到指定 GTID/位点。
- 等待超时应回主库；半同步接收确认不等于副本已执行。

**代码 / 场景：**

**示例场景：**

- **前提：** 用户修改昵称后，响应中记录写入时间或复制位点，接下来数秒的个人资料查询固定路由主库；
- **过程：** 商品推荐仍读副本。
- **结果：** 若订单确认页必须读到刚提交状态，可等待目标副本追到 GTID，超过几十毫秒立即回主库，并监控复制延迟与回退比例。

**对照结果：** 主库记录 binlog，副本接收并重放事件。复制存在延迟，读写分离默认不保证写后立即可见；关键读取需通过粘主、等待复制位点或超时回主库显式保证。

**递进追问：**

1. **主库写成功但副本还没同步时，直接重试读副本有用吗？**

   不可靠，重试可能仍落到落后的副本并放大流量；应绑定明确位点、粘主或直接回主库，并设置等待预算。

2. **半同步复制能否保证读副本立即一致？**

   不能。它通常确认副本已接收日志，而不是每个副本都已执行完成；读请求仍可能落到未追平的副本。

**易错点：**

- 把主从复制描述成实时同步，忽略 relay/apply 阶段、复制延迟和大事务对追赶速度的影响。
- 所有写后读都永久走主库，虽然规避延迟，却失去读扩展价值；应只把关键链路和有限一致性窗口路由到主库。

**参考来源：**

- [真实面经线索（题目已改写）：腾讯二面 Redis 与 MySQL 一致性追问（牛客）](https://www.nowcoder.com/discuss/766955367430438912)
- [高频题库参考（内容已重写）：JavaGuide：MySQL 常见面试题](https://javaguide.cn/database/mysql/mysql-questions-01.html)
- [技术校准：MySQL 8.4：主从复制](https://dev.mysql.com/doc/refman/8.4/en/replication.html)
- [技术校准：MySQL 8.4：通过副本扩展读取](https://dev.mysql.com/doc/refman/8.4/en/replication-solutions-scaleout.html)

校验日期：2026-08-06
