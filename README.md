# AnalyticsHub Frontend

## 简介
这是 AnalyticsHub 的前端项目仓库。

## 目录结构
- `frontend/`: 基于 Vue 3 + Vite 的前端应用核心代码。
- `docs/DEPLOYMENT.md`: 前端部署说明。

## 快速开始

本项目使用 **pnpm** 进行包管理。

1. **进入前端目录**
   ```bash
   cd frontend
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **启动开发服务器**
   ```bash
   pnpm dev
   ```

4. **构建生产版本**
   ```bash
   pnpm build
   ```

## 远程访问 / 内网穿透说明

如果你使用 **cpolar** 或其他内网穿透工具访问开发服务器，可能会遇到 "Blocked request" 或热更新失效的问题。
请修改 `frontend/vite.config.ts` 中的 `server` 配置：

1. 取消 `allowedHosts` 的注释，填入你的穿透域名。
2. 取消 `hmr` 配置的注释，确保热更新连接到正确的穿透地址。

详细配置示例请参考 `vite.config.ts` 文件内的注释。
