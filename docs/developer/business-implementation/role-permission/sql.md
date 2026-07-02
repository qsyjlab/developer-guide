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
  `id` BIGINT PRIMARY KEY COMMENT '账号ID（雪花ID）',
  `account` VARCHAR(64) NOT NULL COMMENT '登录账号（用户名/邮箱/手机号）',
  `display_name` VARCHAR(128) NOT NULL COMMENT '展示名称（昵称）',
  `credential_hash` VARCHAR(255) NOT NULL COMMENT '凭证哈希（密码 bcrypt/argon2）',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1=启用，0=禁用，-1=锁定',
  `created_at` DATETIME NOT NULL COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL COMMENT '更新时间',
  UNIQUE KEY `uk_accounts_account` (`account`)
) COMMENT = '账号主体表';

CREATE TABLE IF NOT EXISTS `{prefix}_auth_sessions` (
  `id` BIGINT PRIMARY KEY COMMENT '会话ID（雪花ID）',
  `account_id` BIGINT NOT NULL COMMENT '账号ID，关联 accounts.id',
  `access_token` VARCHAR(128) NOT NULL COMMENT '访问令牌',
  `refresh_token` VARCHAR(128) NOT NULL COMMENT '刷新令牌',
  `expires_at` DATETIME NOT NULL COMMENT '会话过期时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间',
  UNIQUE KEY `uk_auth_sessions_access_token` (`access_token`),
  KEY `idx_auth_sessions_account_id` (`account_id`)
) COMMENT = '登录会话表';

CREATE TABLE IF NOT EXISTS `{prefix}_provider_bindings` (
  `id` BIGINT PRIMARY KEY COMMENT '绑定ID（雪花ID）',
  `account_id` BIGINT NOT NULL COMMENT '账号ID，关联 accounts.id',
  `provider_name` VARCHAR(64) NOT NULL COMMENT '身份提供方名称（google/github/wechat 等）',
  `provider_subject` VARCHAR(128) NOT NULL COMMENT '提供方主体ID（OpenID/UnionID）',
  `provider_email` VARCHAR(128) COMMENT '提供方返回的邮箱（可空）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL COMMENT '更新时间',
  UNIQUE KEY `uk_provider_subject` (`provider_name`, `provider_subject`),
  KEY `idx_provider_bindings_account_id` (`account_id`)
) COMMENT = '外部身份绑定表（OAuth/SSO）';
```

### 3.2 角色、菜单、权限

```sql
CREATE TABLE IF NOT EXISTS `{prefix}_roles` (
  `id` BIGINT PRIMARY KEY COMMENT '角色ID（雪花ID）',
  `role_key` VARCHAR(64) NOT NULL COMMENT '角色键（稳定唯一标识，用于代码引用）',
  `label` VARCHAR(64) NOT NULL COMMENT '角色名称（展示用）',
  `description` VARCHAR(256) COMMENT '角色描述（可空）',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序值，升序',
  `is_system` TINYINT NOT NULL DEFAULT 0 COMMENT '是否系统内置：1=是（不可删），0=否',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1=启用，0=禁用',
  `created_at` DATETIME NOT NULL COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL COMMENT '更新时间',
  UNIQUE KEY `uk_role_key` (`role_key`)
) COMMENT = '角色定义表';

CREATE TABLE IF NOT EXISTS `{prefix}_user_roles` (
  `id` BIGINT PRIMARY KEY COMMENT '主键ID（雪花ID）',
  `account_id` BIGINT NOT NULL COMMENT '账号ID，关联 accounts.id',
  `role_id` BIGINT NOT NULL COMMENT '角色ID，关联 roles.id',
  `created_at` DATETIME NOT NULL COMMENT '授权时间',
  UNIQUE KEY `uk_user_role` (`account_id`, `role_id`)
) COMMENT = '账号-角色关系表（多对多）';

CREATE TABLE IF NOT EXISTS `{prefix}_menus` (
  `id` BIGINT PRIMARY KEY COMMENT '菜单ID（雪花ID）',
  `parent_id` BIGINT COMMENT '父菜单ID，NULL=顶级菜单',
  `path` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '祖先链路径，逗号分隔，如 ,1,2,3,',
  `menu_key` VARCHAR(64) NOT NULL COMMENT '菜单键（稳定唯一标识）',
  `label` VARCHAR(64) NOT NULL COMMENT '菜单名称（展示用）',
  `icon` VARCHAR(64) COMMENT '菜单图标名（可空）',
  `route_path` VARCHAR(256) COMMENT '前端路由路径（可空，分组节点为空）',
  `permission` VARCHAR(128) COMMENT '菜单访问权限标识（可空，预留按钮级控制）',
  `area` VARCHAR(32) NOT NULL DEFAULT 'admin' COMMENT '所属区域：admin=后台，workbench=工作台等',
  `component` VARCHAR(256) COMMENT '前端组件路径（可空，分组节点为空）',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序值，升序',
  `visible` TINYINT NOT NULL DEFAULT 1 COMMENT '是否可见：1=显示，0=隐藏（隐藏但仍可路由）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL COMMENT '更新时间',
  UNIQUE KEY `uk_menus_menu_key` (`menu_key`)
) COMMENT = '菜单与页面入口表';

CREATE TABLE IF NOT EXISTS `{prefix}_role_menus` (
  `id` BIGINT PRIMARY KEY COMMENT '主键ID（雪花ID）',
  `role_id` BIGINT NOT NULL COMMENT '角色ID，关联 roles.id',
  `menu_id` BIGINT NOT NULL COMMENT '菜单ID，关联 menus.id',
  `created_at` DATETIME NOT NULL COMMENT '授权时间',
  UNIQUE KEY `uk_role_menu` (`role_id`, `menu_id`)
) COMMENT = '角色-菜单关系表（多对多）';

CREATE TABLE IF NOT EXISTS `{prefix}_permissions` (
  `id` BIGINT PRIMARY KEY COMMENT '权限ID（雪花ID）',
  `permission_key` VARCHAR(128) NOT NULL COMMENT '权限键（动作级唯一标识，如 user:delete）',
  `label` VARCHAR(64) NOT NULL COMMENT '权限名称（展示用）',
  `description` VARCHAR(256) COMMENT '权限描述（可空）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间',
  UNIQUE KEY `uk_permissions_key` (`permission_key`)
) COMMENT = '动作级权限点表';

CREATE TABLE IF NOT EXISTS `{prefix}_role_permissions` (
  `id` BIGINT PRIMARY KEY COMMENT '主键ID（雪花ID）',
  `role_id` BIGINT NOT NULL COMMENT '角色ID，关联 roles.id',
  `permission_id` BIGINT NOT NULL COMMENT '权限ID，关联 permissions.id',
  `created_at` DATETIME NOT NULL COMMENT '授权时间',
  UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`)
) COMMENT = '角色-权限关系表（多对多）';
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

1. 每条 SQL 都要说明"给谁用、为什么用、是否需要索引"。
2. 公共 SQL 只写平台无关部分，不写 Nest / SpringBoot 的函数名。
3. 如果一条 SQL 只服务一个页面，也要保留为可复用查询模板。
4. 授权关系表必须有唯一键，避免重复授权导致菜单树重复。
5. 菜单树可以用 `parent_id` 构建，也可以用 `path` 加速祖先链查询。
6. 建表语句每个字段必须带 `COMMENT`，表必须带表级 `COMMENT`；枚举型字段（`status` / `visible` / `is_system` 等）须在注释中列出全部取值含义。
7. 外键字段须在注释中标注关联表与字段，如"账号ID，关联 accounts.id"。
