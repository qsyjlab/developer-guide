# 业务实现模板总览

> 这是新项目启动时的业务模板入口，下面的内容已经拆成多个独立文档。
> 如果你的目标是快速生成代码，优先先看入口，再按业务域进入对应子文档。

## 模板分组

| 模板 | 适用场景 | 说明 |
|------|----------|------|
| [角色权限 - SQL 解释](./business-implementation/role-permission/sql.md) | 角色权限数据库层 | 建表、索引、查询语句 |
| [角色权限 - SpringBoot 实现](./business-implementation/role-permission/springboot.md) | 角色权限 Java 实现 | 分层、接口、mapper |
| [角色权限 - Nest 实现](./business-implementation/role-permission/nest.md) | 角色权限 Nest 实现 | 模块、service、dto、守卫 |
| [日志审计 - SQL 解释](./business-implementation/audit-log/sql.md) | 日志审计数据库层 | 建表、索引、查询、归档 |
| [日志审计 - SpringBoot 实现](./business-implementation/audit-log/springboot.md) | 日志审计 Java 实现 | AOP、拦截器、mapper |
| [日志审计 - Nest 实现](./business-implementation/audit-log/nest.md) | 日志审计 Nest 实现 | interceptor、service、dto |
| [MinIO 文件存储 - SQL 解释](./business-implementation/minio-storage/sql.md) | 文件元数据数据库层 | 文件对象、上传会话、分片记录 |
| [MinIO 文件存储 - SpringBoot 实现](./business-implementation/minio-storage/springboot.md) | 文件存储 Java 实现 | MinIO Client、MyBatis-Plus、预签名 URL |
| [MinIO 文件存储 - Nest 实现](./business-implementation/minio-storage/nest.md) | 文件存储 Nest 实现 | provider、service、上传下载 |
| [微前端 Vite 版本](./business-implementation/micro-frontend/practice.md) | 主子应用拆分 / 多团队并行 / 独立部署 | 主应用、子应用、通信、隔离、发布路径 |

## 共用约定

1. 业务模板按“领域”拆，不按页面堆在一起。
2. SQL、SpringBoot、Nest 作为同级页面分别维护，落在同一个目录下但不同文件里。
3. 如果一个业务域同时存在 Nest 和 SpringBoot 两套实现，先沉淀公共 SQL 和公共字段，再补平台差异。
4. 文档里只保留可迁移骨架，不记录临时实现细节。

## 推荐入口顺序

1. 先选业务域：角色权限 / 日志审计 / 文件存储 / 微前端。
2. 数据驱动型业务先看 SQL 解释，确认建表、索引、公共查询。
3. 再按实际技术栈进入 SpringBoot 实现或 Nest 实现。
4. 如果是前端平台拆分场景，直接阅读“微前端 Vite 版本”。
