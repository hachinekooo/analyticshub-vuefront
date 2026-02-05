# AnalyticsHub 前端部署文档

## 📋 部署前准备

### 1. 服务器要求
- **操作系统**: Linux (Ubuntu 20.04+ / CentOS 7+)
- **Node.js**: 20.19.0 或更高版本（或 >= 22.12.0）
- **Nginx**: 1.18.0 或更高版本
- **内存**: 至少 2GB RAM
- **存储**: 至少 10GB 可用空间

### 2. 环境配置

#### 生产环境配置文件
创建生产环境配置文件：

```bash
# 进入前端目录
cd frontend

# 复制生产环境模板
cp .env.production.example .env.production

# 编辑生产环境配置
vim .env.production
```

**生产环境配置示例** (`frontend/.env.production`):
```bash
# API基础URL（生产环境通过 Nginx 访问后端，保持同源）
VITE_API_URL=https://api.example.com

# 应用标题
VITE_APP_TITLE=AnalyticsHub生产环境
```

## 🚀 部署步骤

### 步骤 1: 安装依赖
```bash
# 进入项目根目录
cd /Users/wangwenpeng/Code/project/analyticshub-vuefront

# 安装依赖
pnpm install
```

### 步骤 2: 构建生产版本
```bash
# 进入前端目录
cd frontend

# 构建生产版本
pnpm build
```

构建完成后，会在 `frontend/dist` 目录生成静态文件。

### 步骤 3: 配置 Nginx

创建或修改 Nginx 配置文件 (`/etc/nginx/conf.d/analyticshub.conf`):

```nginx
server {
    listen 3000;
    server_name _;

    # Vue 静态站点
    location / {
        root /usr/share/nginx/html/analyticshub-frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 反代（推荐：直接转发后端原始路由前缀；提示：proxy_pass 末尾是否带 / 会影响转发后的路径）
    location /api/v1/ {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        root /usr/share/nginx/html/analyticshub-frontend/dist;
        expires 1y;
        add_header Cache-Control "public";
    }
}
```

### 步骤 4: 部署到服务器

#### 方式一: 手动部署
```bash
# 1. 将构建好的 dist 目录上传到服务器
scp -r frontend/dist user@your-server:/usr/share/nginx/html/analyticshub-frontend

# 2. 重启 Nginx
ssh user@your-server "sudo systemctl restart nginx"
```

## 🔧 环境检查

### 验证部署
```bash
# 检查服务是否正常运行
curl -I https://api.example.com

# 检查API代理是否正常
curl https://api.example.com/api/health
```

### Admin Token 校验接口
```bash
curl -i -X POST https://api.example.com/api/v1/auth/admin-token/verify -H "X-Admin-Token: <你的token>"
```

### 环境变量检查
确保生产环境变量正确设置：
```bash
# 检查环境变量
cat frontend/.env.production

# 验证构建结果中的环境变量
grep -r "VITE_" frontend/dist/
```

## 📊 监控和维护

### 日志查看
```bash
# 查看Nginx访问日志
tail -f /var/log/nginx/access.log

# 查看Nginx错误日志
tail -f /var/log/nginx/error.log
```

### 性能监控
```bash
# 监控服务器资源使用
top
htop

# 监控Nginx连接数
netstat -an | grep :3000 | wc -l
```

## 🔒 安全配置

### SSL证书配置（可选）
```nginx
# 在Nginx配置中添加SSL
ssl_certificate /path/to/ssl/cert.pem;
ssl_certificate_key /path/to/ssl/private.key;
ssl_protocols TLSv1.2 TLSv1.3;
```

### 防火墙配置
```bash
# 开放3000端口
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp

# 启用防火墙
sudo ufw enable
```

## 🚨 故障排除

### 常见问题

1. **403 Forbidden**
   - 检查文件权限: `chmod -R 755 /var/www/analyticshub`
   - 检查Nginx用户权限

2. **502 Bad Gateway**
   - 检查后端服务是否运行: `systemctl status backend-service`
   - 检查端口3001是否监听: `netstat -tlnp | grep :3001`

3. **环境变量不生效**
   - 重新构建项目: `pnpm build`
   - 清除浏览器缓存

### 重启服务
```bash
# 重启Nginx
sudo systemctl restart nginx

# 查看服务状态
sudo systemctl status nginx
```

## 📞 支持

如遇部署问题，请检查：
1. 服务器防火墙设置
2. Nginx配置文件语法: `nginx -t`
3. 文件权限和路径正确性
4. 后端服务运行状态

---
**最后更新**: 2026-02-04
**部署版本**: v1.0.0
