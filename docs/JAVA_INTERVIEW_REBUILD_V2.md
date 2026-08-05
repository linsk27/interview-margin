# Java 高频题库 v2：筛选与迁移记录

校验日期：2026-08-06

## 为什么全量重建

上一版沿用了旧题号与大部分旧标题，只对部分题目做覆盖式改写。这样虽然保住了学习进度，却让数组协变、桥接方法、模块系统、NMT 等低频内容继续占据主列表，并把旧进度错误地映射到了新语义。v2 保留三个题库的 bank ID，但为所有新题使用独立的 `v2` question ID 命名空间；旧题在 SQLite 中归档，不再出现在目录中。

## 准入规则

- Java 基础题：JavaGuide 或小林 Coding 明确收录，并由 Oracle / OpenJDK 资料校准答案。
- Java 后端题：至少一条公开真实面经线索、一条 JavaGuide / 小林 Coding 指南和一条官方技术资料。
- Java + AI 题：优先保留 RAG、Agent、上下文、评测、幻觉、工具调用和流式返回等多来源重复主题；厂商特有实现与传统 JVM 冷门题不进入主线。
- 社区页面只提取“问了什么”及出现频次，答案全部独立撰写；不复制正文，不绕过登录、付费或反爬限制。

## 社区样本频次

以下是 10 篇 2025–2026 年公开个体面经的方向性统计；每篇出现某主题记 1 次，不代表平台总体概率。

| 主题 | 样本出现数 | 处理 |
|---|---:|---|
| MySQL 基础、索引、事务或 SQL | 10 / 10 | 后端主线 |
| JVM、GC、类加载或内存排障 | 8 / 10 | 基础主线 |
| 并发、锁、CAS 或 JMM | 7 / 10 | 基础主线 |
| Redis 基础、缓存、持久化或分布式锁 | 6 / 10 | 后端主线 |
| HashMap、集合或 ConcurrentHashMap | 5 / 10 | 基础主线 |
| 线程池、阻塞队列或拒绝策略 | 5 / 10 | 基础主线 |
| Spring IoC、AOP、Bean、事务或 Boot | 4 / 10 | 后端主线 |
| MQ 可靠性、积压或幂等 | 3 / 10 | 后端高频 |
| 网络、HTTP 或操作系统 | 3 / 10 | 后端通识 |

语言基础在样本中的单独出现次数较少，但通常属于一面门槛题，因此人工保证 OOP、接口与抽象类、重载与重写、异常、String、`== / equals / hashCode` 等概念完整覆盖。

## 公开面经样本

- [科大讯飞 Java 后端一面](https://www.nowcoder.com/discuss/747230985057468416)
- [阿里国际 Java 后端一面](https://www.nowcoder.com/discuss/729707786103214080)
- [腾讯 Java 后端一面](https://www.nowcoder.com/discuss/744849501931790336)
- [百度 Java 后端面经](https://www.nowcoder.com/discuss/795247127986245632)
- [4399 Java 后端一面](https://www.nowcoder.com/discuss/792171066616455168)
- [BOSS 直聘 Java 后端一面](https://www.nowcoder.com/discuss/801379399596535808)
- [OPPO Java 后端一面](https://www.nowcoder.com/discuss/790604494257065984)
- [数字马力 Java 后端面经](https://www.nowcoder.com/discuss/826171566831517696)
- [蚂蚁后端一面（2026）](https://www.nowcoder.com/discuss/873553789842702336)
- [脉脉：阿里 Java 后端面经](https://maimai.cn/article/detail?efid=Ba1fhcvc38EuxMgVAWmZDg&fid=1885619951)

交叉验证：[Java 后端面试官汇总](https://www.nowcoder.com/discuss/864594486704291840)、[小红书 Java 后端岗位面经（发布于牛客）](https://www.nowcoder.com/feed/main/detail/b9a57fd0856149ef87a55f80ade7f8fc)。

## 指南主线

- [JavaGuide：Java 知识体系](https://javaguide.cn/java/)
- [小林 Coding：Java 基础](https://www.xiaolincoding.com/interview/java.html)
- [小林 Coding：Java 集合](https://www.xiaolincoding.com/interview/collections.html)
- [小林 Coding：Java 并发](https://www.xiaolincoding.com/interview/juc.html)
- [小林 Coding：JVM](https://www.xiaolincoding.com/interview/jvm.html)
- [小林 Coding：Spring](https://www.xiaolincoding.com/interview/spring.html)
- [小林 Coding：MySQL](https://www.xiaolincoding.com/interview/mysql.html)
- [小林 Coding：Redis](https://www.xiaolincoding.com/interview/redis.html)

## 小红书读取边界

2026-08-06 使用现有浏览器会话访问“小红书 Java 后端面经”搜索页时，页面要求登录后才能查看搜索结果。因此本轮没有绕过登录或反爬，也没有把搜索引擎转载内容伪装成小红书原帖；只采用能够独立打开并核验的公开来源。
