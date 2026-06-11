# MinIO 部署

> 本页只讲 MinIO 服务怎么部署、初始化和排查。业务接入代码与 SQL 请看 [MinIO 文件存储 - SQL 解释](../business-implementation/minio-storage/sql.md)、[SpringBoot 实现](../business-implementation/minio-storage/springboot.md)、[Nest 实现](../business-implementation/minio-storage/nest.md)。

## 一、部署目标

| 目标 | 说明 |
|------|------|
| 对象存储 | 保存文件本体、附件、导出包、归档 ZIP |
| 管理台 | 管理 bucket、access key、对象浏览 |
| 初始化 | 自动创建 bucket，默认不公开访问 |
| 持久化 | 数据目录挂载到服务器磁盘 |

## 二、版本与端口

| 项 | 推荐值 | 说明 |
|----|--------|------|
| MinIO Server | `RELEASE.2025+` | S3 兼容对象存储 |
| minio/mc | 与 Server 大版本匹配 | 初始化 bucket 和策略 |
| API 端口 | `9000` | 业务服务连接端口 |
| Console 端口 | `9001` | 管理台，生产不建议公网暴露 |
| 数据目录 | `/opt/minio/data` | 必须持久化 |

## 三、目录结构

| 路径 | 用途 |
|------|------|
| `/opt/minio/.env` | MinIO 环境变量 |
| `/opt/minio/docker-compose.yml` | Compose 配置 |
| `/opt/minio/data` | 对象数据 |
| `/opt/minio/config` | MinIO 本地配置 |
| `/opt/minio/policies` | bucket policy 文件 |

## 四、环境变量

`.env`：

```bash
MINIO_ROOT_USER=minio_admin
MINIO_ROOT_PASSWORD=change_this_password
MINIO_BUCKET=archive-files
MINIO_REGION=cn-east-1
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
```

业务服务不要直接使用 root 账号，建议单独创建应用级 access key。

## 五、Docker Compose

`docker-compose.yml`：

```yaml
services:
  minio:
    image: minio/minio:RELEASE.2025-04-22T22-12-26Z
    container_name: minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    ports:
      - "${MINIO_API_PORT:-9000}:9000"
      - "${MINIO_CONSOLE_PORT:-9001}:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_REGION_NAME: ${MINIO_REGION:-cn-east-1}
    volumes:
      - ./data:/data
      - ./config:/root/.minio

  minio-init:
    image: minio/mc:RELEASE.2025-04-16T18-13-26Z
    depends_on:
      - minio
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_BUCKET: ${MINIO_BUCKET}
    entrypoint: >
      /bin/sh -c "
      until mc alias set local http://minio:9000 $${MINIO_ROOT_USER} $${MINIO_ROOT_PASSWORD}; do
        echo 'waiting for minio...';
        sleep 2;
      done;
      mc mb --ignore-existing local/$${MINIO_BUCKET};
      mc anonymous set none local/$${MINIO_BUCKET};
      echo 'minio bucket initialized';
      "
```

## 六、启动与初始化

```bash
cd /opt/minio
docker compose --env-file .env up -d minio
docker compose --env-file .env run --rm minio-init
docker compose ps
docker compose logs -f minio
```

## 七、业务账号创建

使用 `mc` 创建业务账号和授权：

```bash
docker compose exec minio mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
docker compose exec minio mc admin user add local app_access_key app_secret_key
docker compose exec minio mc admin policy attach local readwrite --user app_access_key
```

如果需要更细粒度权限，按 bucket 单独维护 policy：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::archive-files",
        "arn:aws:s3:::archive-files/*"
      ]
    }
  ]
}
```

应用 policy：

```bash
docker compose exec minio mc admin policy create local archive-files-rw /policies/archive-files-rw.json
docker compose exec minio mc admin policy attach local archive-files-rw --user app_access_key
```

## 八、Nginx 代理

```nginx
server {
  listen 443 ssl;
  server_name files.example.com;

  client_max_body_size 200m;

  location / {
    proxy_pass http://127.0.0.1:9000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 九、排查命令

```bash
docker compose ps
docker compose logs -f minio
docker compose exec minio mc ls local
docker compose exec minio mc ls local/archive-files
docker compose exec minio mc stat local/archive-files/path/to/object
```

## 十、生产检查清单

| 检查项 | 要求 |
|--------|------|
| root 密码 | 强随机，不能使用默认值 |
| 业务账号 | 单独 access key，不用 root |
| Console | 默认不公网暴露 |
| 数据目录 | 挂载持久化磁盘 |
| bucket policy | 默认私有，下载由后端生成预签名 URL |
| 备份 | 定期同步 `/opt/minio/data` 或使用对象存储复制 |
| HTTPS | 对外访问必须走 TLS |
