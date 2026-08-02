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
- `/projects/:projectId/dashboard` 是项目数据大屏；项目 ID 只取 route params，不再维护 query/localStorage 的第二套来源。
- 同一项目下的 `semantics`、`counters`、`privacy` 分别负责指标字典、累计统计和隐私工单。
- `AdminShell` 只负责全局导航、当前项目切换和语言；业务状态留在对应页面。

创建/编辑项目的三步表单位于 `src/components/projects/ProjectFormDialog.vue`，列表页不重复持有表单字段或校验逻辑。

## 分析模板

`src/features/dashboard/projectDashboardTemplate.ts` 是前端模板的唯一事实来源：

| 模板 | 工作区 |
| --- | --- |
| App | APP 运营、明细数据 |
| Website | 网站流量、明细数据 |
| Web App | 产品运营、网站流量、明细数据 |
| Blank | 自定义、明细数据 |

App 默认组件不包含网站 PV/UV；设备表只表示设备记录，不冒充独立访客。模板负责给出初始编排，管理员保存后的 Dashboard definition 由服务端持久化。

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
