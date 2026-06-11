# MinIO 文件存储 - SpringBoot 实现

> 这里是 SpringBoot 这一侧的实现文档，与 SQL 解释、Nest 实现同级。
> 部署 MinIO 服务请看 [MinIO 部署](../../operations/minio.md)，这里只写业务接入代码。

## 一、分层职责

| 层 | 文件名示例 | 职责 |
|----|------------|------|
| controller | `FileObjectController.java` | 上传文件、生成下载地址、查询业务文件 |
| service | `FileObjectService.java` / `StorageService.java` | 文件元数据写入、MinIO 上传下载 |
| service impl | `FileObjectServiceImpl.java` / `MinioStorageService.java` | 业务编排、objectKey 生成、预签名 URL |
| mapper | `FileObjectMapper.java` | 复杂查询入口，基础 CRUD 交给 MyBatis-Plus |
| entity | `FileObject.java` | `file_objects` 表映射 |
| dto | `UploadFileDTO.java` / `FileQueryDTO.java` | 入参和查询条件 |
| vo | `FileObjectVO.java` / `UploadFileVO.java` | 响应字段控制 |
| config | `MinioStorageProperties.java` / `MinioStorageConfig.java` | MinIO Client 初始化 |

## 二、接口结构

| 模块 | 接口 | DTO / VO | 说明 |
|------|------|----------|------|
| 文件上传 | `POST files/upload` | `UploadFileDTO` / `UploadFileVO` | 普通文件上传 |
| 下载地址 | `GET files/{id}/download-url` | `FileDownloadVO` | 鉴权后生成预签名 URL |
| 业务文件 | `GET files/by-biz` | `FileQueryDTO` / `FileObjectVO` | 查询某个业务对象的文件 |
| 文件删除 | `DELETE files/{id}` | — | 软删除元数据，异步清理对象 |

## 三、依赖与配置

依赖统一维护在 [技术选型清单](../../project-overview.md#二java-生态备选)。如果项目还没接入 MinIO，补充：

```xml
<dependency>
  <groupId>io.minio</groupId>
  <artifactId>minio</artifactId>
  <version>8.5.17</version>
</dependency>
```

`application-prod.yml`：

```yaml
storage:
  minio:
    endpoint: http://127.0.0.1:9000
    public-endpoint: https://files.example.com
    access-key: app_access_key
    secret-key: app_secret_key
    bucket: archive-files
    region: cn-east-1
    presign-expire-seconds: 600
```

## 四、配置类

```java
@ConfigurationProperties(prefix = "storage.minio")
public class MinioStorageProperties {
  private String endpoint;
  private String publicEndpoint;
  private String accessKey;
  private String secretKey;
  private String bucket;
  private String region;
  private Integer presignExpireSeconds = 600;
  // getter / setter
}
```

```java
@Configuration
@EnableConfigurationProperties(MinioStorageProperties.class)
public class MinioStorageConfig {

  @Bean
  public MinioClient minioClient(MinioStorageProperties properties) {
    return MinioClient.builder()
      .endpoint(properties.getEndpoint())
      .credentials(properties.getAccessKey(), properties.getSecretKey())
      .build();
  }
}
```

## 五、Entity / DTO / VO

```java
@TableName("ac_file_objects")
public class FileObject {
  @TableId
  private Long id;
  private String bucket;
  private String objectKey;
  private String originalName;
  private String contentType;
  private Long sizeBytes;
  private String sha256;
  private String bizType;
  private Long bizId;
  private String accessScope;
  private String storageProvider;
  private Integer status;
  private Long createdBy;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private LocalDateTime deletedAt;
}
```

```java
public class UploadFileDTO {
  @NotBlank
  private String bizType;
  private Long bizId;
}

public class UploadFileVO {
  private Long id;
  private String originalName;
  private String contentType;
  private Long sizeBytes;
  private String sha256;
}
```

## 六、MinIO 存储服务

```java
@Service
public class MinioStorageService {

  private final MinioClient minioClient;
  private final MinioStorageProperties properties;

  public MinioStorageService(MinioClient minioClient, MinioStorageProperties properties) {
    this.minioClient = minioClient;
    this.properties = properties;
  }

  public StoredObject upload(String bizType, MultipartFile file) throws Exception {
    ensureBucket();
    String objectKey = buildObjectKey(bizType, file.getOriginalFilename());
    minioClient.putObject(
      PutObjectArgs.builder()
        .bucket(properties.getBucket())
        .object(objectKey)
        .stream(file.getInputStream(), file.getSize(), -1)
        .contentType(file.getContentType())
        .build()
    );
    return new StoredObject(
      properties.getBucket(),
      objectKey,
      file.getOriginalFilename(),
      file.getContentType(),
      file.getSize()
    );
  }

  public String presignedGetUrl(String objectKey) throws Exception {
    return minioClient.getPresignedObjectUrl(
      GetPresignedObjectUrlArgs.builder()
        .method(Method.GET)
        .bucket(properties.getBucket())
        .object(objectKey)
        .expiry(properties.getPresignExpireSeconds(), TimeUnit.SECONDS)
        .build()
    );
  }

  private void ensureBucket() throws Exception {
    boolean exists = minioClient.bucketExists(
      BucketExistsArgs.builder().bucket(properties.getBucket()).build()
    );
    if (!exists) {
      minioClient.makeBucket(
        MakeBucketArgs.builder()
          .bucket(properties.getBucket())
          .region(properties.getRegion())
          .build()
      );
    }
  }

  private String buildObjectKey(String bizType, String originalName) {
    String date = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
    String suffix = StringUtils.getFilenameExtension(originalName);
    String filename = UUID.randomUUID().toString().replace("-", "");
    return bizType + "/" + date + "/" + filename + (suffix == null ? "" : "." + suffix);
  }
}
```

```java
public record StoredObject(
  String bucket,
  String objectKey,
  String originalName,
  String contentType,
  long sizeBytes
) {}
```

## 七、业务 Service

> 写入、软删、分页查询优先使用 MyBatis-Plus。XML 只留给复杂统计或多表查询。

```java
@Service
public class FileObjectServiceImpl extends ServiceImpl<FileObjectMapper, FileObject>
    implements FileObjectService {

  private final MinioStorageService minioStorageService;
  private final IdGenerator idGenerator;

  @Override
  @Transactional(rollbackFor = Exception.class)
  public UploadFileVO upload(MultipartFile file, UploadFileDTO dto, Long accountId) throws Exception {
    StoredObject stored = minioStorageService.upload(dto.getBizType(), file);

    FileObject entity = new FileObject();
    entity.setId(idGenerator.nextId());
    entity.setBucket(stored.bucket());
    entity.setObjectKey(stored.objectKey());
    entity.setOriginalName(stored.originalName());
    entity.setContentType(stored.contentType());
    entity.setSizeBytes(stored.sizeBytes());
    entity.setBizType(dto.getBizType());
    entity.setBizId(dto.getBizId());
    entity.setAccessScope("private");
    entity.setStorageProvider("minio");
    entity.setStatus(1);
    entity.setCreatedBy(accountId);
    entity.setCreatedAt(LocalDateTime.now());
    entity.setUpdatedAt(LocalDateTime.now());
    save(entity);

    return FileObjectConvert.toUploadVO(entity);
  }

  @Override
  public String downloadUrl(Long id, Long accountId) throws Exception {
    FileObject file = getById(id);
    if (file == null || !Objects.equals(file.getStatus(), 1)) {
      throw new BusinessException("文件不存在");
    }
    // 这里接入业务鉴权：校验 accountId 是否能访问 bizType + bizId。
    return minioStorageService.presignedGetUrl(file.getObjectKey());
  }

  @Override
  @Transactional(rollbackFor = Exception.class)
  public void softDelete(Long id, Long accountId) {
    lambdaUpdate()
      .eq(FileObject::getId, id)
      .eq(FileObject::getStatus, 1)
      .set(FileObject::getStatus, 0)
      .set(FileObject::getDeletedAt, LocalDateTime.now())
      .set(FileObject::getUpdatedAt, LocalDateTime.now())
      .update();
  }
}
```

## 八、Controller

```java
@RestController
@RequestMapping("files")
public class FileObjectController {

  private final FileObjectService fileObjectService;

  @PostMapping("upload")
  public ApiResult<UploadFileVO> upload(
      @RequestPart("file") MultipartFile file,
      UploadFileDTO dto
  ) throws Exception {
    Long accountId = CurrentAccount.id();
    return ApiResult.ok(fileObjectService.upload(file, dto, accountId));
  }

  @GetMapping("{id}/download-url")
  public ApiResult<FileDownloadVO> downloadUrl(@PathVariable Long id) throws Exception {
    Long accountId = CurrentAccount.id();
    String url = fileObjectService.downloadUrl(id, accountId);
    return ApiResult.ok(new FileDownloadVO(url));
  }
}
```

## 九、检查清单

| 检查项 | 要求 |
|--------|------|
| 文件本体 | 只进 MinIO，不进 MySQL |
| 元数据 | `bucket`、`objectKey`、`size`、`contentType` 必须落库 |
| 下载 | 后端先鉴权，再生成预签名 URL |
| objectKey | 不使用原文件名，使用业务域 + 日期 + UUID |
| 写入 | MyBatis-Plus `save` / `lambdaUpdate`，不写 insert XML |
| 删除 | 先软删元数据，再异步清理 MinIO 对象 |
