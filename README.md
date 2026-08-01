# AnalyticsHub Frontend

AnalyticsHub 的 Vue 3 管理端。应用以 `/analyticshub/` 为默认部署路径，通过同源 `/analyticshub/api/**` 访问后端。

## 目录结构

- `frontend/`: 基于 Vue 3 + Vite 的前端应用核心代码。
- `docs/DEPLOYMENT.md`: 前端部署说明。

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

开发中可分别使用 `pnpm test` / `pnpm test:watch` / `pnpm lint:check` / `pnpm type-check` / `pnpm build`。部署参数和 Nginx 路由见 [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)。

GitHub Actions 在每次相关 push / pull request 中执行同一个 `pnpm check`，不包含发布或部署步骤。
