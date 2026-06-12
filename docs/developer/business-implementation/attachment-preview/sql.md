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
  `id` BIGINT PRIMARY KEY,
  `file_id` BIGINT NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `ext` VARCHAR(32),
  `mime_type` VARCHAR(128),
  `size_bytes` BIGINT NOT NULL DEFAULT 0,
  `preview_type` VARCHAR(32) NOT NULL,
  `preview_status` TINYINT NOT NULL DEFAULT 0,
  `thumbnail_key` VARCHAR(512),
  `preview_error` VARCHAR(512),
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  UNIQUE KEY `uk_attachment_preview_profiles_file_id` (`file_id`),
  KEY `idx_attachment_preview_profiles_type_status` (`preview_type`, `preview_status`),
  KEY `idx_attachment_preview_profiles_updated_at` (`updated_at`)
);
```

### 3.2 预览任务表

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_attachment_preview_jobs` (
  `id` BIGINT PRIMARY KEY,
  `file_id` BIGINT NOT NULL,
  `job_type` VARCHAR(32) NOT NULL,
  `job_status` TINYINT NOT NULL DEFAULT 0,
  `attempt_count` INT NOT NULL DEFAULT 0,
  `payload_json` JSON,
  `error_message` VARCHAR(512),
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `completed_at` DATETIME,
  KEY `idx_attachment_preview_jobs_file_id` (`file_id`),
  KEY `idx_attachment_preview_jobs_status_type` (`job_status`, `job_type`, `created_at`)
);
```

### 3.3 预览产物表

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_attachment_preview_artifacts` (
  `id` BIGINT PRIMARY KEY,
  `file_id` BIGINT NOT NULL,
  `artifact_type` VARCHAR(32) NOT NULL,
  `storage_key` VARCHAR(512) NOT NULL,
  `content_type` VARCHAR(128),
  `size_bytes` BIGINT NOT NULL DEFAULT 0,
  `page_count` INT,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL,
  UNIQUE KEY `uk_attachment_preview_artifacts_file_type_order` (`file_id`, `artifact_type`, `sort_order`),
  KEY `idx_attachment_preview_artifacts_file_id` (`file_id`)
);
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
