# 附件存储 - Nest 实现

> 只写分片上传、会话恢复、引用复用。

## 一、模块职责

| 层 | 文件名示例 | 职责 |
|----|------------|------|
| controller | `attachment-upload.controller.ts` | 初始化上传、分片上传、完成上传 |
| service | `attachment-upload.service.ts` | 上传会话编排 |
| service | `attachment-ref.service.ts` | 业务引用管理 |
| storage service | `attachment-storage.service.ts` | 分片写入、合并、存储键生成 |
| entity | `attachment-file.entity.ts` / `attachment-upload-session.entity.ts` / `attachment-file-ref.entity.ts` | 表映射 |
| dto | `init-upload.dto.ts` / `upload-chunk.dto.ts` / `complete-upload.dto.ts` | 上传 DTO |

## 二、实体示意

```ts
@Entity('ac_attachment_upload_sessions')
export class AttachmentUploadSessionEntity {
  @PrimaryColumn({ type: 'bigint' })
  id: string

  @Column({ name: 'session_no', length: 64 })
  sessionNo: string

  @Column({ name: 'file_id', type: 'bigint' })
  fileId: string

  @Column({ name: 'chunk_size_bytes', type: 'bigint' })
  chunkSizeBytes: string

  @Column({ name: 'chunk_total', type: 'int' })
  chunkTotal: number

  @Column({ name: 'uploaded_count', type: 'int', default: 0 })
  uploadedCount: number

  @Column({ type: 'tinyint', default: 0 })
  status: number
}
```

## 三、初始化上传

```ts
@Injectable()
export class AttachmentUploadService {
  async initUpload(dto: InitUploadDto, accountId: string) {
    const existing = await this.fileRepo.findOne({
      where: { contentHash: dto.contentHash, uploadStatus: 2 }
    })

    if (existing) {
      return { mode: 'instant', fileId: existing.id }
    }

    const file = await this.fileRepo.save(
      this.fileRepo.create({
        id: IdGenerators.nextId(),
        contentHash: dto.contentHash,
        originalName: dto.originalName,
        ext: dto.ext,
        mimeType: dto.mimeType,
        sizeBytes: String(dto.sizeBytes),
        uploadStatus: 0
      })
    )

    const session = await this.sessionRepo.save(
      this.sessionRepo.create({
        id: IdGenerators.nextId(),
        sessionNo: randomUUID().replaceAll('-', ''),
        fileId: file.id,
        chunkSizeBytes: String(dto.chunkSizeBytes),
        chunkTotal: dto.chunkTotal,
        uploadedCount: 0,
        status: 0
      })
    )

    return { mode: 'upload', sessionId: session.id, sessionNo: session.sessionNo }
  }
}
```

## 四、分片上传

```ts
async uploadChunk(file: Express.Multer.File, dto: UploadChunkDto) {
  const session = await this.requireSession(dto.sessionId)
  await this.storageService.storeChunk(session, dto.chunkIndex, dto.chunkHash, file.buffer)

  await this.chunkRepo.upsert({
    sessionId: session.id,
    chunkIndex: dto.chunkIndex,
    chunkHash: dto.chunkHash,
    sizeBytes: String(file.size),
    status: 1
  })

  await this.sessionRepo.increment({ id: session.id }, 'uploadedCount', 1)
}
```

## 五、完成上传

```ts
async completeUpload(dto: CompleteUploadDto) {
  const session = await this.requireSession(dto.sessionId)
  const chunks = await this.chunkRepo.find({
    where: { sessionId: session.id, status: 1 },
    order: { chunkIndex: 'ASC' }
  })

  this.assertAllChunksUploaded(session, chunks)

  const result = await this.storageService.mergeChunks(session, chunks)
  this.assertHash(result.contentHash, dto.contentHash)

  await this.fileRepo.update(
    { id: session.fileId },
    { uploadStatus: 2, storageKey: result.storageKey }
  )

  await this.sessionRepo.update(
    { id: session.id },
    { status: 2 }
  )

  return { fileId: session.fileId, storageKey: result.storageKey }
}
```

## 六、引用服务

```ts
async createRef(dto: CreateAttachmentRefDto, accountId: string) {
  await this.refRepo.save(
    this.refRepo.create({
      id: IdGenerators.nextId(),
      fileId: dto.fileId,
      bizType: dto.bizType,
      bizId: dto.bizId,
      fieldCode: dto.fieldCode,
      status: 1,
      createdBy: accountId
    })
  )
}
```

## 七、闭坑点

- 秒传返回不能跳过引用创建。
- 分片成功和整文件完成是两个状态。
- 物理删除应放到异步任务，不放在业务删除请求里。
