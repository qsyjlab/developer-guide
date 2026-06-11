# 日志审计 - SQL 解释

> 这里只放公共 SQL：建表语句、索引、查询语句、归档策略说明。
> 不放 SpringBoot / Nest 的代码实现。

## 一、SQL 范围

| 类别 | 说明 |
|------|------|
| 建表语句 | 操作日志、接口日志、审计记录 |
| 索引语句 | 按时间、账号、模块、请求链路查询 |
| 查询语句 | 分页查询、详情查询、统计聚合 |
| 归档策略 | 按月归档、定期清理、导出留痕 |

## 二、公共表结构

| 表 | 用途 |
|------|------|
| `operation_logs` | 记录业务操作 |
| `api_logs` | 记录接口访问 |
| `audit_records` | 记录关键审计事件 |

## 三、建表示意

### 3.1 操作日志

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_operation_logs` (
  `id` BIGINT PRIMARY KEY,
  `account_id` BIGINT,
  `module` VARCHAR(64) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `result` TINYINT NOT NULL DEFAULT 1,
  `request_id` VARCHAR(64) NOT NULL,
  `ip` VARCHAR(64),
  `user_agent` VARCHAR(512),
  `cost_ms` INT NOT NULL DEFAULT 0,
  `message` VARCHAR(1024),
  `created_at` DATETIME NOT NULL
);
```

### 3.2 接口日志

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_api_logs` (
  `id` BIGINT PRIMARY KEY,
  `request_id` VARCHAR(64) NOT NULL,
  `account_id` BIGINT,
  `method` VARCHAR(16) NOT NULL,
  `path` VARCHAR(512) NOT NULL,
  `path_pattern` VARCHAR(512),
  `status_code` INT NOT NULL,
  `success` TINYINT NOT NULL DEFAULT 1,
  `cost_ms` INT NOT NULL DEFAULT 0,
  `ip` VARCHAR(64),
  `user_agent` VARCHAR(512),
  `error_message` VARCHAR(1024),
  `created_at` DATETIME NOT NULL
);
```

### 3.3 审计记录

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_audit_records` (
  `id` BIGINT PRIMARY KEY,
  `request_id` VARCHAR(64) NOT NULL,
  `account_id` BIGINT,
  `target_type` VARCHAR(64) NOT NULL,
  `target_id` BIGINT,
  `operation` VARCHAR(64) NOT NULL,
  `before_snapshot` JSON,
  `after_snapshot` JSON,
  `message` VARCHAR(1024),
  `created_at` DATETIME NOT NULL
);
```

## 四、索引示意

```sql
CREATE INDEX `idx_operation_logs_created_at` ON `{prefix}_operation_logs` (`created_at`);
CREATE INDEX `idx_operation_logs_account_id` ON `{prefix}_operation_logs` (`account_id`, `created_at`);
CREATE INDEX `idx_operation_logs_module_action` ON `{prefix}_operation_logs` (`module`, `action`, `created_at`);
CREATE INDEX `idx_operation_logs_request_id` ON `{prefix}_operation_logs` (`request_id`);
CREATE INDEX `idx_api_logs_request_id` ON `{prefix}_api_logs` (`request_id`);
CREATE INDEX `idx_api_logs_path_created_at` ON `{prefix}_api_logs` (`path_pattern`, `created_at`);
CREATE INDEX `idx_api_logs_status_created_at` ON `{prefix}_api_logs` (`status_code`, `created_at`);
CREATE INDEX `idx_audit_records_target` ON `{prefix}_audit_records` (`target_type`, `target_id`, `created_at`);
```

## 五、查询语句示意

### 5.1 分页查询操作日志

```sql
SELECT *
FROM `{prefix}_operation_logs`
WHERE created_at BETWEEN ? AND ?
  AND (account_id = ? OR ? IS NULL)
  AND (module = ? OR ? IS NULL)
  AND (action = ? OR ? IS NULL)
  AND (result = ? OR ? IS NULL)
ORDER BY created_at DESC, id DESC
LIMIT ? OFFSET ?;
```

### 5.2 按请求链路查询

```sql
SELECT *
FROM `{prefix}_operation_logs`
WHERE request_id = ?
ORDER BY created_at ASC, id ASC;
```

### 5.3 日统计聚合

```sql
SELECT
  DATE(created_at) AS stat_date,
  module,
  action,
  COUNT(*) AS total_count,
  SUM(CASE WHEN result = 1 THEN 1 ELSE 0 END) AS success_count,
  SUM(CASE WHEN result = 0 THEN 1 ELSE 0 END) AS failure_count
FROM `{prefix}_operation_logs`
WHERE created_at BETWEEN ? AND ?
GROUP BY DATE(created_at), module, action
ORDER BY stat_date DESC, total_count DESC;
```

### 5.4 接口耗时统计

```sql
SELECT
  path_pattern,
  method,
  COUNT(*) AS total_calls,
  SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS success_count,
  SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS error_count,
  AVG(cost_ms) AS avg_cost_ms,
  MAX(cost_ms) AS max_cost_ms
FROM `{prefix}_api_logs`
WHERE created_at BETWEEN ? AND ?
GROUP BY path_pattern, method
ORDER BY total_calls DESC;
```

### 5.5 查询对象审计轨迹

```sql
SELECT *
FROM `{prefix}_audit_records`
WHERE target_type = ?
  AND target_id = ?
ORDER BY created_at DESC, id DESC;
```

## 六、归档与清理

### 6.1 月度归档表

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_operation_logs_2026_06`
LIKE `{prefix}_operation_logs`;
```

### 6.2 迁移历史日志

```sql
INSERT INTO `{prefix}_operation_logs_2026_06`
SELECT *
FROM `{prefix}_operation_logs`
WHERE created_at >= '2026-06-01 00:00:00'
  AND created_at < '2026-07-01 00:00:00';
```

### 6.3 清理主表

```sql
DELETE FROM `{prefix}_operation_logs`
WHERE created_at < ?;
```

## 七、SQL 解释原则

1. 日志表必须优先保证可查、可追踪、可归档。
2. 查询索引围绕时间、账号、模块、动作、requestId 建。
3. 日志正文不存明文敏感字段，必要时只存脱敏值或摘要。
4. 接口日志记录请求级事实，操作日志记录业务级动作，审计记录保留关键对象变化。
