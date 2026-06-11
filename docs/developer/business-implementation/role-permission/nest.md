# 角色权限 - Nest 实现

> 这里是 Nest 这一侧的实现文档，与 SQL 解释、SpringBoot 实现同级。
> 只描述 Nest 的模块、controller、service、dto、entity 和守卫，不写 SpringBoot 内容。

## 一、模块职责

| 模块 | 文件名示例 | 职责 |
|------|------|------|
| auth | `auth.controller.ts` / `auth.service.ts` | 登录、会话、当前用户 |
| users | `users.controller.ts` / `users.service.ts` | 用户列表、创建、编辑、禁用 |
| roles | `roles.controller.ts` / `roles.service.ts` | 角色列表、角色授权 |
| menus | `menus.controller.ts` / `menus.service.ts` | 菜单树、菜单维护 |
| dto | `login.dto.ts` / `assign-role-menus.dto.ts` | 入参校验 |
| entities | `role.entity.ts` / `role-menu.entity.ts` | 表结构映射 |
| common auth | `auth.guard.ts` / `current-user.decorator.ts` | 登录态与当前用户上下文 |

## 二、接口结构

| 模块 | 接口 | DTO / Response | 说明 |
|------|------|------|------|
| 登录 | `POST auth/login` | `LoginDto` / `LoginResponseDto` | 账号密码登录 |
| 当前账号 | `GET auth/me` | `CurrentUserDto` | 返回账号、角色、菜单、权限 |
| 用户 | `GET users` | `QueryUserDto` / `UserResponseDto` | 用户分页 |
| 用户 | `POST users` | `CreateUserDto` / `UserResponseDto` | 新增用户 |
| 用户 | `PATCH users/:id` | `UpdateUserDto` / `UserResponseDto` | 编辑用户 |
| 角色 | `GET roles` | `QueryRoleDto` / `RoleResponseDto` | 角色分页 |
| 角色 | `POST roles/:id/menus` | `AssignRoleMenusDto` | 分配菜单 |
| 菜单 | `GET menus/tree` | `MenuTreeNodeDto` | 菜单树 |

## 三、实现方式

### 3.1 Controller

```ts
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  list(@Query() dto: RoleQueryDto) {
    return this.rolesService.list(dto)
  }

  @Post(':id/menus')
  assignMenus(@Param('id') id: string, @Body() dto: AssignRoleMenusDto) {
    return this.rolesService.assignMenus(id, dto)
  }
}
```

### 3.2 Service

```ts
@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(RoleMenuEntity)
    private readonly roleMenuRepository: Repository<RoleMenuEntity>
  ) {}

  async list(dto: RoleQueryDto) {
    return this.roleRepository.findAndCount({
      where: { status: dto.status },
      order: { sortOrder: 'ASC', id: 'DESC' },
    })
  }

  async assignMenus(roleId: string, dto: AssignRoleMenusDto) {
    await this.roleMenuRepository.manager.transaction(async manager => {
      await manager.delete(RoleMenuEntity, { roleId })
      if (!dto.menuIds.length) return
      await manager.insert(
        RoleMenuEntity,
        dto.menuIds.map(menuId => ({ roleId, menuId }))
      )
    })
  }
}
```

### 3.3 DTO

```ts
export class AssignRoleMenusDto {
  @IsArray()
  @ArrayNotEmpty()
  menuIds: string[]
}
```

### 3.4 Entity

```ts
@Entity('ac_menus')
export class MenuEntity {
  @PrimaryColumn({ type: 'bigint' })
  id: string

  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId?: string

  @Column({ name: 'menu_key' })
  menuKey: string

  @Column()
  label: string

  @Column({ name: 'route_path', nullable: true })
  routePath?: string

  @Column({ nullable: true })
  permission?: string

  children?: MenuEntity[]
}
```

### 3.5 菜单树构建

```ts
function buildMenuTree(rows: MenuEntity[]): MenuEntity[] {
  const map = new Map(rows.map(row => [row.id, { ...row, children: [] }]))
  const roots: MenuEntity[] = []
  for (const row of map.values()) {
    if (row.parentId && map.has(row.parentId)) {
      map.get(row.parentId)?.children?.push(row)
    } else {
      roots.push(row)
    }
  }
  return roots
}
```

## 四、守卫与权限

| 组件 | 说明 |
|------|------|
| `auth.guard.ts` | 校验登录态 |
| `current-user.decorator.ts` | 获取当前用户 |
| `require-permission.decorator.ts` | 声明权限点 |

### 4.1 权限装饰器

```ts
export const RequirePermission = (permission: string) =>
  SetMetadata('permission', permission)
```

### 4.2 Guard 判断职责

| 步骤 | 说明 |
|------|------|
| 读取 metadata | 获取接口声明的权限点 |
| 读取当前用户 | 从 token/session 解析 userId |
| 查询权限集合 | 合并角色权限 |
| 判断访问 | 不满足时抛出 `ForbiddenException` |

## 五、密码与会话

| 场景 | 说明 |
|------|------|
| 密码哈希 | service 内统一 hash，不在 controller 处理 |
| token 创建 | 登录成功后创建 session 记录 |
| 当前用户 | guard 校验 token 后挂到 request |
| 响应脱敏 | 不返回 `credentialHash` |

## 六、Nest 落地顺序

1. 先写 module / controller / service 三层骨架。
2. 再补 DTO、entity、guard、decorator。
3. 最后补查询和权限判断逻辑。
4. 授权保存必须用事务，保证删除旧授权和写入新授权一致。

## 七、检查清单

| 检查项 | 结果 |
|------|------|
| DTO 是否有 class-validator | 必须 |
| 角色授权是否用 transaction | 必须 |
| 菜单树是否稳定排序 | 必须 |
| 响应是否隐藏密码哈希 | 必须 |
| 权限失败是否返回 403 | 必须 |
