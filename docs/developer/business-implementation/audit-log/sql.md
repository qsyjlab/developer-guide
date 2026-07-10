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
  `id` BIGINT PRIMARY KEY COMMENT '日志ID（雪花ID）',
  `account_id` BIGINT COMMENT '操作账号ID，关联 accounts.id（可空，匿名操作为空）',
  `module` VARCHAR(64) NOT NULL COMMENT '业务模块：user/role/order 等',
  `action` VARCHAR(64) NOT NULL COMMENT '业务动作：create/update/delete/export 等',
  `result` TINYINT NOT NULL DEFAULT 1 COMMENT '操作结果：1=成功，0=失败',
  `request_id` VARCHAR(64) NOT NULL COMMENT '请求链路ID，用于串联 api_logs 与 audit_records',
  `ip` VARCHAR(64) COMMENT '客户端IP（可空）',
  `user_agent` VARCHAR(512) COMMENT '客户端 User-Agent（可空）',
  `cost_ms` INT NOT NULL DEFAULT 0 COMMENT '业务耗时（毫秒）',
  `message` VARCHAR(1024) COMMENT '日志正文（脱敏后摘要，可空）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间'
) COMMENT = '操作日志表（业务级动作）';
```

### 3.2 接口日志

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_api_logs` (
  `id` BIGINT PRIMARY KEY COMMENT '日志ID（雪花ID）',
  `request_id` VARCHAR(64) NOT NULL COMMENT '请求链路ID，用于串联 operation_logs 与 audit_records',
  `account_id` BIGINT COMMENT '访问账号ID，关联 accounts.id（可空，匿名访问为空）',
  `method` VARCHAR(16) NOT NULL COMMENT 'HTTP 方法：GET/POST/PUT/DELETE 等',
  `path` VARCHAR(512) NOT NULL COMMENT '实际请求路径（含参数值）',
  `path_pattern` VARCHAR(512) COMMENT '路由模板（如 /users/:id，可空）',
  `status_code` INT NOT NULL COMMENT 'HTTP 状态码：200/401/500 等',
  `success` TINYINT NOT NULL DEFAULT 1 COMMENT '是否成功：1=成功，0=失败（5xx/异常）',
  `cost_ms` INT NOT NULL DEFAULT 0 COMMENT '接口耗时（毫秒）',
  `ip` VARCHAR(64) COMMENT '客户端IP（可空）',
  `user_agent` VARCHAR(512) COMMENT '客户端 User-Agent（可空）',
  `error_message` VARCHAR(1024) COMMENT '错误信息（可空，脱敏后）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间'
) COMMENT = '接口日志表（请求级事实）';
```

### 3.3 审计记录

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_audit_records` (
  `id` BIGINT PRIMARY KEY COMMENT '审计ID（雪花ID）',
  `request_id` VARCHAR(64) NOT NULL COMMENT '请求链路ID，用于串联 operation_logs 与 api_logs',
  `account_id` BIGINT COMMENT '操作账号ID，关联 accounts.id（可空，系统操作为空）',
  `target_type` VARCHAR(64) NOT NULL COMMENT '审计对象类型：user/role/order 等',
  `target_id` BIGINT COMMENT '审计对象ID（可空，针对类级别操作为空）',
  `operation` VARCHAR(64) NOT NULL COMMENT '审计操作：create/update/delete/grant/revoke 等',
  `before_snapshot` JSON COMMENT '变更前快照（JSON，新增时为空）',
  `after_snapshot` JSON COMMENT '变更后快照（JSON，删除时为空）',
  `message` VARCHAR(1024) COMMENT '审计说明（可空）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间'
) COMMENT = '审计记录表（关键对象变化）';
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
5. 建表语句每个字段必须带 `COMMENT`，表必须带表级 `COMMENT`；枚举型字段（`result` / `success` 等）须在注释中列出全部取值含义。
6. 外键字段须在注释中标注关联表与字段，如"操作账号ID，关联 accounts.id"。
