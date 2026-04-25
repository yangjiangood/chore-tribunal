# 阿里云 Docker 部署

## 1. 服务器准备

- 阿里云安全组放行 `80` 端口
- 服务器已安装 `Docker` 和 `Docker Compose`
- 把项目代码上传到服务器，例如 `/srv/chore-tribunal`

## 2. 配置环境变量

在项目根目录执行：

```bash
cp .env.prod.example .env.prod
```

然后编辑 `.env.prod`，至少改这几项：

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `LLM_PROVIDER`
- 对应模型厂商的 API Key，例如 `DASHSCOPE_API_KEY`

## 3. 启动服务

在项目根目录执行：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

## 4. 查看状态

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f frontend
```

启动成功后，直接访问：

```text
http://你的服务器IP
```

如果你改了 `APP_PORT`，就访问对应端口。

## 5. 首次初始化数据

如果你需要手动执行种子数据：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec backend pnpm db:seed
```

数据库迁移会在 `backend` 容器启动时自动执行，不需要额外手跑。

## 6. 更新项目

以后更新代码，进入项目目录后执行：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

## 7. 常用命令

停止：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml down
```

只重启后端：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build backend
```

查看数据库容器日志：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f db
```

## 8. 当前部署结构

- `frontend`: Nginx 托管前端静态文件，并反代 `/api`
- `backend`: NestJS 服务，容器内端口 `3000`
- `db`: PostgreSQL 15
- `redis`: Redis 7

这种方式不需要额外处理前端跨域，前端请求会直接走同域 `/api`。
