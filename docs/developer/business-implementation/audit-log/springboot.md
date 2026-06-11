# 日志审计 - SpringBoot 实现

> 这里是 SpringBoot 这一侧的实现文档，与 SQL 解释、Nest 实现同级。
> 重点是 AOP、拦截器、mapper 查询。SpringBoot 依赖统一维护在 [技术选型清单](../../project-overview.md#二java-生态备选)。

## 一、分层职责

| 层 | 文件名示例 | 职责 |
|------|------|------|
| controller | `OperationLogController.java` / `ApiLogController.java` | 日志分页、详情、链路查询 |
| service | `OperationLogService.java` / `ApiLogService.java` | 日志查询与写入接口 |
| service impl | `OperationLogServiceImpl.java` | 查询条件组装、审计记录落库 |
| mapper | `OperationLogMapper.java` / `ApiLogMapper.java` | 复杂查询入口 |
| entity | `OperationLog.java` / `ApiLog.java` | 表结构映射 |
| dto | `OperationLogQueryDTO.java` / `ApiLogQueryDTO.java` | 查询条件与分页参数 |
| vo | `OperationLogVO.java` / `ApiLogVO.java` | 响应字段控制 |
| annotation / aspect | `LogOperation.java` / `OperationLogAspect.java` | 操作日志横切记录 |

## 二、接口结构

| 模块 | 接口 | DTO / VO | 说明 |
|------|------|------|------|
| 操作日志 | `GET logs/operation` | `OperationLogQueryDTO` / `OperationLogVO` | 操作日志分页 |
| 操作日志 | `GET logs/operation/{id}` | `OperationLogVO` | 操作日志详情 |
| 接口日志 | `GET logs/api` | `ApiLogQueryDTO` / `ApiLogVO` | 接口日志分页 |
| 链路查询 | `GET logs/request/{requestId}` | `TraceLogVO` | 请求链路日志 |
| 统计 | `GET logs/stats/daily` | `DailyLogStatsVO` | 日统计 |

## 三、实现要点

### 3.1 Controller

```java
@RestController
@RequestMapping("logs/operation")
public class OperationLogController {

  @GetMapping
  public ApiResult<PageResult<OperationLogVO>> list(OperationLogQueryDTO dto) {
    return ApiResult.ok(operationLogService.list(dto));
  }

  @GetMapping("/{id}")
  public ApiResult<OperationLogVO> detail(@PathVariable Long id) {
    return ApiResult.ok(operationLogService.detail(id));
  }
}
```

### 3.2 AOP 注解

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface LogOperation {
  String module();
  String action();
}
```

### 3.3 AOP 切面

```java
@Aspect
@Component
public class OperationLogAspect {

  @Around("@annotation(logOperation)")
  public Object around(ProceedingJoinPoint point, LogOperation logOperation) throws Throwable {
    long startedAt = System.currentTimeMillis();
    try {
      Object result = point.proceed();
      operationLogService.recordSuccess(logOperation, point, startedAt);
      return result;
    } catch (Throwable error) {
      operationLogService.recordFailure(logOperation, point, startedAt, error);
      throw error;
    }
  }
}
```

### 3.4 DTO / VO

```java
public class OperationLogQueryDTO {
  private LocalDateTime startTime;
  private LocalDateTime endTime;
  private Long accountId;
  private String module;
  private String action;
  private Integer result;
  private Integer page = 1;
  private Integer pageSize = 20;
}

public class OperationLogVO {
  private Long id;
  private Long accountId;
  private String module;
  private String action;
  private Integer result;
  private String requestId;
  private Integer costMs;
  private String message;
  private LocalDateTime createdAt;
}
```

### 3.5 复杂查询 XML

> MyBatis-Plus 负责基础 CRUD。XML 只保留分页筛选、统计聚合、链路查询这类复杂 SQL。

```xml
<select id="selectOperationLogs" resultType="OperationLog">
  SELECT *
  FROM ac_operation_logs
  WHERE created_at BETWEEN #{startTime} AND #{endTime}
    AND (account_id = #{accountId} OR #{accountId} IS NULL)
    AND (module = #{module} OR #{module} IS NULL)
    AND (action = #{action} OR #{action} IS NULL)
  ORDER BY created_at DESC, id DESC
  LIMIT #{pageSize} OFFSET #{offset}
</select>
```

## 四、脱敏规则

| 字段类型 | 处理方式 |
|------|------|
| password / token | 不记录 |
| 手机号 / 邮箱 | 脱敏后记录 |
| 请求体 | 只记录必要摘要 |
| 异常堆栈 | 生产环境只记录错误信息和 traceId |

## 五、落地顺序

1. 先对齐 [技术选型清单](../../project-overview.md#二java-生态备选)，再补 entity、mapper。
2. 再补 `@LogOperation` 和 AOP 切面。
3. 最后补查询接口、导出、归档任务。
4. requestId 拦截器先于日志切面执行，保证所有日志可串联。

## 六、检查清单

| 检查项 | 结果 |
|------|------|
| 是否所有日志都有 requestId | 必须 |
| 是否避免明文敏感字段 | 必须 |
| 分页查询是否按时间倒序 | 必须 |
| 是否有按时间字段索引 | 必须 |
| AOP 失败时是否不吞异常 | 必须 |
