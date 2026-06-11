# MinIO 文件存储 - SQL 解释

> 这里只放公共 SQL：文件对象元数据、上传会话、分片记录、索引和常用查询。
> 文件本体存 MinIO，数据库只存定位信息和业务元数据。

## 一、SQL 范围

| 类别 | 说明 |
|------|------|
| 文件对象 | 记录 bucket、objectKey、文件名、大小、hash、业务归属 |
| 上传会话 | 大文件 / 分片上传时记录上传状态 |
| 分片记录 | 记录每个 part 的 etag、大小、上传时间 |
| 查询语句 | 按业务对象、hash、上传人、状态查询 |
| 清理语句 | 清理失败上传、软删除文件、过期会话 |

## 二、公共表结构

| 表 | 用途 |
|----|------|
| `file_objects` | MinIO 文件对象元数据 |
| `file_upload_sessions` | 上传会话，普通上传可不使用 |
| `file_upload_parts` | 分片上传记录，普通上传可不使用 |

## 三、建表示意

### 3.1 文件对象

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_file_objects` (
  `id` BIGINT PRIMARY KEY,
  `bucket` VARCHAR(128) NOT NULL,
  `object_key` VARCHAR(512) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `content_type` VARCHAR(128),
  `size_bytes` BIGINT NOT NULL DEFAULT 0,
  `sha256` CHAR(64),
  `biz_type` VARCHAR(64) NOT NULL,
  `biz_id` BIGINT,
  `access_scope` VARCHAR(32) NOT NULL DEFAULT 'private',
  `storage_provider` VARCHAR(32) NOT NULL DEFAULT 'minio',
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_by` BIGINT,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `deleted_at` DATETIME,
  UNIQUE KEY `uk_file_objects_bucket_key` (`bucket`, `object_key`),
  KEY `idx_file_objects_biz` (`biz_type`, `biz_id`, `status`, `created_at`),
  KEY `idx_file_objects_sha256` (`sha256`),
  KEY `idx_file_objects_created_by` (`created_by`, `created_at`)
);
```

### 3.2 上传会话

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_file_upload_sessions` (
  `id` BIGINT PRIMARY KEY,
  `upload_no` VARCHAR(64) NOT NULL,
  `bucket` VARCHAR(128) NOT NULL,
  `object_key` VARCHAR(512) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `content_type` VARCHAR(128),
  `total_size_bytes` BIGINT NOT NULL DEFAULT 0,
  `part_size_bytes` BIGINT NOT NULL DEFAULT 0,
  `minio_upload_id` VARCHAR(256),
  `biz_type` VARCHAR(64) NOT NULL,
  `biz_id` BIGINT,
  `status` TINYINT NOT NULL DEFAULT 0,
  `created_by` BIGINT,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `completed_at` DATETIME,
  `expires_at` DATETIME,
  UNIQUE KEY `uk_file_upload_sessions_no` (`upload_no`),
  UNIQUE KEY `uk_file_upload_sessions_bucket_key` (`bucket`, `object_key`),
  KEY `idx_file_upload_sessions_biz` (`biz_type`, `biz_id`, `status`),
  KEY `idx_file_upload_sessions_status_expires` (`status`, `expires_at`)
);
```

### 3.3 上传分片

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_file_upload_parts` (
  `id` BIGINT PRIMARY KEY,
  `session_id` BIGINT NOT NULL,
  `part_number` INT NOT NULL,
  `etag` VARCHAR(128) NOT NULL,
  `size_bytes` BIGINT NOT NULL DEFAULT 0,
  `sha256` CHAR(64),
  `uploaded_at` DATETIME NOT NULL,
  UNIQUE KEY `uk_file_upload_parts_session_part` (`session_id`, `part_number`),
  KEY `idx_file_upload_parts_session_id` (`session_id`)
);
```

## 四、状态枚举

| 字段 | 值 | 说明 |
|------|----|------|
| `file_objects.status` | `1` | 正常 |
| `file_objects.status` | `0` | 已删除 / 不可用 |
| `file_upload_sessions.status` | `0` | 初始化 |
| `file_upload_sessions.status` | `1` | 上传中 |
| `file_upload_sessions.status` | `2` | 已完成 |
| `file_upload_sessions.status` | `3` | 已取消 |
| `file_upload_sessions.status` | `4` | 已过期 |

## 五、常用查询语句

### 5.1 按业务对象查询文件

```sql
SELECT *
FROM `{prefix}_file_objects`
WHERE biz_type = ?
  AND biz_id = ?
  AND status = 1
ORDER BY created_at DESC, id DESC;
```

### 5.2 按 hash 查询已有文件

```sql
SELECT *
FROM `{prefix}_file_objects`
WHERE sha256 = ?
  AND status = 1
ORDER BY created_at DESC
LIMIT 1;
```

### 5.3 查询上传人文件

```sql
SELECT *
FROM `{prefix}_file_objects`
WHERE created_by = ?
  AND status = 1
ORDER BY created_at DESC, id DESC
LIMIT ? OFFSET ?;
```

### 5.4 查询过期上传会话

```sql
SELECT *
FROM `{prefix}_file_upload_sessions`
WHERE status IN (0, 1)
  AND expires_at < NOW()
ORDER BY expires_at ASC;
```

### 5.5 查询会话分片

```sql
SELECT *
FROM `{prefix}_file_upload_parts`
WHERE session_id = ?
ORDER BY part_number ASC;
```

## 六、清理语句

### 6.1 文件软删除

```sql
UPDATE `{prefix}_file_objects`
SET status = 0,
    deleted_at = NOW(),
    updated_at = NOW()
WHERE id = ?
  AND status = 1;
```

### 6.2 标记过期上传会话

```sql
UPDATE `{prefix}_file_upload_sessions`
SET status = 4,
    updated_at = NOW()
WHERE status IN (0, 1)
  AND expires_at < NOW();
```

### 6.3 清理过期分片记录

```sql
DELETE p
FROM `{prefix}_file_upload_parts` p
JOIN `{prefix}_file_upload_sessions` s ON s.id = p.session_id
WHERE s.status IN (3, 4)
  AND s.updated_at < ?;
```

## 七、SQL 解释原则

1. MinIO 保存文件本体，MySQL 保存文件元数据和业务归属。
2. `object_key` 不使用原文件名，推荐 `bizType/yyyyMMdd/uuid.ext`。
3. 下载不要存永久 URL，由后端鉴权后生成预签名 URL。
4. 普通上传只需要 `file_objects`；大文件 / 断点续传再启用上传会话和分片表。
5. 删除优先软删数据库记录，再异步清理 MinIO 对象，避免误删不可恢复。
