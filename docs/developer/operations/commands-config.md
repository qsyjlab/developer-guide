# 命令与配置

> 本页收拢跨语言部署时常用的命令、配置边界和排查方式。具体业务部署分别看 JAR、Nest、MinIO 页面。

## 一、服务器基础检查

```bash
date
timedatectl
hostnamectl
df -h
free -h
ulimit -n
```

推荐基础配置：

| 项 | 建议 |
|----|------|
| 时区 | `Asia/Shanghai` |
| 文件句柄 | 生产服务建议 `65535` |
| 应用用户 | 每个系统使用独立 Linux 用户 |
| 部署根目录 | `/opt/{appName}` |
| 日志目录 | `/opt/{appName}/logs` |
| 配置目录 | `/opt/{appName}/config` |

## 二、常用目录约定

| 路径 | 用途 |
|------|------|
| `/opt/{appName}/releases/{version}` | 版本产物目录 |
| `/opt/{appName}/current` | 当前版本软链 |
| `/opt/{appName}/config` | 环境配置 |
| `/opt/{appName}/logs` | 运行日志 |
| `/opt/{appName}/{appName}.pid` | 裸进程 PID |
| `/data/{service}` | 数据型服务持久化目录 |

## 三、环境变量命名

| 类型 | 示例 | 说明 |
|------|------|------|
| 运行环境 | `NODE_ENV=production` / `SPRING_PROFILES_ACTIVE=prod` | 区分 dev/test/prod |
| 端口 | `PORT=3000` / `SERVER_PORT=8080` | 不在代码里写死 |
| 数据库 | `MYSQL_HOST`、`MYSQL_DATABASE`、`MYSQL_USER` | 密码不进仓库 |
| 对象存储 | `MINIO_ENDPOINT`、`MINIO_BUCKET` | 详见 MinIO 部署 |
| 密钥 | `JWT_SECRET`、`OAUTH_CLIENT_SECRET` | 只放服务器配置 |

## 四、systemd 常用命令

```bash
sudo systemctl daemon-reload
sudo systemctl enable admin-service
sudo systemctl start admin-service
sudo systemctl stop admin-service
sudo systemctl restart admin-service
sudo systemctl status admin-service
sudo journalctl -u admin-service -f
```

## 五、PM2 常用命令

```bash
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs admin-api
pm2 restart admin-api
pm2 stop admin-api
pm2 delete admin-api
pm2 save
pm2 startup
```

## 六、Docker / Compose 常用命令

```bash
docker version
docker compose version
docker ps
docker images
docker logs -f <container>
docker exec -it <container> sh
docker compose --env-file .env up -d
docker compose ps
docker compose logs -f
docker compose down
```

镜像导入导出：

```bash
docker save admin-service:1.0.0 -o admin-service-1.0.0.tar
docker load -i admin-service-1.0.0.tar
```

## 七、Nginx 常用命令

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

通用代理头：

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

## 八、端口规划

| 服务 | 默认端口 | 说明 |
|------|----------|------|
| SpringBoot | `8080` | JAR 服务内部端口 |
| Nest | `3000` | Node 服务内部端口 |
| MinIO API | `9000` | 对象存储 API |
| MinIO Console | `9001` | 管理台，生产不建议公网暴露 |
| MySQL | `3306` | 数据库 |
| Redis | `6379` | 缓存 |
| Nginx HTTP | `80` | 跳转 HTTPS |
| Nginx HTTPS | `443` | 对外入口 |

## 九、排查顺序

1. 先看进程是否存在：`systemctl status` / `pm2 status` / `docker ps`。
2. 再看启动日志：`journalctl` / `pm2 logs` / `docker logs`。
3. 再检查端口监听：`ss -lntp`。
4. 再检查配置文件是否被读取。
5. 最后检查数据库、MinIO、Redis 等依赖连通性。

## 十、敏感配置边界

| 内容 | 是否入仓 | 说明 |
|------|----------|------|
| `.env.production` | 否 | 服务器维护 |
| `application-prod.yml` | 否 | 可提供模板，真实值不入仓 |
| 数据库密码 | 否 | 使用密钥管理或服务器配置 |
| MinIO access key | 否 | 业务账号独立创建 |
| JWT secret | 否 | 生产必须强随机 |
| Dockerfile | 是 | 不包含真实密钥 |
| 启动脚本 | 是 | 不包含真实密钥 |
