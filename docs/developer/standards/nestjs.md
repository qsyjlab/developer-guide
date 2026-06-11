# NestJS 后端扩展规范

> 继承 [通用编码规范](./common.md)。**仅写 NestJS 后端特有约定**，通用规则不在本文档重复。

---

## 一、文件命名规范

### 模块主文件

Controller、Service、Module、Guard 等核心文件使用 **camelCase**：

| 文件 | 示例 |
|------|------|
| Controller | `users.controller.ts`, `snapshots.controller.ts`, `menus.controller.ts` |
| Service | `auth.service.ts`, `storage.service.ts`, `menus.service.ts` |
| Module | `snapshots.module.ts`, `auth.module.ts` |
| Guard | `auth.guard.ts` |

### DTO 文件（`dto/` 子目录）

**kebab-case**（短横线分隔多单词）：

| 示例 | 说明 |
|------|------|
| `change-password.dto.ts` | 修改密码 DTO |
| `upload-project-cover.dto.ts` | 上传项目封面 DTO |
| `init-chunked-upload.dto.ts` | 分片上传初始化 |
| `upload-chunk.dto.ts` | 上传分片 |
| `complete-chunks.dto.ts` | 完成分片合并 |
| `list-snapshots.dto.ts` | 快照列表 |

### Entity 文件（`entities/` 子目录）

**kebab-case**：

| 示例 |
|------|
| `user-role.entity.ts` |
| `upload-session-file.entity.ts` |
| `upload-chunk.entity.ts` |
| `archive-record.entity.ts` |

### Types 文件

**camelCase**（单单词 + `.types` 后缀）：

| 示例 |
|------|
| `snapshot.types.ts` |
| `menu.types.ts` |

### 通用工具（`common/` 目录）

**kebab-case**：

| 示例 |
|------|
| `http-exception.filter.ts` |
| `current-user.decorator.ts` |
| `parse-id.pipe.ts` |
| `format-date-time.ts` |
| `snowflake-id.ts` |

---

## 二、命名速查表

| 文件类型 | 命名规范 | 示例 | 反例（禁止） |
|----------|----------|------|-------------|
| Controller/Service/Module | **camelCase** | `users.controller.ts` | `Users.Controller.ts` |
| DTO | **kebab-case** | `change-password.dto.ts` | `ChangePassword.dto.ts` |
| Entity | **kebab-case** | `upload-session-file.entity.ts` | `uploadSessionFile.entity.ts` |
| Types | **camelCase** + `.types` | `snapshot.types.ts` | `snapshot-types.ts` |
| 通用工具 | **kebab-case** | `http-exception.filter.ts` | `httpException.filter.ts` |

---

## 三、模块文件拆分

| 文件角色 | 文件名示例 | 职责 |
|----------|------------|------|
| Module | `users.module.ts` | 聚合 Controller、Service、Repository 依赖 |
| Controller | `users.controller.ts` | 路由入口、参数接收、调用 Service |
| Service | `users.service.ts` | 业务编排、事务、权限上下文处理 |
| Test | `users.controller.spec.ts` | 控制器或服务的单元测试 |
| DTO | `create-user.dto.ts`、`update-user.dto.ts` | 入参校验、出参序列化 |
| Entity | `user.entity.ts` | 数据库映射，仅在服务内部使用 |

**原则**：
- 资源集合用复数名词表达业务域，例如 `users`、`roles`、`menus`。
- 模块主文件与业务域保持同名，便于快速定位。
- DTO 与 Entity 单独维护，不和 Controller / Service 混写。

---

## 四、DTO 分类范式

### 4.1 DTO 命名约定

本项目 DTO 按 **动作 + 资源名** 命名，前缀表明职责：

| 前缀 | 用途 | 示例 | 装饰器 |
|------|------|------|--------|
| `create-` | POST 请求体，新建资源 | `create-user.dto.ts` | `@IsNotEmpty`, `@IsString`, `@MinLength` |
| `update-` | PUT/PATCH 请求体，更新资源（通常 extends PartialType） | `update-user.dto.ts` | `@IsOptional`, `@IsNotEmpty` |
| `query-` | GET 查询参数（分页/筛选/排序） | `query-user.dto.ts` | `@IsOptional`, `@IsInt`, `@Min(1)` |
| `{动作}-` | 特定操作参数 | `change-password.dto.ts`, `init-chunked-upload.dto.ts` | 按字段装饰 |
| `{资源}-response` | 响应序列化（控制输出字段） | `user-response.dto.ts` | `@Expose`, `@Exclude` |

### 4.2 DTO vs VO vs Request 概念澄清

```
                       NestJS 本项目范式            SpringBoot 备选范式
                       ────────────────            ──────────────────
入参（客户端→服务端）
  创建                  create-xxx.dto.ts            CreateXxxRequest.java
  更新                  update-xxx.dto.ts            UpdateXxxRequest.java
  查询                  query-xxx.dto.ts             XxxQueryRequest.java
  特定动作              change-password.dto.ts       ChangePasswordRequest.java

出参（服务端→客户端）
  列表/详情响应          xxx-response.dto.ts          XxxVO.java / XxxResponse.java
```

> **本项目选择**：统一使用 `dto/` 目录 + 前缀命名范式，不单独拆分 `vo/` 或 `request/` 目录。DTO 同时承担入参校验（class-validator）和出参序列化（class-transformer）职责，减少目录层级。

### 4.3 DTO 编写示例

```ts
// dto/create-user.dto.ts — 创建入参
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator'

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(64)
  account: string

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string

  @IsString()
  @IsNotEmpty()
  displayName: string
}
```

```ts
// dto/update-user.dto.ts — 更新入参（继承可选）
import { PartialType } from '@nestjs/mapped-types'
import { CreateUserDto } from './create-user.dto'

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

```ts
// dto/query-user.dto.ts — 查询入参
import { IsOptional, IsInt, Min, IsString } from 'class-validator'
import { Type } from 'class-transformer'

export class QueryUserDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20

  @IsOptional()
  @IsString()
  keyword?: string
}
```

```ts
// dto/user-response.dto.ts — 响应序列化（脱敏/隐藏字段）
import { Exclude, Expose } from 'class-transformer'

export class UserResponseDto {
  @Expose()
  id: number

  @Expose()
  account: string

  @Expose()
  displayName: string

  @Exclude()        // 响应中永不返回密码哈希
  passwordHash: string

  @Expose()
  status: string
}
```

---

## 五、完整分层调用链路

### 5.1 调用链路图

| 顺序 | 层级 | 示例 | 职责 |
|------|------|------|------|
| 1 | HTTP Request | 请求进入 Controller | 由框架完成路由匹配、参数解析 |
| 2 | Controller | `@Get()`、`@Post()`、`@UseGuards(...)` | 路由入口，参数校验，调用 Service |
| 3 | DTO / Pipe | `@Body() dto: CreateUserDto` | `ValidationPipe` 自动校验入参 |
| 4 | Service | `async create(dto): Promise<UserResponseDto>` | 业务逻辑编排、事务管理、调用 Repository |
| 5 | Repository / EntityManager | `repository.save(entity)` | 数据访问，封装 SQL / ORM 查询 |
| 6 | Entity | `@Entity('ac_users')` | 数据库映射，仅 Service 内部使用 |
| 7 | Database | MySQL / Query | 返回实体或原始查询结果 |

### 5.2 各层职责速查

| 层 | 文件 | 输入 | 输出 | 禁止 |
|----|------|------|------|------|
| **Controller** | `users.controller.ts` | `@Body/@Param/@Query` DTO | Response DTO / `void` | 不写业务逻辑、不直接操作 DB |
| **Service** | `users.service.ts` | DTO / 基本类型 | Entity 或 Response DTO | 不处理 HTTP 上下文（Req/Res） |
| **Repository** | TypeORM `Repository<T>` | Entity / 查询条件 | Entity[] / 原始数据 | 不写业务判断 |
| **Entity** | `entities/user.entity.ts` | — | — | 不含 DTO 装饰器、不含业务逻辑 |
| **DTO** | `dto/*.dto.ts` | — | — | 不含 Entity 装饰器、不含数据库相关 |
| **Guard** | `guards/auth.guard.ts` | ExecutionContext | boolean / Observable | 不写业务逻辑 |
| **Interceptor** | `interceptors/*.ts` | — | 包装后的响应 | 不修改业务数据 |

---

## 六、AI 提示词（NestJS）

追加到通用规范后：

```
NestJS 后端扩展：
- Controller/Service/Module 文件用 camelCase（users.controller.ts）
- DTO 文件用 kebab-case，按动作前缀命名：create-/update-/query-/xxx-/xxx-response
- Entity 文件用 kebab-case（upload-session-file.entity.ts）
- 通用工具文件用 kebab-case（http-exception.filter.ts）
- 目录名用复数名词表示资源集合（modules/users/）
- 模块主文件与目录名一致
- 调用链路：Controller → Service → Repository → Entity，每一层职责单一
- DTO 统一放 dto/ 子目录，同时承担入参校验和出参序列化，不额外拆分 vo/ request/ 目录
- Entity 只在 Service 内部使用，不暴露给 Controller
- 响应序列化用 @Expose/@Exclude + ClassSerializerInterceptor
```
