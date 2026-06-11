# 业务实现模板索引

> 这里是 AI 提示词与业务模板的索引。编码规范已经统一收敛到 `docs/developer/standards/`，业务模板只保留总览和具体业务子页，不再保留中转目录页。
>
> 如果某些内容可以归入现有编码规范，就优先归入规范文档；只有需要作为业务起步骨架的内容，才放到这里。

## 使用方式

1. 先复制 [通用规范](../standards/common.md#八ai-提示词公共基础) 的 AI 提示词节。
2. 再追加需要的平台扩展规范：
   - [Vue 扩展](../standards/vue.md#七ai-提示词vue)
   - [NestJS 扩展](../standards/nestjs.md#六ai-提示词nestjs)
   - [Electron 扩展](../standards/electron.md#六ai-提示词electron)
   - [主题样式](../standards/theme.md#五ai-提示词主题样式)
3. 如果是生成代码，优先按规范中的 AI 提示词节生成。
4. 需要业务起步骨架时，先选总入口，再进入对应业务子页。

## 业务实现模板

| 模板 | 适用范围 | 内容 |
|------|----------|------|
| [业务实现模板总览](../system-settings-sql-template.md) | 新项目启动 / 业务归档标准化 / AI 代码生成 | 业务分组入口、模板分流、复用规则 |
| [角色权限 - SQL 解释](../business-implementation/role-permission/sql.md) | 只看数据库层 | 公共 SQL、索引、查询语句 |
| [角色权限 - SpringBoot 实现](../business-implementation/role-permission/springboot.md) | 只看 SpringBoot 层 | 分层实现、接口、mapper |
| [角色权限 - Nest 实现](../business-implementation/role-permission/nest.md) | 只看 Nest 层 | 模块、service、dto、守卫 |
| [日志审计 - SQL 解释](../business-implementation/audit-log/sql.md) | 只看数据库层 | 公共 SQL、索引、查询、归档 |
| [日志审计 - SpringBoot 实现](../business-implementation/audit-log/springboot.md) | 只看 SpringBoot 层 | 分层实现、AOP、mapper |
| [日志审计 - Nest 实现](../business-implementation/audit-log/nest.md) | 只看 Nest 层 | 模块、service、interceptor |

## 维护原则

- 改编码规范，只改 `docs/developer/standards/`
- 改业务模板入口，只改 `docs/developer/system-settings-sql-template.md`
- 改具体业务模板，只改 `docs/developer/business-implementation/`
- 保留一个总览页和多个业务子页，避免账号权限和日志审计混写
- 业务模板菜单必须直接指向具体文档，不保留中转页
