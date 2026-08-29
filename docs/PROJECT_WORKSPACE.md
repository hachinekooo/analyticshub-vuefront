---
title: 项目工作区前端架构
type: architecture-guide
status: current
audience: contributor, frontend, reviewer
scope: 项目导航、创建流程、分析模板、Dashboard 状态和扩展边界
agent_notes: 修改项目路由、Dashboard 或组件扩展前阅读；接口字段以后端 API 文档为准
---

# 项目工作区前端架构

## 页面职责

- `/projects` 是项目管理首页，只负责项目卡片、创建、编辑、连接检查和初始化入口。
- `/projects/:projectId/dashboard` 固定提供只读的“数据大屏 / 明细数据”两个空间；项目 ID 只取 route params，不再维护 query/localStorage 的第二套来源。
- 同一项目下的 `semantics`、`counters`、`privacy` 分别负责指标字典、累计统计和隐私工单。
- `AdminShell` 只负责全局导航、当前项目切换和语言；业务状态留在对应页面。

创建/编辑项目的三步表单位于 `src/components/projects/ProjectFormDialog.vue`，列表页不重复持有表单字段或校验逻辑。

## 分析模板

`src/features/dashboard/projectDashboardTemplate.ts` 是前端模板的唯一事实来源：

| 模板 | 数据大屏 | 明细数据 |
| --- | --- | --- |
| App | 活跃设备/用户、事件趋势、主要活跃版本和核心动作 | 事件、活跃版本、设备、会话原始记录 |
| Website | PV、UV、人均访问、访问趋势、热门页面和来源 | 页面访问记录 |
| Web App | 产品行为与完整网站流量分析 | 业务事件、页面访问、设备和会话 |
| Blank | 空白编排区 | 空白数据集 |

模板只决定两个稳定空间中的默认组件和数据集，不在明细页提供 App/Website 二次切换。App 默认组件不包含网站 PV/UV；Website 不包含 App `screen_view`；Web App 才同时展示页面访问和产品事件。模板负责给出初始编排，管理员保存后的 Dashboard definition 由服务端持久化。

App 运营指标按事件真实发生时间归入所选周期，服务端接收时间只用于排查离线补发。活跃版本按设备统计：每台设备采用周期内最后一次事件携带的 App 版本和构建号，只计一次。概览和趋势不把未稳定采集的 session（会话）当作核心 KPI；会话明细仍作为通用数据集保留，只有接入方实际上报会话时才有业务含义。

### 设备与版本口径

| 数据 | 能回答的问题 | 不能替代 |
| --- | --- | --- |
| 设备记录 `createdAt` + `appVersion` | 哪个客户端版本在什么时间创建了多少分析凭据；用于观察同意分析用户的注册批次、SDK 接入和凭据兼容异常 | App 安装时间、下载增长、新用户注册 |
| 活跃版本分布 | 所选周期内产生事件的设备，最后观测到的 App 版本与构建号是什么；用于判断升级采用率和旧版本存量 | 从未打开 App、尚未同步或未同意分析的设备 |
| App Store Connect 报告 | 下载、重新下载、商店转化及版本发布前后的获客变化 | App 内行为与功能使用 |

设备记录的 `appVersion` 在记录首次创建时写入，正常 App 升级和分析凭据轮换不会持续刷新。它有诊断价值，但不得在界面、查询或运营结论中命名为“安装版本”或“当前版本”。要判断“哪个版本发布后新增下载最多”，应以 App Store Connect 为事实来源，再与 AnalyticsHub 的注册批次和活跃版本趋势对照；不能只用设备表得出增长结论。

数据大屏和明细组件不创建、编辑或删除业务数据。数据大屏只保留页面级布局配置；明细数据不提供布局编辑。语义映射与 Counter 维护分别由顶部导航的“指标字典”和“计数器”页面负责，Dashboard Counter 组件只读展示数值。

## 受治理分析

“分析配置”维护属性定义、可信 Schema 策略、指标定义、数据质量与 Analysis Pack。它和其他页面的职责边界如下：

- “指标字典”把一个或多个 raw event key 映射为稳定业务语义；指标只引用启用中的稳定语义。
- 属性定义声明字段类型、展示名称、允许值域，以及筛选、分组或 journey key（旅程键）能力；它不删除或改写原始 JSON。
- 受治理指标集中保存事件范围、属性筛选、分组和计算规则。Dashboard 的 `core.governedMetric` 只引用 `metricKey` 并跟随页面日期范围，不能在卡片内形成第二套口径。
- 事件明细用于逐条核查事实：先呈现已治理字段，再按需查看格式化原始 JSON。未登记字段仍可诊断，但不会自动成为稳定运营维度。
- 数据质量报告验证可信协议、属性覆盖、类型和值域；报告为空但未配置可信 Schema 策略时，不能解释为“数据健康”。

以上边界保证 Dashboard 回答可复用的运营问题，事件明细保留排查能力，私有产品则通过 Analysis Pack 提供声明式业务配置。

## Dashboard 状态

布局调整只有“开始 → 完成/取消”一条流程：

- 开始时复制 working layout（工作布局）；
- 拖动、右下角缩放、增删和配置只修改 working layout；
- 完成时一次写入后端并立即生效；
- 取消时恢复进入编辑前的快照；
- 不使用草稿、预览、发布或 localStorage 布局副本。

网络请求必须同时绑定 project ID 和请求 generation，项目/工作区切换后忽略过期响应，避免旧项目数据覆盖当前页面。

服务端 Dashboard definition 的 `defaultRange` 是项目初始数据范围。首次进入或切换项目时，前端将 `24h` / `7d` / `30d` / `90d` 预置值转换成可见日期并用于第一批请求；`custom` 不预置日期。用户临时筛选日期不会顺带改写 Dashboard 默认值。

## 扩展与审查

开源底座只执行声明式 `core.*` 和构建期注册的 `custom.*` widget。新增内置组件应同时补：模板归属、前端渲染、后端 allow-list、API 契约、空态/错误态和测试。私有业务组件在下游仓库静态注册，不把 HTML、JavaScript、SQL 或私有事件 Key 存进 Dashboard definition。
