---
title: AnalyticsHub 前端构建与部署
type: frontend-deployment
status: current
audience: frontend, operator
scope: 前端生产变量、构建产物、上传和页面验收
agent_notes: Nginx、证书、后端、systemd 和数据库以 javaback 仓库运维文档为准
---

# AnalyticsHub 前端构建与部署

本文只负责前端静态产物。服务器初始化、证书、Nginx route、后端 JAR、systemd 和数据库由 `analyticshub-javaback` 仓库统一维护：

- `docs/运维/DEPLOYMENT_GUIDE.md`：端到端部署顺序；
- `ops/README.md`：运维命令和参数；
- `ops/analyticshub web`：`/analyticshub/` 的 Nginx 页面/API 路由。

不要在前端仓库复制维护另一套 Nginx 或服务器脚本。

## 1. 准备构建环境

```bash
cd frontend
nvm install
nvm use
corepack enable
pnpm install --frozen-lockfile
```

Node.js 版本来自 `.nvmrc`，pnpm 版本来自 `package.json#packageManager`。仓库根目录没有 `package.json`，不要在那里运行 pnpm。

## 2. 配置生产变量

```bash
cd frontend
cp .env.production.example .env.production
```

默认同源部署配置：

```env
VITE_API_URL=/analyticshub/api
VITE_APP_TITLE=AnalyticsHub
VITE_DEFAULT_PROJECT_ID=
```

- `VITE_API_URL` 应与后端运维脚本生成的路由一致。
- `VITE_DEFAULT_PROJECT_ID` 可以留空；项目选择逻辑只会使用服务端真实存在且启用的项目。
- 所有 `VITE_*` 都会进入浏览器产物，不能包含 Admin Token、数据库密码或 API secret。
- 修改环境变量后必须重新构建，服务器运行时修改 env 不会改变已有 dist。

## 3. 验证并构建

```bash
pnpm check
```

该命令依次执行 lint、单元测试、TypeScript 检查、生产构建和 bundle budget 校验。全部成功后，产物位于 `frontend/dist/`。

发布 `1.1.2` 时，将完整 dist 作为一个 artifact 保存并记录 checksum；测试通过后把同一个压缩包提升到生产，不要重新构建：

```bash
tar -czf analyticshub-frontend-1.1.2.tar.gz -C frontend dist
shasum -a 256 analyticshub-frontend-1.1.2.tar.gz
```

生产 base 固定为 `/analyticshub/`，静态资源路径为 `/analyticshub/assets/**`。

## 4. 上传产物

运维脚本约定的目标目录：

```text
/usr/share/nginx/html/analyticshub-frontend/dist
```

推荐先上传到临时目录，再由服务器管理员同步到目标目录。例如：

```bash
scp -r frontend/dist user@server:/tmp/analyticshub-frontend-dist
ssh user@server "sudo rsync -a --delete /tmp/analyticshub-frontend-dist/ /usr/share/nginx/html/analyticshub-frontend/dist/"
```

目录权限以服务器实际 Nginx 用户为准。Nginx route 本身不要在这里手工维护，应使用后端 `ops/analyticshub web`。

## 5. 页面验收

后端部署和公开检查通过后，打开：

```text
https://analytics.example.com/analyticshub/
```

至少验证：

- 登录后能读取真实项目列表；
- 切换项目后列表、指标和工单会重新请求当前项目；
- 浏览器刷新子路由不会 404；
- 静态资源和 `/analyticshub/api/**` 请求没有 404/502；
- 已配置可信 Schema 策略的项目默认显示“可信运营范围”，移除对应筛选后切换为“跨版本诊断范围”；
- 构建产物不包含 Token、数据库密码或 API secret。

## 常见问题

- 静态资源 404：核对上传目录和 Vite base，确认部署的是本次构建的完整 `dist/`。
- API 404：核对 `VITE_API_URL=/analyticshub/api`，并检查后端统一 Nginx route。
- API 502：到服务器按后端部署指南检查 `analyticshub` 服务和本地 `3001` 健康接口。
- 环境变量未生效：重新运行 `pnpm check` 并重新部署 dist。
