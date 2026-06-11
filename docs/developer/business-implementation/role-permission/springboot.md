# 角色权限 - SpringBoot 实现

> 这里是 SpringBoot 这一侧的实现文档，与 SQL 解释、Nest 实现同级。
> 只描述 SpringBoot 的分层、接口、mapper、entity 和加密方式，不写 Nest 内容。

## 一、分层职责

| 层 | 文件名示例 | 职责 |
|------|------|------|
| controller | `AuthController.java` / `RoleController.java` | 接收请求、调用 service、返回统一结果 |
| service | `RoleService.java` | 定义业务接口 |
| service impl | `RoleServiceImpl.java` | 事务、授权编排、调用 MyBatis-Plus service / mapper |
| mapper | `RoleMapper.java` / `MenuMapper.java` | 复杂查询入口，基础 CRUD 交给 MyBatis-Plus |
| entity | `Role.java` / `Menu.java` / `RoleMenu.java` | 表结构映射 |
| dto | `LoginDTO.java` / `AssignRoleMenusDTO.java` | 入参与校验 |
| vo | `LoginVO.java` / `MenuTreeVO.java` | 响应字段控制 |
| annotation / aspect | `RequirePermission.java` / `PermissionAspect.java` | 权限横切逻辑 |

## 二、接口结构

| 模块 | 接口 | DTO / VO | 说明 |
|------|------|------|------|
| 登录 | `POST auth/login` | `LoginDTO` / `LoginVO` | 账号密码登录 |
| 当前账号 | `GET auth/me` | `CurrentUserVO` | 返回账号、角色、菜单、权限 |
| 用户 | `GET users` | `UserQueryDTO` / `UserVO` | 用户分页 |
| 用户 | `POST users` | `CreateUserDTO` / `UserVO` | 新增用户 |
| 用户 | `PATCH users/{id}` | `UpdateUserDTO` / `UserVO` | 编辑用户 |
| 角色 | `GET roles` | `RoleQueryDTO` / `RoleVO` | 角色分页 |
| 角色 | `POST roles/{id}/menus` | `AssignRoleMenusDTO` | 分配菜单 |
| 菜单 | `GET menus/tree` | `MenuTreeVO` | 菜单树 |
| 权限 | `GET permissions` | `PermissionVO` | 权限点列表 |

## 三、实现方式

### 3.1 Controller

```java
@RestController
@RequestMapping("roles")
public class RoleController {

  @GetMapping
  public ApiResult<PageResult<RoleVO>> list(RoleQueryDTO dto) {
    return ApiResult.ok(roleService.list(dto));
  }

  @PostMapping("/{id}/menus")
  public ApiResult<Void> assignMenus(
      @PathVariable Long id,
      @RequestBody AssignRoleMenusDTO dto
  ) {
    roleService.assignMenus(id, dto);
    return ApiResult.ok();
  }
}
```

### 3.2 Service

```java
@Service
public class RoleServiceImpl implements RoleService {

  private final RoleMapper roleMapper;
  private final RoleMenuService roleMenuService;

  @Override
  public PageResult<RoleVO> list(RoleQueryDTO dto) {
    return roleMapper.selectPaged(dto);
  }

  @Override
  @Transactional(rollbackFor = Exception.class)
  public void assignMenus(Long roleId, AssignRoleMenusDTO dto) {
    roleMenuService.remove(
      Wrappers.<RoleMenu>lambdaQuery().eq(RoleMenu::getRoleId, roleId)
    );
    if (dto.getMenuIds() == null || dto.getMenuIds().isEmpty()) {
      return;
    }
    List<RoleMenu> rows = dto.getMenuIds().stream()
      .map(menuId -> RoleMenu.create(idGenerator.nextId(), roleId, menuId))
      .toList();
    roleMenuService.saveBatch(rows);
  }
}
```

### 3.3 DTO / VO

```java
public class AssignRoleMenusDTO {
  @NotNull
  private Long roleId;

  @NotEmpty
  private List<Long> menuIds;
}

public class MenuTreeVO {
  private Long id;
  private Long parentId;
  private String menuKey;
  private String label;
  private String routePath;
  private String permission;
  private List<MenuTreeVO> children;
}
```

### 3.4 Entity

```java
@TableName("ac_menus")
public class Menu {
  @TableId
  private Long id;
  private Long parentId;
  private String path;
  private String menuKey;
  private String label;
  private String routePath;
  private String permission;
  private Integer sortOrder;
  private Integer visible;
}
```

### 3.5 复杂查询 XML

> MyBatis-Plus 负责新增、修改、删除、批量插入等基础写入。XML 只保留树查询、聚合查询、多表查询这类复杂 SQL。

```xml
<select id="selectMenuTree" resultMap="MenuTreeMap">
  SELECT
    id, parent_id, path, menu_key, label, icon,
    route_path, permission, area, component,
    sort_order, visible
  FROM ac_menus
  WHERE visible = 1
  ORDER BY sort_order, id
</select>
```

## 四、加密方式

| 场景 | 规则 |
|------|------|
| 密码存储 | 只存哈希 |
| 密码校验 | 盐值 + 哈希比较 |
| 敏感字段 | 入库前处理，返回前脱敏 |

### 4.1 密码工具边界

```java
public final class PasswordUtils {
  public static String hash(String plainPassword) {
    return BCrypt.hashpw(plainPassword, BCrypt.gensalt());
  }

  public static boolean verify(String plainPassword, String passwordHash) {
    return BCrypt.checkpw(plainPassword, passwordHash);
  }
}
```

## 五、权限拦截

### 5.1 注解

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequirePermission {
  String value();
}
```

### 5.2 切面职责

| 步骤 | 说明 |
|------|------|
| 读取注解 | 获取接口需要的权限点 |
| 读取当前用户 | 从 SecurityContext 或 token 上下文获取 accountId |
| 查询权限集合 | 合并用户所有角色的权限 |
| 判断是否包含 | 不包含时抛出 403 |

## 六、SpringBoot 落地顺序

1. 先写 controller / service / mapper 三层骨架。
2. 再补 DTO、VO、entity。
3. 最后补复杂查询 XML 和加密工具。
4. 权限拦截最后接入，避免基础 CRUD 未完成时被横切逻辑干扰。

## 七、检查清单

| 检查项 | 结果 |
|------|------|
| 角色授权是否使用事务 | 必须 |
| `role_menus` 是否先删后插 | 必须 |
| 菜单树是否过滤 `visible` | 必须 |
| 密码哈希是否不可逆 | 必须 |
| VO 是否隐藏 `credential_hash` | 必须 |
