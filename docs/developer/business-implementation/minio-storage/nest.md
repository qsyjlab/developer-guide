# MinIO 文件存储 - Nest 实现

> 这里是 Nest 这一侧的实现文档，与 SQL 解释、SpringBoot 实现同级。
> 部署 MinIO 服务请看 [MinIO 部署](../../operations/minio.md)，这里只写业务接入代码。

## 一、模块职责

| 层 | 文件名示例 | 职责 |
|----|------------|------|
| controller | `files.controller.ts` | 上传文件、生成下载地址、查询业务文件 |
| service | `files.service.ts` | 文件元数据写入、业务鉴权、调用存储服务 |
| storage service | `minio-storage.service.ts` | MinIO 上传、下载、预签名 URL |
| provider | `minio.provider.ts` | 初始化 MinIO Client |
| entity | `file-object.entity.ts` | `file_objects` 表映射 |
| dto | `upload-file.dto.ts` / `query-file.dto.ts` | 入参和查询条件 |
| types | `file-storage.types.ts` | 存储返回类型 |

## 二、接口结构

| 模块 | 接口 | DTO / 返回 | 说明 |
|------|------|------------|------|
| 文件上传 | `POST files/upload` | `UploadFileDto` / `FileObjectResponse` | 普通文件上传 |
| 下载地址 | `GET files/:id/download-url` | `FileDownloadResponse` | 鉴权后生成预签名 URL |
| 业务文件 | `GET files/by-biz` | `QueryFileDto` / `FileObjectResponse[]` | 查询某业务对象文件 |
| 文件删除 | `DELETE files/:id` | — | 软删除元数据 |

## 三、依赖与环境变量

```bash
pnpm add minio
```

```bash
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=app_access_key
MINIO_SECRET_KEY=app_secret_key
MINIO_BUCKET=archive-files
MINIO_REGION=cn-east-1
MINIO_PRESIGN_EXPIRE_SECONDS=600
```

## 四、Provider

```ts
import { Provider } from '@nestjs/common'
import { Client } from 'minio'

export const MINIO_CLIENT = Symbol('MINIO_CLIENT')

export const minioClientProvider: Provider<Client> = {
  provide: MINIO_CLIENT,
  useFactory: () => {
    return new Client({
      endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
      port: Number(process.env.MINIO_PORT || 9000),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || '',
      secretKey: process.env.MINIO_SECRET_KEY || ''
    })
  }
}
```

## 五、Entity / DTO

```ts
@Entity('ac_file_objects')
export class FileObjectEntity {
  @PrimaryColumn({ type: 'bigint' })
  id: string

  @Column({ length: 128 })
  bucket: string

  @Column({ name: 'object_key', length: 512 })
  objectKey: string

  @Column({ name: 'original_name', length: 255 })
  originalName: string

  @Column({ name: 'content_type', length: 128, nullable: true })
  contentType?: string

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: string

  @Column({ length: 64, nullable: true })
  sha256?: string

  @Column({ name: 'biz_type', length: 64 })
  bizType: string

  @Column({ name: 'biz_id', type: 'bigint', nullable: true })
  bizId?: string

  @Column({ name: 'access_scope', length: 32, default: 'private' })
  accessScope: string

  @Column({ name: 'storage_provider', length: 32, default: 'minio' })
  storageProvider: string

  @Column({ type: 'tinyint', default: 1 })
  status: number
}
```

```ts
export class UploadFileDto {
  @IsString()
  @IsNotEmpty()
  bizType: string

  @IsOptional()
  @IsString()
  bizId?: string
}
```

## 六、MinIO 存储服务

```ts
import { Inject, Injectable } from '@nestjs/common'
import { Client } from 'minio'
import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import { Readable } from 'node:stream'

@Injectable()
export class MinioStorageService {
  private readonly bucket = process.env.MINIO_BUCKET || 'archive-files'
  private readonly region = process.env.MINIO_REGION || 'cn-east-1'
  private readonly expires = Number(process.env.MINIO_PRESIGN_EXPIRE_SECONDS || 600)

  constructor(@Inject(MINIO_CLIENT) private readonly client: Client) {}

  async upload(input: {
    bizType: string
    originalName: string
    contentType?: string
    sizeBytes: number
    buffer: Buffer
  }): Promise<StoredObject> {
    await this.ensureBucket()
    const objectKey = this.buildObjectKey(input.bizType, input.originalName)

    await this.client.putObject(
      this.bucket,
      objectKey,
      Readable.from(input.buffer),
      input.sizeBytes,
      { 'Content-Type': input.contentType || 'application/octet-stream' }
    )

    return {
      bucket: this.bucket,
      objectKey,
      originalName: input.originalName,
      contentType: input.contentType || 'application/octet-stream',
      sizeBytes: input.sizeBytes
    }
  }

  async presignedGetUrl(objectKey: string): Promise<string> {
    return this.client.presignedGetObject(this.bucket, objectKey, this.expires)
  }

  private async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket)
    if (!exists) {
      await this.client.makeBucket(this.bucket, this.region)
    }
  }

  private buildObjectKey(bizType: string, originalName: string): string {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '')
    return `${bizType}/${date}/${randomUUID().replaceAll('-', '')}${extname(originalName)}`
  }
}
```

```ts
export interface StoredObject {
  bucket: string
  objectKey: string
  originalName: string
  contentType: string
  sizeBytes: number
}
```

## 七、业务 Service

```ts
@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileObjectEntity)
    private readonly fileRepo: Repository<FileObjectEntity>,
    private readonly minioStorageService: MinioStorageService,
    private readonly idGenerator: IdGenerator
  ) {}

  async upload(file: Express.Multer.File, dto: UploadFileDto, accountId: string) {
    const stored = await this.minioStorageService.upload({
      bizType: dto.bizType,
      originalName: file.originalname,
      contentType: file.mimetype,
      sizeBytes: file.size,
      buffer: file.buffer
    })

    const entity = this.fileRepo.create({
      id: this.idGenerator.nextId(),
      bucket: stored.bucket,
      objectKey: stored.objectKey,
      originalName: stored.originalName,
      contentType: stored.contentType,
      sizeBytes: String(stored.sizeBytes),
      bizType: dto.bizType,
      bizId: dto.bizId,
      accessScope: 'private',
      storageProvider: 'minio',
      status: 1,
      createdBy: accountId
    })

    await this.fileRepo.save(entity)
    return entity
  }

  async downloadUrl(id: string, accountId: string) {
    const file = await this.fileRepo.findOne({ where: { id, status: 1 } })
    if (!file) {
      throw new NotFoundException('文件不存在')
    }
    // 这里接入业务鉴权：校验 accountId 是否能访问 bizType + bizId。
    const url = await this.minioStorageService.presignedGetUrl(file.objectKey)
    return { url }
  }

  async softDelete(id: string, accountId: string): Promise<void> {
    await this.fileRepo.update({ id, status: 1 }, { status: 0, deletedAt: new Date() })
  }
}
```

## 八、Controller

```ts
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: CurrentUserInfo
  ) {
    return this.filesService.upload(file, dto, user.id)
  }

  @Get(':id/download-url')
  downloadUrl(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.filesService.downloadUrl(id, user.id)
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
| 删除 | 先软删元数据，再异步清理 MinIO 对象 |
| 大文件 | 超过阈值后改用上传会话和 multipart 流程 |
