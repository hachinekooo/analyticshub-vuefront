---
title: AnalyticsHub Frontend
type: project-readme
status: current
audience: contributor, frontend, operator
scope: 前端定位、目录、快速启动、工程门禁和部署入口
agent_notes: 入口概览；生产构建细节见 docs/DEPLOYMENT.md
---

# AnalyticsHub Frontend

AnalyticsHub 的 Vue 3 管理端。应用以 `/analyticshub/` 为默认部署路径，通过同源 `/analyticshub/api/**` 访问后端。

## 职责边界

- `frontend/`：Vue 3 + Vite 管理端，包括多项目工作区、运营中心、语义字典和隐私工单。
- `docs/PROJECT_WORKSPACE.md`：项目导航、分析模板、Dashboard 状态与扩展边界。
- `docs/DEPLOYMENT.md`：只维护前端构建、静态产物和页面验收。
- Nginx、证书、后端 JAR、systemd 和数据库由 `analyticshub-javaback` 的运维文档统一维护。

## 快速开始

先按照后端仓库的 [快速启动指南](https://github.com/hachinekooo/analyticshub-javaback/blob/main/QUICKSTART.md) 启动本地 API（默认 `http://127.0.0.1:3001`）。前端开发环境默认通过 Vite 将 `/api` 代理到该地址，不需要额外配置 CORS。

请使用 `frontend/.nvmrc` 指定的 Node.js 和 `frontend/package.json#packageManager` 指定的 pnpm：

```bash
cd frontend
nvm install
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

打开 `http://127.0.0.1:5173/analyticshub/`，使用后端配置的同一个 `ADMIN_TOKEN` 登录。要直接查看 App、Website、WebApp 三种模板及完整模拟数据，请先执行后端仓库的 [`examples/demo-data/seed.sh`](https://github.com/hachinekooo/analyticshub-javaback/tree/main/examples/demo-data)。

开发代理或页面标题需要调整时，复制 `frontend/.env.development.example` 为 `frontend/.env.development`；默认本地启动不需要创建该文件。

只需预览页面时，可先执行 `pnpm build`，再运行 `pnpm mock:preview`。Mock 用于验证页面、空态、基本请求形状和低成本的声明式合同；它不复制生产后端的事务、所有权、跨 Pack 依赖引擎或数据库资源预算。需要验证迁移、checksum、并发导入、失败回滚、查询行数上限或 statement timeout 时，必须连接真实本地后端与 PostgreSQL。

项目配置 `trustedSchemaPolicy` 后，Dashboard 会把该范围作为概览、App 版本、趋势、事件排行、漏斗和留存的默认筛选，并在页面明确显示当前是可信运营范围还是跨版本诊断范围。事件明细始终保留原始事实；管理员主动移除可信筛选时，页面不会把混合合同版本的结果标成稳定 KPI。

## 工程门禁

提交前运行唯一综合门禁；它依次执行 non-mutating lint（不自动改文件）、Vitest、TypeScript 检查、生产构建和 bundle budget（产物体积上限）校验：

```bash
pnpm check
```

开发中可分别使用 `pnpm test` / `pnpm test:watch` / `pnpm lint:check` / `pnpm type-check` / `pnpm build`。工作区实现边界见 [`docs/PROJECT_WORKSPACE.md`](docs/PROJECT_WORKSPACE.md)，前端生产变量、构建产物和页面验收见 [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)。

仓库不启用托管 CI；维护者在提交和发布前于受控本地环境执行 `pnpm check`，构建产物仍通过既有人工发布流程部署。
