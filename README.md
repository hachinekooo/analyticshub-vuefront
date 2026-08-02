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
- `docs/DEPLOYMENT.md`：只维护前端构建、静态产物和页面验收。
- Nginx、证书、后端 JAR、systemd 和数据库由 `analyticshub-javaback` 的运维文档统一维护。

## 快速开始

请使用 `frontend/.nvmrc` 指定的 Node.js 和 `frontend/package.json#packageManager` 指定的 pnpm：

```bash
cd frontend
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

## 工程门禁

提交前运行唯一综合门禁；它依次执行 non-mutating lint（不自动改文件）、Vitest、TypeScript 检查、生产构建和 bundle budget（产物体积上限）校验：

```bash
pnpm check
```

开发中可分别使用 `pnpm test` / `pnpm test:watch` / `pnpm lint:check` / `pnpm type-check` / `pnpm build`。前端生产变量、构建产物和页面验收见 [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)。

GitHub Actions 在每次相关 push / pull request 中执行同一个 `pnpm check`，不包含发布或部署步骤。
