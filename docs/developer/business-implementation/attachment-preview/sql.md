# 附件预览 - SQL 解释

> 只放预览元数据、预览任务、预览产物、常用查询。

## 一、SQL 范围

| 类别 | 说明 |
|------|------|
| 预览元数据 | 文件类型识别、预览类型、状态 |
| 预览任务 | 异步转换、失败重试 |
| 预览产物 | PDF / HTML / 缩略图 / 文本提取 |
| 查询语句 | 按文件、状态、业务对象查询 |

## 二、公共表结构

| 表 | 用途 |
|----|------|
| `attachment_preview_profiles` | 附件预览主记录 |
| `attachment_preview_jobs` | 预览任务队列 |
| `attachment_preview_artifacts` | 预览产物记录 |

## 三、建表示意

### 3.1 预览主表

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_attachment_preview_profiles` (
  `id` BIGINT PRIMARY KEY COMMENT '预览记录ID（雪花ID）',
  `file_id` BIGINT NOT NULL COMMENT '文件ID，关联 attachment_files.id',
  `original_name` VARCHAR(255) NOT NULL COMMENT '原始文件名',
  `ext` VARCHAR(32) COMMENT '文件扩展名（可空）',
  `mime_type` VARCHAR(128) COMMENT 'MIME 类型（可空）',
  `size_bytes` BIGINT NOT NULL DEFAULT 0 COMMENT '文件字节数',
  `preview_type` VARCHAR(32) NOT NULL COMMENT '预览类型：pdf/html/image/text/none 等',
  `preview_status` TINYINT NOT NULL DEFAULT 0 COMMENT '预览状态：0=待生成，1=生成中，2=已完成，3=失败，4=不支持',
  `thumbnail_key` VARCHAR(512) COMMENT '缩略图存储 key（可空）',
  `preview_error` VARCHAR(512) COMMENT '预览失败错误信息（可空）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL COMMENT '更新时间',
  UNIQUE KEY `uk_attachment_preview_profiles_file_id` (`file_id`),
  KEY `idx_attachment_preview_profiles_type_status` (`preview_type`, `preview_status`),
  KEY `idx_attachment_preview_profiles_updated_at` (`updated_at`)
) COMMENT = '附件预览主记录表';
```

### 3.2 预览任务表

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_attachment_preview_jobs` (
  `id` BIGINT PRIMARY KEY COMMENT '任务ID（雪花ID）',
  `file_id` BIGINT NOT NULL COMMENT '文件ID，关联 attachment_files.id',
  `job_type` VARCHAR(32) NOT NULL COMMENT '任务类型：pdf_convert/thumbnail/extract_text 等',
  `job_status` TINYINT NOT NULL DEFAULT 0 COMMENT '任务状态：0=待执行，1=执行中，2=成功，3=失败',
  `attempt_count` INT NOT NULL DEFAULT 0 COMMENT '已尝试次数（用于重试控制）',
  `payload_json` JSON COMMENT '任务参数（JSON，可空）',
  `error_message` VARCHAR(512) COMMENT '失败错误信息（可空）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL COMMENT '更新时间',
  `completed_at` DATETIME COMMENT '完成时间（可空）',
  KEY `idx_attachment_preview_jobs_file_id` (`file_id`),
  KEY `idx_attachment_preview_jobs_status_type` (`job_status`, `job_type`, `created_at`)
) COMMENT = '预览任务队列表';
```

### 3.3 预览产物表

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_attachment_preview_artifacts` (
  `id` BIGINT PRIMARY KEY COMMENT '产物ID（雪花ID）',
  `file_id` BIGINT NOT NULL COMMENT '文件ID，关联 attachment_files.id',
  `artifact_type` VARCHAR(32) NOT NULL COMMENT '产物类型：pdf/html/image/text/thumb 等',
  `storage_key` VARCHAR(512) NOT NULL COMMENT '产物存储 key（MinIO 路径）',
  `content_type` VARCHAR(128) COMMENT '产物 MIME 类型（可空）',
  `size_bytes` BIGINT NOT NULL DEFAULT 0 COMMENT '产物字节数',
  `page_count` INT COMMENT '产物页数（图片产物可空，PDF/多页场景必填）',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序值，用于多页产物顺序',
  `created_at` DATETIME NOT NULL COMMENT '创建时间',
  UNIQUE KEY `uk_attachment_preview_artifacts_file_type_order` (`file_id`, `artifact_type`, `sort_order`),
  KEY `idx_attachment_preview_artifacts_file_id` (`file_id`)
) COMMENT = '预览产物记录表';
```

## 四、状态枚举

| 字段 | 值 | 说明 |
|------|----|------|
| `preview_status` | `0` | 待生成 |
| `preview_status` | `1` | 生成中 |
| `preview_status` | `2` | 已完成 |
| `preview_status` | `3` | 失败 |
| `preview_status` | `4` | 不支持 |
| `job_status` | `0` | 待执行 |
| `job_status` | `1` | 执行中 |
| `job_status` | `2` | 成功 |
| `job_status` | `3` | 失败 |

## 五、常用查询

### 5.1 查询文件预览主记录

```sql
SELECT *
FROM `{prefix}_attachment_preview_profiles`
WHERE file_id = ?;
```

### 5.2 查询文件预览产物

```sql
SELECT *
FROM `{prefix}_attachment_preview_artifacts`
WHERE file_id = ?
ORDER BY artifact_type, sort_order ASC;
```

### 5.3 查询待处理预览任务

```sql
SELECT *
FROM `{prefix}_attachment_preview_jobs`
WHERE job_status = 0
ORDER BY created_at ASC
LIMIT ?;
```

### 5.4 查询失败任务

```sql
SELECT *
FROM `{prefix}_attachment_preview_jobs`
WHERE job_status = 3
ORDER BY updated_at DESC
LIMIT ? OFFSET ?;
```

### 5.5 更新预览状态为完成

```sql
UPDATE `{prefix}_attachment_preview_profiles`
SET preview_status = 2,
    preview_error = NULL,
    updated_at = NOW()
WHERE file_id = ?;
```

## 六、说明

1. 预览主表只保留当前状态，不堆积历史日志。
2. 产物表支持一个文件生成多页图片、多段文本、多种预览产物。
3. 复杂格式优先转 PDF，再由前端统一走 PDF 预览。
4. 建表语句每个字段必须带 `COMMENT`，表必须带表级 `COMMENT`；枚举型字段（`preview_status` / `job_status` 等）须在注释中列出全部取值含义。
5. 外键字段须在注释中标注关联表与字段，如"文件ID，关联 attachment_files.id"。
