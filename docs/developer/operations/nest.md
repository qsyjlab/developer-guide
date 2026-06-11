# Nest 部署

> 本页描述“服务器拿到 Nest 已构建产物后如何部署”。服务器只负责运行 `dist/main.js`，不在服务器上执行开发构建流程。

## 一、版本基线

| 项 | 推荐值 | 说明 |
|----|--------|------|
| Node.js | `22.x LTS` | 与技术清单保持一致 |
| 包管理器 | `pnpm 10.x` | 如产物包不含 `node_modules`，用于安装生产依赖 |
| 进程托管 | `PM2` 或 `systemd` | Node 服务推荐 PM2 |
| 配置文件 | `.env.production` | 不打进源码仓库 |
| 入口文件 | `dist/main.js` | 构建产物入口 |

## 二、产物约定

| 内容 | 命名示例 | 说明 |
|------|----------|------|
| 服务产物 | `admin-api-1.0.0.tgz` | 包含 `dist/`、`package.json`、锁文件 |
| 环境变量 | `.env.production` | 数据库、JWT、MinIO、第三方登录配置 |
| 启动脚本 | `start.sh` | 检查入口文件并启动 |
| PM2 配置 | `ecosystem.config.cjs` | 进程数、日志路径、环境变量 |

推荐服务器目录：

| 路径 | 用途 |
|------|------|
| `/opt/admin-api/releases/1.0.0` | 某个版本的 Nest 产物 |
| `/opt/admin-api/current` | 指向当前运行版本 |
| `/opt/admin-api/config/.env.production` | 生产环境变量 |
| `/opt/admin-api/logs` | PM2 / stdout 日志 |

## 三、环境变量

`.env.production` 示例：

```bash
NODE_ENV=production
PORT=3000

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=admin_db
MYSQL_USER=admin_user
MYSQL_PASSWORD=change_this_password

JWT_SECRET=change_this_jwt_secret
JWT_EXPIRES_IN=2h

MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=app_access_key
MINIO_SECRET_KEY=app_secret_key
MINIO_BUCKET=archive-files
MINIO_REGION=cn-east-1
MINIO_PRESIGN_EXPIRE_SECONDS=600
```

## 四、启动脚本

`start.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-admin-api}"
APP_HOME="${APP_HOME:-/opt/${APP_NAME}}"
NODE_BIN="${NODE_BIN:-node}"

CURRENT_DIR="${APP_HOME}/current"
ENTRY_FILE="${CURRENT_DIR}/dist/main.js"
ENV_FILE="${APP_HOME}/config/.env.production"
LOG_DIR="${APP_HOME}/logs"
PID_FILE="${APP_HOME}/${APP_NAME}.pid"

if [[ ! -f "${ENTRY_FILE}" ]]; then
  echo "Entry file not found: ${ENTRY_FILE}"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Env file not found: ${ENV_FILE}"
  exit 1
fi

mkdir -p "${LOG_DIR}"

if [[ -f "${PID_FILE}" ]] && kill -0 "$(cat "${PID_FILE}")" 2>/dev/null; then
  echo "${APP_NAME} is already running, pid=$(cat "${PID_FILE}")"
  exit 0
fi

set -a
source "${ENV_FILE}"
set +a

echo "Starting ${APP_NAME}"
nohup "${NODE_BIN}" "${ENTRY_FILE}" \
  > "${LOG_DIR}/${APP_NAME}.out.log" 2>&1 &

echo $! > "${PID_FILE}"
echo "Started ${APP_NAME}, pid=$(cat "${PID_FILE}")"
```

## 五、PM2 配置

`ecosystem.config.cjs`：

```js
module.exports = {
  apps: [
    {
      name: 'admin-api',
      script: '/opt/admin-api/current/dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env_file: '/opt/admin-api/config/.env.production',
      out_file: '/opt/admin-api/logs/admin-api.out.log',
      error_file: '/opt/admin-api/logs/admin-api.err.log',
      time: true,
      max_memory_restart: '512M'
    }
  ]
}
```

命令：

```bash
pm2 start /opt/admin-api/ecosystem.config.cjs
pm2 status
pm2 logs admin-api
pm2 restart admin-api
pm2 save
pm2 startup
```

## 六、版本部署脚本

`deploy.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-admin-api}"
APP_HOME="${APP_HOME:-/opt/${APP_NAME}}"
VERSION="${1:?Usage: ./deploy.sh <version> <artifact.tgz>}"
ARTIFACT="${2:?Usage: ./deploy.sh <version> <artifact.tgz>}"

RELEASE_DIR="${APP_HOME}/releases/${VERSION}"
CURRENT_LINK="${APP_HOME}/current"

mkdir -p "${RELEASE_DIR}" "${APP_HOME}/logs" "${APP_HOME}/config"
tar -xzf "${ARTIFACT}" -C "${RELEASE_DIR}" --strip-components=1

if [[ -f "${RELEASE_DIR}/package.json" ]] && [[ ! -d "${RELEASE_DIR}/node_modules" ]]; then
  cd "${RELEASE_DIR}"
  pnpm install --prod --frozen-lockfile
fi

ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"

if command -v pm2 >/dev/null 2>&1 && pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  pm2 restart "${APP_NAME}"
else
  "${APP_HOME}/start.sh"
fi
```

## 七、产物版 Dockerfile

> 这个 Dockerfile 接收已经打好的 `.tgz` 产物，不在镜像里执行源码构建。

```dockerfile
FROM node:22-alpine

ARG APP_NAME=admin-api
ARG APP_VERSION=1.0.0

ENV NODE_ENV=production \
    TZ=Asia/Shanghai

WORKDIR /opt/app

COPY ${APP_NAME}-${APP_VERSION}.tgz /tmp/app.tgz
COPY .env.production /opt/app/.env.production
COPY start-container.sh /opt/app/start.sh

RUN tar -xzf /tmp/app.tgz -C /opt/app --strip-components=1 \
  && chmod +x /opt/app/start.sh \
  && addgroup -S app \
  && adduser -S app -G app \
  && rm -f /tmp/app.tgz

USER app
EXPOSE 3000

ENTRYPOINT ["/opt/app/start.sh"]
```

`start-container.sh`：

```bash
#!/usr/bin/env sh
set -eu

set -a
. /opt/app/.env.production
set +a

exec node dist/main.js
```

## 八、Nginx 反向代理

```nginx
server {
  listen 443 ssl;
  server_name admin.example.com;

  client_max_body_size 200m;

  location /backend/ {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 九、检查清单

| 检查项 | 要求 |
|--------|------|
| Node 版本 | `node -v` 与技术清单一致 |
| 入口文件 | `dist/main.js` 存在 |
| 生产依赖 | `node_modules` 已包含或部署时执行 `pnpm install --prod` |
| 环境变量 | `.env.production` 单独维护，不提交仓库 |
| 进程守护 | PM2 或 systemd 二选一，不重复托管 |
| 日志 | stdout / stderr 可追踪 |
