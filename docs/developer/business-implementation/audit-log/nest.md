# 日志审计 - Nest 实现

> 这里是 Nest 这一侧的实现文档，与 SQL 解释、SpringBoot 实现同级。
> 重点是 interceptor、service、dto、entity。

## 一、模块职责

| 模块 | 文件名示例 | 职责 |
|------|------|------|
| logs module | `logs.module.ts` | 聚合日志查询能力 |
| controller | `logs.controller.ts` | 操作日志、接口日志、链路查询入口 |
| service | `logs.service.ts` | 查询、统计、写入日志 |
| dto | `query-operation-log.dto.ts` / `query-api-log.dto.ts` | 查询参数校验 |
| entities | `operation-log.entity.ts` / `api-log.entity.ts` | 表结构映射 |
| audit common | `audit.interceptor.ts` / `log-operation.decorator.ts` | 全局记录与操作声明 |

## 二、接口结构

| 模块 | 接口 | DTO / Response | 说明 |
|------|------|------|------|
| 操作日志 | `GET logs/operation` | `QueryOperationLogDto` / `OperationLogResponseDto` | 操作日志分页 |
| 操作日志 | `GET logs/operation/:id` | `OperationLogResponseDto` | 操作日志详情 |
| 接口日志 | `GET logs/api` | `QueryApiLogDto` / `ApiLogResponseDto` | 接口日志分页 |
| 链路查询 | `GET logs/request/:requestId` | `TraceLogResponseDto` | 请求链路日志 |
| 统计 | `GET logs/stats/daily` | `DailyLogStatsDto` | 日统计 |

## 三、实现要点

### 3.1 Controller

```ts
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get('operation')
  listOperationLogs(@Query() dto: QueryOperationLogDto) {
    return this.logsService.listOperationLogs(dto)
  }

  @Get('operation/:id')
  getOperationLog(@Param('id') id: string) {
    return this.logsService.getOperationLog(id)
  }
}
```

### 3.2 Interceptor

```ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly logsService: LogsService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const startedAt = Date.now()
    const request = context.switchToHttp().getRequest()
    return next.handle().pipe(
      tap(async () => {
        const costMs = Date.now() - startedAt
        await this.logsService.recordApiLog({
          requestId: request.requestId,
          accountId: request.user?.id,
          method: request.method,
          path: request.path,
          statusCode: 200,
          costMs,
        })
      })
    )
  }
}
```

### 3.3 DTO

```ts
export class QueryOperationLogDto {
  @IsOptional()
  module?: string

  @IsOptional()
  action?: string

  @IsOptional()
  requestId?: string

  @IsOptional()
  @Type(() => Number)
  page = 1

  @IsOptional()
  @Type(() => Number)
  pageSize = 20
}
```

### 3.4 Entity

```ts
@Entity('ac_operation_logs')
export class OperationLogEntity {
  @PrimaryColumn({ type: 'bigint' })
  id: string

  @Column({ name: 'account_id', type: 'bigint', nullable: true })
  accountId?: string

  @Column()
  module: string

  @Column()
  action: string

  @Column()
  result: number

  @Column({ name: 'request_id' })
  requestId: string

  @Column({ name: 'cost_ms' })
  costMs: number
}
```

### 3.5 Service 查询

```ts
async listOperationLogs(dto: QueryOperationLogDto) {
  const [rows, total] = await this.operationLogRepository.findAndCount({
    where: {
      module: dto.module,
      action: dto.action,
      requestId: dto.requestId,
    },
    order: { createdAt: 'DESC', id: 'DESC' },
    take: dto.pageSize,
    skip: (dto.page - 1) * dto.pageSize,
  })
  return { rows, total }
}
```

## 四、requestId 传递

| 步骤 | 说明 |
|------|------|
| 入口中间件 | 没有 `x-request-id` 时生成一个 |
| request 对象 | 挂载 `request.requestId` |
| 响应头 | 回写 `x-request-id` |
| 日志写入 | API 日志、操作日志、审计记录共用 |

## 五、脱敏规则

| 字段类型 | 处理方式 |
|------|------|
| password / token | 不记录 |
| authorization header | 不记录 |
| 手机号 / 邮箱 | 脱敏后记录 |
| 异常信息 | 记录 message，不默认记录完整 stack |

## 六、落地顺序

1. 先补 entity、dto、service 查询接口。
2. 再补 interceptor 和 `@LogOperation` 装饰器。
3. 最后补 requestId 传递、脱敏和归档任务。
4. 全局 interceptor 接入前，先确认健康检查和静态资源路径是否需要排除。

## 七、检查清单

| 检查项 | 结果 |
|------|------|
| 所有日志是否有 requestId | 必须 |
| interceptor 是否不吞异常 | 必须 |
| DTO 是否限制分页参数 | 必须 |
| token/password 是否不落库 | 必须 |
| 查询是否有时间索引支撑 | 必须 |
