# 角色权限 - SQL 解释

> 这里只放公共 SQL：建表语句、索引、查询语句、种子数据说明。
> 不放 SpringBoot / Nest 的代码实现，避免把数据库层和语言层混在一起。

## 一、SQL 范围

| 类别 | 说明 |
|------|------|
| 建表语句 | 角色权限相关的表结构 |
| 索引语句 | 列表页、树查询、授权查询需要的索引 |
| 查询语句 | 菜单树、角色授权、用户合并权限 |
| 种子数据 | 管理员、默认角色、默认菜单 |

## 二、公共表结构

| 表 | 用途 |
|------|------|
| `accounts` | 账号主体 |
| `auth_sessions` | 登录会话 |
| `provider_bindings` | 外部身份绑定 |
| `roles` | 角色定义 |
| `user_roles` | 账号与角色关系 |
| `menus` | 菜单与页面入口 |
| `role_menus` | 角色与菜单关系 |
| `permissions` | 动作级权限 |
| `role_permissions` | 角色与权限关系 |

## 三、建表示意

### 3.1 账号与外部身份

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_accounts` (
  `id` BIGINT PRIMARY KEY,
  `account` VARCHAR(64) NOT NULL,
  `display_name` VARCHAR(128) NOT NULL,
  `credential_hash` VARCHAR(255) NOT NULL,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  UNIQUE KEY `uk_accounts_account` (`account`)
);

CREATE TABLE IF NOT EXISTS `{prefix}_auth_sessions` (
  `id` BIGINT PRIMARY KEY,
  `account_id` BIGINT NOT NULL,
  `access_token` VARCHAR(128) NOT NULL,
  `refresh_token` VARCHAR(128) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL,
  UNIQUE KEY `uk_auth_sessions_access_token` (`access_token`),
  KEY `idx_auth_sessions_account_id` (`account_id`)
);

CREATE TABLE IF NOT EXISTS `{prefix}_provider_bindings` (
  `id` BIGINT PRIMARY KEY,
  `account_id` BIGINT NOT NULL,
  `provider_name` VARCHAR(64) NOT NULL,
  `provider_subject` VARCHAR(128) NOT NULL,
  `provider_email` VARCHAR(128),
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  UNIQUE KEY `uk_provider_subject` (`provider_name`, `provider_subject`),
  KEY `idx_provider_bindings_account_id` (`account_id`)
);
```

### 3.2 角色、菜单、权限

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_roles` (
  `id` BIGINT PRIMARY KEY,
  `role_key` VARCHAR(64) NOT NULL,
  `label` VARCHAR(64) NOT NULL,
  `description` VARCHAR(256),
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_system` TINYINT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  UNIQUE KEY `uk_role_key` (`role_key`)
);

CREATE TABLE IF NOT EXISTS `{prefix}_user_roles` (
  `id` BIGINT PRIMARY KEY,
  `account_id` BIGINT NOT NULL,
  `role_id` BIGINT NOT NULL,
  `created_at` DATETIME NOT NULL,
  UNIQUE KEY `uk_user_role` (`account_id`, `role_id`)
);

CREATE TABLE IF NOT EXISTS `{prefix}_menus` (
  `id` BIGINT PRIMARY KEY,
  `parent_id` BIGINT,
  `path` VARCHAR(512) NOT NULL DEFAULT '',
  `menu_key` VARCHAR(64) NOT NULL,
  `label` VARCHAR(64) NOT NULL,
  `icon` VARCHAR(64),
  `route_path` VARCHAR(256),
  `permission` VARCHAR(128),
  `area` VARCHAR(32) NOT NULL DEFAULT 'admin',
  `component` VARCHAR(256),
  `sort_order` INT NOT NULL DEFAULT 0,
  `visible` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  UNIQUE KEY `uk_menus_menu_key` (`menu_key`)
);

CREATE TABLE IF NOT EXISTS `{prefix}_role_menus` (
  `id` BIGINT PRIMARY KEY,
  `role_id` BIGINT NOT NULL,
  `menu_id` BIGINT NOT NULL,
  `created_at` DATETIME NOT NULL,
  UNIQUE KEY `uk_role_menu` (`role_id`, `menu_id`)
);

CREATE TABLE IF NOT EXISTS `{prefix}_permissions` (
  `id` BIGINT PRIMARY KEY,
  `permission_key` VARCHAR(128) NOT NULL,
  `label` VARCHAR(64) NOT NULL,
  `description` VARCHAR(256),
  `created_at` DATETIME NOT NULL,
  UNIQUE KEY `uk_permissions_key` (`permission_key`)
);

CREATE TABLE IF NOT EXISTS `{prefix}_role_permissions` (
  `id` BIGINT PRIMARY KEY,
  `role_id` BIGINT NOT NULL,
  `permission_id` BIGINT NOT NULL,
  `created_at` DATETIME NOT NULL,
  UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`)
);
```

## 四、索引示意

```sql
CREATE INDEX `idx_user_roles_account_id` ON `{prefix}_user_roles` (`account_id`);
CREATE INDEX `idx_role_menus_role_id` ON `{prefix}_role_menus` (`role_id`);
CREATE INDEX `idx_role_menus_menu_id` ON `{prefix}_role_menus` (`menu_id`);
CREATE INDEX `idx_role_permissions_role_id` ON `{prefix}_role_permissions` (`role_id`);
CREATE INDEX `idx_role_permissions_permission_id` ON `{prefix}_role_permissions` (`permission_id`);
CREATE INDEX `idx_menus_parent_id_sort_order` ON `{prefix}_menus` (`parent_id`, `sort_order`, `id`);
CREATE INDEX `idx_menus_area_visible` ON `{prefix}_menus` (`area`, `visible`, `sort_order`);
```

## 五、查询语句示意

### 5.1 查询角色菜单树

```sql
SELECT m.*
FROM `{prefix}_menus` m
JOIN `{prefix}_role_menus` rm ON rm.menu_id = m.id
WHERE rm.role_id = ?
  AND m.visible = 1
ORDER BY m.sort_order, m.id;
```

### 5.2 查询用户合并菜单

```sql
SELECT DISTINCT m.*
FROM `{prefix}_menus` m
JOIN `{prefix}_role_menus` rm ON rm.menu_id = m.id
JOIN `{prefix}_user_roles` ur ON ur.role_id = rm.role_id
WHERE ur.account_id = ?
  AND m.visible = 1
  AND m.area = ?
ORDER BY m.sort_order, m.id;
```

### 5.3 递归菜单树

```sql
WITH RECURSIVE menu_tree AS (
  SELECT *
  FROM `{prefix}_menus`
  WHERE parent_id IS NULL

  UNION ALL

  SELECT m.*
  FROM `{prefix}_menus` m
  JOIN menu_tree t ON m.parent_id = t.id
)
SELECT *
FROM menu_tree
ORDER BY sort_order, id;
```

### 5.4 查询用户权限点

```sql
SELECT DISTINCT p.permission_key
FROM `{prefix}_permissions` p
JOIN `{prefix}_role_permissions` rp ON rp.permission_id = p.id
JOIN `{prefix}_user_roles` ur ON ur.role_id = rp.role_id
WHERE ur.account_id = ?
ORDER BY p.permission_key;
```

### 5.5 保存角色菜单前清理旧授权

```sql
DELETE FROM `{prefix}_role_menus`
WHERE role_id = ?;
```

```sql
INSERT INTO `{prefix}_role_menus` (`id`, `role_id`, `menu_id`, `created_at`)
VALUES (?, ?, ?, NOW());
```

## 六、默认种子数据

### 6.1 默认角色

```sql
INSERT INTO `{prefix}_roles`
  (`id`, `role_key`, `label`, `description`, `sort_order`, `is_system`, `status`, `created_at`, `updated_at`)
SELECT
  7400000000000001, 'admin', '管理员', '拥有全部菜单和权限', 1, 1, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `{prefix}_roles` WHERE `role_key` = 'admin'
);
```

### 6.2 默认菜单分组

```sql
INSERT INTO `{prefix}_menus`
  (`id`, `parent_id`, `path`, `menu_key`, `label`, `icon`, `route_path`, `permission`, `area`, `component`, `sort_order`, `visible`, `created_at`, `updated_at`)
SELECT
  7200000000000102, NULL, ',7200000000000102,', 'group_admin', '后台管理', 'Menu', NULL, NULL, 'admin', NULL, 1, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `{prefix}_menus` WHERE `menu_key` = 'group_admin'
);
```

### 6.3 管理员绑定全部菜单

```sql
INSERT INTO `{prefix}_role_menus` (`id`, `role_id`, `menu_id`, `created_at`)
SELECT
  menu.id + 1000000000000000,
  7400000000000001,
  menu.id,
  NOW()
FROM `{prefix}_menus` menu
WHERE NOT EXISTS (
  SELECT 1
  FROM `{prefix}_role_menus` rm
  WHERE rm.role_id = 7400000000000001
    AND rm.menu_id = menu.id
);
```

## 七、SQL 解释原则

1. 每条 SQL 都要说明“给谁用、为什么用、是否需要索引”。
2. 公共 SQL 只写平台无关部分，不写 Nest / SpringBoot 的函数名。
3. 如果一条 SQL 只服务一个页面，也要保留为可复用查询模板。
4. 授权关系表必须有唯一键，避免重复授权导致菜单树重复。
5. 菜单树可以用 `parent_id` 构建，也可以用 `path` 加速祖先链查询。
