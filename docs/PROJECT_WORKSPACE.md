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
| App | 产品行为、事件趋势和核心动作 | 事件、设备、会话 |
| Website | 页面访问趋势、访客和热门页面 | 页面访问记录 |
| Web App | 产品行为与页面访问 | 业务事件、页面访问、设备和会话 |
| Blank | 空白编排区 | 空白数据集 |

模板只决定两个稳定空间中的默认组件和数据集，不在明细页提供 App/Website 二次切换。App 默认组件不包含网站 PV/UV；Website 不包含 App `screen_view`；Web App 才同时展示页面访问和产品事件。模板负责给出初始编排，管理员保存后的 Dashboard definition 由服务端持久化。

数据大屏和明细组件不创建、编辑或删除业务数据。数据大屏只保留页面级布局配置；明细数据不提供布局编辑。语义映射与 Counter 维护分别由顶部导航的“指标字典”和“计数器”页面负责，Dashboard Counter 组件只读展示数值。

## Dashboard 状态

布局调整只有“开始 → 完成/取消”一条流程：

- 开始时复制 working layout（工作布局）；
- 拖动、右下角缩放、增删和配置只修改 working layout；
- 完成时一次写入后端并立即生效；
- 取消时恢复进入编辑前的快照；
- 不使用草稿、预览、发布或 localStorage 布局副本。

网络请求必须同时绑定 project ID 和请求 generation，项目/工作区切换后忽略过期响应，避免旧项目数据覆盖当前页面。

## 扩展与审查

开源底座只执行声明式 `core.*` 和构建期注册的 `custom.*` widget。新增内置组件应同时补：模板归属、前端渲染、后端 allow-list、API 契约、空态/错误态和测试。私有业务组件在下游仓库静态注册，不把 HTML、JavaScript、SQL 或私有事件 Key 存进 Dashboard definition。
