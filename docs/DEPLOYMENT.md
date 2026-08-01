# AnalyticsHub 前端部署

本文说明当前前端的生产构建与统一部署方式。AnalyticsHub 默认挂载在 `/analyticshub/`，API 通过同源路径 `/analyticshub/api/**` 访问；不要把前端部署到 `/` 后只代理 `/api/v1/**`。

完整服务器初始化、证书、后端 JAR、systemd 和数据库步骤，以后端仓库的 `docs/运维/DEPLOYMENT_GUIDE.md` 与 `ops/analyticshub` 为准。

## 1. 构建环境

前端工程位于 `frontend/`，Node.js 版本由 `frontend/.nvmrc` 管理，包管理器版本由 `frontend/package.json` 的 `packageManager` 字段管理。

```bash
cd frontend
nvm install
nvm use
corepack enable
pnpm install --frozen-lockfile
```

不要在仓库根目录执行 `pnpm install`；根目录没有 `package.json`。

## 2. 生产环境变量

复制示例文件：

```bash
cd frontend
cp .env.production.example .env.production
```

推荐保持同源 API 配置：

```env
VITE_API_URL=/analyticshub/api
VITE_APP_TITLE=AnalyticsHub
VITE_DEFAULT_PROJECT_ID=
```

说明：

- `VITE_API_URL` 必须与 Nginx 的 `/analyticshub/api/**` 路由一致。
- `VITE_DEFAULT_PROJECT_ID` 可留空；若填写，会被编译进浏览器静态资源，因此不能放秘密或私有凭据。
- 所有 `VITE_*` 值都可能被浏览器看到，Admin Token、数据库密码和 API secret 不得写入前端环境文件。
- `.env.production` 只在本地使用并已被 `.gitignore` 排除；仓库只提交 `.env.production.example`。

## 3. 构建静态文件

```bash
cd frontend
pnpm check
```

`check` 会执行 lint、unit tests（单元测试）、TypeScript 检查、生产构建和 bundle budget 校验；任一环节失败都不应发布。成功后产物位于 `frontend/dist/`。Vite 的生产 base 是 `/analyticshub/`，因此静态资源 URL 会使用 `/analyticshub/assets/**`。

## 4. 上传 dist

后端统一运维脚本默认使用以下目录：

```text
/usr/share/nginx/html/analyticshub-frontend/dist
```

可以先上传到临时目录，再由服务器管理员同步并设置 Nginx 可读权限。例如：

```bash
scp -r frontend/dist user@server:/tmp/analyticshub-frontend-dist
ssh user@server "sudo rsync -a --delete /tmp/analyticshub-frontend-dist/ /usr/share/nginx/html/analyticshub-frontend/dist/"
```

不同 Linux 发行版的 Nginx 用户可能是 `nginx` 或 `www-data`，请按服务器实际用户设置目录权限。

## 5. 配置统一 Nginx 子路由

AnalyticsHub 的后端仓库维护唯一的路由脚本。`ops/analyticshub web` 生成 `/etc/nginx/conf.d/analyticshub.conf`，其中只包含 `location` 片段，不是完整的 `server` 配置。

先在目标域名已有的 HTTPS `server` 块中显式 include：

```nginx
server {
    listen 443 ssl;
    server_name analytics.example.com;

    # 证书及该站点的其他配置由部署方维护。
    include /etc/nginx/conf.d/analyticshub.conf;
}
```

然后在后端仓库执行：

```bash
sudo -E env DOMAIN=analytics.example.com CERTBOT_EMAIL=admin@example.com ISSUE_CERT=true bash ops/analyticshub web
```

如果证书已经存在，可省略 `ISSUE_CERT=true`。不要在 Nginx 的 `http` 级别通配 include 该 location fragment。

生成后的统一映射是：

```text
/analyticshub/              -> frontend/dist
/analyticshub/api/health    -> 127.0.0.1:3001/api/health
/analyticshub/api/v1/**     -> 127.0.0.1:3001/api/v1/**
/analyticshub/api/admin/**  -> 127.0.0.1:3001/api/admin/**
/analyticshub/api/public/** -> 127.0.0.1:3001/api/public/**
```

后端 `3001` 和 PostgreSQL `5432` 应保持本机或受信网络可见；公网通常只开放 80/443，不需要为前端单独开放 3000，也不应把 3001 直接暴露到公网。

## 6. 验证

先检查 Nginx 和公开健康接口：

```bash
sudo nginx -t
curl -fsS https://analytics.example.com/analyticshub/api/health
```

再打开管理端：

```text
https://analytics.example.com/analyticshub/
```

管理 Token 校验接口为：

```bash
curl -i -X POST https://analytics.example.com/analyticshub/api/v1/auth/admin-token/verify \
  -H "X-Admin-Token: <your-admin-token>"
```

最后至少验证：

- 页面刷新仍停留在 `/analyticshub/` 下，静态资源没有 404。
- 项目列表可以访问 `/analyticshub/api/admin/**`。
- 采集接口可以访问 `/analyticshub/api/v1/**` 与 `/analyticshub/api/public/**`。
- 浏览器中没有把 Admin Token、数据库密码或 API secret 编译进静态文件。

## 7. 常见问题

### 静态资源 404

确认 Vite base 为 `/analyticshub/`，上传的是 `frontend/dist/` 的当前构建结果，并且 Nginx 已加载统一 route fragment。

### API 404

确认生产环境使用 `VITE_API_URL=/analyticshub/api`，并检查请求是否落在 `/analyticshub/api/admin/**`、`/analyticshub/api/v1/**` 或 `/analyticshub/api/public/**`。

### 502 Bad Gateway

在服务器本机检查后端：

```bash
systemctl status analyticshub
curl -fsS http://127.0.0.1:3001/api/health
```

### 环境变量修改后未生效

Vite 在 build time（构建期）写入环境变量。修改 `.env.production` 后必须重新运行 `pnpm build` 并重新部署 `dist/`。

---

部署口径：AnalyticsHub 1.0.1
