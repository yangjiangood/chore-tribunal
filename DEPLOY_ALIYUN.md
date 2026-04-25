# 阿里云 Docker 部署

## 一键部署

首次部署：

```bash
git clone https://github.com/yangjiangood/chore-tribunal.git
cd chore-tribunal
bash deploy.sh aliyun
```

如果你要直接带阿里云百炼 Key：

```bash
DASHSCOPE_API_KEY=你的Key bash deploy.sh aliyun
```

如果你要直接带 DeepSeek Key：

```bash
DEEPSEEK_API_KEY=你的Key bash deploy.sh deepseek
```

脚本会自动做这些事：

- 自动生成 `.env.prod`
- 自动生成 `POSTGRES_PASSWORD`
- 自动生成 `JWT_SECRET`
- 自动执行 `docker compose up -d --build`

## 一键更新

以后更新代码：

```bash
cd /srv/chore-tribunal
bash update.sh
```

## 手动查看状态

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f frontend
```

## 访问地址

默认端口是 `80`，直接访问：

```text
http://你的服务器公网IP
```

## 首次补种子数据

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec backend pnpm db:seed
```

## 如果你想自定义环境变量

可以在执行前直接带上：

```bash
APP_PORT=8080 POSTGRES_PASSWORD=你的数据库密码 JWT_SECRET=你的JWT密钥 DASHSCOPE_API_KEY=你的Key bash deploy.sh aliyun
```

支持的变量包括：

- `APP_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `LLM_PROVIDER`
- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`
- `DASHSCOPE_API_KEY`
- `DEEPSEEK_API_KEY`
- `MOONSHOT_API_KEY`
- `ZAI_API_KEY`

## 当前部署结构

- `frontend`: Nginx 托管前端静态文件，并反代 `/api`
- `backend`: NestJS 服务
- `db`: PostgreSQL 15
- `redis`: Redis 7
