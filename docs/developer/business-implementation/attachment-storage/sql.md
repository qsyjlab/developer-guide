# 附件存储 - SQL 解释

> 只放分片上传、断点续传、文件去重、引用复用相关 SQL。

## 一、SQL 范围

| 类别 | 说明 |
|------|------|
| 文件主表 | 物理文件唯一记录 |
| 上传会话 | 断点续传会话 |
| 分片记录 | 分片状态与校验 |
| 文件引用 | 多业务引用同一文件 |

## 二、公共表结构

| 表 | 用途 |
|----|------|
| `attachment_files` | 文件主表 |
| `attachment_upload_sessions` | 上传会话表 |
| `attachment_file_chunks` | 分片表 |
| `attachment_file_refs` | 文件引用表 |

## 三、建表示意

### 3.1 文件主表

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_attachment_files` (
  `id` BIGINT PRIMARY KEY,
  `content_hash` CHAR(64) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `ext` VARCHAR(32),
  `mime_type` VARCHAR(128),
  `size_bytes` BIGINT NOT NULL DEFAULT 0,
  `storage_key` VARCHAR(512),
  `storage_provider` VARCHAR(32) NOT NULL DEFAULT 'minio',
  `upload_status` TINYINT NOT NULL DEFAULT 0,
  `preview_status` TINYINT NOT NULL DEFAULT 0,
  `created_by` BIGINT,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  UNIQUE KEY `uk_attachment_files_content_hash` (`content_hash`),
  KEY `idx_attachment_files_status` (`upload_status`, `created_at`)
);
```

### 3.2 上传会话表

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_attachment_upload_sessions` (
  `id` BIGINT PRIMARY KEY,
  `session_no` VARCHAR(64) NOT NULL,
  `file_id` BIGINT NOT NULL,
  `chunk_size_bytes` BIGINT NOT NULL,
  `chunk_total` INT NOT NULL,
  `uploaded_count` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 0,
  `expires_at` DATETIME,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  UNIQUE KEY `uk_attachment_upload_sessions_no` (`session_no`),
  KEY `idx_attachment_upload_sessions_file_id` (`file_id`),
  KEY `idx_attachment_upload_sessions_status` (`status`, `expires_at`)
);
```

### 3.3 分片表

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_attachment_file_chunks` (
  `id` BIGINT PRIMARY KEY,
  `session_id` BIGINT NOT NULL,
  `chunk_index` INT NOT NULL,
  `chunk_hash` CHAR(64) NOT NULL,
  `size_bytes` BIGINT NOT NULL DEFAULT 0,
  `storage_key` VARCHAR(512),
  `status` TINYINT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL,
  `uploaded_at` DATETIME,
  UNIQUE KEY `uk_attachment_file_chunks_session_index` (`session_id`, `chunk_index`),
  KEY `idx_attachment_file_chunks_session_id` (`session_id`)
);
```

### 3.4 文件引用表

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_attachment_file_refs` (
  `id` BIGINT PRIMARY KEY,
  `file_id` BIGINT NOT NULL,
  `biz_type` VARCHAR(64) NOT NULL,
  `biz_id` BIGINT NOT NULL,
  `field_code` VARCHAR(64) NOT NULL,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_by` BIGINT,
  `created_at` DATETIME NOT NULL,
  UNIQUE KEY `uk_attachment_file_refs_biz` (`file_id`, `biz_type`, `biz_id`, `field_code`),
  KEY `idx_attachment_file_refs_file_id` (`file_id`, `status`),
  KEY `idx_attachment_file_refs_biz_type_id` (`biz_type`, `biz_id`, `status`)
);
```

## 四、状态枚举

| 字段 | 值 | 说明 |
|------|----|------|
| `upload_status` | `0` | 初始化 |
| `upload_status` | `1` | 上传中 |
| `upload_status` | `2` | 已完成 |
| `upload_status` | `3` | 失败 |
| `status` | `0` | 待上传 / 待处理 |
| `status` | `1` | 正常 |
| `status` | `2` | 已过期 / 已关闭 |

## 五、常用查询

### 5.1 按内容哈希查重

```sql
SELECT *
FROM `{prefix}_attachment_files`
WHERE content_hash = ?
  AND upload_status = 2
LIMIT 1;
```

### 5.2 查询会话已上传分片

```sql
SELECT chunk_index
FROM `{prefix}_attachment_file_chunks`
WHERE session_id = ?
  AND status = 1
ORDER BY chunk_index ASC;
```

### 5.3 查询文件引用数

```sql
SELECT COUNT(1) AS ref_count
FROM `{prefix}_attachment_file_refs`
WHERE file_id = ?
  AND status = 1;
```

### 5.4 查询业务附件

```sql
SELECT f.*, r.biz_type, r.biz_id, r.field_code
FROM `{prefix}_attachment_file_refs` r
JOIN `{prefix}_attachment_files` f ON f.id = r.file_id
WHERE r.biz_type = ?
  AND r.biz_id = ?
  AND r.status = 1
ORDER BY r.created_at DESC;
```

### 5.5 标记会话过期

```sql
UPDATE `{prefix}_attachment_upload_sessions`
SET status = 2,
    updated_at = NOW()
WHERE status IN (0, 1)
  AND expires_at < NOW();
```

## 六、说明

1. 物理文件唯一性以 `content_hash` 为准。
2. 删除业务记录只删引用，不直接删物理文件。
3. 物理文件删除应在引用数为 0 后走异步清理。
