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
  `id` BIGINT PRIMARY KEY COMMENT '文件ID（雪花ID）',
  `content_hash` CHAR(64) NOT NULL COMMENT '文件内容哈希（sha256，用于去重）',
  `original_name` VARCHAR(255) NOT NULL COMMENT '原始文件名',
  `ext` VARCHAR(32) COMMENT '文件扩展名（可空）',
  `mime_type` VARCHAR(128) COMMENT 'MIME 类型（可空）',
  `size_bytes` BIGINT NOT NULL DEFAULT 0 COMMENT '文件字节数',
  `storage_key` VARCHAR(512) COMMENT '存储 key（MinIO 路径，可空表示未上传完成）',
  `storage_provider` VARCHAR(32) NOT NULL DEFAULT 'minio' COMMENT '存储提供方：minio/oss/cos 等',
  `upload_status` TINYINT NOT NULL DEFAULT 0 COMMENT '上传状态：0=初始化，1=上传中，2=已完成，3=失败',
  `preview_status` TINYINT NOT NULL DEFAULT 0 COMMENT '预览状态：0=待生成，1=生成中，2=已完成，3=失败，4=不支持',
  `created_by` BIGINT COMMENT '上传人账号ID，关联 accounts.id（可空）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL COMMENT '更新时间',
  UNIQUE KEY `uk_attachment_files_content_hash` (`content_hash`),
  KEY `idx_attachment_files_status` (`upload_status`, `created_at`)
) COMMENT = '文件主表（物理文件唯一记录）';
```

### 3.2 上传会话表

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_attachment_upload_sessions` (
  `id` BIGINT PRIMARY KEY COMMENT '会话ID（雪花ID）',
  `session_no` VARCHAR(64) NOT NULL COMMENT '会话编号（前端生成，断点续传凭证）',
  `file_id` BIGINT NOT NULL COMMENT '文件ID，关联 attachment_files.id',
  `chunk_size_bytes` BIGINT NOT NULL COMMENT '分片大小（字节）',
  `chunk_total` INT NOT NULL COMMENT '总分片数',
  `uploaded_count` INT NOT NULL DEFAULT 0 COMMENT '已上传分片数',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '会话状态：0=待上传，1=正常（上传中/已完成），2=已过期/已关闭',
  `expires_at` DATETIME COMMENT '过期时间（可空）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL COMMENT '更新时间',
  UNIQUE KEY `uk_attachment_upload_sessions_no` (`session_no`),
  KEY `idx_attachment_upload_sessions_file_id` (`file_id`),
  KEY `idx_attachment_upload_sessions_status` (`status`, `expires_at`)
) COMMENT = '上传会话表（断点续传）';
```

### 3.3 分片表

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_attachment_file_chunks` (
  `id` BIGINT PRIMARY KEY COMMENT '分片ID（雪花ID）',
  `session_id` BIGINT NOT NULL COMMENT '会话ID，关联 attachment_upload_sessions.id',
  `chunk_index` INT NOT NULL COMMENT '分片序号（从 0 或 1 起，按约定统一）',
  `chunk_hash` CHAR(64) NOT NULL COMMENT '分片内容哈希（sha256，用于校验）',
  `size_bytes` BIGINT NOT NULL DEFAULT 0 COMMENT '分片字节数',
  `storage_key` VARCHAR(512) COMMENT '分片存储 key（可空表示未上传完成）',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '分片状态：0=待上传，1=正常，2=已过期/已关闭',
  `created_at` DATETIME NOT NULL COMMENT '创建时间',
  `uploaded_at` DATETIME COMMENT '上传完成时间（可空）',
  UNIQUE KEY `uk_attachment_file_chunks_session_index` (`session_id`, `chunk_index`),
  KEY `idx_attachment_file_chunks_session_id` (`session_id`)
) COMMENT = '分片记录表';
```

### 3.4 文件引用表

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_attachment_file_refs` (
  `id` BIGINT PRIMARY KEY COMMENT '引用ID（雪花ID）',
  `file_id` BIGINT NOT NULL COMMENT '文件ID，关联 attachment_files.id',
  `biz_type` VARCHAR(64) NOT NULL COMMENT '业务类型：order/contract/task 等',
  `biz_id` BIGINT NOT NULL COMMENT '业务对象ID',
  `field_code` VARCHAR(64) NOT NULL COMMENT '字段编码（同一业务多个附件字段的区分）',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '引用状态：0=待上传/待处理，1=正常，2=已过期/已关闭',
  `created_by` BIGINT COMMENT '创建人账号ID，关联 accounts.id（可空）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间',
  UNIQUE KEY `uk_attachment_file_refs_biz` (`file_id`, `biz_type`, `biz_id`, `field_code`),
  KEY `idx_attachment_file_refs_file_id` (`file_id`, `status`),
  KEY `idx_attachment_file_refs_biz_type_id` (`biz_type`, `biz_id`, `status`)
) COMMENT = '文件引用表（多业务引用同一文件）';
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
4. 建表语句每个字段必须带 `COMMENT`，表必须带表级 `COMMENT`；枚举型字段（`upload_status` / `preview_status` / `status` 等）须在注释中列出全部取值含义。
5. 外键字段须在注释中标注关联表与字段，如"文件ID，关联 attachment_files.id"。
