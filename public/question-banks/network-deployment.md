# 网络、Linux、Nginx 与部署

# 网络分层与传输

## Q1：OSI 七层模型分别是什么？

**短回答：**

物理、数据链路、网络、传输、会话、表示、应用是概念分层；实际互联网常用 TCP/IP 模型，排障重点是每层职责与边界。

**原理：**

- OSI 从低到高是物理层、数据链路层、网络层、传输层、会话层、表示层和应用层。
- 它首先是一套职责边界，不应机械地等同于七个独立进程：以访问 HTTPS 为例，以太网或 Wi-Fi 承载帧，IP 负责跨网段寻址，TCP 提供有序字节流，TLS 完成加密与身份认证，HTTP 表达应用语义；TLS 和 HTTP 在 OSI 教学模型中会横跨表示、会话、应用层。
- 互联网工程更常用链路层、网际层、传输层、应用层的 TCP/IP 模型。排障价值在于逐层建立证据：链路是否 up、ARP/邻居是否可达、路由是否选择正确、端口是否完成握手、TLS 是否通过证书校验、HTTP 是否返回预期内容，上一层失败前不要先猜下一层业务代码。

**代码 / 场景：**

访问 `api.example.com` 超时时，可以先解析一次地址，再让路由检查和 HTTPS 请求都使用这一个地址，避免“查的是 A 地址、请求却走 B 地址”。

~~~bash
target_host=api.example.com
target_ip=$(getent ahostsv4 "$target_host" | awk 'NR == 1 { print $1 }')
test -n "$target_ip" || { echo "DNS 未返回 IPv4 地址"; exit 1; }

ip link show                                      # 链路层：接口是否 UP
ip route get "$target_ip"                         # 网络层：这次目标的出口、下一跳和源地址
ss -tn state established                          # 传输层：是否已有 TCP 连接
curl -v --connect-timeout 3 \
  --resolve "$target_host:443:$target_ip" \
  "https://$target_host/health"                  # TLS/HTTP：强制使用同一个 IP，仍保留正确 SNI
~~~

`ip route get` 成功但 curl 报 `Connection refused`，说明 IP 路径大体可达、目标端口主动拒绝；若 TLS 已协商而 `/health` 返回 503，则应转向代理或应用层，而不是继续修改网卡。

**递进追问：**

1. **为什么实际排障通常不用严格走完七层？**

   因为互联网协议栈并非逐项实现 OSI 七层，工程上会选择能快速切分故障域的观测点，例如 DNS、路由、TCP、TLS、HTTP；模型用于定位边界，不是要求固定执行七条命令。

2. **DNS 属于哪一层，解析成功能证明服务可用吗？**

   DNS 是应用层协议，通常使用 UDP 或 TCP 53 端口。解析成功只证明拿到了地址，不能证明到该地址的路由、端口、证书或 HTTP 应用均正常。

**易错点：**

- 把 HTTPS 简单标成“会话层协议”并忽略其在真实 TCP/IP 栈中的位置，会让排障步骤脱离可观测事实。
- 能 ping 通只说明特定 ICMP 路径可能可用，不能据此断言目标 TCP 443 端口、TLS 证书和 HTTP 路由都正常。

**参考来源：**

- [IETF RFC 1122：互联网主机通信层要求](https://datatracker.ietf.org/doc/html/rfc1122)
- [ISO：OSI 基本参考模型 ISO/IEC 7498-1](https://www.iso.org/standard/14256.html)

校验日期：2026-07-20

## Q2：TCP 和 UDP 的核心区别是什么？

**短回答：**

TCP 提供面向连接的可靠有序字节流与拥塞控制，UDP 提供无连接数据报且不保证到达顺序，应用可自行构建可靠性。

**原理：**

- TCP 是面向连接、可靠、有序的双向字节流：握手后用序列号、累计确认、重传、接收窗口和拥塞窗口控制发送，应用看不到原始报文边界；一个字节丢失会阻塞其后的有序交付。
- UDP 是无连接的数据报服务，每次发送保留消息边界，首部只有源/目的端口、长度和校验和等基本字段，不保证到达、顺序、去重或拥塞控制。所谓“UDP 更快”不是无条件结论：它只是内核协议机制更少，若应用需要可靠性、重排、拥塞控制和连接迁移，就必须自己实现或采用 QUIC。
- 选择依据应是语义：文件与普通 HTTP 需要完整有序，实时音视频常宁可丢失过期包也不等待重传。

**代码 / 场景：**

在测试机上可用网络仿真比较两种协议面对丢包时的表现，操作前确认接口只承载测试流量。

~~~bash
sudo tc qdisc add dev lo root netem loss 10%
iperf3 -s &
iperf3 -c 127.0.0.1 -t 5       # TCP 会重传并调整拥塞窗口
iperf3 -c 127.0.0.1 -u -b 20M -t 5  # UDP 报告丢包/乱序，不重传
sudo tc qdisc del dev lo root
~~~

比较 TCP 的 retransmits 与 UDP 的 Lost/Total Datagrams，而不是只比较吞吐；后者可能显示更高发送速率，却已经缺少业务数据。

**递进追问：**

1. **为什么 DNS 通常用 UDP，但有时切换到 TCP？**

   普通查询响应较小，UDP 可省去连接握手；响应被截断、区域传送或策略要求时会使用 TCP，从而可靠传递较大的 DNS 消息。

2. **UDP 是否完全没有连接概念？**

   协议本身没有握手和连接状态，但操作系统可以对 UDP socket 调用 connect 固定默认对端并过滤错误；这仍不产生 TCP 那样的可靠传输状态机。

**易错点：**

- 把 UDP 直接等同于低延迟会忽略应用层重传、FEC、拥塞控制和 NAT 保活成本，最终实现可能比 TCP 更复杂。
- TCP 的一次 write 不对应接收端一次 read；若把 TCP 当成保留报文边界的数据报协议，解析必然在分片或合并时出错。

**参考来源：**

- [IETF RFC 9293：Transmission Control Protocol](https://datatracker.ietf.org/doc/html/rfc9293)
- [IETF RFC 768：User Datagram Protocol](https://datatracker.ietf.org/doc/html/rfc768)

校验日期：2026-07-20

## Q3：TCP 三次握手为什么需要三次？

**短回答：**

双方要确认彼此发送和接收能力并同步初始序列号；第三次确认让服务端知道客户端已收到服务端序列号。

**原理：**

- 三次握手同步双方的初始序列号并确认双向收发能力。客户端从 CLOSED 进入 SYN-SENT，发送 `SYN, seq=x`；
- 服务端在 LISTEN 收到后进入 SYN-RECEIVED，回复 `SYN+ACK, seq=y, ack=x+1`，既确认客户端序列号又公布自己的序列号；
- 客户端再发 `ACK, ack=y+1` 并进入 ESTABLISHED，服务端收到第三次确认后才同样进入 ESTABLISHED。只有两次时，服务端不知道自己的 SYN 是否被客户端接收，延迟到达的旧 SYN 还可能让服务端错误地保留连接资源。
- 第三次不是为了“凑次数”，而是确认服务端到客户端这条方向及其序列空间已经生效；SYN 中还会协商 MSS、窗口扩大、SACK 等选项。

**代码 / 场景：**

在服务端抓取一个新连接，可以直接核对标志位、序列号和确认号；`-S` 保留绝对序列号便于学习。

~~~bash
sudo tcpdump -ni any -S "tcp port 443 and (tcp[tcpflags] & (tcp-syn|tcp-ack) != 0)"
# 198.51.100.8.53000 > 203.0.113.10.443: Flags [S],  seq 1000
# 203.0.113.10.443 > 198.51.100.8.53000: Flags [S.], seq 7000, ack 1001
# 198.51.100.8.53000 > 203.0.113.10.443: Flags [.],  ack 7001
~~~

若只看到 SYN 重复而没有 SYN+ACK，优先查路由、防火墙或监听；看到 SYN+ACK 重传却无最终 ACK，故障多在返回路径或客户端侧过滤。

**递进追问：**

1. **第三次 ACK 可以携带应用数据吗？**

   普通 TCP 允许第三个报文在确认服务端 SYN 的同时携带数据；但应用何时发送还受 API、TLS 握手以及 TCP Fast Open 等机制影响。

2. **服务端大量处于 SYN-RECEIVED 说明什么？**

   说明服务端发送了 SYN+ACK 却迟迟收不到最终 ACK，可能是回程网络故障、SYN flood 或半连接队列压力，应结合抓包、队列计数和 SYN cookie 指标判断。

**易错点：**

- 把三次握手解释成双方各发送一次再额外确认一次，遗漏了两个独立初始序列号及其确认关系。
- 仅凭应用日志没有“连接建立”记录就判断 SYN 未到达不可靠，半连接阶段通常尚未被 accept，必须结合 ss、内核计数或抓包。

**参考来源：**

- [IETF RFC 9293：TCP Connection Establishment](https://datatracker.ietf.org/doc/html/rfc9293#section-3.5)
- [IETF RFC 4987：TCP SYN Flooding Attacks and Mitigations](https://datatracker.ietf.org/doc/html/rfc4987)

校验日期：2026-07-20

## Q4：TCP 四次挥手为什么常见？

**短回答：**

TCP 全双工两方向独立关闭，一方 FIN 只表示不再发送，对端可先 ACK 后处理完剩余数据再发送自己的 FIN。

**原理：**

- TCP 是全双工字节流，两个发送方向必须分别关闭，因此 FIN 与对端 FIN 的确认在语义上是两件事。主动关闭方发送 FIN 后进入 FIN-WAIT-1，对端确认后进入 FIN-WAIT-2；
- 被动方收到 FIN 只表示“对方不会再发送”，本方仍可把缓冲区中的响应写完，所以先进入 CLOSE-WAIT 并单独回复 ACK。等应用调用 close 或 shutdown 关闭自己的发送方向后，它才发送 FIN、进入 LAST-ACK；
- 主动方确认该 FIN 后进入 TIME-WAIT。若被动方没有剩余数据并立即关闭，ACK 和 FIN 可以合并在一个报文中，抓包可能只出现三个报文，因此“四次”是常见状态转换而非固定包数。半关闭能力正是 FIN 必须分方向处理的原因。

**代码 / 场景：**

出现连接迟迟不释放时，先按 TCP 状态判断是哪一端没有完成应用动作，再抓取 FIN/ACK 证实。

~~~bash
ss -tanp state close-wait    # 本机已收到 FIN，但进程尚未关闭本端
ss -tanp state fin-wait-2    # 本机 FIN 已确认，等待对端自己的 FIN
sudo tcpdump -ni any "tcp port 8080 and (tcp[tcpflags] & tcp-fin != 0)"
~~~

若大量 `CLOSE-WAIT` 都属于同一 PID，通常是该进程未在 EOF/异常路径关闭 socket；调小系统超时并不能修复应用的文件描述符泄漏。

**递进追问：**

1. **close 与 shutdown(SHUT_WR) 有什么差别？**

   shutdown(SHUT_WR) 只关闭发送方向并发出 FIN，仍可继续读取对端数据；close 释放文件描述符引用，最后一个引用关闭时才真正结束 socket。

2. **为什么会长期出现 CLOSE-WAIT？**

   内核已经把对端 FIN 通知给应用，但应用没有执行关闭，常见于异常分支漏掉资源清理或阻塞逻辑；责任在本机应用而非远端重传。

**易错点：**

- 认为任何 TCP 关闭都必须在抓包中看到恰好四个报文是错误的，ACK 与 FIN 可以合并，RST 也可能直接中止连接。
- 发现 CLOSE-WAIT 后盲目修改 tcp_fin_timeout 方向错误，该参数不能替代拥有 socket 的进程调用 close。

**参考来源：**

- [IETF RFC 9293：TCP Connection Termination](https://datatracker.ietf.org/doc/html/rfc9293#section-3.6)
- [Linux man-pages：shutdown(2)](https://man7.org/linux/man-pages/man2/shutdown.2.html)

校验日期：2026-07-20

## Q5：TIME_WAIT 的作用是什么？

**短回答：**

主动关闭方等待足够时间让旧报文过期，并可重发最后 ACK，避免同四元组新连接收到历史报文。

**原理：**

- TIME-WAIT 通常出现在主动关闭且发送最后 ACK 的一端，它至少解决两个问题。第一，如果最后 ACK 丢失，对端会重传 FIN，TIME-WAIT 端仍保留连接状态，能够再次确认，而不是回 RST；
- 第二，让旧连接中延迟或重复的报文在最大报文生存期范围内消失，避免相同源 IP、源端口、目的 IP、目的端口的后续连接误收历史序列空间的数据。规范采用 2×MSL 的等待思想，因为一个旧报文及其响应都需要衰减时间。
- TIME-WAIT 本身不是内存泄漏，但高并发短连接会占用临时端口和连接表；优先通过连接复用、HTTP/2、合理端口范围和架构分散解决，而非跳过协议安全边界。

**代码 / 场景：**

先确认数量、四元组和谁是主动关闭方，再决定是否真有临时端口压力。

~~~bash
ss -tan state time-wait | head
ss -tan state time-wait | wc -l
cat /proc/sys/net/ipv4/ip_local_port_range
ss -s
~~~

若大量记录的本地端口是随机高端口、远端都是同一 API，说明本机客户端频繁主动关闭；启用客户端连接池后再比较 TIME-WAIT 数量和请求延迟，比直接缩短等待时间更安全。

**递进追问：**

1. **服务端也会出现 TIME-WAIT 吗？**

   会。TIME-WAIT 取决于哪一端执行主动关闭，而不固定属于客户端；若服务端先发送 FIN，例如主动超时断开，它也可能进入该状态。

2. **TIME-WAIT 多就一定性能差吗？**

   不一定，它是正常协议状态。只有临时端口耗尽、连接表压力或新建连接失败等指标同时出现时，才构成需要处理的容量问题。

**易错点：**

- 看到 TIME-WAIT 数量大就把它称为 socket 泄漏不准确；泄漏更常见于进程仍持有 ESTABLISHED 或 CLOSE-WAIT 描述符。
- 在不了解 NAT、负载均衡和内核版本语义时强行复用旧四元组，可能让延迟报文污染新连接或造成难复现的重置。

**参考来源：**

- [IETF RFC 9293：TIME-WAIT State](https://datatracker.ietf.org/doc/html/rfc9293#section-3.6.1)
- [Linux man-pages：tcp(7)](https://man7.org/linux/man-pages/man7/tcp.7.html)

校验日期：2026-07-20

## Q6：TCP 如何保证可靠传输？

**短回答：**

通过序列号、确认、校验、重传、滑动窗口和拥塞控制；可靠指字节流交付，不表示应用业务一定成功。

**原理：**

- TCP 的可靠性是“把对端发送的字节按序、无重复地交给应用”，由多种机制共同完成。发送字节带序列号，接收方用 ACK 表示下一个期望序号；报文段校验和发现传输损坏，乱序数据可暂存，缺口通过重传超时、重复 ACK 和选择确认 SACK 触发重传。
- 发送窗口不能超过接收方通告的 rwnd，同时拥塞控制维护 cwnd，实际可在途数据受两者较小值限制。往返时间用于动态估计重传定时器，指数退避避免故障路径上持续轰炸。
- 可靠传输不等于业务成功：ACK 只说明字节到达对端 TCP 栈，不能证明数据库已提交，支付等业务仍需应用级请求 ID、确认和幂等。

**代码 / 场景：**

在隔离测试环境注入丢包，并观察发送连接的重传、拥塞窗口与 RTT 变化。

~~~bash
sudo tc qdisc add dev eth0 root netem loss 3% delay 40ms
curl -o /dev/null http://test-origin.example/large.bin &
ss -ti dst 203.0.113.20   # 观察 cwnd、rtt、retrans 等字段
sudo tc qdisc del dev eth0 root
~~~

抓包会看到某个序列区间缺失后被再次发送；curl 最终文件仍完整，但耗时上升。测试结束必须删除 qdisc，且不要在共享生产接口直接注入丢包。

**递进追问：**

1. **收到 TCP ACK 是否说明业务处理成功？**

   不是。ACK 最多表明相应字节已被对端 TCP 接收，应用可能尚未读取、校验或提交事务；业务成功必须由应用层响应或可查询状态确认。

2. **SACK 相比累计 ACK 解决什么问题？**

   累计 ACK 只能指出连续收到的末端，SACK 还能报告后面已收到的离散区间，使发送端只重传真正缺失的数据而不必重复发送整个窗口。

**易错点：**

- 把 TCP 可靠性理解为“消息恰好处理一次”会遗漏应用崩溃、响应丢失和客户端重试，业务仍需要幂等键与去重。
- 只把超时重传当成丢包信号过于简单，乱序、ACK 丢失、路径变化和拥塞也会影响重传与 RTT 估计。

**参考来源：**

- [IETF RFC 9293：TCP Functional Specification](https://datatracker.ietf.org/doc/html/rfc9293)
- [IETF RFC 2018：TCP Selective Acknowledgment Options](https://datatracker.ietf.org/doc/html/rfc2018)

校验日期：2026-07-20

## Q7：拥塞控制和流量控制有什么区别？

**短回答：**

流量控制按接收端窗口防止压垮对端，拥塞控制按网络反馈调整发送速率，保护路径中的共享网络。

**原理：**

- 流量控制保护接收端：接收方根据缓冲区剩余容量在 ACK 中通告接收窗口 rwnd，窗口为零时发送方暂停并通过窗口探测等待恢复，避免快速发送者压垮慢速消费者。
- 拥塞控制保护共享网络路径：发送方维护拥塞窗口 cwnd，根据 ACK、丢包、ECN 和 RTT 等信号执行慢启动、拥塞避免、快速重传/恢复，避免路由器队列持续溢出。发送方在途未确认数据通常受 `min(rwnd, cwnd)` 限制，因此吞吐低时要区分是哪一个窗口成为瓶颈。
- rwnd 小常指向接收应用读取慢或缓冲不足；cwnd 收缩常指向路径丢包、拥塞或初始慢启动，两者的责任域和调优方法完全不同。

**代码 / 场景：**

Linux 的 `ss -ti` 能同时看到拥塞信息与接收窗口缩放，结合抓包可判定瓶颈。

~~~bash
ss -ti dst 203.0.113.30
# cubic wscale:7,7 rto:220 rtt:18/3 cwnd:4 bytes_acked:... retrans:0/6
sudo tcpdump -ni eth0 -vv "host 203.0.113.30 and tcp"
~~~

若 ACK 通告 `win 0`，应检查接收进程为何不读数据；若 rwnd 充足但 cwnd 在丢包后降到 4，则应查路径拥塞或丢包，增加接收缓冲不会解决后者。

**递进追问：**

1. **接收窗口为零后连接会永久卡住吗？**

   不会立即永久卡住。发送方会发送零窗口探测，接收方缓冲释放后通告非零窗口；但应用长期不读取仍会让连接持续停顿。

2. **为什么高带宽高 RTT 链路需要较大的窗口？**

   在途数据上限必须覆盖带宽时延积才能填满链路，rwnd 或 cwnd 太小都会让发送方在每个 RTT 等待确认，无法利用全部带宽。

**易错点：**

- 看到 TCP 速度慢就只调大系统接收缓冲，若真正限制是 cwnd、丢包或应用生成速度，改动不会带来预期收益。
- 把 iowait 或接收应用停顿误判为网络拥塞，会让团队在链路上调参却忽略零窗口和进程读取延迟的证据。

**参考来源：**

- [IETF RFC 9293：TCP Flow Control](https://datatracker.ietf.org/doc/html/rfc9293)
- [IETF RFC 5681：TCP Congestion Control](https://datatracker.ietf.org/doc/html/rfc5681)

校验日期：2026-07-20

## Q8：粘包为什么不是 TCP 的错误？

**短回答：**

TCP 只提供连续字节流，不保留应用 write 边界；应用协议必须用长度字段、分隔符或固定长度完成消息帧解析。

**原理：**

- TCP 的契约是有序字节流，不保留应用每次 `write` 的调用边界。发送端可能因缓冲、分段、Nagle 或网卡卸载把一次写拆成多个段，也可能把多次小写合并；接收端 `read` 只返回当时可用的若干字节，因此一次可能拿到半条消息、恰好一条或多条消息。
- “粘包”只是应用把字节流误当消息流后的现象，不是 TCP 破坏了数据。协议必须自行定义帧：固定长度、分隔符、长度前缀，或像 HTTP 那样以头字段和编码规则界定边界。解析器还应增量缓存、循环消费完整帧、保留尾部残片，并限制声明长度，防止恶意长度导致内存耗尽。

**代码 / 场景：**

下面的长度前缀解码器无论一个 chunk 含半帧还是多帧，都只在收齐完整载荷后交付消息。

~~~js
let pending = Buffer.alloc(0)
socket.on("data", chunk => {
  pending = Buffer.concat([pending, chunk])
  while (pending.length >= 4) {
    const size = pending.readUInt32BE(0)
    if (size > 1024 * 1024) return socket.destroy(new Error("frame too large"))
    if (pending.length < 4 + size) break
    handleMessage(pending.subarray(4, 4 + size))
    pending = pending.subarray(4 + size)
  }
})
~~~

测试时应分别把同一帧切成多个 chunk、把三帧放进一个 chunk，并断言输出消息顺序和内容完全相同。

**递进追问：**

1. **关闭 Nagle 算法能解决粘包吗？**

   不能。TCP 仍是字节流，网络分段、接收缓冲和 read 时机都可改变边界；TCP_NODELAY 只影响小包发送时机，不提供消息帧语义。

2. **用换行符分帧时还要考虑什么？**

   载荷中的换行必须转义或禁止，解析器要限制单帧最大长度并处理跨 chunk 的分隔符，否则可能产生歧义或无限缓存攻击。

**易错点：**

- 假设 socket 的一次 data 回调对应发送方一次 write，在本机小流量测试可能碰巧成立，上线后会因分片和合并随机失败。
- 采用长度前缀却不校验最大长度，会让攻击者声明超大帧并迫使服务端持续缓存，形成直接的内存拒绝服务。

**参考来源：**

- [IETF RFC 9293：TCP 提供可靠字节流服务](https://datatracker.ietf.org/doc/html/rfc9293)
- [IETF RFC 9112：HTTP/1.1 Message Body Length](https://datatracker.ietf.org/doc/html/rfc9112#section-6)

校验日期：2026-07-20

# HTTP、TLS 与实时通信

## Q9：HTTP 为什么称为无状态协议？

**短回答：**

每个请求本身不要求服务器记住前一次请求，登录状态由 Cookie、令牌或服务器 Session 等应用机制补充。

**原理：**

- HTTP 的“无状态”指协议不要求服务器为了理解当前请求而记住先前请求：方法、目标 URI、头字段和消息体应提供完成本次处理所需的语义。它不表示系统中不能有状态，也不表示 TCP 连接、缓存或认证上下文不存在。
- 网站登录通常由客户端 Cookie 或 Authorization 携带会话标识，服务端再到 Session 存储读取用户状态；无状态令牌则把部分声明放入签名令牌。无论哪种方案，状态都是应用在 HTTP 之上显式建立的。负载均衡时，如果状态只保存在单机内存，就需要粘性会话；
- 把会话放在共享存储或让请求携带可验证凭证，任一健康实例才可独立处理请求。

**代码 / 场景：**

用 curl 的 Cookie jar 可以观察应用如何在两个彼此独立的 HTTP 请求间显式传递会话标识。

~~~bash
curl -i -c cookies.txt -X POST https://app.example.com/login \
  -d "username=linda&password=example"
# 响应：Set-Cookie: sid=abc123; HttpOnly; Secure; SameSite=Lax
curl -i -b cookies.txt https://app.example.com/profile
# 请求：Cookie: sid=abc123；服务端据此加载会话
~~~

删除 `cookies.txt` 后再次访问 profile 应得到 401；这说明第二次请求不会天然继承第一次登录，状态来自显式 Cookie，而不是 HTTP 自动记忆。

**递进追问：**

1. **无状态令牌是否意味着服务端完全不存状态？**

   不一定。注销列表、密钥轮换、权限变更、刷新令牌和风控仍可能需要服务端状态；“自包含”只说明验证访问令牌时可少查一次会话。

2. **HTTP/2 复用同一连接会破坏无状态吗？**

   不会。连接复用属于传输优化，请求的应用语义仍各自完整；服务器不能仅凭“来自同一连接”就推断是同一登录用户。

**易错点：**

- 把无状态理解成“服务端不能使用数据库或 Session”是概念混淆，真正要求是状态依赖必须通过应用机制明确关联。
- 把用户身份绑定到 TCP 连接会在连接池、HTTP/2 多路复用、代理复用和断线重连时造成越权或身份串线。

**参考来源：**

- [IETF RFC 9110：HTTP Semantics](https://datatracker.ietf.org/doc/html/rfc9110)
- [IETF RFC 6265：HTTP State Management Mechanism](https://datatracker.ietf.org/doc/html/rfc6265)

校验日期：2026-07-20

## Q10：HTTPS 建立连接做了什么？

**短回答：**

因为 HTTP 明文本身不能证明“对面是谁”，也不能防止内容被偷看或篡改，HTTPS 会先通过 TLS 验证服务器身份并协商会话密钥，再传输加密且带完整性校验的 HTTP 数据。

**原理：**

![TCP 建连、TLS 握手与加密 HTTP 数据传输时序图](/content/diagrams/network-deployment/tcp-tls-handshake-v1.svg "先建立可靠传输，再验证身份并协商会话密钥，之后才发送加密应用数据。")

- 因为 TCP 只保证字节尽量可靠、有序地到达，并不验证域名身份，也不加密内容，所以 HTTPS 不能连上 TCP 就直接发送敏感 HTTP，而要先做 TLS 握手，再允许双方交换受保护的应用数据。
- TLS 1.3 客户端在 ClientHello 中给出支持版本、密码套件、随机数、密钥份额、SNI 主机名和 ALPN；服务端用 ServerHello 选择参数并提供自己的密钥份额，双方据此计算共享秘密。
- 随后服务端发送证书链与 CertificateVerify，客户端检查域名、有效期、签名链、用途和信任根；双方用 Finished 校验此前握手 transcript 未被篡改，最后派生方向独立的对称应用数据密钥。证书用于认证身份，真正承载 HTTP 的是高效对称加密；
- SNI 决定多域名证书/站点，ALPN 协商 h2 或 http/1.1。会话恢复可减少往返，但 0-RTT 数据具有重放风险。

**代码 / 场景：**

下面的命令会同时验证 SNI、证书链、协议版本、密码套件和 ALPN，不要使用不带 `-servername` 的结果判断多域名站点。

~~~bash
openssl s_client -connect interview.example.com:443 \
  -servername interview.example.com -alpn "h2,http/1.1" -showcerts </dev/null
# 重点检查：Protocol TLSv1.3、Cipher、ALPN protocol、Verify return code: 0 (ok)
curl -vI https://interview.example.com/
~~~

若 TCP 已连接但证书名称只包含另一个域名，问题在证书/SNI 路由；若校验为 0 而 HTTP 返回 502，TLS 已成功，应继续检查代理到上游。

**递进追问：**

1. **为什么有证书仍需要临时密钥交换？**

   证书主要证明服务端公钥属于该域名，临时 ECDHE 密钥交换用于生成本次会话秘密，并提供前向保密，使长期私钥日后泄露也难以解密旧流量。

2. **TLS 1.3 的 0-RTT 为什么不适合直接提交订单？**

   早期数据可能被网络攻击者重放，协议不能自动保证业务只执行一次；仅应承载可安全重放的读取，写操作还需幂等键或禁用 0-RTT。

**易错点：**

- 只看到浏览器地址栏锁标就认为后端链路也加密不成立，TLS 可能终止于边缘代理，代理到源站是否加密需单独核验。
- 使用 `openssl s_client -connect IP:443` 却不传 SNI，可能拿到默认虚拟主机证书，从而对真实域名配置作出错误结论。

**参考来源：**

- [IETF RFC 8446：The Transport Layer Security Protocol Version 1.3](https://datatracker.ietf.org/doc/html/rfc8446)
- [IETF RFC 5280：Internet X.509 Public Key Infrastructure](https://datatracker.ietf.org/doc/html/rfc5280)

校验日期：2026-07-20

## Q11：HTTP keep-alive 的价值是什么？

**短回答：**

多个请求复用连接，减少 TCP/TLS 握手和慢启动成本；连接池需设置空闲超时和最大连接数。

**原理：**

- 持久连接允许多个 HTTP 请求复用已经建立的 TCP/TLS 连接，省去重复握手、证书验证和 TCP 慢启动，尤其能降低高 RTT 网络上的首包延迟。HTTP/1.1 默认使用持久连接，但同一连接上的响应必须正确界定长度；通常顺序发送，流水线因队头阻塞和兼容性很少使用。
- HTTP/2 在一个连接上以流多路复用，仍共享底层 TCP 的丢包影响。客户端连接池必须限制每个源的连接数、空闲时间和最大寿命；服务端/代理也要设置 keepalive timeout、请求上限和优雅关闭。
- 无限保留会占用文件描述符和内存，过短则让握手成本重新出现，合理值应由请求频率、并发和发布策略决定。

**代码 / 场景：**

用 curl 在同一次调用中请求两个资源，并从详细日志确认第二个请求复用了连接。

~~~bash
curl -sv -o /dev/null https://app.example.com/health \
  --next -o /dev/null https://app.example.com/version 2>&1 | grep -E "Connected|Re-using"
ss -tn dst :443
# Nginx 示例：keepalive_timeout 30s; keepalive_requests 1000;
~~~

日志应出现一次 Connected 和后续 Re-using existing connection。若每个请求都重新连接，要检查客户端是否复用同一个连接池、响应是否正确给出长度，以及服务端是否发送 `Connection: close`。

**递进追问：**

1. **keep-alive 与 TCP keepalive 是同一件事吗？**

   不是。HTTP keep-alive 表示复用连接处理多个请求；TCP keepalive 是长时间空闲后用探测报文发现失效对端，两者的层次、目的和超时均不同。

2. **为什么发布时长连接会让旧实例迟迟不退出？**

   已有连接可能继续承载请求或实时流。优雅发布应先摘流、停止接受新连接，再设置最大排空时间并让客户端在连接关闭后重连。

**易错点：**

- 把连接池设成无上限会在上游变慢时迅速消耗客户端临时端口、服务端文件描述符和代理 worker 连接。
- 只在请求头手工添加 `Connection: keep-alive` 并不等于真正复用；客户端必须复用同一池，响应分帧和双方超时也要匹配。

**参考来源：**

- [IETF RFC 9112：HTTP/1.1 Persistent Connections](https://datatracker.ietf.org/doc/html/rfc9112#section-9.3)
- [IETF RFC 9113：HTTP/2](https://datatracker.ietf.org/doc/html/rfc9113)

校验日期：2026-07-20

## Q12：SSE 断线续传如何实现？

**短回答：**

服务端为事件设置递增 id，客户端重连携带 Last-Event-ID，服务端从可保留的事件位置继续或明确要求重新同步。

**原理：**

- SSE 的响应使用 `text/event-stream`，服务端用空行分隔事件，可为每条事件发送 `id:`。浏览器接收后保存最近一次事件 ID；连接异常关闭时会按 `retry:` 或实现策略重连，并在新请求中发送 `Last-Event-ID`。
- 服务端必须把 ID 映射到可重放的持久事件序列，例如数据库自增游标或消息日志 offset，然后只返回该 ID 之后的事件。协议字段只是游标传递机制，并不会替你保存历史；当游标过旧已超出保留窗口时，应明确发送需要全量同步的业务事件或返回约定错误，而不是静默从最新位置开始。
- ID 要稳定且单调，客户端处理还应幂等，因为断线边界可能导致重复交付。代理需禁用响应缓冲并延长读超时。

**代码 / 场景：**

假设客户端已处理到 1042，可用 curl 模拟重连，并验证服务端从 1043 开始输出。

~~~bash
curl -N -H "Accept: text/event-stream" \
  -H "Last-Event-ID: 1042" https://app.example.com/api/events
# id: 1043
# event: annotation.updated
# data: {"questionId":"q7","version":3}
# （随后一个空行结束事件）
~~~

测试还应在发送 data 后、客户端确认处理前强制断网，重连后即使重复收到 1043，也必须靠事件 ID 或版本号避免重复写入。

**递进追问：**

1. **只发送递增 id 就能保证不丢事件吗？**

   不能。服务端还要持久保存 ID 对应的事件并按 Last-Event-ID 查询；若事件只存在进程内存，重启或切换实例后仍会丢失续传位置。

2. **多实例部署时 SSE 游标如何保持一致？**

   事件日志和游标语义应放在共享数据库或消息系统中，任一实例都能按 ID 回放；不要把续传依赖绑定到某台机器的本地数组。

**易错点：**

- 把数组下标当永久事件 ID 会在压缩、删除或进程重启后发生漂移，客户端可能重复或跳过业务事件。
- 只设置 `Content-Type: text/event-stream` 却保留 Nginx 缓冲，会让事件在代理攒成大块后才到浏览器，表现成“断流”。

**参考来源：**

- [WHATWG HTML：Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Nginx 官方文档：ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

校验日期：2026-07-20

## Q13：WebSocket 握手后为何不再是普通 HTTP？

**短回答：**

先通过 HTTP Upgrade 协商，成功后在同一 TCP 连接上传输 WebSocket 帧，消息、心跳和鉴权续期由应用协议处理。

**原理：**

- 经典 RFC 6455 WebSocket 握手从 HTTP/1.1 Upgrade 请求开始，以复用现有 80/443 端口和代理能力。
- 客户端发送 `Upgrade: websocket`、`Connection: Upgrade`、随机 `Sec-WebSocket-Key` 和版本；服务端用 GUID 对 key 计算摘要并返回 101 与 `Sec-WebSocket-Accept`。
- 101 之后，该连接切换为 WebSocket 帧协议。
- 现代协议还允许用 HTTP/2 extended CONNECT（RFC 8441）或 HTTP/3 extended CONNECT（RFC 9220）在单独流上引导 WebSocket，此时没有 HTTP/1.1 的 101/Upgrade 形式，其他流仍可承载 HTTP。
- 无论握手载体如何，WebSocket 数据都按 opcode、长度、FIN、掩码、ping/pong 和 close 帧解释；初始认证也不能替代长连接期间的消息级授权、过期处理、背压和重连。

**代码 / 场景：**

可手工检查升级响应；`Sec-WebSocket-Key` 必须是 16 字节随机值的 Base64，下面仅用于诊断。

~~~bash
curl --http1.1 -i https://ws.example.com/socket \
  -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ=="
# 预期：HTTP/1.1 101 Switching Protocols 与 Sec-WebSocket-Accept
~~~

若返回 200 HTML，通常是 Upgrade 头未被代理转发或路由落到普通页面；返回 101 后再用 curl 当普通 HTTP 读取并不能正确解析 WebSocket 帧。

**递进追问：**

1. **WebSocket 连接建立后还能发送新的 HTTP 请求吗？**

   经典 HTTP/1.1 升级后不能在该 TCP 连接上继续混用普通 HTTP 消息；HTTP/2/3 extended CONNECT 只占一个流，其他流仍可承载 HTTP，但 WebSocket 所在流内仍只能传帧。

2. **为什么经典 HTTP/1.1 反向代理必须显式转发 Upgrade 相关头？**

   Upgrade 与 Connection 属于逐跳语义，代理不会像普通端到端头那样自动透传；缺失时上游只会看到普通 HTTP 请求。HTTP/2/3 则要由代理明确支持 extended CONNECT。

**易错点：**

- 握手时验证过用户后就永久信任整条连接，会忽略账号停用、角色变更和令牌过期，敏感消息仍应重新检查授权。
- 只依赖 ping/pong 而不设置代理 read timeout，Nginx 或负载均衡器仍可能先关闭空闲连接，客户端必须实现退避重连。

**参考来源：**

- [IETF RFC 6455：The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [IETF RFC 8441：Bootstrapping WebSockets with HTTP/2](https://datatracker.ietf.org/doc/html/rfc8441)
- [IETF RFC 9220：Bootstrapping WebSockets with HTTP/3](https://datatracker.ietf.org/doc/html/rfc9220)

校验日期：2026-07-20

# Linux 排障与进程

## Q14：Linux 进程和线程有什么关系？

**短回答：**

线程共享进程地址空间和资源但有独立执行上下文，Linux 内核以 task 调度；多进程隔离更强、通信成本更高。

**原理：**

- Linux 内核把进程和线程都表示为可调度 task，每个 task 有独立的 TID、寄存器、内核栈、调度状态和信号掩码。线程通过 clone 共享地址空间、打开文件表、文件系统上下文和信号处理等资源；
- 同一线程组共享 TGID，用户看到的进程 PID 通常就是线程组长的 TID。多线程通信可直接读写共享内存，成本低但必须同步，任一线程的非法内存访问通常会终止整个进程。多进程拥有独立地址空间，故障隔离更强，需使用管道、socket、共享内存等 IPC。
- 调度器实际按线程分配 CPU，所以定位 CPU 热点必须看 TID，不能只盯进程总百分比。

**代码 / 场景：**

先获得目标 PID，再列出该线程组中每个 TID 的状态、CPU 核和占用，并与 `/proc` 对照。

~~~bash
pid=4242
ps -eLo pid,tid,psr,stat,pcpu,comm | awk -v p="$pid" "$1 == p"
ls /proc/$pid/task
cat /proc/$pid/status | grep -E "^(Pid|Tgid|Threads):"
~~~

若 PID 4242 有 TID 4271 持续占满一个核，采样栈时应针对 4271；只对进程总 CPU 做平均会掩盖单线程死循环。线程数不断增长还需检查线程池上限和未回收 worker。

**递进追问：**

1. **一个线程调用 exec 后会发生什么？**

   成功 exec 会用新程序映像替换进程地址空间，调用线程继续成为新映像，原线程组中的其他线程被终止，因此不能把它当普通线程级函数切换。

2. **线程共享文件描述符意味着什么？**

   一个线程关闭或修改共享描述符可能影响其他线程，引用、关闭顺序和并发 I/O 必须设计清楚；它也使线程间传递已打开资源非常便捷。

**易错点：**

- 认为“一个进程只由调度器调度一次”会误读多核 CPU 数据，Linux 调度实体通常是各个线程 task。
- 多线程共享地址空间不等于读写天然安全，缺少锁、原子或内存顺序会产生竞态、不可见更新和数据结构损坏。

**参考来源：**

- [Linux man-pages：clone(2)](https://man7.org/linux/man-pages/man2/clone.2.html)
- [Linux man-pages：pthreads(7)](https://man7.org/linux/man-pages/man7/pthreads.7.html)

校验日期：2026-07-20

## Q15：线上 CPU 飙高如何排查？

**短回答：**

先确认系统与进程 CPU、负载和核数，再定位线程与调用栈或火焰图，区分计算、死循环、GC 和内核等待。

**原理：**

- 排查要先确认范围和时间，再逐级缩小：用监控、`uptime`、`mpstat` 区分单核打满、整机 user/system 升高、steal 或 iowait；用 `pidstat`/`top` 找到 PID，再切到线程视角找 TID；
- 最后用语言运行时剖析器或 `perf` 采样调用栈。高 user 常见于计算、死循环、正则回溯或频繁 GC，高 system 可能是系统调用、网络包或锁竞争，容器 CPU throttle 还会让应用延迟升高但宿主机未满。
- 应保留发布版本、请求量、GC、错误率等同期证据，并优先做短时低开销采样。找到热点函数后还要用输入和流量复现，不能把“进程 CPU 高”直接等同于代码泄漏。

**代码 / 场景：**

下面是一条从系统到线程再到栈的只读诊断链；生产采样时间应短，并留存原始结果。

~~~bash
uptime; mpstat -P ALL 1 5
pidstat -u -p ALL 1 5
top -H -p 4242                 # 找到高 CPU 的 TID
sudo perf top -p 4242          # 实时查看热点符号
sudo perf record -F 99 -g -p 4242 -- sleep 20
sudo perf report
~~~

若只有 TID 4271 的 user CPU 接近 100%，perf 主要落在 JSON 序列化函数，应结合对应接口流量和大对象输入验证，而不是先重启抹掉现场。

**递进追问：**

1. **CPU 利用率不高但请求仍很慢，应看什么？**

   检查 iowait、不可中断任务、锁等待、容器限额、外部依赖和事件循环延迟；低 CPU 可能代表线程在等待而不是系统健康。

2. **为什么不建议一开始就长时间录制最高频 perf？**

   高频全栈采样会产生额外 CPU、磁盘和数据量，可能放大故障；应先缩小 PID/TID，再以可控频率和短窗口采样并评估开销。

**易错点：**

- 看到 load average 高就直接认定 CPU 算力不足，会漏掉 D 状态 I/O 等待；必须结合 per-CPU 与任务状态。
- 高峰时立即重启虽然可能恢复服务，却丢失线程、栈和输入证据；若容量允许，应先摘除实例并短时采样再重启。

**参考来源：**

- [Linux Kernel 文档：Perf Security](https://docs.kernel.org/admin-guide/perf-security.html)
- [Linux man-pages：perf-record(1)](https://man7.org/linux/man-pages/man1/perf-record.1.html)

校验日期：2026-07-20

## Q16：内存持续增长如何判断泄漏？

**短回答：**

观察 RSS、堆、缓存和 swap 趋势，采集堆快照比较保留对象；Linux page cache 增长不应直接等同应用泄漏。

**原理：**

- 先拆分指标：RSS 是当前驻留物理内存，虚拟地址空间 VIRT 可能包含尚未驻留的映射；语言堆只是 RSS 的一部分，此外还有线程栈、原生库、直接缓冲、mmap 和共享页。Linux page cache 通常可回收，不能只看 `free` 的 used。
- 判断泄漏要观察在相似负载和完整 GC 后，某类不可回收对象或私有脏页是否跨多个周期单调增长；同时看 swap、缺页、OOM 和 cgroup 限额。对托管运行时采集至少两份间隔堆快照，比较 retained size 和引用链；
- 若堆稳定而 RSS 增长，则查看 `/proc/PID/smaps_rollup`、原生分配器、Buffer 与线程数。最终需通过可重复负载验证增长斜率和修复后的平台化。

**代码 / 场景：**

以 PID 4242 为例，先每分钟记录系统与进程分解，再决定是否进入语言堆快照，而不是直接宣判泄漏。

~~~bash
grep -E "^(VmRSS|VmSize|VmSwap|Threads):" /proc/4242/status
cat /proc/4242/smaps_rollup | grep -E "^(Rss|Pss|Private_Dirty|Shared_Clean):"
pmap -x 4242 | tail -n 1
cat /proc/meminfo | grep -E "^(MemAvailable|Cached|SwapFree):"
~~~

若 V8 heapUsed 在强制完整 GC 后回落到稳定基线，但 Private_Dirty 和外部 Buffer 随请求持续上升，应查原生缓冲释放路径，而不是继续扩大 JS 堆。

**递进追问：**

1. **RSS 不下降就一定有泄漏吗？**

   不一定。运行时或 malloc 可能保留已释放页供后续复用，页未归还内核但应用可再次使用；要结合堆基线、私有页和持续负载趋势判断。

2. **为什么要比较 retained size 而不只看对象数量？**

   少量根对象可能通过引用链保留庞大对象图，数量变化很小却占用大量内存；retained size 更能定位移除该引用后可释放的总量。

**易错点：**

- 把 Linux buff/cache 增长直接当应用泄漏，会忽略文件缓存可回收性；应优先看 MemAvailable、内存压力和进程私有页。
- 只采一份堆快照无法证明趋势，还可能把初始化缓存误判为泄漏；至少在可比负载与 GC 边界上做差分。

**参考来源：**

- [Linux Kernel 文档：/proc Filesystem](https://docs.kernel.org/filesystems/proc.html)
- [Node.js 官方诊断：Understanding and Tuning Memory](https://nodejs.org/en/learn/diagnostics/memory/understanding-and-tuning-memory)

校验日期：2026-07-20

## Q17：load average 很高一定是 CPU 不够吗？

**短回答：**

Linux 负载还包含不可中断睡眠任务，可能是磁盘或网络存储 I/O；需结合 CPU 利用率、iowait 和进程状态判断。

**原理：**

- 不一定。Linux load average 统计一段时间内可运行任务以及处于不可中断睡眠的任务数量，后者常见于等待块设备或网络文件系统 I/O。三个值分别是 1、5、15 分钟的指数平滑结果，不是 CPU 百分比。
- 解释时必须结合逻辑 CPU 数：8 核机器 load 8 且 CPU 持续接近满载可能刚好饱和；load 40 但 CPU idle 很高，往往有大量 D 状态任务在等待存储或内核资源。还应检查容器 CPU quota、run queue、iowait、上下文切换和具体等待通道。
- 负载是“排队压力”的信号，不能单独给出扩容 CPU 的结论，根因可能是慢盘、NFS、锁、内存回收或挂起设备。

**代码 / 场景：**

下面组合能区分 CPU 运行队列与不可中断 I/O 队列，并找到阻塞任务。

~~~bash
uptime
nproc
vmstat 1 5                 # 看 r、b、us、sy、id、wa
ps -e -o state,pid,wchan:32,comm | awk "$1 ~ /^D/"
iostat -xz 1 5             # 看设备 await、aqu-sz、%util
~~~

若 load 30、CPU idle 70%、vmstat 的 b 很高，D 状态都停在 `nfs_*` 等待通道，应查 NFS 延迟；此时增加 CPU 核通常没有效果。

**递进追问：**

1. **load 1 在单核和 32 核机器上含义相同吗？**

   绝对任务数相同，但容量占比完全不同：单核可能接近饱和，32 核仅占很小部分；还要看任务是否可运行还是处于 D 状态。

2. **iowait 高是否一定是磁盘坏了？**

   不一定，可能是正常批处理、存储限速、远程盘延迟或请求放大；需结合设备 await、队列、吞吐与具体进程 I/O 证据判断。

**易错点：**

- 把三个 load 数值当作 1、5、15 分钟 CPU 使用率百分比是错误的，它们是经过平滑的任务数量指标。
- 只按 load 大于 CPU 核数触发重启会掩盖存储故障，还可能让重启实例再次同时访问慢存储并形成更大冲击。

**参考来源：**

- [Linux man-pages：proc_loadavg(5)](https://man7.org/linux/man-pages/man5/proc_loadavg.5.html)
- [Linux Kernel 文档：/proc/loadavg](https://docs.kernel.org/filesystems/proc.html)

校验日期：2026-07-20

## Q18：端口无法访问如何分层排查？

**短回答：**

确认进程监听地址与端口，再查本机防火墙、安全组、路由、DNS 和反向代理，分别从服务端与客户端测试连接。

**原理：**

- 应从“进程是否监听”逐层走到客户端，而不是一次性归因于防火墙。服务端先用 `ss` 确认监听端口、地址族和绑定地址：`127.0.0.1:8080` 只能本机访问，`0.0.0.0` 与 `[::]` 的 IPv4/IPv6 行为还受系统设置影响；随后本机 curl 验证应用。
- 再检查主机防火墙、容器端口映射、云安全组和路由。客户端侧先解析 DNS，确认 A/AAAA 是否指向预期地址，再测试 TCP 三次握手；443 端口连通后还要用正确 SNI 验证 TLS 与 HTTP Host 路由。
- 抓包中无 SYN 表示请求未到主机，有 SYN 无 SYN+ACK 指向监听/过滤，有握手但 502 则是代理上游问题。每一步都应保留具体错误码和流量方向。

**代码 / 场景：**

假设公网 `app.example.com:443` 失败、应用本地监听 8080，可按下面顺序切分故障域。

~~~bash
sudo ss -lntp | grep -E ":(443|8080)\b"
curl -sv http://127.0.0.1:8080/health
dig +short A app.example.com; dig +short AAAA app.example.com
ip route get 203.0.113.10
nc -vz -w 3 app.example.com 443
curl -vk --resolve app.example.com:443:203.0.113.10 https://app.example.com/health
~~~

本机 8080 返回 200、公网 TCP 443 超时说明问题在监听 443 或网络边界；若 443 握手成功但返回 Nginx 502，再查看 error.log 与 upstream 地址。

**递进追问：**

1. **Connection refused 与 timeout 通常分别说明什么？**

   refused 通常表示目标可达但端口无人监听或防火墙主动回 RST；timeout 表示报文或响应被丢弃，也可能是路由、ACL、回程路径问题。

2. **为什么只测 IP:443 可能误判 HTTPS？**

   多域名站点依赖 TLS SNI 选择证书、依赖 HTTP Host 选择虚拟主机；直接访问 IP 可能落到默认站点，必须保留真实域名语义。

**易错点：**

- 服务绑定 `127.0.0.1` 时即使进程和端口都存在，其他主机仍无法访问；排查必须读取 Local Address 而非只看端口号。
- 禁用整机防火墙来“验证”会扩大攻击面且混淆规则，应查看命中计数或仅添加精确来源、目标端口的临时诊断规则。

**参考来源：**

- [Linux man-pages：ss(8)](https://man7.org/linux/man-pages/man8/ss.8.html)
- [curl 官方手册：--resolve 与连接诊断](https://curl.se/docs/manpage.html)

校验日期：2026-07-20

# Nginx 与生产部署

## Q19：Nginx 反向代理解决什么问题？

**短回答：**

它接收公网连接并转发到应用，可统一 TLS、静态资源、超时、缓冲、限流、日志和负载均衡。

**原理：**

- 反向代理在客户端和应用之间提供统一入口：它接受公网 TCP/TLS，按主机名和路径选择 upstream，把请求转发给只监听内网或本机端口的应用。这样可集中管理证书、HTTP/2、静态文件、压缩、访问日志、限流、超时、请求体上限、响应缓冲和负载均衡，并在应用滚动发布时切换实例。
- 代理不会自动理解所有应用语义：必须明确 Host、客户端 IP、原始协议、WebSocket Upgrade 等头，合理设置连接/读取/发送超时。502 通常表示 Nginx 无法与上游正确通信，504 表示等待上游超时；
- 这两类错误与应用主动返回的 5xx 应通过 `$upstream_status`、连接日志和 error.log 区分。

**代码 / 场景：**

下面配置把公网 `/api/` 转给本机应用，并记录实际命中的上游、状态和响应时间。

~~~nginx
log_format upstream "$host $request status=$status upstream=$upstream_addr "
                    "us=$upstream_status rt=$request_time urt=$upstream_response_time";
location /api/ {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_connect_timeout 3s;
  proxy_read_timeout 30s;
}
~~~

先执行 `nginx -t`，再 reload，并用 `curl -i https://app.example.com/api/health` 对照 access/error log；不要只看浏览器页面。

**递进追问：**

1. **proxy_pass 末尾斜杠为什么会影响上游路径？**

   带 URI 的 proxy_pass 会按 location 规则替换匹配前缀，不带 URI 时通常传递原始规范化路径；两者混用容易让 `/api/x` 变成 `/x` 或重复前缀。

2. **502 与 504 如何快速区分？**

   502 多见于连接被拒、上游提前关闭或返回无效响应；504 是在配置的等待窗口内未收到结果。应结合 error.log 和 upstream timing，而非只看页面文案。

**易错点：**

- 信任客户端直接传入的 X-Forwarded-For 而不使用 `$proxy_add_x_forwarded_for` 和可信代理边界，会让审计 IP 被伪造。
- 修改配置后不运行 `nginx -t` 就 reload，可能因语法、证书路径或重复监听失败，让计划中的变更根本没有生效。

**参考来源：**

- [Nginx 官方文档：ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Nginx 官方文档：How nginx processes a request](https://nginx.org/en/docs/http/request_processing.html)

校验日期：2026-07-20

## Q20：proxy_buffering 对 SSE 有何影响？

**短回答：**

代理缓冲可能攒满后才发送，破坏实时流；SSE 路由通常关闭缓冲并设置合适读超时，同时发送心跳。

**原理：**

- 开启 `proxy_buffering` 时，Nginx 会尽快从上游读取响应并暂存在内存 buffer，必要时写临时文件，再按自己的节奏发送给慢客户端；这对普通大响应能释放上游连接，却会让 SSE 的小事件在缓冲区积累，用户迟迟看不到实时更新。
- SSE 路由通常应设置 `proxy_buffering off`，上游也可返回 `X-Accel-Buffering: no`，同时保持 `Content-Type: text/event-stream`，避免中间压缩器再次聚合小块。
- `proxy_read_timeout` 计算两次读取之间的间隔，而非整个连接寿命，所以服务端应发送注释心跳防止空闲超时。关闭缓冲会让慢客户端长期占用连接，仍需连接上限、背压、心跳和断线重连策略。

**代码 / 场景：**

只对 SSE location 关闭缓冲，不要为了一个实时接口全局关闭普通响应的代理优化。

~~~nginx
location /api/events {
  proxy_pass http://app_backend;
  proxy_http_version 1.1;
  proxy_buffering off;
  proxy_cache off;
  proxy_read_timeout 75s;
  gzip off;
}
~~~

用 `curl -N https://app.example.com/api/events` 观察每条 `data:` 是否立刻出现；服务端每 20 秒发送 `: heartbeat\n\n`，若 75 秒后仍断开，应继续检查 CDN/隧道的空闲超时。

**递进追问：**

1. **X-Accel-Buffering: no 和配置指令谁更适合？**

   专用 SSE 路由最好在 Nginx 配置中明确关闭，响应头可作为应用按响应控制的补充；还要确认上游或 CDN 没有删除该头或再次缓冲。

2. **为什么已经关闭缓冲仍要发送心跳？**

   关闭缓冲只改变数据转发时机，代理、NAT 和负载均衡器仍会按空闲时间清理连接；注释心跳既维持活动，也便于客户端检测链路。

**易错点：**

- 把 `proxy_read_timeout` 理解成 SSE 总时长会误设超大值；它关注连续两次上游读取的间隔，心跳间隔必须更短。
- 只在应用调用 flush 而忽略 Nginx、压缩和 CDN 缓冲，无法保证浏览器实时收到事件，必须从源站到公网逐跳验证。

**参考来源：**

- [Nginx 官方文档：proxy_buffering](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering)
- [WHATWG HTML：Event Streams](https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation)

校验日期：2026-07-20

## Q21：Nginx 负载均衡有哪些常见策略？

**短回答：**

默认轮询，还可最少连接、IP 哈希和权重；健康检查、超时与会话状态决定实际可用性。

**原理：**

- 默认策略是加权轮询，请求按权重在可用上游间分配；`least_conn` 选择当前活动连接较少的实例，适合请求耗时差异大但连接数能反映压力的场景；`ip_hash` 或一致性 `hash` 可让相同键倾向同一实例，用于有限的会话亲和或缓存命中。
- 权重表达容量差异，`backup` 仅在主节点不可用时接管，`max_fails` 与 `fail_timeout` 提供被动失败判定。算法不能替代健康检查、超时和无状态设计：长连接使“请求数均衡”与“负载均衡”不同，粘性路由会造成热点，进程重启也会改变映射。
- 还应为上游连接启用合理 keepalive，并记录 `$upstream_addr`、状态和耗时验证真实分配。

**代码 / 场景：**

下面给两台容量不同的实例使用 least_conn，并把实际上游写进响应头和日志用于验证。

~~~nginx
upstream interview_api {
  least_conn;
  server 10.0.0.11:3000 weight=2 max_fails=3 fail_timeout=10s;
  server 10.0.0.12:3000 weight=1 max_fails=3 fail_timeout=10s;
  keepalive 32;
}
location /api/ {
  proxy_pass http://interview_api;
  proxy_http_version 1.1;
  proxy_set_header Connection "";
  add_header X-Debug-Upstream $upstream_addr always;
}
~~~

运行多次 `curl -sI https://app.example.com/api/health | grep X-Debug`，确认两台都被命中；再安全摘除一台并观察失败窗口和 5xx。

**递进追问：**

1. **least_conn 为什么不一定代表最小 CPU 负载？**

   连接可能空闲或请求成本差异巨大，一条连接也可能承载重计算；least_conn 只能依据连接计数近似，仍需结合实例指标和容量权重。

2. **有 Session 时一定要使用 ip_hash 吗？**

   不一定。更稳健的方法是把会话放入共享存储或使用可验证令牌；IP 哈希会被 NAT、移动网络和代理影响，并造成扩缩容重映射。

**易错点：**

- 只配置轮询而没有连接、读取超时，故障实例可能长时间拖住请求，算法再公平也无法提供可用性。
- 用客户端 IP 做强会话标识会让共享出口后的大量用户集中到一台实例，也会在用户网络切换时丢失亲和。

**参考来源：**

- [Nginx 官方文档：Using nginx as HTTP load balancer](https://nginx.org/en/docs/http/load_balancing.html)
- [Nginx 官方文档：ngx_http_upstream_module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)

校验日期：2026-07-20

## Q22：静态 SPA 为什么要配置 try_files？

**短回答：**

前端路由路径在服务器没有真实文件，需先尝试文件，失败回退 index.html；API 和静态资源路径应排除回退。

**原理：**

- SPA 的 `/questions/42` 是客户端路由，构建产物中通常没有名为 `questions/42` 的真实文件。用户从首页内跳转时浏览器 JavaScript 接管不会请求服务器，但刷新或直接打开该 URL 会向 Nginx 发起请求；
- 若只按文件系统查找就返回 404。`try_files $uri $uri/ /index.html` 先服务真实资源，找不到时内部回退入口文档，由前端路由解析路径。
- 回退必须限定在前端页面区域：`/api/` 应代理或明确 404，`.js`、图片等缺失静态资源也不应返回 HTML，否则浏览器会以错误 MIME 解析。带内容哈希的资源可长期缓存，`index.html` 应短缓存或不缓存以避免引用已删除旧包。

**代码 / 场景：**

一个安全的最小配置会把 API、静态资源和页面回退分开，并对入口与哈希资源设置不同缓存。

~~~nginx
location /api/ { proxy_pass http://127.0.0.1:3000; }
location /assets/ {
  try_files $uri =404;
  add_header Cache-Control "public, max-age=31536000, immutable";
}
location = /index.html { add_header Cache-Control "no-cache"; }
location / { try_files $uri $uri/ /index.html; }
~~~

发布后验证 `curl -I /questions/42` 返回 HTML 200，而 `curl -I /assets/missing.js` 返回 404、`curl -I /api/missing` 不会回退成首页。

**递进追问：**

1. **为什么所有 404 都回退 index.html 会有问题？**

   缺失脚本、图片和 API 也会得到 200 HTML，监控误判成功，浏览器报 MIME/语法错误，客户端还可能把错误页面当 JSON 解析。

2. **为什么 index.html 不适合长期 immutable 缓存？**

   入口文件包含当前哈希资源名，长期缓存会让用户继续请求已下线的旧资源；应让入口可重新验证，而哈希静态文件长期缓存。

**易错点：**

- 把 `/api` location 放置或匹配错误，导致 API 404 被 SPA 回退吞掉，前端看到 200 HTML 后只报模糊 JSON 解析错误。
- 使用 `error_page 404 /index.html` 全局兜底而不区分资源类型，会掩盖真实静态文件缺失并污染可用性指标。

**参考来源：**

- [Nginx 官方文档：try_files](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)
- [Nginx 官方文档：Location 与请求处理](https://nginx.org/en/docs/http/request_processing.html)

校验日期：2026-07-20

## Q23：Cloudflare Tunnel 的工作原理是什么？

**短回答：**

本机 cloudflared 主动建立到 Cloudflare 的出站隧道，公网主机名流量经边缘转入本地服务，无需开放家庭网络入站端口。

**原理：**

![浏览器、Cloudflare 边缘、cloudflared 与本地服务之间的流量路径图](/content/diagrams/network-deployment/cloudflare-tunnel-v1.svg "连接器主动建立出站隧道；公网请求经边缘路由到本地服务，无需开放家庭入站端口。")

- `cloudflared` 在源站网络内主动向 Cloudflare 边缘建立多条长连接，因方向是出站，家庭路由器或主机无需把 80/443 入站端口暴露公网。公网主机名的 DNS 指向某个 Tunnel 标识；
- 请求先到 Cloudflare 边缘，边缘根据主机名和隧道路由选择在线 connector，再沿已有连接转发到配置的本地 URL，例如 `http://127.0.0.1:3000`。
- 隧道只提供到源站的传输路径，不会让错误的本地端口自动可用：边缘找不到在线 connector 常表现为 1033，connector 在线却连不上本地服务则常表现为 502。高可用可运行多个同 Tunnel connector，凭据必须当密钥保护；
- 公网 TLS、Access 策略和源站协议仍要分别配置和验证。

**代码 / 场景：**

排查时按“本地源站→connector→公网边缘”顺序验证，能快速区分 502 与 1033。

~~~bash
curl -sv http://127.0.0.1:3000/health
cloudflared tunnel list
cloudflared tunnel info interview-tunnel
cloudflared --config /etc/cloudflared/config.yml tunnel run interview-tunnel
curl -sv https://interview.example.com/health
~~~

若本地 200、tunnel info 没有活跃 connector，修复服务/凭据与进程自启动；若 connector 在线但日志报 `connect: connection refused`，核对 ingress 的 service 端口和地址族。

**递进追问：**

1. **为什么 Tunnel 不需要公网固定 IP？**

   connector 主动连接 Cloudflare，边缘通过已建立的隧道回送请求；源站公网地址变化或位于 NAT 后，不影响 DNS 继续指向 Tunnel 标识。

2. **运行两个 cloudflared 会重复处理同一请求吗？**

   同一 Tunnel 的多个 connector 用于冗余和分配流量，边缘为每个请求选择一条可用连接，不会正常地把同一 HTTP 请求广播执行两次。

**易错点：**

- 把 Tunnel JSON 凭据提交到 Git 或发到聊天中等同泄露接入能力，应限制文件权限、使用密钥管理并在泄露后轮换。
- 看到 Cloudflare 错误页就只改 DNS 会走错方向：1033 要查 connector 可达性，502 还要查 cloudflared 到本地 service。

**参考来源：**

- [Cloudflare 官方文档：Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [Cloudflare 官方文档：Tunnel availability and failover](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/tunnel-availability/)

校验日期：2026-07-20

## Q24：HTTPS 终止在代理后应用要注意什么？

**短回答：**

正确设置信任代理和 X-Forwarded-Proto/For，生成安全 Cookie 与绝对 URL 时使用原始协议，并限制可信代理来源。

**原理：**

- TLS 在 CDN 或 Nginx 终止后，应用到代理之间可能是 HTTP，因此 socket 的本地协议不能代表用户原始协议。
- 可信代理应覆盖并传递 `X-Forwarded-Proto`、`X-Forwarded-For`、`X-Forwarded-Host` 或标准 `Forwarded`，应用只在请求确实来自已知代理地址/跳数时解释这些字段。
- 否则攻击者可直连应用并伪造 `X-Forwarded-Proto: https`、客户端 IP 或 Host，绕过 HTTPS 重定向、限流和审计。正确配置后，应用生成绝对 URL、判断 Secure Cookie、记录真实 IP 和 OAuth 回调时都使用原始外部语义。
- 代理与源站之间是否需要再次 TLS 取决于网络信任边界，但即使内网 HTTP，也应只允许代理访问应用端口并清洗外来转发头。

**代码 / 场景：**

Nginx 重写转发头，Express 只信任明确的环回/内网代理，而不是无条件 `true`。

~~~nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
~~~

~~~js
app.set("trust proxy", ip => ip === "127.0.0.1" || ip.startsWith("10.0.0."))
app.get("/debug-request", (req, res) => res.json({
  protocol: req.protocol, secure: req.secure, ip: req.ip, host: req.hostname
}))
~~~

分别经公网 HTTPS 和直接访问内网端口测试；后者伪造转发头不应被当成安全公网请求，生产应进一步用防火墙禁止直连。

**递进追问：**

1. **为什么 `trust proxy = true` 可能危险？**

   若存在比预期更短的直连路径，客户端可自行提供 X-Forwarded-*，框架会把伪造值当真实协议/IP；应限定代理地址、网段或可靠跳数。

2. **代理后 Secure Cookie 为什么可能不下发？**

   应用看到内部 HTTP 而认为请求不安全；正确传递 X-Forwarded-Proto 并配置可信代理后，框架才能识别外部 HTTPS，同时 Cookie 仍应带 Secure。

**易错点：**

- 使用客户端传来的第一个 X-Forwarded-For 作为真实 IP，却不验证可信代理链，会让限流、审计和管理员 IP 白名单被绕过。
- 代理终止 TLS 后把应用端口暴露到公网，使攻击者可绕过 WAF、访问控制和头清洗；源站应只接受可信代理网络。

**参考来源：**

- [Express 官方指南：Express behind proxies](https://expressjs.com/en/guide/behind-proxies.html)
- [IETF RFC 7239：Forwarded HTTP Extension](https://datatracker.ietf.org/doc/html/rfc7239)

校验日期：2026-07-20

## Q25：如何验证一次部署没有影响其他域名？

**短回答：**

分别检查 DNS、证书、状态码、关键页面和 Host 路由；子域改动不应覆盖根域记录，部署前后都做独立冒烟。

**原理：**

- 把域名视为彼此独立的 DNS、TLS SNI 和 HTTP Host 三层路由。变更前先建立清单并保存每个域名的 A/AAAA/CNAME、证书主体/到期时间、状态码、重定向链、关键页面特征和 API 健康结果；变更后从公网逐项对比。
- `curl --resolve` 可在 DNS 切换前把指定域名定向到新 IP，同时仍携带正确 SNI 与 Host，验证新虚拟主机不会落入 default_server。
- 还要显式测试根域、www、API、管理后台及一个不存在的 Host，确认通配 DNS、证书和 Nginx 默认站点没有扩大匹配。
- 发布验证不仅看 200：错误地返回另一个站点首页也是 200，应检查内容指纹、响应头和业务 API，并监控一段时间内各 Host 的 4xx/5xx 与证书告警。

**代码 / 场景：**

假设新入口 IP 为 203.0.113.20，先绕过 DNS 对三个域名做 SNI/Host 冒烟，再比较正式解析。

~~~bash
for host in example.com interview.example.com api.example.com; do
  echo "=== $host ==="
  dig +short "$host"
  curl -fsS --resolve "$host:443:203.0.113.20" \
    -o /tmp/body -D - "https://$host/health"
  sha256sum /tmp/body
  openssl s_client -connect 203.0.113.20:443 -servername "$host" </dev/null 2>/dev/null \
    | openssl x509 -noout -subject -dates -ext subjectAltName
done
~~~

再请求随机 Host，预期被拒绝或落到安全空站点，而不是泄露任一业务站；DNS 生效后重复公网请求并核对监控。

**递进追问：**

1. **为什么 `curl https://新IP` 不能替代 --resolve？**

   直接访问 IP 会把 SNI 和 Host 都设成 IP，无法验证基于域名的证书和虚拟主机；--resolve 只替换连接地址，仍保留真实域名语义。

2. **所有域名都返回 200 为什么仍可能部署错误？**

   默认虚拟主机可能把多个 Host 都返回同一首页。必须验证标题、关键 JSON、内容哈希或站点专属响应头，而不是只比较状态码。

**易错点：**

- 修改通配 CNAME 或根域记录时只测试目标子域，会漏掉同一记录覆盖的其他站点；变更评审必须列出记录影响范围。
- 只用本机 DNS 缓存验证会忽略权威记录、不同递归解析器和 TTL 传播，正式切换后还应从公网解析并持续监控。

**参考来源：**

- [Nginx 官方文档：基于名称的虚拟主机请求处理](https://nginx.org/en/docs/http/request_processing.html)
- [curl 官方手册：--resolve](https://curl.se/docs/manpage.html#--resolve)

校验日期：2026-07-20
