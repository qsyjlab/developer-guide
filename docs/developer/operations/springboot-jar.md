# SpringBoot JAR 部署

> 本页描述“服务器拿到已经构建好的 JAR 包后如何部署”。不在服务器上执行 Maven / Gradle 构建，也不把本地开发命令混进部署脚本。

## 一、版本基线

| 项 | 推荐值 | 说明 |
|----|--------|------|
| Java | JDK `1.8` | 对齐现有 Java 8 服务器运行环境 |
| SpringBoot | `2.7.x` | 产物为可执行 boot jar |
| 进程托管 | `nohup` 启动脚本 | 当前服务器部署方式；systemd 可作为外层托管 |
| 日志目录 | `/docker-web/oauth2/volumes/system/logs` | stdout 启动日志、应用日志、PID 统一存放 |
| 配置方式 | JAR 内配置 + JVM 系统参数 | 例如 `-DLOG_PATH` 覆盖 logback 日志路径 |

## 二、产物约定

| 内容 | 命名示例 | 说明 |
|------|----------|------|
| JAR 包 | `oauth2-system-server.jar` | 已构建完成的可执行 JAR，与启动脚本同目录 |
| 启动脚本 | `start.sh` | 检查 JAR、停止旧进程、启动新进程、写 PID |
| 启动日志 | `nohup-yyyymmdd_HHMMSS.out` | 每次启动单独归档 |
| 当前日志软链 | `current.out` | 指向最新一次启动日志 |
| PID 文件 | `oauth2-system-server.pid` | 位于日志目录，便于脚本和 systemd 读取 |

推荐服务器目录：

| 路径 | 用途 |
|------|------|
| `/docker-web/oauth2/system` | JAR 包和启动脚本所在目录 |
| `/docker-web/oauth2/system/oauth2-system-server.jar` | 当前运行 JAR |
| `/docker-web/oauth2/system/start.sh` | nohup 启动脚本 |
| `/docker-web/oauth2/volumes/system/logs` | 日志和 PID 目录 |
| `/docker-web/oauth2/volumes/system/logs/current.out` | 最新启动日志软链 |

## 三、配置文件

`application-prod.yml` 示例：

```yaml
server:
  port: 8080

spring:
  profiles:
    active: prod
  datasource:
    url: jdbc:mysql://127.0.0.1:3306/admin_db?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: admin_user
    password: change_this_password
    driver-class-name: com.mysql.cj.jdbc.Driver

mybatis-plus:
  mapper-locations: classpath*:mapper/**/*.xml
  configuration:
    map-underscore-to-camel-case: true

logging:
  file:
    path: /docker-web/oauth2/volumes/system/logs

storage:
  minio:
    endpoint: http://127.0.0.1:9000
    public-endpoint: https://files.example.com
    access-key: app_access_key
    secret-key: app_secret_key
    bucket: archive-files
    region: cn-east-1
    secure: false
    presign-expire-seconds: 600
```

## 四、nohup 启动脚本

`start.sh`：

```bash
#!/bin/bash
set -euo pipefail

# ====================== 配置区 ======================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JAR_NAME="${JAR_NAME:-oauth2-system-server.jar}"
JAR_PATH="${SCRIPT_DIR}/${JAR_NAME}"

# 服务器日志目录
LOG_DIR="${LOG_DIR:-/docker-web/oauth2/volumes/system/logs}"

# Java 命令，默认使用服务器 PATH 中的 java
JAVA_BIN="${JAVA_BIN:-java}"

# JVM 参数：Java 8 + SpringBoot 2.7.x 当前推荐固定内存
JAVA_OPTS=(
  -Xms512m
  -Xmx512m
)

# 系统参数：用于覆盖 logback 日志路径；如需 profile 可追加 -Dspring.profiles.active=prod
JAVA_SYS_OPTS=(
  -DLOG_PATH="${LOG_DIR}"
)

# 日志文件
START_TIME="$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${LOG_DIR}/nohup-${START_TIME}.out"
CURRENT_LOG="${LOG_DIR}/current.out"

# PID 文件
PID_FILE="${LOG_DIR}/oauth2-system-server.pid"
# ====================================================

mkdir -p "${LOG_DIR}" "${LOG_DIR}/current" "${LOG_DIR}/archive"

if [[ ! -f "${JAR_PATH}" ]]; then
  echo "JAR file not found: ${JAR_PATH}"
  exit 1
fi

echo "Stopping old process..."

if [[ -f "${PID_FILE}" ]]; then
  OLD_PID="$(cat "${PID_FILE}" || true)"
  if [[ -n "${OLD_PID:-}" ]] && ps -p "${OLD_PID}" >/dev/null 2>&1; then
    echo "Stopping process from PID file: ${OLD_PID}"
    kill "${OLD_PID}" || true
    sleep 5
  fi
fi

PIDS="$(pgrep -f "java.*${JAR_NAME}" || true)"
if [[ -n "${PIDS:-}" ]]; then
  echo "Stopping residual process: ${PIDS}"
  kill ${PIDS} || true
  sleep 5
fi

RESIDUAL_PIDS="$(pgrep -f "java.*${JAR_NAME}" || true)"
if [[ -n "${RESIDUAL_PIDS:-}" ]]; then
  echo "Force stopping residual process: ${RESIDUAL_PIDS}"
  kill -9 ${RESIDUAL_PIDS} || true
  sleep 3
fi

echo "Starting new process..."
echo "JAR: ${JAR_PATH}"
echo "Log dir: ${LOG_DIR}"
echo "Startup log: ${LOG_FILE}"
echo "JVM opts: ${JAVA_OPTS[*]}"
echo "System opts: ${JAVA_SYS_OPTS[*]}"

# 当前启动日志软链，方便快速查看最新一次启动输出
ln -sfn "${LOG_FILE}" "${CURRENT_LOG}"

nohup "${JAVA_BIN}" "${JAVA_SYS_OPTS[@]}" "${JAVA_OPTS[@]}" -jar "${JAR_PATH}" \
  > "${LOG_FILE}" 2>&1 &

NEW_PID=$!
echo "${NEW_PID}" > "${PID_FILE}"

echo "Waiting for startup..."
sleep 10

if ps -p "${NEW_PID}" >/dev/null 2>&1; then
  echo "Started successfully. PID: ${NEW_PID}"
  echo "PID file: ${PID_FILE}"
  echo "Current startup log: ${CURRENT_LOG} -> ${LOG_FILE}"
  echo "Application log dir: ${LOG_DIR}"
  echo "Current memory usage:"
  ps -p "${NEW_PID}" -o pid,rss,vsz,etime,cmd | tail -n 1
else
  echo "Startup failed. Check log: ${LOG_FILE}"
  echo "Last 50 lines:"
  tail -n 50 "${LOG_FILE}"
  exit 1
fi
```

脚本说明：

| 逻辑 | 说明 |
|------|------|
| `SCRIPT_DIR` | 以脚本所在目录定位 JAR，避免依赖当前执行目录 |
| `LOG_DIR` | 日志固定落到服务器 volume 目录 |
| `JAVA_OPTS` | 固定堆内存，适合小型后台服务 |
| `JAVA_SYS_OPTS` | 用 `-DLOG_PATH` 覆盖应用日志路径 |
| `PID_FILE` | 记录当前进程，下一次启动先优雅停止 |
| `pgrep -f` | PID 文件失效时按 JAR 名称兜底清理 |
| `current.out` | 指向最新一次 nohup 输出，排查启动问题更快 |

## 五、版本部署脚本

`deploy.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_HOME="${APP_HOME:-/docker-web/oauth2/system}"
JAR_NAME="${JAR_NAME:-oauth2-system-server.jar}"
VERSION="${1:?Usage: ./deploy.sh <version> <jar-file>}"
JAR_SOURCE="${2:?Usage: ./deploy.sh <version> <jar-file>}"

RELEASE_DIR="${APP_HOME}/releases/${VERSION}"

mkdir -p "${RELEASE_DIR}"
cp "${JAR_SOURCE}" "${RELEASE_DIR}/${JAR_NAME}"
cp "${JAR_SOURCE}" "${APP_HOME}/${JAR_NAME}"

"${APP_HOME}/start.sh"
```

使用：

```bash
chmod +x /docker-web/oauth2/system/*.sh
/docker-web/oauth2/system/deploy.sh 1.0.0 /tmp/oauth2-system-server.jar
tail -f /docker-web/oauth2/volumes/system/logs/current.out
```

## 六、systemd 托管

`/etc/systemd/system/oauth2-system-server.service`：

```ini
[Unit]
Description=OAuth2 System Server
After=network.target

[Service]
Type=forking
User=root
Group=root
PIDFile=/docker-web/oauth2/volumes/system/logs/oauth2-system-server.pid
ExecStart=/docker-web/oauth2/system/start.sh
ExecStop=/bin/kill -TERM $MAINPID
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

命令：

```bash
sudo systemctl daemon-reload
sudo systemctl enable oauth2-system-server
sudo systemctl start oauth2-system-server
sudo systemctl status oauth2-system-server
sudo journalctl -u oauth2-system-server -f
```

## 七、产物版 Dockerfile

> 这个 Dockerfile 接收已经构建好的 JAR，不在镜像里执行 Maven / Gradle。

```dockerfile
FROM eclipse-temurin:8-jre-alpine

ARG APP_NAME=oauth2-system-server
ARG APP_VERSION=1.0.0

ENV TZ=Asia/Shanghai \
    JAVA_OPTS="-Xms512m -Xmx1024m -XX:+UseG1GC -Dfile.encoding=UTF-8"

WORKDIR /opt/app

COPY ${APP_NAME}-${APP_VERSION}.jar /opt/app/app.jar
COPY start-container.sh /opt/app/start.sh

RUN chmod +x /opt/app/start.sh \
  && addgroup -S app \
  && adduser -S app -G app

USER app
EXPOSE 8080

ENTRYPOINT ["/opt/app/start.sh"]
```

`start-container.sh`：

```bash
#!/usr/bin/env sh
set -eu

set -- java

for opt in ${JAVA_OPTS:-}; do
  set -- "$@" "$opt"
done

set -- "$@" -jar /opt/app/app.jar

if [ -n "${SPRING_CONFIG_ADDITIONAL_LOCATION:-}" ]; then
  set -- "$@" "--spring.config.additional-location=${SPRING_CONFIG_ADDITIONAL_LOCATION}"
fi

if [ -n "${SPRING_PROFILES_ACTIVE:-}" ]; then
  set -- "$@" "--spring.profiles.active=${SPRING_PROFILES_ACTIVE}"
fi

exec "$@"
```

可选外部配置：

| 场景 | 启用方式 |
|------|----------|
| JAR 内已经包含配置 | 不设置 `SPRING_CONFIG_ADDITIONAL_LOCATION` 和 `SPRING_PROFILES_ACTIVE` |
| 需要指定 profile | 设置 `SPRING_PROFILES_ACTIVE=prod` |
| 需要挂载外部配置 | 挂载配置文件，并设置 `SPRING_CONFIG_ADDITIONAL_LOCATION=/opt/app/config/application-prod.yml` |

## 八、检查清单

| 检查项 | 要求 |
|--------|------|
| Java 版本 | `java -version` 为 1.8 或兼容 Java 8 的运行时 |
| 配置文件 | 不打进 JAR，服务器独立维护 |
| 日志目录 | 启动前创建，应用用户有写权限 |
| PID 文件 | 启停脚本统一管理 |
| 健康检查 | 接入 actuator 后验证 `/actuator/health` |
| 敏感配置 | 数据库、MinIO、OAuth 密钥不进代码仓库 |
