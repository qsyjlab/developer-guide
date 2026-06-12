# 附件存储 - SpringBoot 实现

> 只写分片上传、断点续传、文件引用复用的业务结构。

## 一、分层职责

| 层 | 文件名示例 | 职责 |
|----|------------|------|
| controller | `AttachmentUploadController.java` | 初始化上传、分片上传、完成上传 |
| service | `AttachmentUploadService.java` | 上传会话、分片状态、合并校验 |
| service | `AttachmentRefService.java` | 文件引用创建、删除、查询 |
| service impl | `AttachmentStorageServiceImpl.java` | 存储键生成、分片写入、合并 |
| mapper | `AttachmentFileMapper.java` | 复杂查询 |
| entity | `AttachmentFile.java` / `AttachmentUploadSession.java` / `AttachmentFileRef.java` | 表映射 |
| dto | `InitUploadDTO.java` / `UploadChunkDTO.java` / `CompleteUploadDTO.java` | 上传参数 |

## 二、接口结构

| 接口 | 说明 |
|------|------|
| `POST attachments/upload/init` | 初始化上传，返回 `sessionId` |
| `POST attachments/upload/chunk` | 上传单个分片 |
| `GET attachments/upload/session/{sessionId}` | 查询已上传分片 |
| `POST attachments/upload/complete` | 完成上传并合并 |
| `POST attachments/refs` | 新增业务引用 |
| `DELETE attachments/refs/{id}` | 删除业务引用 |

## 三、Entity 示意

```java
@TableName("ac_attachment_files")
public class AttachmentFile {
  @TableId
  private Long id;
  private String contentHash;
  private String originalName;
  private String ext;
  private String mimeType;
  private Long sizeBytes;
  private String storageKey;
  private String storageProvider;
  private Integer uploadStatus;
  private Integer previewStatus;
}
```

## 四、初始化上传

```java
@Transactional(rollbackFor = Exception.class)
public InitUploadVO initUpload(InitUploadDTO dto, Long accountId) {
  AttachmentFile existing = fileMapper.selectByHash(dto.getContentHash());
  if (existing != null) {
    return InitUploadVO.instant(existing.getId());
  }

  AttachmentFile file = new AttachmentFile();
  file.setId(idGenerator.nextId());
  file.setContentHash(dto.getContentHash());
  file.setOriginalName(dto.getOriginalName());
  file.setExt(dto.getExt());
  file.setMimeType(dto.getMimeType());
  file.setSizeBytes(dto.getSizeBytes());
  file.setUploadStatus(0);
  saveFile(file);

  AttachmentUploadSession session = new AttachmentUploadSession();
  session.setId(idGenerator.nextId());
  session.setSessionNo(UUID.randomUUID().toString().replace("-", ""));
  session.setFileId(file.getId());
  session.setChunkSizeBytes(dto.getChunkSizeBytes());
  session.setChunkTotal(dto.getChunkTotal());
  session.setStatus(0);
  saveSession(session);

  return InitUploadVO.session(session.getId(), session.getSessionNo());
}
```

## 五、分片上传

```java
@Transactional(rollbackFor = Exception.class)
public void uploadChunk(MultipartFile chunkFile, UploadChunkDTO dto) {
  AttachmentUploadSession session = requireSession(dto.getSessionId());
  assertChunkIndex(dto.getChunkIndex(), session.getChunkTotal());

  storageService.storeChunk(session, dto.getChunkIndex(), dto.getChunkHash(), chunkFile);
  chunkMapper.upsertChunk(session.getId(), dto.getChunkIndex(), dto.getChunkHash(), chunkFile.getSize());
  sessionMapper.increaseUploadedCount(session.getId());
}
```

## 六、完成上传

```java
@Transactional(rollbackFor = Exception.class)
public CompleteUploadVO completeUpload(CompleteUploadDTO dto) {
  AttachmentUploadSession session = requireSession(dto.getSessionId());
  List<AttachmentFileChunk> chunks = chunkMapper.selectBySessionId(session.getId());
  assertAllChunksUploaded(session, chunks);

  MergeResult result = storageService.mergeChunks(session, chunks);
  assertHash(result.contentHash(), dto.getContentHash());

  fileMapper.markUploadCompleted(session.getFileId(), result.storageKey());
  sessionMapper.markCompleted(session.getId());

  return new CompleteUploadVO(session.getFileId(), result.storageKey());
}
```

## 七、引用复用

```java
@Transactional(rollbackFor = Exception.class)
public void createRef(CreateAttachmentRefDTO dto, Long accountId) {
  AttachmentFileRef ref = new AttachmentFileRef();
  ref.setId(idGenerator.nextId());
  ref.setFileId(dto.getFileId());
  ref.setBizType(dto.getBizType());
  ref.setBizId(dto.getBizId());
  ref.setFieldCode(dto.getFieldCode());
  ref.setStatus(1);
  ref.setCreatedBy(accountId);
  ref.setCreatedAt(LocalDateTime.now());
  refMapper.insert(ref);
}
```

## 八、闭坑点

- 秒传命中后只新增引用，不再重复创建物理文件。
- 分片合并前必须校验整文件哈希。
- 删除引用后再检查引用数，引用数为 0 再做异步清理。
